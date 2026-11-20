// @vitest-environment node
// ============================================================
// Migration 046 — M06 bulk import.
// Done when (PDF): a 500-row file imports cleanly, or returns row-level
// errors with nothing partly saved.
// ============================================================

import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import {
  asUser,
  createDatabase,
  createUser,
  errorAsUser,
  FULL_DECLARATION,
  grantScope,
  pastPeriod,
  setRole,
} from './harness';

let db: PGlite;
let officer: string;
let declaration: unknown;

interface ImportResult {
  ok: boolean;
  dry_run: boolean;
  imported: number;
  failed: number;
  rows: { row: number; ok: boolean; errors: string[]; warnings: string[] }[];
}

const row = (
  i: number,
  form: Record<string, string> = {},
  extra: Record<string, unknown> = {}
) => ({
  tool_id: 'T02',
  tool_name: 'District Biodiversity Monitoring',
  period: pastPeriod(i % 28),
  form_data: {
    stakeholder: 'District Authorities',
    district: 'Musanze',
    forest_ha: String(10 + (i % 7)),
    ...form,
  },
  ...extra,
});

async function importRows(rows: unknown[], dryRun: boolean, decl: unknown = declaration) {
  return asUser(db, officer, async tx => {
    const r = await tx.query<{ r: ImportResult }>(
      `SELECT public.import_reports($1::jsonb, $2::jsonb, $3) AS r`,
      [JSON.stringify(rows), JSON.stringify(decl), dryRun]
    );
    return r.rows[0].r;
  });
}

async function reportCount(): Promise<number> {
  const r = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM public.toolkit_reports`
  );
  return r.rows[0].n;
}

beforeAll(async () => {
  ({ db } = await createDatabase());
  officer = await createUser(db, 'officer@musanze.gov.rw');
  await setRole(db, officer, 'local_reporting');
  await grantScope(db, officer, 'data_entry', 'District Authorities', 'Musanze');
  declaration = (
    await db.query<{ d: unknown }>(`SELECT ${FULL_DECLARATION} AS d`)
  ).rows[0].d;
}, 180_000);

describe('Done when: a 500-row file returns row-level errors with nothing partly saved', () => {
  it('reports each bad row with its reason and saves none of the 500', async () => {
    const before = await reportCount();
    const rows = Array.from({ length: 500 }, (_, i) => row(i));
    rows[9] = row(9, { forest_ha: '-4' }); // impossible value (M04)
    rows[199] = row(199, { district: 'Huye' }); // outside the officer's district (M01)
    rows[349] = row(349, {}, { period: 'Q1 2099' }); // outside the NBSAP period
    rows[449] = row(449, { forest_ha: 'lots' }); // not a number

    const r = await importRows(rows, false);
    expect(r.ok).toBe(false);
    expect(r.imported).toBe(0);
    expect(r.failed).toBe(4);
    const bad = r.rows.filter(x => !x.ok);
    expect(bad.map(x => x.row)).toEqual([10, 200, 350, 450]);
    expect(bad[0].errors[0]).toMatch(
      /Forest Restoration is -4; it cannot be below 0 ha/
    );
    expect(bad[1].errors[0]).toMatch(
      /may not submit for this institution or district/
    );
    expect(bad[2].errors[0]).toMatch(/outside the NBSAP reporting period/);
    expect(bad[3].errors[0]).toMatch(/must be a number/);
    expect(await reportCount()).toBe(before); // nothing partly saved
  }, 120_000);
});

describe('Done when: a 500-row file imports cleanly', () => {
  it('a dry run checks all 500 rows and saves nothing', async () => {
    const before = await reportCount();
    const r = await importRows(Array.from({ length: 500 }, (_, i) => row(i)), true);
    expect(r).toMatchObject({ ok: true, dry_run: true, imported: 0, failed: 0 });
    expect(r.rows).toHaveLength(500);
    expect(await reportCount()).toBe(before);
  }, 120_000);

  it('the import saves all 500, each a pending report in validation with the declaration', async () => {
    const before = await reportCount();
    const r = await importRows(Array.from({ length: 500 }, (_, i) => row(i)), false);
    expect(r).toMatchObject({ ok: true, dry_run: false, imported: 500, failed: 0 });
    expect(await reportCount()).toBe(before + 500);

    const s = await db.query<{
      n: number;
      pending: number;
      declared: number;
      scoped: number;
    }>(
      `SELECT count(*)::int AS n,
              count(*) FILTER (WHERE status = 'pending' AND workflow_status = 'submitted')::int AS pending,
              count(*) FILTER (WHERE dqa_declaration->>'declared_by' = $1)::int AS declared,
              count(*) FILTER (WHERE district_id IS NOT NULL)::int AS scoped
       FROM public.toolkit_reports WHERE submitted_by = $1::uuid`,
      [officer]
    );
    expect(s.rows[0]).toEqual({ n: 500, pending: 500, declared: 500, scoped: 500 });
  }, 120_000);
});

describe('row checks', () => {
  it('a duplicate within the file is reported on the second row', async () => {
    const target = (
      await db.query<{ id: number }>(`SELECT min(id) AS id FROM public.nbsap_targets`)
    ).rows[0].id;
    const r = await importRows(
      [
        row(0, {}, { nbsap_target_id: target, period: 'Q3 2023' }),
        row(1, {}, { nbsap_target_id: target, period: 'Q3 2023' }),
      ],
      true
    );
    expect(r.rows.map(x => x.ok)).toEqual([true, false]);
    expect(r.rows[1].errors[0]).toMatch(/Duplicate/);
  });

  it('every row fails without the data-quality checklist', async () => {
    const r = await importRows([row(1), row(2)], true, { declared: false, items: [] });
    expect(r.failed).toBe(2);
    expect(r.rows[0].errors[0]).toMatch(/Complete the data-quality checklist/);
  });

  it('warnings are returned for the preview (no target or indicator linked)', async () => {
    const r = await importRows([row(3)], true);
    expect(r.rows[0].warnings.join(' ')).toMatch(/No NBSAP target is linked/);
  });

  it('refuses an empty file, more than 1000 rows, and anonymous callers', async () => {
    expect(
      (
        await errorAsUser(db, officer, tx =>
          tx.query(`SELECT public.import_reports('[]', '{}')`)
        )
      )?.message
    ).toMatch(/no rows/);
    const many = JSON.stringify(Array.from({ length: 1001 }, (_, i) => row(i)));
    expect(
      (
        await errorAsUser(db, officer, tx =>
          tx.query(`SELECT public.import_reports($1::jsonb, '{}')`, [many])
        )
      )?.message
    ).toMatch(/At most 1000 rows/);
    expect(
      (
        await errorAsUser(db, null, tx =>
          tx.query(`SELECT public.import_reports('[]', '{}')`)
        )
      )?.message
    ).toMatch(/permission denied|Not authenticated/);
  });
});

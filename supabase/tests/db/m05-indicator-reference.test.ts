// @vitest-environment node
// ============================================================
// Migration 045 — M05 indicator reference data and disaggregation.
// Done when (PDF): all indicators in use have complete reference data.
// A PDF sheet can be generated for each (the sheet is built from
// v_indicator_reference; see src/utils/indicatorSheet.test.ts).
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
  setRole,
  useSingleStage,
} from './harness';

let db: PGlite;
let admin: string;
let officer: string;
let viewer: string;

const WOMEN_YOUTH = 'Women and Youth in Biodiversity Decision-Making (%)';
const PEOPLE_BENEFITING = 'People Benefiting from Wild Resources';

async function idOf(name: string): Promise<number> {
  const r = await db.query<{ id: number }>(
    `SELECT min(id) AS id FROM public.indicators WHERE name = $1`,
    [name]
  );
  if (r.rows[0]?.id == null) throw new Error(`indicator not seeded: ${name}`);
  return r.rows[0].id;
}

async function submit(indicator: number, period: string, form: Record<string, string>) {
  return asUser(db, officer, async tx => {
    const r = await tx.query<{ id: string; f: { code: string; severity: string }[] }>(
      `INSERT INTO public.toolkit_reports
         (tool_id, tool_name, submitted_by, status, period, district, indicator_id, form_data, dqa_declaration)
       VALUES ('T02', 'District', $1, 'pending', $2, 'Musanze', $3, $4::jsonb, ${FULL_DECLARATION})
       RETURNING id, quality_flags AS f`,
      [
        officer,
        period,
        indicator,
        JSON.stringify({ stakeholder: 'District Authorities', district: 'Musanze', ...form }),
      ]
    );
    return r.rows[0];
  });
}

beforeAll(async () => {
  ({ db } = await createDatabase());
  admin = await createUser(db, 'admin@rema.gov.rw');
  officer = await createUser(db, 'officer@musanze.gov.rw');
  viewer = await createUser(db, 'viewer@example.rw');
  await setRole(db, admin, 'dashboard_management');
  await setRole(db, officer, 'local_reporting');
  await grantScope(db, officer, 'data_entry', 'District Authorities', 'Musanze');
  await useSingleStage(db, 'ministry');
}, 180_000);

describe('Done when: all indicators in use have complete reference data', () => {
  it('every field is filled for every indicator in use except the RBIS code (not in any document)', async () => {
    const r = await db.query<{ gaps: string[]; n: number }>(
      `SELECT gaps, count(*)::int AS n FROM public.v_indicator_reference
       WHERE in_use GROUP BY gaps`
    );
    expect(r.rows).toEqual([{ gaps: ['RBIS code'], n: expect.any(Number) }]);
  });

  it('once RBIS codes are entered, every indicator in use is complete', async () => {
    await db.query(
      `UPDATE public.indicators SET rbis_code = 'RBIS-' || id WHERE in_use AND rbis_code IS NULL`
    );
    const r = await db.query<{ incomplete: number; total: number }>(
      `SELECT count(*) FILTER (WHERE NOT complete)::int AS incomplete, count(*)::int AS total
       FROM public.v_indicator_reference WHERE in_use`
    );
    expect(r.rows[0].incomplete).toBe(0);
    expect(r.rows[0].total).toBeGreaterThan(80);
  });

  it('exact duplicates are kept but taken out of use', async () => {
    const r = await db.query<{ name: string; n: number; in_use: number }>(
      `SELECT name, count(*)::int AS n, count(*) FILTER (WHERE in_use)::int AS in_use
       FROM public.indicators GROUP BY name, nbsap_target_id HAVING count(*) > 1`
    );
    expect(r.rows.length).toBeGreaterThan(0);
    for (const row of r.rows) expect(row.in_use).toBe(1);
  });

  it('each indicator has a reference sheet from the Framework for its target', async () => {
    const r = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM public.v_indicator_reference
       WHERE in_use AND (sheet_methodology IS NULL OR sheet_source IS NULL)`
    );
    expect(r.rows[0].n).toBe(0);
    const s = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM public.target_reference_sheets`
    );
    expect(s.rows[0].n).toBe(22);
  });
});

describe('national tier and validation route', () => {
  it('national tier sits beside the KM-GBF type', async () => {
    const r = await db.query<{ km: string; nt: number; name: string }>(
      `SELECT km_gbf_type::text AS km, national_tier AS nt, national_tier_name AS name
       FROM public.v_indicator_reference WHERE name = $1`,
      [WOMEN_YOUTH]
    );
    expect(r.rows[0]).toEqual({ km: 'headline', nt: 1, name: 'Headline (mandatory)' });
  });

  it('the validation route includes NISR only for indicators flagged for statistical sign-off', async () => {
    await db.query(`UPDATE public.validation_stages SET is_active = TRUE`); // all five stages
    const id = await idOf(WOMEN_YOUTH);
    const route = async () =>
      (
        await db.query<{ r: { code: string }[] }>(
          `SELECT public.indicator_validation_route($1) AS r`,
          [id]
        )
      ).rows[0].r.map(s => s.code);
    expect(await route()).not.toContain('nisr');
    await db.query(
      `UPDATE public.indicators SET requires_statistical_validation = TRUE WHERE id = $1`,
      [id]
    );
    expect(await route()).toContain('nisr');
    await db.query(
      `UPDATE public.indicators SET requires_statistical_validation = FALSE WHERE id = $1`,
      [id]
    );
    await useSingleStage(db, 'ministry');
  });
});

describe('TWG approval', () => {
  it('only complete reference data can be approved; approval records who and when', async () => {
    const id = await idOf(PEOPLE_BENEFITING);
    await db.query(`UPDATE public.indicators SET rbis_code = NULL WHERE id = $1`, [id]);
    const err = await errorAsUser(db, admin, tx =>
      tx.query(`UPDATE public.indicators SET reference_status = 'approved' WHERE id = $1`, [id])
    );
    expect(err?.message).toMatch(/incomplete \(missing: RBIS code\)/);

    await asUser(db, admin, tx =>
      tx.query(
        `UPDATE public.indicators SET rbis_code = 'RBIS-T9-01', reference_status = 'approved' WHERE id = $1`,
        [id]
      )
    );
    const r = await db.query<{ s: string; by: string }>(
      `SELECT reference_status AS s, reference_approved_by AS by FROM public.indicators WHERE id = $1`,
      [id]
    );
    expect(r.rows[0]).toEqual({ s: 'approved', by: admin });
  });

  it('changing approved reference data returns it to draft', async () => {
    const id = await idOf(PEOPLE_BENEFITING);
    await asUser(db, admin, tx =>
      tx.query(`UPDATE public.indicators SET formula = formula || ' (revised)' WHERE id = $1`, [id])
    );
    const r = await db.query<{ s: string; by: string | null }>(
      `SELECT reference_status AS s, reference_approved_by AS by FROM public.indicators WHERE id = $1`,
      [id]
    );
    expect(r.rows[0]).toEqual({ s: 'draft', by: null });
  });

  it('only administrators edit reference data; unknown breakdowns are refused', async () => {
    const id = await idOf(PEOPLE_BENEFITING);
    const n = await asUser(
      db,
      officer,
      async tx =>
        (await tx.query(`UPDATE public.indicators SET formula = 'x' WHERE id = $1`, [id]))
          .affectedRows
    );
    expect(n).toBe(0);
    const err = await errorAsUser(db, admin, tx =>
      tx.query(`UPDATE public.indicators SET disaggregations = ARRAY['ethnicity'] WHERE id = $1`, [
        id,
      ])
    );
    expect(err?.message).toMatch(/Unknown disaggregation: ethnicity/);
  });

  it('signed-in users read the reference sheets; anonymous visitors do not', async () => {
    const n = await asUser(
      db,
      viewer,
      async tx => (await tx.query(`SELECT 1 FROM public.v_indicator_reference`)).rows.length
    );
    expect(n).toBeGreaterThan(80);
    const anon = await asUser(
      db,
      null,
      async tx => (await tx.query(`SELECT 1 FROM public.target_reference_sheets`)).rows.length
    ).catch(() => 0);
    expect(anon).toBe(0);
  });
});

describe('sex, age and youth fields where required', () => {
  it('a report on an indicator that needs a breakdown is refused without it', async () => {
    const id = await idOf(WOMEN_YOUTH);
    await expect(submit(id, 'Q1 2025', { reported_value: '40' })).rejects.toThrow(
      /must be broken down by sex: enter "Women \/ female"/
    );
    await expect(
      submit(id, 'Q1 2025', { dis_female: '12', dis_male: 'many', dis_youth: '5' })
    ).rejects.toThrow(/"Men \/ male" must be a whole number/);
  });

  it('is accepted with the breakdown', async () => {
    const id = await idOf(WOMEN_YOUTH);
    const r = await submit(id, 'Q2 2025', { dis_female: '12', dis_male: '18', dis_youth: '9' });
    expect(r.f.filter(f => f.severity === 'error')).toEqual([]);
  });

  it('warns when women + men differ from the age groups', async () => {
    const id = await idOf(PEOPLE_BENEFITING);
    const r = await submit(id, 'Q3 2025', {
      dis_female: '10',
      dis_male: '10',
      dis_youth: '4',
      dis_age_under_16: '0',
      dis_age_16_30: '4',
      dis_age_31_64: '10',
      dis_age_65_plus: '1',
    });
    expect(r.f.map(f => f.code)).toContain('disaggregation_inconsistent');
  });

  it('indicators without a required breakdown are not affected', async () => {
    const r = await submit(await idOf('Degraded Wetlands Restored (ha)'), 'Q4 2025', {
      forest_ha: '5',
    });
    expect(r.f.filter(f => f.code.startsWith('disaggregation'))).toEqual([]);
  });
});

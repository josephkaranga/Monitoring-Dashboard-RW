// @vitest-environment node
// ============================================================
// Migration 043 — M04 data-quality checks and DQA checklist.
// Done when (PDF): a 50% jump is flagged to the validator. Submission is
// blocked until the checklist is complete.
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
  review,
  setRole,
  useSingleStage,
} from './harness';

let db: PGlite;
let officer: string; // Musanze data entry
let validator: string; // ministry validator for Musanze
let admin: string; // REMA administrator

interface Flag {
  code: string;
  severity: 'error' | 'warning';
  field?: string;
  message: string;
  change_pct?: number;
  previous?: number;
  current?: number;
  previous_period?: string;
}

const MUSANZE = { stakeholder: 'District Authorities', district: 'Musanze' };

/** Submit as the officer; `declaration` is a SQL expression (default: complete). */
async function submit(
  tool: string,
  period: string | null,
  form: Record<string, string>,
  declaration = FULL_DECLARATION
): Promise<string> {
  return asUser(db, officer, async tx => {
    const r = await tx.query<{ id: string }>(
      `INSERT INTO public.toolkit_reports
         (tool_id, tool_name, submitted_by, status, period, district, form_data, dqa_declaration)
       VALUES ($1::report_type, 'Test', $2, 'pending', $3, 'Musanze', $4::jsonb, ${declaration})
       RETURNING id`,
      [tool, officer, period, JSON.stringify({ ...MUSANZE, ...form })]
    );
    return r.rows[0].id;
  });
}

async function submitError(
  tool: string,
  period: string | null,
  form: Record<string, string>,
  declaration = FULL_DECLARATION
): Promise<string | undefined> {
  try {
    await submit(tool, period, form, declaration);
    return undefined;
  } catch (e) {
    return (e as Error).message;
  }
}

/** What a user sees of a report's quality flags (through RLS). */
async function flagsSeenBy(user: string, id: string): Promise<Flag[]> {
  return asUser(db, user, async tx => {
    const r = await tx.query<{ f: Flag[] }>(
      `SELECT quality_flags AS f FROM public.toolkit_reports WHERE id = $1`,
      [id]
    );
    return r.rows[0]?.f ?? [];
  });
}

beforeAll(async () => {
  ({ db } = await createDatabase());
  officer = await createUser(db, 'officer@musanze.gov.rw');
  validator = await createUser(db, 'val@minagri.gov.rw');
  admin = await createUser(db, 'admin@rema.gov.rw');
  await setRole(db, officer, 'local_reporting');
  await setRole(db, validator, 'lead_government_ministry_reporting');
  await setRole(db, admin, 'dashboard_management');
  await grantScope(db, officer, 'data_entry', 'District Authorities', 'Musanze');
  await grantScope(db, validator, 'ministry_validator', 'District Authorities', 'Musanze');
  await useSingleStage(db, 'ministry');
}, 180_000);

describe('the checklist', () => {
  it('is seeded from the Monitoring Framework data-quality standards, with sources', async () => {
    const r = await asUser(db, officer, tx =>
      tx.query<{ text: string; source: string }>(
        `SELECT text, source FROM public.dqa_checklist_items WHERE is_active ORDER BY ordinal`
      )
    );
    expect(r.rows.map(x => x.text.split(':')[0])).toEqual([
      'Accuracy',
      'Completeness',
      'Consistency',
      'Timeliness',
      'Relevance',
      'Uniqueness',
      'Format',
      'Traceability',
    ]);
    for (const row of r.rows) expect(row.source).toMatch(/2\.5\.3\.6/);
  });

  it('only administrators change the checklist, rules and threshold', async () => {
    for (const sql of [
      `UPDATE public.dqa_checklist_items SET is_active = FALSE`,
      `UPDATE public.dqa_field_rules SET max_value = NULL`,
      `UPDATE public.dqa_settings SET value = 5`,
    ]) {
      const n = await asUser(db, officer, async tx => (await tx.query(sql)).affectedRows);
      expect(n).toBe(0); // RLS: no rows visible for update
    }
    const t = await db.query<{ v: string }>(
      `SELECT value::text AS v FROM public.dqa_settings WHERE key = 'jump_threshold'`
    );
    expect(t.rows[0].v).toBe('0.5');
  });
});

describe('Done when: submission is blocked until the checklist is complete', () => {
  it('refuses a report with no declaration', async () => {
    expect(await submitError('T02', 'Q1 2025', { forest_ha: '10' }, 'NULL')).toMatch(
      /Complete the data-quality checklist/
    );
  });

  it('refuses a report with one item unconfirmed', async () => {
    const partial = `(SELECT jsonb_build_object('declared', true, 'items', jsonb_agg(id))
                      FROM public.dqa_checklist_items WHERE is_active AND ordinal <> 8)`;
    expect(await submitError('T02', 'Q1 2025', { forest_ha: '10' }, partial)).toMatch(
      /Complete the data-quality checklist/
    );
  });

  it('refuses a report whose items are all confirmed but the declaration is not accepted', async () => {
    const undeclared = `(SELECT jsonb_build_object('declared', false, 'items', jsonb_agg(id))
                         FROM public.dqa_checklist_items WHERE is_active)`;
    expect(await submitError('T02', 'Q1 2025', { forest_ha: '10' }, undeclared)).toMatch(
      /Complete the data-quality checklist/
    );
  });

  it('accepts a complete checklist and records who declared it and when (not forgeable)', async () => {
    const forged = `(SELECT jsonb_build_object('declared', true, 'items', jsonb_agg(id),
                       'declared_by', '00000000-0000-0000-0000-000000000000')
                     FROM public.dqa_checklist_items WHERE is_active)`;
    const id = await submit('T02', 'Q1 2025', { forest_ha: '10' }, forged);
    const r = await db.query<{ by: string; at: string | null }>(
      `SELECT dqa_declaration->>'declared_by' AS by, dqa_declaration->>'declared_at' AS at
       FROM public.toolkit_reports WHERE id = $1`,
      [id]
    );
    expect(r.rows[0].by).toBe(officer);
    expect(r.rows[0].at).not.toBeNull();
  });

  it('a deactivated item is no longer required; a new item is', async () => {
    const before = await submitError('T02', 'Q2 2025', { forest_ha: '10' });
    expect(before).toBeUndefined();

    await asUser(db, admin, tx =>
      tx.query(
        `INSERT INTO public.dqa_checklist_items (ordinal, text, source)
         VALUES (9, 'Disaggregation: figures are split by sex where the indicator asks for it.', 'REMA')`
      )
    );
    // A declaration built before the new item existed is now incomplete.
    const stale = `'{"declared": true, "items": [1,2,3,4,5,6,7,8]}'::jsonb`;
    expect(await submitError('T02', 'Q3 2025', { forest_ha: '10' }, stale)).toMatch(
      /Complete the data-quality checklist/
    );

    await asUser(db, admin, tx =>
      tx.query(`UPDATE public.dqa_checklist_items SET is_active = FALSE WHERE ordinal = 9`)
    );
    expect(await submitError('T02', 'Q3 2025', { forest_ha: '10' }, stale)).toBeUndefined();
  });
});

describe('impossible values are refused', () => {
  it.each([
    ['a negative area', 'T02', 'Q4 2025', { forest_ha: '-5' }, /cannot be below 0 ha/],
    [
      'an area larger than Rwanda',
      'T02',
      'Q4 2025',
      { forest_ha: '3000000' },
      /cannot be above 2633800 ha/,
    ],
    ['text in a number field', 'T02', 'Q4 2025', { wetland_ha: 'about 40' }, /must be a number/],
    [
      'a habitat score outside 1-10',
      'T03',
      'Q4 2025',
      { habitat_quality: '11' },
      /cannot be above 10/,
    ],
    [
      'implementation above 100%',
      'T05',
      null,
      { year: '2025', implementation_pct: '120' },
      /cannot be above 100 %/,
    ],
    [
      'disbursed above allocated',
      'T05',
      null,
      { year: '2025', budget_allocated: '100', budget_disbursed: '150' },
      /disbursed cannot be more/,
    ],
    [
      'a future quarter',
      'T02',
      'Q1 2099',
      { forest_ha: '10' },
      /outside the NBSAP reporting period/,
    ],
    [
      'a quarter that has not happened yet',
      'T02',
      `Q4 ${new Date().getFullYear() + 1}`,
      { forest_ha: '10' },
      /has not happened yet|outside the NBSAP/,
    ],
    ['a malformed period', 'T02', 'Quarter 1', { forest_ha: '10' }, /is not a quarter/],
    ['no period', 'T02', null, { forest_ha: '10' }, /period is missing/],
  ] as const)('%s', async (_name, tool, period, form, message) => {
    expect(await submitError(tool, period, { ...form })).toMatch(message);
  });

  it('accepts a valid fiscal-year report (T05)', async () => {
    const id = await submit('T05', null, {
      year: '2024',
      budget_allocated: '100',
      budget_disbursed: '80',
      implementation_pct: '60',
    });
    const flags = await flagsSeenBy(officer, id);
    expect(flags.filter(f => f.severity === 'error')).toEqual([]);
  });
});

describe('Done when: a 50% jump is flagged to the validator', () => {
  let jumpId: string;

  beforeAll(async () => {
    // Previous published report: 100 ha of forest restored in Q1 2024.
    const prev = await submit('T03', 'Q1 2024', { restoration_ha: '100', habitat_quality: '6' });
    await review(db, validator, prev, 'approve'); // single stage: published
    jumpId = await submit('T03', 'Q2 2024', { restoration_ha: '160', habitat_quality: '7' });
  });

  it('the validator sees the jump, with the previous and current values', async () => {
    const flags = await flagsSeenBy(validator, jumpId);
    const jump = flags.find(f => f.code === 'jump');
    expect(jump).toMatchObject({
      severity: 'warning',
      field: 'restoration_ha',
      previous: 100,
      current: 160,
      change_pct: 60,
      previous_period: 'Q1 2024',
    });
    expect(jump?.message).toMatch(/Restoration Activities changed by 60% since Q1 2024/);
    // A 17% change in the habitat score is not flagged.
    expect(flags.filter(f => f.code === 'jump')).toHaveLength(1);
  });

  it('flags a fall of 50% or more too, but not a change below the threshold', async () => {
    const fall = await submit('T03', 'Q3 2024', { restoration_ha: '50' });
    expect((await flagsSeenBy(validator, fall)).find(f => f.code === 'jump')?.change_pct).toBe(-50);
    const small = await submit('T03', 'Q4 2024', { restoration_ha: '140' });
    expect((await flagsSeenBy(validator, small)).some(f => f.code === 'jump')).toBe(false);
  });

  it('compares with the latest earlier published report only (not pending ones)', async () => {
    // Q2-Q4 2024 are still pending: Q1 2024 (100 ha) remains the reference.
    const r = await submit('T03', '2025', { restoration_ha: '100' });
    expect((await flagsSeenBy(validator, r)).some(f => f.code === 'jump')).toBe(false);
  });

  it('the threshold is REMA’s setting', async () => {
    await asUser(db, admin, tx =>
      tx.query(`UPDATE public.dqa_settings SET value = 0.3 WHERE key = 'jump_threshold'`)
    );
    const r = await submit('T03', 'Q1 2026', { restoration_ha: '140' });
    expect((await flagsSeenBy(validator, r)).find(f => f.code === 'jump')?.change_pct).toBe(40);
    await asUser(db, admin, tx =>
      tx.query(`UPDATE public.dqa_settings SET value = 0.5 WHERE key = 'jump_threshold'`)
    );
  });

  it('warns when no target or indicator is linked', async () => {
    const codes = (await flagsSeenBy(validator, jumpId)).map(f => f.code);
    expect(codes).toEqual(expect.arrayContaining(['no_target', 'no_indicator']));
  });
});

describe('the form preview gives the same answer as submission', () => {
  it('reports errors and the jump before the user submits', async () => {
    const flags = await asUser(db, officer, async tx => {
      const r = await tx.query<{ f: Flag[] }>(
        `SELECT public.preview_report_quality('T03', $1::jsonb) AS f`,
        [
          JSON.stringify({
            ...MUSANZE,
            period: 'Q3 2026',
            restoration_ha: '400',
            habitat_quality: '0',
          }),
        ]
      );
      return r.rows[0].f;
    });
    expect(flags.find(f => f.code === 'jump' && f.field === 'restoration_ha')).toMatchObject({
      previous: 100,
      current: 400,
    });
    expect(flags.find(f => f.code === 'below_min')?.field).toBe('habitat_quality');
  });

  it('is not available to anonymous visitors', async () => {
    const err = await errorAsUser(db, null, tx =>
      tx.query(`SELECT public.preview_report_quality('T02', '{}'::jsonb)`)
    );
    expect(err?.message).toMatch(/permission denied|Not authenticated/);
  });
});

describe('resubmission is checked the same way', () => {
  let id: string;

  beforeAll(async () => {
    id = await submit('T02', 'Q2 2026', { forest_ha: '20' });
    await review(db, validator, id, 'return', 'Check the hectares');
  });

  const resubmit = (form: Record<string, string>, declaration: string) =>
    errorAsUser(db, officer, tx =>
      tx.query(`SELECT public.resubmit_report($1, $2::jsonb, NULL, 'Fixed', ${declaration})`, [
        id,
        JSON.stringify({ ...MUSANZE, ...form }),
      ])
    );

  it('needs the checklist again', async () => {
    expect((await resubmit({ forest_ha: '25' }, 'NULL'))?.message).toMatch(
      /Complete the data-quality checklist/
    );
  });

  it('refuses impossible corrected values', async () => {
    expect((await resubmit({ forest_ha: '-1' }, FULL_DECLARATION))?.message).toMatch(
      /cannot be below 0/
    );
  });

  it('accepts a valid correction and records new flags and declaration', async () => {
    expect(await resubmit({ forest_ha: '25' }, FULL_DECLARATION)).toBeNull();
    const r = await db.query<{ ws: string; by: string }>(
      `SELECT workflow_status AS ws, dqa_declaration->>'declared_by' AS by
       FROM public.toolkit_reports WHERE id = $1`,
      [id]
    );
    expect(r.rows[0]).toEqual({ ws: 'submitted', by: officer });
  });
});

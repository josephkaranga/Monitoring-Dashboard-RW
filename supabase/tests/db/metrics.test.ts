// @vitest-environment node
// ============================================================
// Migration 038 — headline metrics equal the sum over approved reports,
// whatever happens to a report afterwards (notes, revocation, deletion).
// ============================================================

import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import {
  asUser,
  createDatabase,
  createUser,
  grantScope,
  review,
  setRole,
  useSingleStage,
} from './harness';

let db: PGlite;
let reviewer: string;
let officer: string;
let admin: string;

async function forestTotal(): Promise<number> {
  const r = await db.query<{ v: string }>(
    `SELECT metric_value::text AS v FROM public.system_metrics WHERE metric_type = 'forest_ha_total'`
  );
  return Number(r.rows[0].v);
}

beforeAll(async () => {
  ({ db } = await createDatabase());
  reviewer = await createUser(db, 'rev@minagri.gov.rw');
  officer = await createUser(db, 'officer@musanze.gov.rw');
  admin = await createUser(db, 'admin@rema.gov.rw');
  await setRole(db, reviewer, 'lead_government_ministry_reporting');
  await setRole(db, officer, 'local_reporting');
  await setRole(db, admin, 'dashboard_management');
  // Scope rules (migration 039) are not under test here.
  await grantScope(db, officer, 'data_entry', 'District Authorities', 'Musanze');
  await grantScope(db, reviewer, 'ministry_validator', 'District Authorities', 'Musanze');
  await useSingleStage(db, 'ministry');
}, 180_000);

describe('system metrics (forest hectares)', () => {
  it('count an approved report once, through notes, revocation, reinstatement and deletion', async () => {
    const before = await forestTotal();

    const id = await asUser(db, officer, async tx => {
      const r = await tx.query<{ id: string }>(
        `INSERT INTO public.toolkit_reports (tool_id, tool_name, submitted_by, status, period, district, form_data)
         VALUES ('T02', 'District Biodiversity Monitoring', $1, 'pending', 'Q1 2027', 'Musanze',
                 '{"forest_ha": "120", "stakeholder": "District Authorities", "district": "Musanze"}'::jsonb)
         RETURNING id`,
        [officer]
      );
      return r.rows[0].id;
    });
    expect(await forestTotal()).toBe(before); // pending: not counted

    await review(db, reviewer, id, 'approve'); // single stage: publishes
    expect(await forestTotal()).toBe(before + 120);

    // Any later write to a published report (here by the service role) must
    // not add the figures again -- this inflated totals before 038.
    await db.query(`UPDATE public.toolkit_reports SET review_note = 'checked' WHERE id = $1`, [id]);
    await db.query(
      `UPDATE public.toolkit_reports SET review_note = 'checked again' WHERE id = $1`,
      [id]
    );
    expect(await forestTotal()).toBe(before + 120);

    await review(db, reviewer, id, 'return', 'withdrawn: figures to be checked');
    expect(await forestTotal()).toBe(before); // a withdrawn report no longer counts

    await asUser(db, officer, tx => tx.query(`SELECT public.resubmit_report($1)`, [id]));
    expect(await forestTotal()).toBe(before); // resubmitted is not published

    await review(db, reviewer, id, 'approve');
    expect(await forestTotal()).toBe(before + 120);

    await asUser(db, admin, tx =>
      tx.query(`DELETE FROM public.toolkit_reports WHERE id = $1`, [id])
    );
    expect(await forestTotal()).toBe(before);
  });

  it('lets only administrators force a recalculation', async () => {
    await expect(
      asUser(db, reviewer, tx => tx.query(`SELECT public.admin_recalculate_system_metrics()`))
    ).rejects.toThrow(/Only administrators/);
    const r = await asUser(db, admin, tx =>
      tx.query<{ t: string }>(`SELECT public.admin_recalculate_system_metrics() AS t`)
    );
    expect(r.rows[0].t).toMatch(/recalculated/i);
  });
});

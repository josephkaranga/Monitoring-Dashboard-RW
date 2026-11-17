// @vitest-environment node
// Migration 041 — dashboard stage filters: per-stage counts in the
// database, under each user's own access rules.
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import {
  asUser,
  createDatabase,
  createUser,
  FULL_DECLARATION,
  grantScope,
  review,
  setRole,
} from './harness';

let db: PGlite;
let musanze: string;
let huye: string;
let validator: string;
let viewer: string;

async function submit(user: string, district: string, period: string) {
  return asUser(db, user, async tx => {
    const r = await tx.query<{ id: string }>(
      `INSERT INTO public.toolkit_reports (tool_id, tool_name, submitted_by, status, period, district, form_data, dqa_declaration)
       VALUES ('T02', 'District', $1, 'pending', $2, $3, $4::jsonb, ${FULL_DECLARATION}) RETURNING id`,
      [user, period, district, JSON.stringify({ stakeholder: 'District Authorities', district })]
    );
    return r.rows[0].id;
  });
}

async function pipeline(user: string) {
  return asUser(db, user, async tx => {
    const r = await tx.query<{
      workflow_status: string;
      stage_code: string | null;
      reports: number;
    }>(
      `SELECT workflow_status, stage_code, reports FROM public.v_validation_pipeline ORDER BY 1, 2`
    );
    return r.rows;
  });
}

beforeAll(async () => {
  ({ db } = await createDatabase());
  musanze = await createUser(db, 'a@musanze.gov.rw');
  huye = await createUser(db, 'a@huye.gov.rw');
  validator = await createUser(db, 'v@musanze.gov.rw');
  viewer = await createUser(db, 'policy@minecofin.gov.rw');
  await setRole(db, musanze, 'local_reporting');
  await setRole(db, huye, 'local_reporting');
  await setRole(db, validator, 'local_reporting');
  await setRole(db, viewer, 'policy_monitoring');
  await grantScope(db, musanze, 'data_entry', 'District Authorities', 'Musanze');
  await grantScope(db, huye, 'data_entry', 'District Authorities', 'Huye');
  await grantScope(db, validator, 'district_validator', 'District Authorities', 'Musanze');

  const m1 = await submit(musanze, 'Musanze', 'Q1 2026');
  await submit(musanze, 'Musanze', 'Q2 2026');
  await submit(huye, 'Huye', 'Q1 2026');
  await review(db, validator, m1, 'approve'); // Musanze report moves on to REMA
}, 180_000);

describe('v_validation_pipeline', () => {
  it('counts reports per state and current stage', async () => {
    const rows = await pipeline(viewer); // national viewer: sees all
    expect(rows).toEqual([
      { workflow_status: 'in_validation', stage_code: 'rema', reports: 1 },
      { workflow_status: 'submitted', stage_code: 'district', reports: 2 },
    ]);
  });

  it('respects each user’s access: a Huye officer counts only what they can see', async () => {
    const rows = await pipeline(huye);
    expect(rows).toEqual([{ workflow_status: 'submitted', stage_code: 'district', reports: 1 }]);
  });
});

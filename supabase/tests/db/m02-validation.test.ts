// @vitest-environment node
// ============================================================
// M02 — Multi-level validation (migration 040)
// PDF "Done when": one report passes district, ministry, NISR, RLMUA and
// REMA, and can be returned at any stage. Progress changes only on
// publication.
// ============================================================

import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import {
  asUser,
  createDatabase,
  createUser,
  errorAsUser,
  grantScope,
  review,
  setRole,
} from './harness';

let db: PGlite;

let submitter: string; // REMA data entry
let districtVal: string; // district validator, Musanze
let institutionVal: string; // ministry/institution validator for REMA reports
let nisrVal: string;
let rlmuaVal: string; // base role local_reporting: reads only through the validator rule
let remaVerifier: string;
let sysAdmin: string; // dashboard_management, no validator scope

let indicatorId: number;
const TARGET = 1;
let periodSeq = 0;

const STAGES = ['district', 'ministry', 'nisr', 'rlmua', 'rema'] as const;
type StageCode = (typeof STAGES)[number];
const validatorFor = (code: StageCode) =>
  ({
    district: districtVal,
    ministry: institutionVal,
    nisr: nisrVal,
    rlmua: rlmuaVal,
    rema: remaVerifier,
  })[code];

/** A REMA report about Musanze, on a flagged indicator, with map evidence: passes all five stages. */
async function submitFullRoute(forestHa = 50): Promise<string> {
  periodSeq += 1;
  return asUser(db, submitter, async tx => {
    const r = await tx.query<{ id: string }>(
      `INSERT INTO public.toolkit_reports
         (tool_id, tool_name, submitted_by, status, period, district, nbsap_target_id, indicator_id,
          form_data, attachments, workflow_status)
       VALUES ('T02', 'District Biodiversity Monitoring', $1, 'pending', $2, 'Musanze', $3, $4, $5::jsonb, $6::jsonb,
               'published') -- a forged status: must be ignored
       RETURNING id`,
      [
        submitter,
        `Q${(periodSeq % 4) + 1} ${2030 + Math.floor(periodSeq / 4)}`,
        TARGET,
        indicatorId,
        JSON.stringify({ stakeholder: 'REMA', district: 'Musanze', forest_ha: String(forestHa) }),
        JSON.stringify([{ name: 'boundary.pdf', ext: 'pdf', size: 10, evidence_type: 'map_gis' }]),
      ]
    );
    return r.rows[0].id;
  });
}

async function state(id: string) {
  const r = await db.query<{
    workflow_status: string;
    status: string;
    stage: string | null;
    route: string[];
  }>(
    `SELECT r.workflow_status, r.status::text AS status, s.code AS stage,
            ARRAY(SELECT vs.code FROM unnest(r.route) WITH ORDINALITY u(id, n)
                  JOIN public.validation_stages vs ON vs.id = u.id ORDER BY u.n) AS route
     FROM public.toolkit_reports r LEFT JOIN public.validation_stages s ON s.id = r.current_stage_id
     WHERE r.id = $1`,
    [id]
  );
  return r.rows[0];
}

const progress = async () =>
  (await db.query<{ p: number }>(`SELECT public.compute_target_progress($1) AS p`, [TARGET]))
    .rows[0].p;
const forest = async () =>
  Number(
    (
      await db.query<{ v: string }>(
        `SELECT metric_value::text AS v FROM public.system_metrics WHERE metric_type = 'forest_ha_total'`
      )
    ).rows[0].v
  );

async function approveThrough(id: string, stages: readonly StageCode[]) {
  for (const code of stages) await review(db, validatorFor(code), id, 'approve');
}

beforeAll(async () => {
  ({ db } = await createDatabase());

  submitter = await createUser(db, 'focal@rema.gov.rw');
  districtVal = await createUser(db, 'validator@musanze.gov.rw');
  institutionVal = await createUser(db, 'validator@rema.gov.rw');
  nisrVal = await createUser(db, 'validator@nisr.gov.rw');
  rlmuaVal = await createUser(db, 'gis@rlmua.gov.rw');
  remaVerifier = await createUser(db, 'verifier@rema.gov.rw');
  sysAdmin = await createUser(db, 'sysadmin@rema.gov.rw');

  await setRole(db, submitter, 'local_reporting');
  await setRole(db, districtVal, 'local_reporting');
  await setRole(db, institutionVal, 'lead_government_ministry_reporting');
  await setRole(db, nisrVal, 'policy_monitoring');
  await setRole(db, rlmuaVal, 'local_reporting');
  await setRole(db, remaVerifier, 'lead_government_ministry_reporting');
  await setRole(db, sysAdmin, 'dashboard_management');

  await grantScope(db, submitter, 'data_entry', 'REMA');
  await grantScope(db, districtVal, 'district_validator', 'District Authorities', 'Musanze');
  await grantScope(db, institutionVal, 'ministry_validator', 'REMA');
  await grantScope(db, nisrVal, 'nisr_validator', 'NISR');
  await grantScope(db, rlmuaVal, 'rlmua_validator', 'NLA');
  await grantScope(db, remaVerifier, 'rema_verifier', 'REMA');

  const ind = await db.query<{ id: number }>(
    `SELECT id FROM public.indicators WHERE nbsap_target_id = $1 ORDER BY id LIMIT 1`,
    [TARGET]
  );
  indicatorId = ind.rows[0].id;
  await db.query(
    `UPDATE public.indicators SET requires_statistical_validation = TRUE WHERE id = $1`,
    [indicatorId]
  );
}, 180_000);

describe('Done when: one report passes district, ministry, NISR, RLMUA and REMA', () => {
  it('gets the five-stage route and starts at the district, whatever status the browser sent', async () => {
    const id = await submitFullRoute();
    expect(await state(id)).toEqual({
      workflow_status: 'submitted',
      status: 'pending',
      stage: 'district',
      route: [...STAGES],
    });
  });

  it('moves stage by stage; only the validator of the current stage can act', async () => {
    const id = await submitFullRoute();
    for (const [i, code] of STAGES.entries()) {
      // The validator of the NEXT stage cannot jump ahead.
      const next = STAGES[i + 1];
      if (next) {
        await expect(review(db, validatorFor(next), id, 'approve')).rejects.toThrow(
          /not a validator/
        );
      }
      expect((await state(id)).stage).toBe(code);
      await review(db, validatorFor(code), id, 'approve');
    }
    expect(await state(id)).toMatchObject({
      workflow_status: 'published',
      status: 'approved',
      stage: null,
    });
  });

  it('a system administrator without the REMA verifier scope cannot publish', async () => {
    const id = await submitFullRoute();
    await approveThrough(id, ['district', 'ministry', 'nisr', 'rlmua']);
    await expect(review(db, sysAdmin, id, 'approve')).rejects.toThrow(/not a validator/);
    expect((await state(id)).stage).toBe('rema');
  });
});

describe('Done when: progress changes only on publication', () => {
  it('target progress and headline metrics stay put through four approvals and move on publication', async () => {
    const id = await submitFullRoute(70);
    const p0 = await progress();
    const f0 = await forest();

    await approveThrough(id, ['district', 'ministry', 'nisr', 'rlmua']);
    expect(await progress()).toBe(p0);
    expect(await forest()).toBe(f0);

    await review(db, remaVerifier, id, 'approve', 'Verified against RBIS');
    expect(await progress()).toBeGreaterThan(p0);
    expect(await forest()).toBe(f0 + 70);

    // Withdrawing the publication takes it back out.
    await review(db, remaVerifier, id, 'return', 'Boundary file is outdated');
    expect(await progress()).toBe(p0);
    expect(await forest()).toBe(f0);
  });
});

describe('Done when: progress changes only on publication — the stored figure the dashboard reads', () => {
  const stored = async () =>
    (
      await db.query<{ p: number }>(
        `SELECT progress AS p FROM public.nbsap_targets WHERE id = $1`,
        [TARGET]
      )
    ).rows[0].p;

  it('nbsap_targets.progress moves once on publication, back on withdrawal, once again on republication', async () => {
    const id = await submitFullRoute(10);
    const s0 = await stored();

    await approveThrough(id, ['district', 'ministry', 'nisr', 'rlmua']);
    expect(await stored()).toBe(s0);

    await review(db, remaVerifier, id, 'approve');
    const s1 = await stored();
    expect(s1).toBeGreaterThan(s0);

    // Later writes to a published report (service role) add nothing.
    await db.query(`UPDATE public.toolkit_reports SET review_note = 'checked' WHERE id = $1`, [id]);
    expect(await stored()).toBe(s1);

    await review(db, remaVerifier, id, 'return', 'Recheck');
    expect(await stored()).toBe(s0);

    await asUser(db, submitter, tx => tx.query(`SELECT public.resubmit_report($1)`, [id]));
    await approveThrough(id, [...STAGES]);
    expect(await stored()).toBe(s1); // not s1 + another step
  });
});

describe('Done when: a report can be returned at any stage', () => {
  for (const [i, code] of STAGES.entries()) {
    it(`returned at the ${code} stage goes back to the submitter, then restarts from the first stage`, async () => {
      const id = await submitFullRoute();
      await approveThrough(id, STAGES.slice(0, i));
      await review(db, validatorFor(code), id, 'return', `Please fix (${code})`);

      const r = await db.query<{ ws: string; returned_at: string; note: string }>(
        `SELECT r.workflow_status AS ws, s.code AS returned_at, r.review_note AS note
         FROM public.toolkit_reports r JOIN public.validation_stages s ON s.id = r.returned_at_stage_id
         WHERE r.id = $1`,
        [id]
      );
      expect(r.rows[0]).toEqual({
        ws: 'returned',
        returned_at: code,
        note: `Please fix (${code})`,
      });

      // Nobody can approve a returned report; the submitter corrects and resubmits.
      await expect(review(db, validatorFor(code), id, 'approve')).rejects.toThrow(/returned/);
      await asUser(db, submitter, tx =>
        tx.query(`SELECT public.resubmit_report($1, $2::jsonb, NULL, 'Corrected')`, [
          id,
          JSON.stringify({ stakeholder: 'REMA', district: 'Musanze', forest_ha: '55' }),
        ])
      );
      expect(await state(id)).toMatchObject({ workflow_status: 'submitted', stage: 'district' });
    });
  }

  it('returning or rejecting needs a reason', async () => {
    const id = await submitFullRoute();
    await expect(review(db, districtVal, id, 'return')).rejects.toThrow(/note is required/);
    await expect(review(db, districtVal, id, 'reject', '  ')).rejects.toThrow(/note is required/);
  });

  it('only the submitter resubmits, and cannot move the report to another institution or district', async () => {
    const id = await submitFullRoute();
    await review(db, districtVal, id, 'return', 'Missing data');
    await expect(
      asUser(db, districtVal, tx => tx.query(`SELECT public.resubmit_report($1)`, [id]))
    ).rejects.toThrow(/Only the person who submitted/);
    await expect(
      asUser(db, submitter, tx =>
        tx.query(`SELECT public.resubmit_report($1, $2::jsonb)`, [
          id,
          JSON.stringify({ stakeholder: 'REMA', district: 'Huye' }),
        ])
      )
    ).rejects.toThrow(/cannot change/);
  });
});

describe('history and integrity', () => {
  it('records who did what at which stage, with the note, and cannot be altered', async () => {
    const id = await submitFullRoute();
    await review(db, districtVal, id, 'approve', 'District figures match');
    await review(db, institutionVal, id, 'return', 'Attach the field sheet');

    const h = await db.query<{
      action: string;
      to_status: string;
      stage: string | null;
      note: string | null;
      actor: string;
    }>(
      `SELECT h.action, h.to_status, s.code AS stage, h.note, h.actor
       FROM public.report_status_history h LEFT JOIN public.validation_stages s ON s.id = h.stage_id
       WHERE h.report_id = $1 ORDER BY h.id`,
      [id]
    );
    expect(h.rows).toEqual([
      { action: 'submit', to_status: 'submitted', stage: null, note: null, actor: submitter },
      {
        action: 'approve',
        to_status: 'in_validation',
        stage: 'district',
        note: 'District figures match',
        actor: districtVal,
      },
      {
        action: 'return',
        to_status: 'returned',
        stage: 'ministry',
        note: 'Attach the field sheet',
        actor: institutionVal,
      },
    ]);

    await expect(
      db.query(`UPDATE public.report_status_history SET note = 'edited'`)
    ).rejects.toThrow(/append-only/);
    await expect(
      db.query(`DELETE FROM public.report_status_history WHERE report_id = $1`, [id])
    ).rejects.toThrow(/append-only/);
  });

  it('users cannot change reports directly, only through the workflow functions', async () => {
    const id = await submitFullRoute();
    const err = await errorAsUser(db, remaVerifier, tx =>
      tx.query(`UPDATE public.toolkit_reports SET workflow_status = 'published' WHERE id = $1`, [
        id,
      ])
    );
    expect(err?.message).toMatch(/permission denied/i);
    expect((await state(id)).workflow_status).toBe('submitted');
  });

  it('a validator reads the reports routed through their stage, and no others', async () => {
    const routed = await submitFullRoute();
    // A REMA report without map evidence never reaches RLMUA.
    const notRouted = await asUser(db, submitter, async tx => {
      const r = await tx.query<{ id: string }>(
        `INSERT INTO public.toolkit_reports (tool_id, tool_name, submitted_by, status, period, form_data)
         VALUES ('T01', 'National Institutional Reporting', $1, 'pending', 'Q4 2040', '{"stakeholder":"REMA"}')
         RETURNING id`,
        [submitter]
      );
      return r.rows[0].id;
    });
    expect((await state(notRouted)).route).toEqual(['ministry', 'rema']);

    const seen = await asUser(db, rlmuaVal, async tx =>
      (await tx.query<{ id: string }>(`SELECT id FROM public.toolkit_reports`)).rows.map(x => x.id)
    );
    expect(seen).toContain(routed);
    expect(seen).not.toContain(notRouted);
  });
});

describe('the route is configuration (Decision 3)', () => {
  it('administrators change stages; new reports follow the new route', async () => {
    await asUser(db, sysAdmin, tx =>
      tx.query(`UPDATE public.validation_stages SET is_active = FALSE WHERE code = 'nisr'`)
    );
    const id = await submitFullRoute();
    expect((await state(id)).route).toEqual(['district', 'ministry', 'rlmua', 'rema']);
    await asUser(db, sysAdmin, tx =>
      tx.query(`UPDATE public.validation_stages SET is_active = TRUE WHERE code = 'nisr'`)
    );
  });

  it('nobody else can change the route', async () => {
    await asUser(db, remaVerifier, tx =>
      tx.query(`UPDATE public.validation_stages SET is_active = FALSE WHERE code = 'rema'`)
    );
    const r = await db.query<{ a: boolean }>(
      `SELECT is_active AS a FROM public.validation_stages WHERE code = 'rema'`
    );
    expect(r.rows[0].a).toBe(true);
  });

  it('a submitter cannot unflag an indicator to skip NISR sign-off (only administrators edit indicators)', async () => {
    await asUser(db, submitter, tx =>
      tx.query(
        `UPDATE public.indicators SET requires_statistical_validation = FALSE WHERE id = $1`,
        [indicatorId]
      )
    );
    const r = await db.query<{ f: boolean }>(
      `SELECT requires_statistical_validation AS f FROM public.indicators WHERE id = $1`,
      [indicatorId]
    );
    expect(r.rows[0].f).toBe(true);
    // ...and the route still includes NISR.
    expect((await state(await submitFullRoute())).route).toContain('nisr');
  });

  it('validator scopes go to the right institution', async () => {
    const u = await createUser(db, 'wrong@rema.gov.rw');
    await setRole(db, u, 'lead_government_ministry_reporting');
    await expect(grantScope(db, u, 'rlmua_validator', 'REMA')).rejects.toThrow(/NLA staff only/);
    await expect(grantScope(db, u, 'district_validator', 'MINAGRI')).rejects.toThrow(
      /District Authorities/
    );
  });
});

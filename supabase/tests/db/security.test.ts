// @vitest-environment node
// ============================================================
// Security annex (Nov 2026) — verified against a real PostgreSQL
// with every migration applied, acting as each signed-in role.
// Run: npm run test:db
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
  useSingleStage,
  type AppliedMigration,
} from './harness';

let db: PGlite;
let applied: AppliedMigration[];

// Users
let admin: string; // dashboard_management (REMA administrator)
let admin2: string; // second administrator
let ministry: string; // lead_government_ministry_reporting (reviewer)
let ministry2: string; // second reviewer
let district: string; // local_reporting (data entry)
let viewer: string; // public_viewer

let periodSeq = 0;

/** Insert a report as `userId` through RLS, like the browser does. Returns its id. */
async function submitAs(userId: string, status = 'pending'): Promise<string> {
  const period = `Q${(periodSeq % 4) + 1} ${2027 + Math.floor(periodSeq / 4)}`;
  periodSeq += 1;
  return asUser(db, userId, async tx => {
    const r = await tx.query<{ id: string }>(
      `INSERT INTO public.toolkit_reports (tool_id, tool_name, submitted_by, status, period, district, form_data)
       VALUES ('T02', 'District Biodiversity Monitoring', $1, $2::submission_status, $3, 'Musanze',
               '{"x":1, "stakeholder": "District Authorities", "district": "Musanze"}'::jsonb)
       RETURNING id`,
      [userId, status, period]
    );
    return r.rows[0].id;
  });
}

async function reportRow(id: string) {
  const r = await db.query<{ status: string; reviewed_by: string | null; form_data: unknown }>(
    `SELECT status::text, reviewed_by, form_data FROM public.toolkit_reports WHERE id = $1`,
    [id]
  );
  return r.rows[0];
}

beforeAll(async () => {
  ({ db, applied } = await createDatabase());

  admin = await createUser(db, 'admin@rema.gov.rw');
  admin2 = await createUser(db, 'admin2@rema.gov.rw');
  ministry = await createUser(db, 'reviewer@minagri.gov.rw');
  ministry2 = await createUser(db, 'reviewer2@moe.gov.rw');
  district = await createUser(db, 'officer@musanze.gov.rw');
  viewer = await createUser(db, 'viewer@example.org');

  await setRole(db, admin, 'dashboard_management');
  await setRole(db, admin2, 'dashboard_management');
  await setRole(db, ministry, 'lead_government_ministry_reporting');
  await setRole(db, ministry2, 'lead_government_ministry_reporting');
  await setRole(db, district, 'local_reporting');
  await setRole(db, viewer, 'public_viewer');

  // M01 (039): submitting and reviewing need a scope. Everyone here works on
  // Musanze district reports, so the security rules are tested in isolation.
  for (const u of [ministry, ministry2, district]) {
    await grantScope(db, u, 'data_entry', 'District Authorities', 'Musanze');
  }
  for (const u of [ministry, ministry2]) {
    await grantScope(db, u, 'ministry_validator', 'District Authorities', 'Musanze');
  }
  // M02 (040): one stage, so a single review publishes and the security
  // rules are tested on their own. The full route is tested in m02-validation.
  await useSingleStage(db, 'ministry');
}, 180_000);

describe('migrations', () => {
  it('all migrations apply to an empty database', () => {
    const failed = applied.filter(a => !a.ok);
    expect(failed).toEqual([]);
    expect(applied.map(a => a.file)).toContain('037_security_hardening.sql');
  });
});

describe('C1 — sign-up cannot choose a role', () => {
  it('a sign-up asking for REMA Administrator gets public_viewer and an inactive account', async () => {
    const id = await createUser(db, 'attacker@example.org', {
      full_name: 'Attacker',
      role: 'dashboard_management',
    });
    const r = await db.query<{ role: string; is_active: boolean; full_name: string }>(
      `SELECT role::text, is_active, full_name FROM public.profiles WHERE id = $1`,
      [id]
    );
    expect(r.rows[0]).toEqual({ role: 'public_viewer', is_active: false, full_name: 'Attacker' });
  });
});

describe('C2 — users cannot change their own role or account status', () => {
  it('rejects a user raising their own role', async () => {
    const err = await errorAsUser(db, district, tx =>
      tx.query(`UPDATE public.profiles SET role = 'dashboard_management' WHERE id = $1`, [district])
    );
    expect(err?.code).toBe('42501');
  });

  it('rejects a user reactivating their own account', async () => {
    const pending = await createUser(db, 'pending@example.org');
    const err = await errorAsUser(db, pending, tx =>
      tx.query(`UPDATE public.profiles SET is_active = true WHERE id = $1`, [pending])
    );
    expect(err?.code).toBe('42501');
  });

  it('still lets a user edit their own name', async () => {
    const err = await errorAsUser(db, district, tx =>
      tx.query(`UPDATE public.profiles SET full_name = 'District Officer' WHERE id = $1`, [
        district,
      ])
    );
    expect(err).toBeNull();
  });

  it('lets an administrator change another user’s role', async () => {
    const target = await createUser(db, 'promote@example.org');
    await asUser(db, admin, tx =>
      tx.query(
        `UPDATE public.profiles SET role = 'local_reporting', is_active = true WHERE id = $1`,
        [target]
      )
    );
    const r = await db.query<{ role: string; is_active: boolean }>(
      `SELECT role::text, is_active FROM public.profiles WHERE id = $1`,
      [target]
    );
    expect(r.rows[0]).toEqual({ role: 'local_reporting', is_active: true });
  });

  it('rejects an administrator changing their own role', async () => {
    const err = await errorAsUser(db, admin, tx =>
      tx.query(`UPDATE public.profiles SET role = 'policy_monitoring' WHERE id = $1`, [admin])
    );
    expect(err?.code).toBe('42501');
  });

  it('lets a user clear their own suspension only after it has expired', async () => {
    const u = await createUser(db, 'suspended@example.org');
    await setRole(db, u, 'local_reporting');
    await db.query(
      `UPDATE public.profiles SET suspended_at = now() - interval '10 days', suspended_by = $2,
         suspension_reason = 'test', suspension_end_date = now() + interval '5 days' WHERE id = $1`,
      [u, admin]
    );
    const clear = (tx: Parameters<Parameters<typeof asUser>[2]>[0]) =>
      tx.query(
        `UPDATE public.profiles SET suspended_at = NULL, suspended_by = NULL,
           suspension_reason = NULL, suspension_end_date = NULL WHERE id = $1`,
        [u]
      );
    expect((await errorAsUser(db, u, clear))?.code).toBe('42501');

    await db.query(
      `UPDATE public.profiles SET suspension_end_date = now() - interval '1 day' WHERE id = $1`,
      [u]
    );
    expect(await errorAsUser(db, u, clear)).toBeNull();
  });
});

describe('H1 — approvers have limits', () => {
  it('a submitter cannot insert a report that is already approved', async () => {
    const err = await errorAsUser(db, ministry, tx =>
      tx.query(
        `INSERT INTO public.toolkit_reports (tool_id, tool_name, submitted_by, status, period)
         VALUES ('T01', 'National Institutional Reporting', $1, 'approved', 'Q1 2030')`,
        [ministry]
      )
    );
    expect(err?.message).toMatch(/row-level security/i);
  });

  it('a reviewer cannot approve their own submission', async () => {
    const id = await submitAs(ministry);
    await expect(review(db, ministry, id, 'approve')).rejects.toThrow(/own submission/);
    expect((await reportRow(id)).status).toBe('pending');
  });

  it('an administrator cannot approve their own submission', async () => {
    const id = await submitAs(admin);
    await expect(review(db, admin, id, 'approve')).rejects.toThrow(/own submission/);
    expect((await reportRow(id)).status).toBe('pending');
  });

  it('a reviewer approves someone else’s report and the database records who did it', async () => {
    const id = await submitAs(district);
    // Recording someone else as reviewer is impossible: users cannot UPDATE reports at all.
    expect(
      await errorAsUser(db, ministry, tx =>
        tx.query(`UPDATE public.toolkit_reports SET reviewed_by = $2 WHERE id = $1`, [id, admin])
      )
    ).not.toBeNull();
    await review(db, ministry, id, 'approve', 'ok');
    const row = await reportRow(id);
    expect(row.status).toBe('approved');
    expect(row.reviewed_by).toBe(ministry);
  });

  it('a reviewer cannot change the submitted data', async () => {
    const id = await submitAs(district);
    const err = await errorAsUser(db, ministry, tx =>
      tx.query(`UPDATE public.toolkit_reports SET form_data = '{"x":999}'::jsonb WHERE id = $1`, [
        id,
      ])
    );
    expect(err?.message).toMatch(/permission denied/i);
    expect((await reportRow(id)).form_data).toMatchObject({ x: 1 });
  });

  it('a data-entry user cannot update any report (013 "link reports" policy removed)', async () => {
    const id = await submitAs(ministry2);
    expect(
      await errorAsUser(db, district, tx =>
        tx.query(`UPDATE public.toolkit_reports SET status = 'approved' WHERE id = $1`, [id])
      )
    ).not.toBeNull();
    await expect(review(db, district, id, 'approve')).rejects.toThrow(/not a validator/);
    expect((await reportRow(id)).status).toBe('pending');
  });
});

describe('H2 — public viewer reads approved reports only', () => {
  it('returns no pending or rejected reports', async () => {
    const pending = await submitAs(district);
    const rejected = await submitAs(district);
    const approved = await submitAs(district);
    await review(db, ministry, rejected, 'reject', 'no');
    await review(db, ministry, approved, 'approve');

    const seen = await asUser(db, viewer, async tx => {
      const r = await tx.query<{ id: string; status: string }>(
        `SELECT id, status::text FROM public.toolkit_reports`
      );
      return r.rows;
    });
    const ids = seen.map(r => r.id);
    expect(ids).toContain(approved);
    expect(ids).not.toContain(pending);
    expect(ids).not.toContain(rejected);
    expect(new Set(seen.map(r => r.status))).toEqual(new Set(['approved']));
  });
});

describe('H3 — audit log is written by the database and append-only', () => {
  it('a signed-in user cannot insert into audit_log directly', async () => {
    const err = await errorAsUser(db, district, tx =>
      tx.query(
        `INSERT INTO public.audit_log (user_id, action_type, action, role) VALUES ($1, 'approve', 'forged', 'dashboard_management')`,
        [admin]
      )
    );
    expect(err?.message).toMatch(/permission denied/i);
  });

  it('log_audit_event records the real user and role, whatever the caller claims', async () => {
    await asUser(db, district, tx =>
      tx.query(`SELECT public.log_audit_event('export_data_csv', 'Exported CSV', '{"rows":10}')`)
    );
    const r = await db.query<{ user_id: string; role: string; source: string }>(
      `SELECT user_id, role, source FROM public.audit_log WHERE action_type = 'export_data_csv' ORDER BY created_at DESC LIMIT 1`
    );
    expect(r.rows[0]).toEqual({ user_id: district, role: 'local_reporting', source: 'client' });
  });

  it('log_audit_event refuses anonymous callers and malformed action types', async () => {
    expect(
      await errorAsUser(db, null, tx => tx.query(`SELECT public.log_audit_event('x', 'y')`))
    ).not.toBeNull();
    expect(
      (
        await errorAsUser(db, district, tx =>
          tx.query(`SELECT public.log_audit_event('DROP TABLE;', 'y')`)
        )
      )?.code
    ).toBe('22023');
  });

  it('a status change is recorded with who did it and the previous value', async () => {
    const id = await submitAs(district);
    await review(db, ministry2, id, 'approve');
    const r = await db.query<{
      user_id: string;
      action_type: string;
      old_values: { status: string };
      new_values: { status: string };
    }>(
      `SELECT user_id, action_type, old_values, new_values FROM public.audit_log
       WHERE table_name = 'toolkit_reports' AND record_id = $1 AND action_type = 'approve'`,
      [id]
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].user_id).toBe(ministry2);
    expect(r.rows[0].old_values.status).toBe('pending');
    expect(r.rows[0].new_values.status).toBe('approved');
  });

  it('a role change is recorded with the previous role', async () => {
    const target = await createUser(db, 'rolechange@example.org');
    await asUser(db, admin2, tx =>
      tx.query(`UPDATE public.profiles SET role = 'policy_monitoring' WHERE id = $1`, [target])
    );
    const r = await db.query<{
      user_id: string;
      old_values: { role: string };
      new_values: { role: string };
    }>(
      `SELECT user_id, old_values, new_values FROM public.audit_log
       WHERE table_name = 'profiles' AND record_id = $1 AND action_type = 'role_updated'`,
      [target]
    );
    expect(r.rows[0]).toEqual({
      user_id: admin2,
      old_values: { role: 'public_viewer' },
      new_values: { role: 'policy_monitoring' },
    });
  });

  it('nobody can edit or delete audit rows, not even the database owner', async () => {
    await expect(db.query(`UPDATE public.audit_log SET action = 'edited'`)).rejects.toThrow(
      /append-only/
    );
    await expect(db.query(`DELETE FROM public.audit_log`)).rejects.toThrow(/append-only/);
    await expect(db.query(`TRUNCATE public.audit_log`)).rejects.toThrow(/append-only/);
  });

  it('deleting a user keeps their audit rows (user_id set to NULL)', async () => {
    const u = await createUser(db, 'leaver@example.org');
    await setRole(db, u, 'local_reporting');
    await asUser(db, u, tx => tx.query(`SELECT public.log_audit_event('login', 'User signed in')`));
    const before = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM public.audit_log WHERE user_id = $1`,
      [u]
    );
    expect(before.rows[0].n).toBeGreaterThan(0);

    await db.query(`DELETE FROM auth.users WHERE id = $1`, [u]);
    const after = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM public.audit_log WHERE record_id = $1 OR (action_type = 'login' AND user_id IS NULL)`,
      [u]
    );
    expect(after.rows[0].n).toBeGreaterThan(0);
  });
});

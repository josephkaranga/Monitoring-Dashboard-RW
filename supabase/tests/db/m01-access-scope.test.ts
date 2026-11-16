// @vitest-environment node
// ============================================================
// M01 — Institutions and access scope (migration 039)
// PDF "Done when": a district officer sees only their district;
// a ministry validator acts only on their institution.
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
} from './harness';

let db: PGlite;

let admin: string;
let musanzeOfficer: string; // data entry, District Authorities / Musanze
let huyeOfficer: string; // data entry, District Authorities / Huye
let minagriEntry: string; // data entry, MINAGRI (ministry account)
let minagriValidator: string; // ministry validator, MINAGRI
let moeEntry: string; // data entry, MoE
let minagriAdmin: string; // institution admin, MINAGRI

let periodSeq = 0;
const nextPeriod = () => {
  periodSeq += 1;
  return `Q${(periodSeq % 4) + 1} ${2027 + Math.floor(periodSeq / 4)}`;
};

async function submit(userId: string, stakeholder: string, district?: string): Promise<string> {
  return asUser(db, userId, async tx => {
    const r = await tx.query<{ id: string }>(
      `INSERT INTO public.toolkit_reports
         (tool_id, tool_name, submitted_by, status, period, district, institution, form_data,
          institution_id, district_id)
       VALUES ('T01', 'National Institutional Reporting', $1, 'pending', $2, $3, $4, $5::jsonb,
               999999, 999999) -- forged columns: must be ignored
       RETURNING id`,
      [
        userId,
        nextPeriod(),
        district ?? null,
        district ?? stakeholder,
        JSON.stringify({ stakeholder, ...(district ? { district } : {}) }),
      ]
    );
    return r.rows[0].id;
  });
}

async function visibleIds(userId: string): Promise<string[]> {
  return asUser(db, userId, async tx => {
    const r = await tx.query<{ id: string }>(`SELECT id FROM public.toolkit_reports`);
    return r.rows.map(x => x.id);
  });
}

async function status(id: string): Promise<string> {
  const r = await db.query<{ s: string }>(
    `SELECT status::text AS s FROM public.toolkit_reports WHERE id = $1`,
    [id]
  );
  return r.rows[0].s;
}

beforeAll(async () => {
  ({ db } = await createDatabase());

  admin = await createUser(db, 'admin@rema.gov.rw');
  musanzeOfficer = await createUser(db, 'env@musanze.gov.rw');
  huyeOfficer = await createUser(db, 'env@huye.gov.rw');
  minagriEntry = await createUser(db, 'focal@minagri.gov.rw');
  minagriValidator = await createUser(db, 'validator@minagri.gov.rw');
  moeEntry = await createUser(db, 'focal@moe.gov.rw');
  minagriAdmin = await createUser(db, 'admin@minagri.gov.rw');

  await setRole(db, admin, 'dashboard_management');
  await setRole(db, musanzeOfficer, 'local_reporting');
  await setRole(db, huyeOfficer, 'local_reporting');
  await setRole(db, minagriEntry, 'lead_government_ministry_reporting');
  await setRole(db, minagriValidator, 'lead_government_ministry_reporting');
  await setRole(db, moeEntry, 'lead_government_ministry_reporting');
  await setRole(db, minagriAdmin, 'policy_monitoring');

  await grantScope(db, musanzeOfficer, 'data_entry', 'District Authorities', 'Musanze');
  await grantScope(db, huyeOfficer, 'data_entry', 'District Authorities', 'Huye');
  await grantScope(db, minagriEntry, 'data_entry', 'MINAGRI');
  await grantScope(db, minagriValidator, 'ministry_validator', 'MINAGRI');
  await grantScope(db, moeEntry, 'data_entry', 'MoE');
  await grantScope(db, minagriAdmin, 'institution_admin', 'MINAGRI');
  // M02 (040): a single ministry stage isolates the scope rules under test.
  await useSingleStage(db, 'ministry');
}, 180_000);

describe('reference data moved from the frontend', () => {
  it('seeds 88 institutions, each in a valid category, codes matching target responsibilities', async () => {
    const r = await db.query<{ n: number; districts: number }>(
      `SELECT count(*)::int AS n, count(*) FILTER (WHERE covers_all_districts)::int AS districts FROM public.institutions`
    );
    expect(r.rows[0]).toEqual({ n: 88, districts: 1 });

    // Every stakeholder code used by nbsap_targets resolves to an institution.
    const missing = await db.query<{ code: string }>(
      `SELECT DISTINCT unnest(responsible_stakeholders) AS code FROM public.nbsap_targets
       EXCEPT SELECT code FROM public.institutions`
    );
    expect(missing.rows.map(x => x.code)).toEqual([]);
  });

  it('seeds the 101 NBSAP strategic actions with their responsible institutions', async () => {
    const r = await db.query<{ actions: number; links: number; linked: number }>(
      `SELECT (SELECT count(*)::int FROM public.nbsap_strategic_actions) AS actions,
              count(*)::int AS links, count(institution_id)::int AS linked
       FROM public.strategic_action_institutions`
    );
    expect(r.rows[0].actions).toBe(101);
    expect(r.rows[0].links).toBe(532);
    expect(r.rows[0].linked).toBeGreaterThan(500); // generic groups ("NGOs", "Media") stay text
  });

  it('gives the sign-up form institutions and districts without signing in', async () => {
    const r = await asUser(db, null, tx =>
      tx.query<{ o: { institutions: unknown[]; districts: unknown[] } }>(
        `SELECT public.signup_options() AS o`
      )
    );
    expect(r.rows[0].o.institutions).toHaveLength(88);
    expect(r.rows[0].o.districts).toHaveLength(30);
  });
});

describe('Done when: a district officer sees only their district', () => {
  it('a Musanze officer sees Musanze reports and their own, not Huye', async () => {
    const musanze = await submit(musanzeOfficer, 'District Authorities', 'Musanze');
    const huye = await submit(huyeOfficer, 'District Authorities', 'Huye');

    const seenByMusanze = await visibleIds(musanzeOfficer);
    expect(seenByMusanze).toContain(musanze);
    expect(seenByMusanze).not.toContain(huye);

    const seenByHuye = await visibleIds(huyeOfficer);
    expect(seenByHuye).toContain(huye);
    expect(seenByHuye).not.toContain(musanze);
  });

  it('cannot submit for another district or another institution', async () => {
    expect(
      (
        await errorAsUser(db, musanzeOfficer, tx =>
          tx.query(
            `INSERT INTO public.toolkit_reports (tool_id, tool_name, submitted_by, status, period, district, form_data)
           VALUES ('T02', 'District', $1, 'pending', 'Q1 2031', 'Huye', '{"stakeholder":"District Authorities","district":"Huye"}')`,
            [musanzeOfficer]
          )
        )
      )?.message
    ).toMatch(/row-level security/i);
    expect(
      (
        await errorAsUser(db, musanzeOfficer, tx =>
          tx.query(
            `INSERT INTO public.toolkit_reports (tool_id, tool_name, submitted_by, status, period, form_data)
           VALUES ('T01', 'National', $1, 'pending', 'Q2 2031', '{"stakeholder":"MINAGRI"}')`,
            [musanzeOfficer]
          )
        )
      )?.message
    ).toMatch(/row-level security/i);
  });

  it('the database sets institution and district; forged values are ignored', async () => {
    const id = await submit(musanzeOfficer, 'District Authorities', 'Musanze');
    const r = await db.query<{ code: string; district: string }>(
      `SELECT i.code, d.name AS district FROM public.toolkit_reports r
       JOIN public.institutions i ON i.id = r.institution_id
       JOIN public.districts d ON d.id = r.district_id WHERE r.id = $1`,
      [id]
    );
    expect(r.rows[0]).toEqual({ code: 'District Authorities', district: 'Musanze' });
  });
});

describe('Done when: a ministry validator acts only on their institution', () => {
  it('approves a MINAGRI report but cannot touch an MoE report', async () => {
    const minagriReport = await submit(minagriEntry, 'MINAGRI');
    const moeReport = await submit(moeEntry, 'MoE');

    await review(db, minagriValidator, minagriReport, 'approve');
    await expect(review(db, minagriValidator, moeReport, 'approve')).rejects.toThrow(
      /not a validator/
    );

    expect(await status(minagriReport)).toBe('approved');
    expect(await status(moeReport)).toBe('pending');
  });

  it('a ministry account without a validator scope cannot approve anything', async () => {
    const id = await submit(minagriEntry, 'MINAGRI');
    await expect(review(db, moeEntry, id, 'approve')).rejects.toThrow(/not a validator/);
    expect(await status(id)).toBe('pending');
  });

  it('a system administrator without a validator scope cannot approve data (PDF target roles)', async () => {
    const id = await submit(moeEntry, 'MoE');
    await expect(review(db, admin, id, 'approve')).rejects.toThrow(/not a validator/);
    expect(await status(id)).toBe('pending');
  });
});

describe('scopes are granted only by administrators', () => {
  it('a user cannot grant themselves a scope, nor can anyone grant their own', async () => {
    const asSelf = await errorAsUser(db, moeEntry, tx =>
      tx.query(
        `INSERT INTO public.user_scopes (user_id, scope_role, institution_id)
         SELECT $1, 'ministry_validator', id FROM public.institutions WHERE code = 'MoE'`,
        [moeEntry]
      )
    );
    expect(asSelf).not.toBeNull();

    const adminSelf = await errorAsUser(db, admin, tx =>
      tx.query(
        `INSERT INTO public.user_scopes (user_id, scope_role, institution_id)
         SELECT $1, 'institution_admin', id FROM public.institutions WHERE code = 'REMA'`,
        [admin]
      )
    );
    expect(adminSelf?.message).toMatch(/themselves/);
  });

  it('rejects scopes that do not fit the account or the institution', async () => {
    const viewerOnly = await createUser(db, 'viewer@moe.gov.rw');
    await setRole(db, viewerOnly, 'policy_monitoring');
    expect(
      (
        await errorAsUser(db, admin, tx =>
          tx.query(
            `INSERT INTO public.user_scopes (user_id, scope_role, institution_id)
           SELECT $1, 'data_entry', id FROM public.institutions WHERE code = 'MoE'`,
            [viewerOnly]
          )
        )
      )?.message
    ).toMatch(/reporting account/);
    expect(
      (
        await errorAsUser(db, admin, tx =>
          tx.query(
            `INSERT INTO public.user_scopes (user_id, scope_role, institution_id)
           SELECT $1, 'data_entry', id FROM public.institutions WHERE code = 'District Authorities'`,
            [musanzeOfficer]
          )
        )
      )?.message
    ).toMatch(/choose the district/);
  });

  it('every grant is in the audit log with who granted it', async () => {
    const u = await createUser(db, 'new.validator@moe.gov.rw');
    await setRole(db, u, 'lead_government_ministry_reporting');
    await asUser(db, admin, tx =>
      tx.query(
        `INSERT INTO public.user_scopes (user_id, scope_role, institution_id)
         SELECT $1, 'ministry_validator', id FROM public.institutions WHERE code = 'MoE'`,
        [u]
      )
    );
    const r = await db.query<{ user_id: string; granted_by: string }>(
      `SELECT user_id, new_values->>'granted_by' AS granted_by FROM public.audit_log
       WHERE table_name = 'user_scopes' AND new_values->>'user_id' = $1`,
      [u]
    );
    expect(r.rows[0]).toEqual({ user_id: admin, granted_by: admin });
  });
});

describe('institution administrators manage their own institution', () => {
  it('sign-up records the requested institution, but grants nothing', async () => {
    const id = await createUser(db, 'new.staff@minagri.gov.rw', {
      full_name: 'New Staff',
      institution_code: 'MINAGRI',
      role: 'dashboard_management',
    });
    const r = await db.query<{
      role: string;
      is_active: boolean;
      organization: string;
      scopes: number;
    }>(
      `SELECT role::text, is_active, organization,
              (SELECT count(*)::int FROM public.user_scopes WHERE user_id = p.id) AS scopes
       FROM public.profiles p WHERE id = $1`,
      [id]
    );
    expect(r.rows[0]).toEqual({
      role: 'public_viewer',
      is_active: false,
      organization: 'Ministry of Agriculture and Animal Resources',
      scopes: 0,
    });
  });

  it('the MINAGRI admin sees MINAGRI applicants and approves one as data entry', async () => {
    const applicant = await createUser(db, 'applicant@minagri.gov.rw', {
      institution_code: 'MINAGRI',
    });
    const outsider = await createUser(db, 'applicant@moe.gov.rw', { institution_code: 'MoE' });

    const seen = await asUser(db, minagriAdmin, async tx =>
      (await tx.query<{ id: string }>(`SELECT id FROM public.profiles`)).rows.map(x => x.id)
    );
    expect(seen).toContain(applicant);
    expect(seen).not.toContain(outsider);

    await asUser(db, minagriAdmin, tx =>
      tx.query(`SELECT public.approve_institution_member($1, 'data_entry')`, [applicant])
    );
    const r = await db.query<{ role: string; is_active: boolean; scope: string }>(
      `SELECT p.role::text, p.is_active, i.code AS scope FROM public.profiles p
       JOIN public.user_scopes s ON s.user_id = p.id AND s.scope_role = 'data_entry'
       JOIN public.institutions i ON i.id = s.institution_id WHERE p.id = $1`,
      [applicant]
    );
    expect(r.rows[0]).toEqual({ role: 'local_reporting', is_active: true, scope: 'MINAGRI' });

    // ...and the new member can now submit for MINAGRI only.
    expect(await submit(applicant, 'MINAGRI')).toBeTruthy();
  });

  it('cannot approve people from another institution, promote anyone, or act on themselves', async () => {
    const outsider = await createUser(db, 'other@moe.gov.rw', { institution_code: 'MoE' });
    expect(
      (
        await errorAsUser(db, minagriAdmin, tx =>
          tx.query(`SELECT public.approve_institution_member($1, 'data_entry')`, [outsider])
        )
      )?.code
    ).toBe('42501');

    expect(
      (
        await errorAsUser(db, minagriAdmin, tx =>
          tx.query(`SELECT public.approve_institution_member($1, 'ministry_validator')`, [outsider])
        )
      )?.code
    ).toBe('22023');

    // Direct promotion of a member is refused by the profile guard.
    const member = await createUser(db, 'member2@minagri.gov.rw', { institution_code: 'MINAGRI' });
    await asUser(db, minagriAdmin, tx =>
      tx.query(`SELECT public.approve_institution_member($1, 'viewer')`, [member])
    );
    expect(
      await errorAsUser(db, minagriAdmin, tx =>
        tx.query(`UPDATE public.profiles SET role = 'dashboard_management' WHERE id = $1`, [member])
      )
    ).toBeNull(); // no error, but RLS gives the admin no UPDATE on profiles...
    const role = await db.query<{ r: string }>(
      `SELECT role::text AS r FROM public.profiles WHERE id = $1`,
      [member]
    );
    expect(role.rows[0].r).toBe('policy_monitoring'); // ...so nothing changed
  });

  it('removes a member: scopes revoked, account deactivated', async () => {
    const leaver = await createUser(db, 'leaver@minagri.gov.rw', { institution_code: 'MINAGRI' });
    await asUser(db, minagriAdmin, tx =>
      tx.query(`SELECT public.approve_institution_member($1, 'data_entry')`, [leaver])
    );
    await asUser(db, minagriAdmin, tx =>
      tx.query(`SELECT public.remove_institution_member($1)`, [leaver])
    );
    const r = await db.query<{ role: string; is_active: boolean; scopes: number }>(
      `SELECT role::text, is_active, (SELECT count(*)::int FROM public.user_scopes WHERE user_id = p.id) AS scopes
       FROM public.profiles p WHERE id = $1`,
      [leaver]
    );
    expect(r.rows[0]).toEqual({ role: 'public_viewer', is_active: false, scopes: 0 });
  });

  it('cannot remove a validator; only a REMA administrator can', async () => {
    await db.query(
      `UPDATE public.profiles SET institution_id = (SELECT id FROM public.institutions WHERE code='MINAGRI') WHERE id = $1`,
      [minagriValidator]
    );
    expect(
      (
        await errorAsUser(db, minagriAdmin, tx =>
          tx.query(`SELECT public.remove_institution_member($1)`, [minagriValidator])
        )
      )?.code
    ).toBe('42501');
  });
});

describe('affiliation is not self-service', () => {
  it('a user cannot move themselves to another institution', async () => {
    const err = await errorAsUser(db, moeEntry, tx =>
      tx.query(
        `UPDATE public.profiles SET institution_id = (SELECT id FROM public.institutions WHERE code = 'REMA') WHERE id = $1`,
        [moeEntry]
      )
    );
    expect(err?.code).toBe('42501');
  });

  it('organization text follows the institution', async () => {
    const u = await createUser(db, 'sync@example.org');
    await db.query(
      `UPDATE public.profiles SET organization = 'whatever I typed',
         institution_id = (SELECT id FROM public.institutions WHERE code = 'RSB') WHERE id = $1`,
      [u]
    );
    const r = await db.query<{ o: string }>(
      `SELECT organization AS o FROM public.profiles WHERE id = $1`,
      [u]
    );
    expect(r.rows[0].o).toBe('Rwanda Standards Board');
  });
});

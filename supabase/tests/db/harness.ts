// ============================================================
// Database test harness
// Applies every migration in /migrations (in file-name order) to an
// in-process PostgreSQL (PGlite) on top of a minimal Supabase stand-in,
// and lets tests run SQL as a specific signed-in user under RLS.
// ============================================================

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const ROOT = resolve(__dirname, '../../..');
const MIGRATIONS_DIR = join(ROOT, 'migrations');

/**
 * REPLAY ADJUSTMENTS — test databases only.
 *
 * Some historical migrations cannot be replayed on an empty database
 * (found 16 Nov 2026). Production already has them applied in some form,
 * so the files are left as they are and the harness reproduces the
 * intended end state instead. Each entry says why.
 * A clean baseline for staging/training environments is part of M10.
 */
const REPLAY_ADJUSTMENTS: Record<
  string,
  { before?: string; replaceWith?: string; strip?: RegExp }
> = {
  // Adds an enum value and uses it in the same transaction, which
  // PostgreSQL forbids. Commit the new value first, then run the rest.
  '010_add_public_viewer_role.sql': {
    before: `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'public_viewer';`,
    strip: /^ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'public_viewer';\s*$/m,
  },
  // Drops the old enum type before dropping the functions that use it,
  // so it fails on any PostgreSQL. Intended end state: the value
  // sector_reporting is renamed lead_government_ministry_reporting and
  // can_write() uses the new name. RENAME VALUE reaches exactly that.
  '011_rename_sector_reporting_role.sql': {
    replaceWith: `
      ALTER TYPE user_role RENAME VALUE 'sector_reporting' TO 'lead_government_ministry_reporting';
      CREATE OR REPLACE FUNCTION public.can_write()
      RETURNS BOOLEAN AS $$
        SELECT get_user_role() IN ('lead_government_ministry_reporting','local_reporting','dashboard_management');
      $$ LANGUAGE SQL SECURITY DEFINER STABLE;
    `,
  },
  // milestone_export_view was created in the Supabase dashboard, not in a migration.
  '032_fix_milestone_export_view_security.sql': {
    before: `CREATE OR REPLACE VIEW public.milestone_export_view AS SELECT * FROM public.nbsap_milestones;`,
  },
  // notify_admin_new_signup() existed in production before 033 (first defined
  // in a migration only in 036). Create a stand-in; 036 replaces it.
  '033_fix_function_search_path_and_anon_execute.sql': {
    before: `CREATE OR REPLACE FUNCTION public.notify_admin_new_signup() RETURNS trigger
             LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$;`,
  },
  // rls_auto_enable() was created in the dashboard; 035 only revokes it.
  '035_admin_guard_milestone_bulk_functions.sql': {
    before: `CREATE OR REPLACE FUNCTION public.rls_auto_enable() RETURNS void LANGUAGE sql AS $$ SELECT $$;`,
  },
};

export interface AppliedMigration {
  file: string;
  ok: boolean;
  error?: string;
}

export async function createDatabase(): Promise<{ db: PGlite; applied: AppliedMigration[] }> {
  const db = await PGlite.create({ extensions: { uuid_ossp, pgcrypto } });
  // gen_random_uuid() is core since PG13; pgcrypto is loaded because 001 asks for it.
  await db.exec(readFileSync(join(__dirname, 'supabase-stub.sql'), 'utf8'));

  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d{3}_.*\.sql$/.test(f))
    .sort();

  const applied: AppliedMigration[] = [];
  for (const file of files) {
    let sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    const adj = REPLAY_ADJUSTMENTS[file];
    try {
      if (adj?.before) await db.exec(adj.before);
      if (adj?.replaceWith) sql = adj.replaceWith;
      if (adj?.strip) sql = sql.replace(adj.strip, '');
      await db.exec(sql);
      applied.push({ file, ok: true });
    } catch (err) {
      // Leave any aborted explicit transaction so later migrations can run.
      await db.exec('ROLLBACK').catch(() => undefined);
      const e = err as Error & { detail?: string };
      applied.push({ file, ok: false, error: e.detail ? `${e.message} | ${e.detail}` : e.message });
    }
  }
  return { db, applied };
}

/** Create a user the way Supabase Auth does (insert into auth.users; triggers create the profile). */
export async function createUser(
  db: PGlite,
  email: string,
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const res = await db.query<{ id: string }>(
    `INSERT INTO auth.users (email, raw_user_meta_data) VALUES ($1, $2::jsonb) RETURNING id`,
    [email, JSON.stringify(metadata)]
  );
  return res.rows[0].id;
}

/** Set a user's role and activation as the service role would (no auth.uid()). */
export async function setRole(
  db: PGlite,
  userId: string,
  role: string,
  active = true
): Promise<void> {
  await db.query(`UPDATE public.profiles SET role = $2::user_role, is_active = $3 WHERE id = $1`, [
    userId,
    role,
    active,
  ]);
}

export type ScopeRole =
  | 'data_entry'
  | 'institution_admin'
  | 'district_validator'
  | 'ministry_validator'
  | 'nisr_validator'
  | 'rlmua_validator'
  | 'rema_verifier';

/** Grant a scope as the service role would (migrations 039/040). */
export async function grantScope(
  db: PGlite,
  userId: string,
  scopeRole: ScopeRole,
  institutionCode: string,
  districtName?: string
): Promise<void> {
  const r = await db.query(
    `INSERT INTO public.user_scopes (user_id, scope_role, institution_id, district_id)
     SELECT $1, $2, i.id, (SELECT id FROM public.districts WHERE name = $4)
     FROM public.institutions i WHERE i.code = $3`,
    [userId, scopeRole, institutionCode, districtName ?? null]
  );
  if (r.affectedRows !== 1) throw new Error(`grantScope: institution ${institutionCode} not found`);
}

/**
 * Keep only one validation stage active, applying to every report (040).
 * Lets tests of other rules (security, metrics, scope) publish a report in
 * one review step.
 */
export async function useSingleStage(db: PGlite, code = 'ministry'): Promise<void> {
  await db.query(`UPDATE public.validation_stages SET is_active = (code = $1)`, [code]);
  await db.query(`UPDATE public.validation_stages SET applies_to = 'all_reports' WHERE code = $1`, [
    code,
  ]);
}

/**
 * SQL expression for a complete data-quality declaration (043): every
 * active checklist item confirmed and the declaration accepted. Use it as a
 * value in an INSERT or as resubmit_report's p_declaration.
 */
export const FULL_DECLARATION = `(SELECT jsonb_build_object('declared', true, 'items', COALESCE(jsonb_agg(id), '[]'::jsonb))
   FROM public.dqa_checklist_items WHERE is_active)`;

/**
 * The n-th past reporting period (043 refuses future periods): Q1 2020 ...
 * Q4 2026, then the years 2020 ... 2026. Reports from one submitter, tool
 * and target need different periods (unique index from 027).
 */
export function pastPeriod(n: number): string {
  if (n < 28) return `Q${(n % 4) + 1} ${2020 + Math.floor(n / 4)}`;
  if (n < 35) return String(2020 + n - 28);
  throw new Error(`pastPeriod: only 35 past periods (asked for #${n})`);
}

/** Run review_report() as a user (040). */
export async function review(
  db: PGlite,
  userId: string,
  reportId: string,
  action: 'approve' | 'return' | 'reject',
  note?: string
): Promise<void> {
  await asUser(db, userId, tx =>
    tx.query(`SELECT public.review_report($1, $2, $3)`, [reportId, action, note ?? null])
  );
}

/**
 * Run `fn` as a signed-in user: role `authenticated`, JWT subject = userId.
 * Everything is rolled back afterwards unless `commit` is true.
 */
export async function asUser<T>(
  db: PGlite,
  userId: string | null,
  fn: (tx: Transaction) => Promise<T>,
  { commit = true }: { commit?: boolean } = {}
): Promise<T> {
  return db.transaction(async tx => {
    await tx.exec(`SET LOCAL ROLE ${userId ? 'authenticated' : 'anon'}`);
    await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
    const result = await fn(tx);
    if (!commit) await tx.rollback();
    return result;
  });
}

/** Run `fn` as a user and return the PostgreSQL error (code + message), or null if it succeeded. */
export async function errorAsUser(
  db: PGlite,
  userId: string | null,
  fn: (tx: Transaction) => Promise<unknown>
): Promise<{ code?: string; message: string } | null> {
  try {
    await asUser(db, userId, fn);
    return null;
  } catch (err) {
    const e = err as { code?: string; message: string };
    return { code: e.code, message: e.message };
  }
}

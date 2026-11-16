// ============================================================
// M01 — Institutions and access scope (migration 039)
// Reference data and scope management. All authorisation is enforced
// by the database (RLS, triggers, RPCs); these calls only reflect it.
// ============================================================

import { supabase } from '../utils/supabase';
import type {
  ApiResponse,
  District,
  Institution,
  InstitutionCategory,
  ScopeRole,
  StrategicAction,
  UserProfile,
  UserScope,
} from '../types/index';

// ── Reference data ───────────────────────────────────────────

let institutionsCache: { data: Institution[]; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

export async function fetchInstitutions(force = false): Promise<Institution[]> {
  if (!force && institutionsCache && Date.now() - institutionsCache.ts < CACHE_MS) {
    return institutionsCache.data;
  }
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw new Error(`Could not load institutions: ${error.message}`);
  institutionsCache = { data: (data || []) as Institution[], ts: Date.now() };
  return institutionsCache.data;
}

export function clearInstitutionsCache(): void {
  institutionsCache = null;
}

export interface SignupOptions {
  institutions: {
    code: string;
    name: string;
    category: InstitutionCategory;
    covers_all_districts: boolean;
  }[];
  districts: { id: number; name: string }[];
}

/** Institutions and districts for the sign-up form (works before signing in). */
export async function fetchSignupOptions(): Promise<SignupOptions> {
  const { data, error } = await supabase.rpc('signup_options');
  if (error) throw new Error(`Could not load institutions: ${error.message}`);
  return data as SignupOptions;
}

export async function fetchStrategicActions(): Promise<StrategicAction[]> {
  const { data, error } = await supabase
    .from('nbsap_strategic_actions')
    .select(
      'id, target_id, ordinal, action, data_sources, institutions:strategic_action_institutions(label, institution_id, ordinal)'
    )
    .order('target_id')
    .order('ordinal');
  if (error) throw new Error(`Could not load strategic actions: ${error.message}`);
  return (data || []).map(row => {
    const r = row as unknown as StrategicAction & {
      institutions: { label: string; institution_id: number | null; ordinal: number }[];
    };
    return {
      ...r,
      institutions: [...(r.institutions || [])]
        .sort((a, b) => a.ordinal - b.ordinal)
        .map(({ label, institution_id }) => ({ label, institution_id })),
    };
  });
}

// ── Scopes ───────────────────────────────────────────────────

export async function fetchMyScopes(): Promise<UserScope[]> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return [];
  const { data, error } = await supabase.from('user_scopes').select('*').eq('user_id', uid);
  if (error) throw new Error(`Could not load your access scope: ${error.message}`);
  return (data || []) as UserScope[];
}

export async function fetchUserScopes(userId: string): Promise<UserScope[]> {
  const { data, error } = await supabase
    .from('user_scopes')
    .select('*')
    .eq('user_id', userId)
    .order('granted_at');
  if (error) throw new Error(`Could not load access scope: ${error.message}`);
  return (data || []) as UserScope[];
}

/** All scopes visible to the caller (administrators: everyone). */
export async function fetchAllScopes(): Promise<UserScope[]> {
  const { data, error } = await supabase.from('user_scopes').select('*');
  if (error) throw new Error(`Could not load access scopes: ${error.message}`);
  return (data || []) as UserScope[];
}

/** REMA administrator only (RLS). Nobody can grant a scope to themselves. */
export async function grantScope(input: {
  user_id: string;
  scope_role: ScopeRole;
  institution_id: number;
  district_id?: number | null;
}): Promise<ApiResponse<UserScope>> {
  const { data, error } = await supabase
    .from('user_scopes')
    .insert({ ...input, district_id: input.district_id ?? null })
    .select()
    .single();
  if (error) return { data: null, error: friendlyDbError(error.message) };
  return { data: data as UserScope, error: null };
}

export async function revokeScope(scopeId: number): Promise<ApiResponse<null>> {
  const { error } = await supabase.from('user_scopes').delete().eq('id', scopeId);
  if (error) return { data: null, error: friendlyDbError(error.message) };
  return { data: null, error: null };
}

/** REMA administrator only: set a user's affiliation. */
export async function setUserAffiliation(
  userId: string,
  institutionId: number | null,
  districtId: number | null
): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('profiles')
    .update({ institution_id: institutionId, district_id: districtId })
    .eq('id', userId);
  if (error) return { data: null, error: friendlyDbError(error.message) };
  return { data: null, error: null };
}

// ── Institution administration ───────────────────────────────

/** People affiliated with the institutions the caller administers (RLS). */
export async function fetchInstitutionMembers(): Promise<UserProfile[]> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .not('institution_id', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load members: ${error.message}`);
  return ((data || []) as UserProfile[]).filter(p => p.id !== uid);
}

export async function approveMember(
  userId: string,
  as: 'data_entry' | 'viewer',
  districtId?: number | null
): Promise<ApiResponse<null>> {
  const { error } = await supabase.rpc('approve_institution_member', {
    p_user: userId,
    p_as: as,
    p_district: districtId ?? null,
  });
  if (error) return { data: null, error: friendlyDbError(error.message) };
  return { data: null, error: null };
}

export async function removeMember(userId: string): Promise<ApiResponse<null>> {
  const { error } = await supabase.rpc('remove_institution_member', { p_user: userId });
  if (error) return { data: null, error: friendlyDbError(error.message) };
  return { data: null, error: null };
}

// ── Helpers ──────────────────────────────────────────────────

/** Turn database refusals into sentences a user can act on. */
export function friendlyDbError(message: string): string {
  if (/row-level security/i.test(message)) return 'You do not have permission to do this.';
  if (/duplicate key|already exists/i.test(message)) return 'This access is already granted.';
  return message;
}

/** Districts the caller may submit for with this institution (null = any). */
export function allowedDistrictIds(
  scopes: UserScope[],
  institutionId: number,
  role: ScopeRole = 'data_entry'
): number[] | null {
  const relevant = scopes.filter(s => s.scope_role === role && s.institution_id === institutionId);
  if (relevant.some(s => s.district_id === null)) return null;
  return relevant.map(s => s.district_id as number);
}

export function districtName(
  districts: Pick<District, 'id' | 'name'>[],
  id: number | null
): string {
  if (id == null) return '';
  return districts.find(d => d.id === id)?.name ?? `District ${id}`;
}

// ============================================================
// M01 hooks: institutions (reference data) and the signed-in user's scopes.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { fetchInstitutions, fetchMyScopes } from '../services/institutionService';
import type { Institution, UserScope } from '../types/index';

export function useInstitutions() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      setInstitutions(await fetchInstitutions(force));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { institutions, loading, error, reload: () => load(true) };
}

/** The signed-in user's scopes. Administrators are unrestricted (isAdmin). */
export function useMyScopes() {
  const { user } = useAuth();
  const [scopes, setScopes] = useState<UserScope[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setScopes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setScopes(await fetchMyScopes());
    } catch (e) {
      console.error(e);
      setScopes([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const isAdmin = user?.role === 'dashboard_management';
  const isInstitutionAdmin = scopes.some(s => s.scope_role === 'institution_admin');
  return { scopes, loading, isAdmin, isInstitutionAdmin, reload: load };
}

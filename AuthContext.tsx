import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { fetchUserSettings } from './dataService';
import type { AuthState, UserProfile, UserSettings, RolePermissions } from './index';
import { USER_ROLE_PERMISSIONS } from './index';

type AuthAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_SESSION'; user: UserProfile; session: import('@supabase/supabase-js').Session }
  | { type: 'CLEAR_SESSION' };

interface AuthContextValue extends AuthState {
  settings: UserSettings | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
  permissions: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_SESSION':
      return {
        ...state,
        user: action.user,
        session: action.session,
        permissions: USER_ROLE_PERMISSIONS[action.user.role],
        loading: false,
      };
    case 'CLEAR_SESSION':
      return { ...initialState, loading: false };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextValue>({
  ...initialState,
  settings: null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

// ── In-memory profile cache (5 min TTL) ──────────────────────
let profileCache: { userId: string; profile: UserProfile; ts: number } | null = null;
const PROFILE_CACHE_TTL = 5 * 60 * 1000;

// ── sessionStorage cache (survives page refresh) ─────────────
const SESSION_KEY = 'nbsap_profile_cache';

function readSessionCache(userId: string): UserProfile | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId: string; profile: UserProfile; ts: number };
    if (parsed.userId !== userId) return null;
    if (Date.now() - parsed.ts > PROFILE_CACHE_TTL) return null;
    return parsed.profile;
  } catch {
    return null;
  }
}

function writeSessionCache(userId: string, profile: UserProfile) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, profile, ts: Date.now() }));
  } catch { /* ignore */ }
}

function clearSessionCache() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [settings, setSettings] = React.useState<UserSettings | null>(null);
  const mountedRef = useRef(true);

  // These refs prevent race conditions — never use state for these
  const fetchingRef = useRef(false);   // true while loadUserData is running
  const initializedRef = useRef(false); // true once INITIAL_SESSION has been handled

  const loadUserData = useCallback(async (
    userId: string,
    session: import('@supabase/supabase-js').Session
  ) => {
    // Prevent duplicate concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      let profile: UserProfile | null = null;

      // 1. In-memory cache
      if (
        profileCache &&
        profileCache.userId === userId &&
        Date.now() - profileCache.ts < PROFILE_CACHE_TTL
      ) {
        profile = profileCache.profile;
      }

      // 2. sessionStorage cache (instant on page refresh)
      if (!profile) {
        profile = readSessionCache(userId);
        if (profile) {
          profileCache = { userId, profile, ts: Date.now() };
        }
      }

      // 3. Fetch from DB
      if (!profile) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error || !data) {
          console.error('Profile fetch error:', error);
          if (mountedRef.current) dispatch({ type: 'CLEAR_SESSION' });
          return;
        }
        profile = data as UserProfile;
        profileCache = { userId, profile, ts: Date.now() };
        writeSessionCache(userId, profile);
      }

      if (!mountedRef.current) return;

      // Block inactive users
      if (!profile.is_active) {
        await supabase.auth.signOut();
        profileCache = null;
        clearSessionCache();
        if (mountedRef.current) dispatch({ type: 'CLEAR_SESSION' });
        return;
      }

      dispatch({ type: 'SET_SESSION', user: profile, session });

      // Background tasks — don't block UI
      Promise.all([
        fetchUserSettings(userId).then(s => {
          if (s && mountedRef.current) setSettings(s);
        }),
        supabase.from('profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId),
      ]).catch(console.error);

    } catch (err) {
      console.error('loadUserData error:', err);
      if (mountedRef.current) dispatch({ type: 'CLEAR_SESSION' });
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    profileCache = null;
    clearSessionCache();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) return;
    fetchingRef.current = false; // allow re-fetch
    await loadUserData(sessionData.session.user.id, sessionData.session);
  }, [loadUserData]);

  const handleSignOut = useCallback(async () => {
    profileCache = null;
    clearSessionCache();
    await supabase.auth.signOut();
    dispatch({ type: 'CLEAR_SESSION' });
    setSettings(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchingRef.current = false;
    initializedRef.current = false;

    // Hard safety timeout — if nothing resolves in 6s, unblock the UI
    const safetyTimeout = setTimeout(() => {
      if (mountedRef.current && !initializedRef.current) {
        console.warn('Auth safety timeout — forcing loading=false');
        initializedRef.current = true;
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    }, 6000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        if (event === 'INITIAL_SESSION') {
          // This is the ONLY event that should clear the safety timeout
          // and mark auth as initialized
          clearTimeout(safetyTimeout);
          initializedRef.current = true;

          if (session?.user) {
            await loadUserData(session.user.id, session);
          } else {
            dispatch({ type: 'CLEAR_SESSION' });
          }

        } else if (event === 'SIGNED_IN' && session?.user) {
          // Only handle SIGNED_IN after initialization to avoid double-loading
          if (initializedRef.current) {
            fetchingRef.current = false; // allow fresh fetch on explicit sign-in
            await loadUserData(session.user.id, session);
          }

        } else if (event === 'SIGNED_OUT') {
          clearTimeout(safetyTimeout);
          profileCache = null;
          clearSessionCache();
          dispatch({ type: 'CLEAR_SESSION' });
          setSettings(null);

        } else if (event === 'TOKEN_REFRESHED') {
          // TOKEN_REFRESHED fires frequently — NEVER clear loading here
          // because loadUserData may still be running from INITIAL_SESSION
          // Just silently ignore it — the session is still valid
          if (initializedRef.current && !fetchingRef.current && state.user) {
            // Already loaded, just keep going
          }

        } else if (event === 'USER_UPDATED' && session?.user) {
          profileCache = null;
          clearSessionCache();
          fetchingRef.current = false;
          await loadUserData(session.user.id, session);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [loadUserData]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ ...state, settings, signOut: handleSignOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function usePermissions(): RolePermissions | null {
  return useAuth().permissions;
}

export function useIsAdmin(): boolean {
  return useAuth().user?.role === 'dashboard_management';
}

export function useCanSubmit(): boolean {
  return useAuth().permissions?.canSubmitReports ?? false;
}

export function useCanApprove(): boolean {
  return useAuth().permissions?.canApproveReports ?? false;
}

import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { fetchUserSettings } from '../services/dataService';
import type { AuthState, UserProfile, UserSettings, RolePermissions } from '../types/index';
import { USER_ROLE_PERMISSIONS } from '../types/index';
import toast from 'react-hot-toast';

type AuthAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_SESSION'; user: UserProfile; session: import('@supabase/supabase-js').Session }
  | { type: 'CLEAR_SESSION' };

interface AuthContextValue extends AuthState {
  settings: UserSettings | null;
  isPasswordRecovery: boolean;
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
  isPasswordRecovery: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

// ── Account Status Check Result ──────────────────────────────
export interface AccountStatusCheckResult {
  allowed: boolean;
  message?: string;
  suspensionCleared?: boolean;
  updatedProfile?: UserProfile;
}

/**
 * Check account status and handle deactivation, suspension, and auto-reactivation
 * Requirements: 4.4, 4.5, 4.6, 4.11
 */
export async function checkAccountStatus(profile: UserProfile): Promise<AccountStatusCheckResult> {
  // Check if account is deactivated
  if (!profile.is_active) {
    return {
      allowed: false,
      message: 'Your account has been deactivated. Please contact an administrator.'
    };
  }

  // Check if account is suspended
  if (profile.suspended_at) {
    // Check if suspension has expired
    if (profile.suspension_end_date) {
      const endDate = new Date(profile.suspension_end_date);
      const now = new Date();
      
      if (endDate < now) {
        // Auto-reactivate expired suspension
        const { data: updatedProfile, error } = await supabase
          .from('profiles')
          .update({
            suspended_at: null,
            suspended_by: null,
            suspension_reason: null,
            suspension_end_date: null
          })
          .eq('id', profile.id)
          .select()
          .single();

        if (error) {
          console.error('Failed to auto-reactivate expired suspension:', error);
          return {
            allowed: false,
            message: 'Your account suspension has expired, but auto-reactivation failed. Please contact an administrator.'
          };
        }

        // Log the auto-reactivation
        try {
          await supabase.from('audit_log').insert({
            user_id: profile.id,
            action_type: 'auto_reactivate_account',
            action: 'System auto-reactivated expired suspension',
            detail: `Suspension expired on ${endDate.toISOString()}. Account automatically reactivated.`,
            role: 'system'
          });
        } catch (auditError) {
          console.error('Failed to log auto-reactivation:', auditError);
        }

        return {
          allowed: true,
          suspensionCleared: true,
          updatedProfile: updatedProfile as UserProfile
        };
      }
    }

    // Suspension is still active
    const endDateMsg = profile.suspension_end_date 
      ? ` Your suspension will end on ${new Date(profile.suspension_end_date).toLocaleDateString()}.`
      : '';
    
    return {
      allowed: false,
      message: `Your account is currently suspended.${endDateMsg} Please contact an administrator.`
    };
  }

  // Account is active and not suspended
  return { allowed: true };
}

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

// Reads Supabase's own internal state — the code-verifier value is
// formatted as "verifier/redirectType".  It exists from the moment
// resetPasswordForEmail is called until the code is exchanged, so it
// is available during the first React render (before async init).
function isRecoveryPending(): boolean {
  try {
    // PKCE: check Supabase's code-verifier for recovery redirect type
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
      const v = localStorage.getItem('nbsap-auth-token-code-verifier');
      if (v && v.endsWith('/recovery')) return true;
    }
    // Implicit: recovery type lives in the URL hash
    if (window.location.hash.includes('type=recovery')) return true;
  } catch { /* incognito / storage disabled */ }
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [settings, setSettings] = React.useState<UserSettings | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(isRecoveryPending);
  const mountedRef = useRef(true);
  const navigate = useNavigate();

  // These refs prevent race conditions — never use state for these
  const fetchingRef = useRef(false);   // true while loadUserData is running
  const initializedRef = useRef(false); // true once INITIAL_SESSION has been handled
  const recoveryRef = useRef(isPasswordRecovery);

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

      // Check account status
      const statusCheck = await checkAccountStatus(profile);
      if (!statusCheck.allowed) {
        await supabase.auth.signOut();
        profileCache = null;
        clearSessionCache();
        if (mountedRef.current) {
          dispatch({ type: 'CLEAR_SESSION' });
          toast.error(
            statusCheck.message || 'Account access denied. Please contact the administrator.',
            { duration: 10000 }
          );
        }
        return;
      }

      // If suspension was auto-cleared, refresh the profile
      if (statusCheck.suspensionCleared) {
        profile = statusCheck.updatedProfile!;
        profileCache = { userId, profile, ts: Date.now() };
        writeSessionCache(userId, profile);
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
          clearTimeout(safetyTimeout);
          initializedRef.current = true;

          if (recoveryRef.current) {
            dispatch({ type: 'SET_LOADING', loading: false });
            navigate('/auth?mode=set-password', { replace: true });
          } else if (session?.user) {
            await loadUserData(session.user.id, session);
          } else {
            dispatch({ type: 'CLEAR_SESSION' });
          }

        } else if (event === 'SIGNED_IN' && session?.user) {
          if (recoveryRef.current) return;
          if (initializedRef.current) {
            fetchingRef.current = false;
            await loadUserData(session.user.id, session);
          }

        } else if (event === 'SIGNED_OUT') {
          clearTimeout(safetyTimeout);
          profileCache = null;
          clearSessionCache();
          dispatch({ type: 'CLEAR_SESSION' });
          setSettings(null);

        } else if (event === 'TOKEN_REFRESHED') {
          // Silently ignore — session is still valid
          if (initializedRef.current && !fetchingRef.current && state.user) {
            // Already loaded, keep going
          }

        } else if (event === 'USER_UPDATED' && session?.user) {
          profileCache = null;
          clearSessionCache();
          fetchingRef.current = false;
          await loadUserData(session.user.id, session);

        } else if (event === 'PASSWORD_RECOVERY') {
          recoveryRef.current = true;
          setIsPasswordRecovery(true);
          navigate('/auth?mode=set-password', { replace: true });
        }
      }
    );

    // ── Listen for Supabase 400 refresh token errors ──────────
    // When the refresh token is invalid/expired, Supabase emits an
    // AuthApiError. We catch it here and sign the user out cleanly
    // so they land on the login page instead of a broken state.
    const handleAuthError = (event: Event) => {
      const err = (event as CustomEvent)?.detail;
      if (
        err?.status === 400 ||
        err?.message?.includes('Refresh Token Not Found') ||
        err?.message?.includes('Invalid Refresh Token')
      ) {
        console.warn('Refresh token invalid — signing out');
        profileCache = null;
        clearSessionCache();
        supabase.auth.signOut().catch(() => {});
        if (mountedRef.current) dispatch({ type: 'CLEAR_SESSION' });
      }
    };
    window.addEventListener('supabase.auth.error', handleAuthError);

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      window.removeEventListener('supabase.auth.error', handleAuthError);
    };
  }, [loadUserData]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ ...state, settings, isPasswordRecovery, signOut: handleSignOut, refreshProfile }}>
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

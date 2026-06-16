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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [settings, setSettings] = React.useState<UserSettings | null>(null);
  const mountedRef = useRef(true);

  const loadUserData = useCallback(async (
    userId: string,
    session: import('@supabase/supabase-js').Session
  ) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!mountedRef.current) return;

      if (error || !profile) {
        console.error('Profile fetch error:', error);
        dispatch({ type: 'CLEAR_SESSION' });
        return;
      }

      // If user is inactive (pending approval), sign them out
      if (!profile.is_active) {
        await supabase.auth.signOut();
        dispatch({ type: 'CLEAR_SESSION' });
        return;
      }

      dispatch({ type: 'SET_SESSION', user: profile as UserProfile, session });

      // Background: load settings + update last_login
      fetchUserSettings(userId)
        .then(s => { if (s && mountedRef.current) setSettings(s); })
        .catch(console.error);

      supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId)
        .then(() => {})
        .catch(console.error);

    } catch (err) {
      console.error('loadUserData error:', err);
      if (mountedRef.current) dispatch({ type: 'CLEAR_SESSION' });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) return;
    await loadUserData(sessionData.session.user.id, sessionData.session);
  }, [loadUserData]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    dispatch({ type: 'CLEAR_SESSION' });
    setSettings(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Hard safety timeout — 5s max loading state
    const safetyTimeout = setTimeout(() => {
      if (mountedRef.current) dispatch({ type: 'SET_LOADING', loading: false });
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        clearTimeout(safetyTimeout);

        if (!mountedRef.current) return;

        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          await loadUserData(session.user.id, session);
        } else if (event === 'SIGNED_OUT') {
          dispatch({ type: 'CLEAR_SESSION' });
          setSettings(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Don't reload full profile on token refresh — just clear loading
          dispatch({ type: 'SET_LOADING', loading: false });
        } else if (event === 'USER_UPDATED' && session?.user) {
          await loadUserData(session.user.id, session);
        } else if (event === 'INITIAL_SESSION' && !session) {
          dispatch({ type: 'CLEAR_SESSION' });
        } else {
          // Any other event — stop loading
          dispatch({ type: 'SET_LOADING', loading: false });
        }
      }
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [loadUserData]);

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

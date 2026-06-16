import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { supabase } from './supabase';
import { fetchUserSettings } from './dataService';
import type {
  AuthState,
  UserProfile,
  UserSettings,
  RolePermissions,
} from './index';
import { USER_ROLE_PERMISSIONS } from './index';

// ── State & Actions ──────────────────────────────────────────

type AuthAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_SESSION'; user: UserProfile; session: import('@supabase/supabase-js').Session }
  | { type: 'SET_SETTINGS'; settings: UserSettings }
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

// ── Context ──────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  ...initialState,
  settings: null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [settings, setSettings] = React.useState<UserSettings | null>(null);

  const loadUserData = useCallback(async (userId: string, session: import('@supabase/supabase-js').Session) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      dispatch({ type: 'CLEAR_SESSION' });
      return;
    }

    dispatch({
      type: 'SET_SESSION',
      user: profile as UserProfile,
      session,
    });

    // Load settings in background
    const userSettings = await fetchUserSettings(userId);
    if (userSettings) setSettings(userSettings);

    // Update last login
    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);
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
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserData(session.user.id, session);
      } else {
        dispatch({ type: 'CLEAR_SESSION' });
      }
    });

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserData(session.user.id, session);
        } else if (event === 'SIGNED_OUT') {
          dispatch({ type: 'CLEAR_SESSION' });
          setSettings(null);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          dispatch({ type: 'SET_LOADING', loading: false });
        } else if (event === 'USER_UPDATED' && session?.user) {
          await loadUserData(session.user.id, session);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        settings,
        signOut: handleSignOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Custom Hooks ─────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function usePermissions(): RolePermissions | null {
  return useAuth().permissions;
}

export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.role === 'dashboard_management';
}

export function useCanSubmit(): boolean {
  const { permissions } = useAuth();
  return permissions?.canSubmitReports ?? false;
}

export function useCanApprove(): boolean {
  const { permissions } = useAuth();
  return permissions?.canApproveReports ?? false;
}

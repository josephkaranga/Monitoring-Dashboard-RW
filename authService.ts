import { supabase } from './supabase';
import type {
  LoginCredentials,
  SignupData,
  UserProfile,
  UserSettings,
  ApiResponse,
} from './index';

// ── SIGN IN ──────────────────────────────────────────────────
export async function signIn(
  credentials: LoginCredentials
): Promise<ApiResponse<{ profile: UserProfile; settings: UserSettings }>> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
  });

  if (error) return { data: null, error: error.message };

  const [profileRes, settingsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single(),
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', data.user.id)
      .single(),
  ]);

  if (profileRes.error) return { data: null, error: profileRes.error.message };

  // Block inactive (pending approval) users
  if (!profileRes.data.is_active) {
    await supabase.auth.signOut();
    return {
      data: null,
      error: 'Your account is pending approval by a REMA Administrator. You will be notified once approved.',
    };
  }

  // Update last_login timestamp
  await supabase
    .from('profiles')
    .update({ last_login: new Date().toISOString() })
    .eq('id', data.user.id);

  return {
    data: {
      profile: profileRes.data as UserProfile,
      settings: settingsRes.data as UserSettings,
    },
    error: null,
  };
}

// ── SIGN UP ──────────────────────────────────────────────────
export async function signUp(
  userData: SignupData
): Promise<ApiResponse<UserProfile>> {
  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('email, is_active')
    .eq('email', userData.email.trim().toLowerCase())
    .maybeSingle();

  if (existingUser) {
    if (existingUser.is_active) {
      return { 
        data: null, 
        error: 'This email is already registered. Please sign in or use the "Forgot password" option if you cannot access your account.' 
      };
    } else {
      return { 
        data: null, 
        error: 'An account with this email is pending approval. Please wait for REMA Administrator approval or contact support.' 
      };
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email: userData.email.trim().toLowerCase(),
    password: userData.password,
    options: {
      data: {
        full_name: userData.full_name,
        role: userData.role,
        organization: userData.organization || null,
        department: userData.department || null,
      },
    },
  });

  if (error) {
    // Provide user-friendly error messages
    if (error.message.includes('already registered') || error.message.includes('already exists')) {
      return { 
        data: null, 
        error: 'This email is already registered. Please sign in or use the "Forgot password" option.' 
      };
    }
    return { data: null, error: error.message };
  }
  
  if (!data.user) return { data: null, error: 'Signup failed' };

  // Profile is created automatically via DB trigger
  // Fetch the created profile
  await new Promise((r) => setTimeout(r, 500)); // brief wait for trigger
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError) return { data: null, error: profileError.message };

  return { data: profile as UserProfile, error: null };
}

// ── SIGN OUT ─────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// ── GET CURRENT SESSION ───────────────────────────────────────
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return data.session;
}

// ── GET CURRENT USER PROFILE ──────────────────────────────────
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sessionData.session.user.id)
    .single();

  if (error) return null;
  return data as UserProfile;
}

// ── UPDATE PROFILE ───────────────────────────────────────────
export async function updateProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<ApiResponse<UserProfile>> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as UserProfile, error: null };
}

// ── RESET PASSWORD ───────────────────────────────────────────
export async function resetPassword(email: string): Promise<ApiResponse<null>> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// ── UPDATE PASSWORD ───────────────────────────────────────────
export async function updatePassword(
  newPassword: string
): Promise<ApiResponse<null>> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// ── GET ALL USERS (admin only) ────────────────────────────────
export async function getAllUsers(): Promise<ApiResponse<UserProfile[]>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data as UserProfile[], error: null };
}

// ── UPDATE USER ROLE (admin only) ─────────────────────────────
export async function updateUserRole(
  userId: string,
  role: import('./index').UserRole
): Promise<ApiResponse<UserProfile>> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as UserProfile, error: null };
}

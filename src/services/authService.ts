import { supabase } from '../utils/supabase';
import type {
  LoginCredentials,
  SignupData,
  UserProfile,
  UserSettings,
  ApiResponse,
} from '../types/index';

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

  // Block suspended accounts (unless suspension has expired)
  if (profileRes.data.suspended_at) {
    const suspEndDate = profileRes.data.suspension_end_date;
    const suspExpired = suspEndDate && new Date(suspEndDate) <= new Date();
    if (!suspExpired) {
      await supabase.auth.signOut();
      const endMsg = suspEndDate
        ? ` Your suspension ends on ${new Date(suspEndDate).toLocaleDateString('en-RW', { day: 'numeric', month: 'long', year: 'numeric' })}.`
        : '';
      const reason = profileRes.data.suspension_reason
        ? ` Reason: ${profileRes.data.suspension_reason}.`
        : '';
      return {
        data: null,
        error: `Your account has been suspended.${reason}${endMsg} Please contact the REMA Administrator for assistance.`,
      };
    }
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
    return { data: null, error: error.message };
  }
  
  if (!data.user) {
    return { data: null, error: 'Signup failed. Please try again.' };
  }

  // Profile is created automatically via DB trigger
  // Fetch the created profile
  await new Promise((r) => setTimeout(r, 500)); // brief wait for trigger
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Profile fetch error:', profileError);
    return { data: null, error: 'Failed to create user profile. Please contact support.' };
  }

  if (!profile) {
    // Profile wasn't created by trigger, wait a bit longer and try again
    await new Promise((r) => setTimeout(r, 1000));
    const { data: retryProfile, error: retryError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (retryError || !retryProfile) {
      console.error('Profile still not found after retry:', retryError);
      return { data: null, error: 'Account created but profile setup failed. Please contact support.' };
    }

    return { data: retryProfile as UserProfile, error: null };
  }

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
  // Prevent role changes through profile update
  const { data: sessionData } = await supabase.auth.getSession();
  if (updates.role && userId === sessionData.session?.user?.id) {
    return { 
      data: null, 
      error: 'Role changes must be requested through the approval workflow. Please submit a role change request.' 
    };
  }

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
  // Use VITE_APP_URL if set, otherwise use hostname without port so the
  // redirectTo URL is consistent regardless of which dev-server port is
  // active. Port differences (3000 vs 3001 vs 3002) can break the link
  // if Supabase's allowed redirect list doesn't include every port.
  const appUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '')
    || `${window.location.protocol}//${window.location.hostname}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth`,
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
  role: import('../types/index').UserRole
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

// ── UPDATE USER ROLE DIRECTLY (admin only) ───────────────────
export async function updateUserRoleDirectly(
  userId: string,
  newRole: import('../types/index').UserRole,
  reason?: string
): Promise<ApiResponse<UserProfile>> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Get current user's role
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', sessionData.session.user.id)
    .single();

  if (adminProfile?.role !== 'dashboard_management') {
    return { data: null, error: 'Only REMA Administrators can directly change user roles' };
  }

  // Get target user's current role
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', userId)
    .single();

  if (!targetProfile) {
    return { data: null, error: 'User not found' };
  }

  const oldRole = targetProfile.role;

  // Update role
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Log in audit trail
  await supabase.from('audit_log').insert({
    user_id: sessionData.session.user.id,
    action_type: 'admin_role_change',
    action: 'Administrator directly changed user role',
    detail: `Changed ${targetProfile.full_name}'s role from ${oldRole} to ${newRole}. Reason: ${reason || 'Not specified'}`,
    role: 'dashboard_management'
  });

  // Notify the user
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Role Changed by Administrator',
    message: `Your role has been changed from ${oldRole} to ${newRole} by a REMA Administrator.`,
    type: 'info'
  });

  return { data: data as UserProfile, error: null };
}

// ── DEACTIVATE USER ACCOUNT (admin only) ─────────────────────
export async function deactivateUserAccount(
  userId: string,
  reason?: string
): Promise<ApiResponse<UserProfile>> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Verify admin role
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', sessionData.session.user.id)
    .single();

  if (adminProfile?.role !== 'dashboard_management') {
    return { data: null, error: 'Only administrators can deactivate accounts' };
  }

  // Get target user info
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single();

  if (!targetProfile) {
    return { data: null, error: 'User not found' };
  }

  // Deactivate account
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Log in audit trail
  await supabase.from('audit_log').insert({
    user_id: sessionData.session.user.id,
    action_type: 'deactivate_account',
    action: 'Administrator deactivated user account',
    detail: `Deactivated account for ${targetProfile.full_name} (${targetProfile.email}). Reason: ${reason || 'Not specified'}`,
    role: 'dashboard_management'
  });

  // Notify the user
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Account Deactivated',
    message: `Your account has been deactivated by an administrator. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`,
    type: 'warning'
  });

  return { data: data as UserProfile, error: null };
}

// ── SUSPEND USER ACCOUNT (admin only) ────────────────────────
export async function suspendUserAccount(
  userId: string,
  reason: string,
  endDate?: Date
): Promise<ApiResponse<UserProfile>> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Verify admin role
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', sessionData.session.user.id)
    .single();

  if (adminProfile?.role !== 'dashboard_management') {
    return { data: null, error: 'Only administrators can suspend accounts' };
  }

  // Get target user info
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single();

  if (!targetProfile) {
    return { data: null, error: 'User not found' };
  }

  // Suspend account
  const { data, error } = await supabase
    .from('profiles')
    .update({
      suspended_at: new Date().toISOString(),
      suspended_by: sessionData.session.user.id,
      suspension_reason: reason,
      suspension_end_date: endDate?.toISOString() || null
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Log in audit trail
  await supabase.from('audit_log').insert({
    user_id: sessionData.session.user.id,
    action_type: 'suspend_account',
    action: 'Administrator suspended user account',
    detail: `Suspended account for ${targetProfile.full_name} (${targetProfile.email}). Reason: ${reason}. End date: ${endDate?.toISOString() || 'Indefinite'}`,
    role: 'dashboard_management'
  });

  // Notify the user
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Account Suspended',
    message: `Your account has been suspended. Reason: ${reason}. ${endDate ? `Suspension ends: ${endDate.toLocaleDateString()}` : 'Contact administrator for more information.'}`,
    type: 'error'
  });

  return { data: data as UserProfile, error: null };
}

// ── REACTIVATE USER ACCOUNT (admin only) ─────────────────────
export async function reactivateUserAccount(
  userId: string
): Promise<ApiResponse<UserProfile>> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Verify admin role
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', sessionData.session.user.id)
    .single();

  if (adminProfile?.role !== 'dashboard_management') {
    return { data: null, error: 'Only administrators can reactivate accounts' };
  }

  // Get target user info
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single();

  if (!targetProfile) {
    return { data: null, error: 'User not found' };
  }

  // Reactivate account
  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_active: true,
      suspended_at: null,
      suspended_by: null,
      suspension_reason: null,
      suspension_end_date: null
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Log in audit trail
  await supabase.from('audit_log').insert({
    user_id: sessionData.session.user.id,
    action_type: 'reactivate_account',
    action: 'Administrator reactivated user account',
    detail: `Reactivated account for ${targetProfile.full_name} (${targetProfile.email})`,
    role: 'dashboard_management'
  });

  // Notify the user
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Account Reactivated',
    message: 'Your account has been reactivated. You can now log in and access the system.',
    type: 'success'
  });

  return { data: data as UserProfile, error: null };
}

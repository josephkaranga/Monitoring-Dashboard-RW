import { supabase } from '../utils/supabase';
import type { UserRole, ApiResponse } from '../types/index';

export interface RoleChangeRequest {
  id: string;
  user_id: string;
  from_role: UserRole;
  to_role: UserRole;
  justification: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'stale';
  reviewed_by?: string;
  reviewed_at?: string;
  review_note?: string;
  rejection_reason?: string;
  is_notified: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  requester_name?: string;
  requester_email?: string;
  reviewer_name?: string;
}

// ── SUBMIT ROLE CHANGE REQUEST ──────────────────────────────
export async function submitRoleChangeRequest(
  requestedRole: UserRole,
  justification: string
): Promise<ApiResponse<RoleChangeRequest>> {
  // Get current user
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', sessionData.session.user.id)
    .single();

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  // Check for existing pending request
  const { data: existingRequest } = await supabase
    .from('role_change_requests')
    .select('id')
    .eq('user_id', sessionData.session.user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingRequest) {
    return { data: null, error: 'You already have a pending role change request' };
  }

  // Create request
  const { data, error } = await supabase
    .from('role_change_requests')
    .insert({
      user_id: sessionData.session.user.id,
      from_role: profile.role,
      to_role: requestedRole,
      justification,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Log in audit trail
  await supabase.from('audit_log').insert({
    user_id: sessionData.session.user.id,
    action_type: 'role_change_request',
    action: 'Submitted role change request',
    detail: `Requested change from ${profile.role} to ${requestedRole}`,
    role: profile.role
  });

  return { data: data as RoleChangeRequest, error: null };
}

// ── GET ROLE CHANGE REQUESTS ────────────────────────────────
export async function getRoleChangeRequests(
  filters?: {
    status?: string;
    userId?: string;
  }
): Promise<ApiResponse<RoleChangeRequest[]>> {
  let query = supabase
    .from('role_change_requests')
    .select(`
      *,
      requester:profiles!user_id(full_name, email),
      reviewer:profiles!reviewed_by(full_name)
    `)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  // Flatten joined data
  const requests = data.map((req: any) => ({
    ...req,
    requester_name: req.requester?.full_name,
    requester_email: req.requester?.email,
    reviewer_name: req.reviewer?.full_name
  }));

  return { data: requests as RoleChangeRequest[], error: null };
}

// ── GET PENDING REQUESTS COUNT ──────────────────────────────
export async function getPendingRequestsCount(): Promise<ApiResponse<number>> {
  const { count, error } = await supabase
    .from('role_change_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: count || 0, error: null };
}

// ── APPROVE ROLE CHANGE REQUEST ─────────────────────────────
export async function approveRoleChangeRequest(
  requestId: string,
  approvalNote?: string
): Promise<ApiResponse<RoleChangeRequest>> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('role_change_requests')
    .update({
      status: 'approved',
      reviewed_by: sessionData.session.user.id,
      reviewed_at: new Date().toISOString(),
      review_note: approvalNote || null
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Log in audit trail
  await supabase.from('audit_log').insert({
    user_id: sessionData.session.user.id,
    action_type: 'role_change_approved',
    action: 'Approved role change request',
    detail: `Approved request ${requestId}`,
    role: 'dashboard_management'
  });

  return { data: data as RoleChangeRequest, error: null };
}

// ── REJECT ROLE CHANGE REQUEST ──────────────────────────────
export async function rejectRoleChangeRequest(
  requestId: string,
  rejectionReason: string
): Promise<ApiResponse<RoleChangeRequest>> {
  if (rejectionReason.length < 10) {
    return { data: null, error: 'Rejection reason must be at least 10 characters' };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('role_change_requests')
    .update({
      status: 'rejected',
      reviewed_by: sessionData.session.user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Log in audit trail
  await supabase.from('audit_log').insert({
    user_id: sessionData.session.user.id,
    action_type: 'role_change_rejected',
    action: 'Rejected role change request',
    detail: `Rejected request ${requestId}: ${rejectionReason}`,
    role: 'dashboard_management'
  });

  return { data: data as RoleChangeRequest, error: null };
}

// ── CANCEL ROLE CHANGE REQUEST ──────────────────────────────
export async function cancelRoleChangeRequest(
  requestId: string
): Promise<ApiResponse<RoleChangeRequest>> {
  const { data, error } = await supabase
    .from('role_change_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Log in audit trail
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    await supabase.from('audit_log').insert({
      user_id: sessionData.session.user.id,
      action_type: 'role_change_request',
      action: 'Cancelled role change request',
      detail: `Cancelled request ${requestId}`
    });
  }

  return { data: data as RoleChangeRequest, error: null };
}

import { supabase } from './supabase';
import type {
  Indicator,
  NBSAPTarget,
  District,
  Risk,
  AuditEntry,
  Notification,
  NotificationPreferences,
  UserSettings,
  ApiResponse,
} from '../types';

// ============================================================
// INDICATORS SERVICE
// ============================================================

export async function fetchIndicators(filters?: {
  tier?: string;
  targetId?: number;
  status?: string;
  search?: string;
}): Promise<Indicator[]> {
  let query = supabase
    .from('indicators')
    .select('*')
    .order('id', { ascending: true });

  if (filters?.tier && filters.tier !== 'all') {
    query = query.eq('tier', filters.tier);
  }
  if (filters?.targetId) {
    query = query.eq('nbsap_target_id', filters.targetId);
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('fetchIndicators error:', error);
    return [];
  }
  return (data || []) as Indicator[];
}

export async function updateIndicatorProgress(
  indicatorId: number,
  progress: number
): Promise<ApiResponse<Indicator>> {
  const status =
    progress >= 70 ? 'on-track' : progress >= 40 ? 'at-risk' : 'behind';

  const { data, error } = await supabase
    .from('indicators')
    .update({ progress, status })
    .eq('id', indicatorId)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Indicator, error: null };
}

export async function fetchTargets(): Promise<NBSAPTarget[]> {
  const { data, error } = await supabase
    .from('nbsap_targets')
    .select('*, indicators(*)')
    .order('id', { ascending: true });

  if (error) {
    console.error('fetchTargets error:', error);
    return [];
  }
  return (data || []) as NBSAPTarget[];
}

// ============================================================
// DISTRICTS SERVICE
// ============================================================

export async function fetchDistricts(): Promise<District[]> {
  const { data, error } = await supabase
    .from('districts')
    .select('*, province:provinces(id, name)')
    .order('province_id', { ascending: true });

  if (error) {
    console.error('fetchDistricts error:', error);
    return [];
  }
  return (data || []) as District[];
}

export async function updateDistrictStatus(
  districtId: number,
  status: District['status']
): Promise<ApiResponse<District>> {
  const { data, error } = await supabase
    .from('districts')
    .update({ status })
    .eq('id', districtId)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as District, error: null };
}

// ============================================================
// RISK REGISTER SERVICE
// ============================================================

export async function fetchRisks(filters?: {
  level?: string;
  category?: string;
  search?: string;
}): Promise<Risk[]> {
  let query = supabase
    .from('risks')
    .select('*')
    .order('level', { ascending: false });

  if (filters?.level && filters.level !== 'all') {
    query = query.eq('level', filters.level);
  }
  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }
  if (filters?.search) {
    query = query.ilike('description', `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('fetchRisks error:', error);
    return [];
  }
  return (data || []) as Risk[];
}

export async function upsertLiveRisk(risk: Partial<Risk> & { id: string }): Promise<void> {
  await supabase
    .from('risks')
    .upsert({ ...risk, is_live: true, updated_at: new Date().toISOString() })
    .eq('id', risk.id);
}

export async function removeLiveRisk(riskId: string): Promise<void> {
  await supabase
    .from('risks')
    .delete()
    .eq('id', riskId)
    .eq('is_live', true);
}

// ============================================================
// AUDIT LOG SERVICE
// ============================================================

export async function writeAuditEntry(
  actionType: string,
  action: string,
  detail?: string
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', sessionData.session.user.id)
    .single();

  await supabase.from('audit_log').insert({
    user_id: sessionData.session.user.id,
    action_type: actionType,
    action,
    detail: detail || null,
    role: profile?.role || null,
  });
}

export async function fetchAuditLog(filters?: {
  actionType?: string;
  userId?: string;
  limit?: number;
}): Promise<AuditEntry[]> {
  let query = supabase
    .from('audit_log')
    .select(`
      *,
      profile:profiles(full_name, email, role)
    `)
    .order('created_at', { ascending: false })
    .limit(filters?.limit || 200);

  if (filters?.actionType && filters.actionType !== 'all') {
    query = query.eq('action_type', filters.actionType);
  }
  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('fetchAuditLog error:', error);
    return [];
  }
  return (data || []) as AuditEntry[];
}

export async function exportAuditLogToCSV(entries: AuditEntry[]): Promise<string> {
  const fields = ['created_at', 'action_type', 'action', 'detail', 'role'];
  const header = fields.join(',');
  const rows = entries.map((e) =>
    fields
      .map((f) => `"${String((e as Record<string, unknown>)[f] ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header, ...rows].join('\n');
}

// ============================================================
// NOTIFICATIONS SERVICE
// ============================================================

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return (data || []) as Notification[];
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId);
}

export async function createNotification(
  userId: string,
  notification: {
    title: string;
    message: string;
    type?: Notification['type'];
    action_tab?: string;
    action_label?: string;
  }
): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: userId,
    ...notification,
    type: notification.type || 'info',
  });
}

// ============================================================
// NOTIFICATION PREFERENCES SERVICE
// ============================================================

export async function fetchNotifPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data as NotificationPreferences;
}

export async function saveNotifPreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>
): Promise<ApiResponse<NotificationPreferences>> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as NotificationPreferences, error: null };
}

// ============================================================
// USER SETTINGS SERVICE
// ============================================================

export async function fetchUserSettings(
  userId: string
): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data as UserSettings;
}

export async function saveUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<ApiResponse<UserSettings>> {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as UserSettings, error: null };
}

// ============================================================
// REALTIME SUBSCRIPTIONS
// ============================================================

export function subscribeToReports(
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => void
) {
  return supabase
    .channel('toolkit_reports_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'toolkit_reports' },
      callback
    )
    .subscribe();
}

export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => callback(payload.new as Notification)
    )
    .subscribe();
}

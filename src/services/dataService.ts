import { supabase } from '../utils/supabase';
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
} from '../types/index';

// ============================================================
// INDICATORS SERVICE
// ============================================================

export async function fetchIndicators(filters?: {
  tier?: string;
  targetId?: number;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<Indicator[]> {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 100; // default 100 per page
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('indicators')
    .select('*')
    .order('id', { ascending: true })
    .range(from, from + pageSize - 1);

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
  
  // Map the data and handle missing responsible_stakeholders column gracefully
  return (data || []).map((target: any) => ({
    ...target,
    responsible_stakeholders: target.responsible_stakeholders || []
  })) as NBSAPTarget[];
}

export async function fetchTargetsWithReportStats(): Promise<NBSAPTarget[]> {
  const { data, error } = await supabase
    .from('target_progress_with_reports')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('fetchTargetsWithReportStats error:', error);
    return [];
  }
  return (data || []) as NBSAPTarget[];
}

export async function fetchUserResponsibleTargets(userOrganization?: string): Promise<NBSAPTarget[]> {
  console.log('🔧 fetchUserResponsibleTargets called with userOrg:', userOrganization);
  
  try {
    // Use the database RPC function now that it has correct stakeholder mappings
    console.log('�️ Using database RPC function with updated stakeholder mappings');
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_user_responsible_targets', { user_org: userOrganization || '' });

    if (rpcError) {
      console.error('❌ RPC error:', rpcError);
      throw rpcError;
    }

    if (rpcData && rpcData.length > 0) {
      // Transform the RPC data to match NBSAPTarget interface
      const transformedTargets: NBSAPTarget[] = rpcData.map((item: any) => ({
        id: item.target_id,
        title: item.title,
        description: item.description,
        goal: item.goal,
        progress: item.progress,
        responsible_stakeholders: item.responsible_stakeholders || [],
        baseline: '', // Not returned by RPC
        goal_color: '', // Not returned by RPC  
        created_at: '', // Not returned by RPC
        updated_at: '', // Not returned by RPC
      }));

      console.log('✅ RPC success: returning', transformedTargets.length, 'targets from database function');
      console.log('🔍 Database targets:', transformedTargets.map(t => ({ 
        id: t.id, 
        title: t.title, 
        stakeholders: t.responsible_stakeholders 
      })));
      return transformedTargets;
    }

    // If RPC returns empty, fall back to all targets
    console.log('⚠️ RPC returned empty, falling back to all targets');
    return await fetchTargets();
    
  } catch (rpcError) {
    console.error('❌ RPC failed, using fallback method:', rpcError);
    
    // Fallback: get all targets with stakeholder mapping
    try {
      const fallbackTargets = await fetchTargets();
      console.log('� Fallback: loaded', fallbackTargets.length, 'targets from fetchTargets()');
      
      // Use the database mappings - these should now match the updated database
      return fallbackTargets;
      
    } catch (fallbackError) {
      console.error('❌ Fallback fetchTargets failed:', fallbackError);
      return [];
    }
  }
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

/**
 * Log an audit event for data exports and other map actions
 * @param eventType - Type of event (e.g., 'export', 'layer_switch', 'overlay_toggle')
 * @param metadata - Additional metadata about the event (e.g., layer name, export format)
 */
export async function logAuditEvent(
  eventType: string,
  metadata: Record<string, any>
): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    
    // If no session, log anonymously (for public access scenarios)
    const userId = sessionData.session?.user.id || 'anonymous';
    
    let role = null;
    if (sessionData.session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', sessionData.session.user.id)
        .single();
      role = profile?.role || null;
    }

    await supabase.from('audit_log').insert({
      user_id: userId,
      action_type: 'map_action',
      action: eventType,
      detail: JSON.stringify(metadata),
      role,
    });
  } catch (error) {
    // Don't throw errors for audit logging failures
    console.error('Failed to log audit event:', error);
  }
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
      .map((f) => `"${String((e as unknown as Record<string, unknown>)[f] ?? '').replace(/"/g, '""')}"`)
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
  const channelName = `toolkit_reports_changes:${Math.random().toString(36).slice(2)}`;
  return supabase
    .channel(channelName)
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

// ============================================================
// BIODIVERSITY MAP SERVICES
// ============================================================

/**
 * Get indicators aggregated by district
 * Since indicators are national-level, this returns the overall NBSAP progress
 * which can be applied to all districts or filtered by target
 */
export async function getIndicatorsByDistrict(filters?: {
  targetId?: number;
}): Promise<Map<number, { progress: number; indicatorCount: number }>> {
  // Fetch all indicators (optionally filtered by target)
  let query = supabase
    .from('indicators')
    .select('id, progress, nbsap_target_id');

  if (filters?.targetId) {
    query = query.eq('nbsap_target_id', filters.targetId);
  }

  const { data: indicators, error } = await query;
  
  if (error) {
    console.error('getIndicatorsByDistrict error:', error);
    return new Map();
  }

  if (!indicators || indicators.length === 0) {
    return new Map();
  }

  // Calculate average progress across all indicators
  const totalProgress = indicators.reduce((sum, ind) => sum + (ind.progress || 0), 0);
  const avgProgress = Math.round(totalProgress / indicators.length);
  const indicatorCount = indicators.length;

  // Fetch all districts
  const { data: districts, error: districtError } = await supabase
    .from('districts')
    .select('id');

  if (districtError || !districts) {
    console.error('getIndicatorsByDistrict districts error:', districtError);
    return new Map();
  }

  // Apply the same progress to all districts (national-level indicators)
  const result = new Map<number, { progress: number; indicatorCount: number }>();
  districts.forEach(district => {
    result.set(district.id, { progress: avgProgress, indicatorCount });
  });

  return result;
}

/**
 * Get risks aggregated by district
 * Calculates threat scores based on forest cover and documented risks
 */
export async function getRisksByDistrict(): Promise<Map<number, { 
  threatScore: number; 
  threatLevel: 'high' | 'medium' | 'low';
  riskFactors: string[];
}>> {
  // Fetch all districts with forest cover data
  const { data: districts, error: districtError } = await supabase
    .from('districts')
    .select('id, name, forest_cover');

  if (districtError || !districts) {
    console.error('getRisksByDistrict districts error:', districtError);
    return new Map();
  }

  // Fetch all risks
  const { data: risks, error: risksError } = await supabase
    .from('risks')
    .select('id, description, level, category');

  if (risksError) {
    console.error('getRisksByDistrict risks error:', risksError);
  }

  const result = new Map<number, { 
    threatScore: number; 
    threatLevel: 'high' | 'medium' | 'low';
    riskFactors: string[];
  }>();

  // Calculate threat score for each district
  districts.forEach(district => {
    let threatScore = 0;
    const riskFactors: string[] = [];

    // Forest cover assessment (0-40 points)
    // Lower forest cover = higher threat
    const forestCover = district.forest_cover || 0;
    if (forestCover < 15) {
      threatScore += 40;
      riskFactors.push('Very low forest cover');
    } else if (forestCover < 25) {
      threatScore += 30;
      riskFactors.push('Low forest cover');
    } else if (forestCover < 35) {
      threatScore += 20;
      riskFactors.push('Moderate forest cover');
    } else {
      threatScore += 10;
      riskFactors.push('Good forest cover');
    }

    // National-level risks contribute to all districts (0-40 points)
    // This is a simplified approach - in reality, risks would be district-specific
    if (risks && risks.length > 0) {
      const highRisks = risks.filter(r => r.level === 'High').length;
      const mediumRisks = risks.filter(r => r.level === 'Medium').length;
      
      const riskScore = Math.min((highRisks * 5) + (mediumRisks * 2), 40);
      threatScore += riskScore;
      
      if (highRisks > 0) {
        riskFactors.push(`${highRisks} high-priority national risks`);
      }
      if (mediumRisks > 0) {
        riskFactors.push(`${mediumRisks} medium-priority national risks`);
      }
    }

    // Determine threat level based on score
    let threatLevel: 'high' | 'medium' | 'low';
    if (threatScore >= 60) {
      threatLevel = 'high';
    } else if (threatScore >= 30) {
      threatLevel = 'medium';
    } else {
      threatLevel = 'low';
    }

    result.set(district.id, {
      threatScore,
      threatLevel,
      riskFactors
    });
  });

  return result;
}

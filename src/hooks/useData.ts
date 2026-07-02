import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { fetchReports, getDashboardStats, type ReportFilters } from '../services/reportService';
import {
  fetchIndicators,
  fetchDistricts,
  fetchRisks,
  fetchAuditLog,
  fetchNotifications,
  fetchNotifPreferences,
  fetchUserSettings,
  writeAuditEntry,
  subscribeToReports,
  subscribeToNotifications,
  getIndicatorsByDistrict,
  getRisksByDistrict,
  markAllNotificationsRead,
} from '../services/dataService';
import { useAuth } from '../services/AuthContext';
import type {
  ToolkitReport,
  Indicator,
  District,
  Risk,
  AuditEntry,
  Notification,
  DashboardStats,
  UserSettings,
} from '../types/index';

// ── Generic data fetcher hook ────────────────────────────────

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: unknown[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      if (mountedRef.current) setData(result);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => {
      mountedRef.current = false;
    };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ── Dashboard Stats ──────────────────────────────────────────

export function useDashboardStats(autoRefresh = true) {
  const { data, loading, error, refetch } = useAsync(getDashboardStats, []);

  // Auto-refresh every 60 seconds only if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refetch, 60_000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  return { stats: data as DashboardStats | null, loading, error, refetch };
}

// ── Toolkit Reports ──────────────────────────────────────────

export function useReports(filters: ReportFilters = {}) {
  const [reports, setReports] = useState<ToolkitReport[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchReports(filters);
      if (mountedRef.current) {
        setReports(result.data);
        setCount(result.count);
      }
    } catch (err) {
      console.error('useReports error:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [JSON.stringify(filters)]); // eslint-disable-line

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Only subscribe to realtime if explicitly requested
  useEffect(() => {
    if (!filters.realtime) return;
    const channel = subscribeToReports(() => load());
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, filters.realtime]);

  return { reports, count, loading, error, refetch: load };
}

// ── Pending verification count ────────────────────────────────

export function usePendingCount(): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    const { count: c } = await supabase
      .from('toolkit_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    setCount(c || 0);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh every 30s instead of realtime subscription
  useEffect(() => {
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  return count;
}

// ── Indicators ───────────────────────────────────────────────

export function useIndicators(filters?: {
  tier?: string;
  targetId?: number;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useAsync(() => fetchIndicators(filters), [JSON.stringify(filters)]);
}

// ── Districts ────────────────────────────────────────────────

export function useDistricts() {
  return useAsync(fetchDistricts, []);
}

// ── Risk Register ────────────────────────────────────────────

export function useRisks(filters?: { level?: string; category?: string; search?: string }) {
  return useAsync(() => fetchRisks(filters), [JSON.stringify(filters)]);
}

// ── Audit Log ────────────────────────────────────────────────

export function useAuditLog(filters?: { actionType?: string; limit?: number }) {
  const { permissions } = useAuth();
  const result = useAsync(() => fetchAuditLog(filters), [JSON.stringify(filters)]);
  // Return empty if no permission — but always call the hook
  if (!permissions?.canViewAuditLog) {
    return { data: [] as AuditEntry[], loading: false, error: null, refetch: () => {} };
  }
  return result;
}

// ── Notifications ────────────────────────────────────────────

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await fetchNotifications(user.id);
    setNotifications(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription for new notifications only
  useEffect(() => {
    if (!user?.id) return;
    const channel = subscribeToNotifications(user.id, (newNotif: Notification) => {
      setNotifications(prev => [newNotif, ...prev]);
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = useCallback(async () => {
    if (!user?.id || unreadCount === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await markAllNotificationsRead(user.id);
  }, [user?.id, unreadCount]);

  return { notifications, loading, unreadCount, refetch: load, markAllRead };
}

// ── Notification Preferences ──────────────────────────────────

export function useNotifPreferences() {
  const { user } = useAuth();
  return useAsync(
    () => (user?.id ? fetchNotifPreferences(user.id) : Promise.resolve(null)),
    [user?.id]
  );
}

// ── User Settings ────────────────────────────────────────────

export function useUserSettings() {
  const { user } = useAuth();
  return useAsync(
    () => (user?.id ? fetchUserSettings(user.id) : Promise.resolve(null)),
    [user?.id]
  );
}

// ── Audit Logger (imperative) ─────────────────────────────────

export function useAuditLogger() {
  const { permissions } = useAuth();
  return useCallback(
    (actionType: string, action: string, detail?: string) => {
      if (!permissions) return;
      writeAuditEntry(actionType, action, detail).catch(console.error);
    },
    [permissions]
  );
}

// ── NBSAP Progress by District ────────────────────────────────

export function useNBSAPProgress(targetId?: number) {
  return useAsync(() => getIndicatorsByDistrict(targetId ? { targetId } : undefined), [targetId]);
}

// ── Threat Level by District ──────────────────────────────────

export function useThreatLevels() {
  return useAsync(getRisksByDistrict, []);
}

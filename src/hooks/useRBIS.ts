// ══════════════════════════════════════════════════════════════════════════════
// RBIS Custom Hooks
// ══════════════════════════════════════════════════════════════════════════════
// React hooks for RBIS (Rwanda Biodiversity Information System) data fetching
// Provides hooks for connection management, metrics, indicators matrix, signal
// feed, and dashboard summary with auto-refresh and error handling capabilities.
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  connectToRBIS,
  disconnectFromRBIS,
  getConnectionStatus,
  fetchRBISMetrics,
  fetchRecentOccurrences,
  fetchGBFGoals,
  fetchRBISDataStreams,
  fetchRBISDashboardSummary,
} from '../services/rbisService';
import type {
  RBISConnection,
  RBISMetrics,
  RBISOccurrence,
  GBFGoal,
  RBISDataStream,
  RBISDashboardSummary,
} from '../types/rbis';

// ── RBIS Connection Hook ──────────────────────────────────────────────────────

/**
 * Hook for managing RBIS connection state
 * Provides connect/disconnect functions and tracks connection status
 * 
 * @returns Connection state, loading flag, and connect/disconnect functions
 * 
 * @example
 * ```tsx
 * const { connection, loading, connect, disconnect } = useRBISConnection();
 * 
 * return (
 *   <button onClick={connection.status === 'connected' ? disconnect : connect}>
 *     {connection.status === 'connected' ? 'Disconnect' : 'Connect'}
 *   </button>
 * );
 * ```
 */
export function useRBISConnection() {
  const [connection, setConnection] = useState<RBISConnection>({
    status: 'disconnected',
    serverUrl: 'rbis.ur.ac.rw',
    lastSync: null,
    error: null,
  });
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  // Load initial connection status
  useEffect(() => {
    mountedRef.current = true;
    
    const loadStatus = async () => {
      const status = await getConnectionStatus();
      if (mountedRef.current) {
        setConnection(status);
      }
    };
    
    loadStatus();
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    setConnection(prev => ({ ...prev, status: 'connecting', error: null }));
    
    try {
      const result = await connectToRBIS();
      if (mountedRef.current) {
        setConnection(result);
      }
    } catch (error) {
      if (mountedRef.current) {
        setConnection(prev => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Connection failed',
        }));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await disconnectFromRBIS();
      if (mountedRef.current) {
        setConnection({
          status: 'disconnected',
          serverUrl: 'rbis.ur.ac.rw',
          lastSync: null,
          error: null,
        });
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, []);

  return { connection, loading, connect, disconnect };
}

// ── RBIS Metrics Hook ─────────────────────────────────────────────────────────

/**
 * Hook for fetching RBIS metrics and recent occurrences
 * Supports auto-refresh with configurable interval
 * 
 * @param autoRefresh - Enable automatic refresh (default: true)
 * @param refreshInterval - Refresh interval in milliseconds (default: 30000 = 30 seconds)
 * @returns Metrics data, recent occurrences, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { metrics, recentOccurrences, loading, error, refetch } = useRBISMetrics();
 * 
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
 * 
 * return (
 *   <div>
 *     <p>Total Occurrences: {metrics?.totalOccurrences}</p>
 *     <p>Last 24h: {metrics?.last24Hours}</p>
 *   </div>
 * );
 * ```
 */
export function useRBISMetrics(autoRefresh = true, refreshInterval = 30000) {
  const [metrics, setMetrics] = useState<RBISMetrics | null>(null);
  const [recentOccurrences, setRecentOccurrences] = useState<RBISOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [metricsData, occurrences] = await Promise.all([
        fetchRBISMetrics(),
        fetchRecentOccurrences(5),
      ]);
      
      if (mountedRef.current) {
        setMetrics(metricsData);
        setRecentOccurrences(occurrences);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, load]);

  return { metrics, recentOccurrences, loading, error, refetch: load };
}

// ── Indicators Matrix Hook ────────────────────────────────────────────────────

/**
 * Hook for fetching GBF goals with targets and indicators
 * Provides the complete indicators-targets-RBIS matrix data
 * 
 * @returns Goals data with nested targets and indicators, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { goals, loading, error, refetch } = useIndicatorsMatrix();
 * 
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
 * 
 * return (
 *   <div>
 *     {goals.map(goal => (
 *       <GBFGoalSection key={goal.id} goal={goal} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useIndicatorsMatrix() {
  const [goals, setGoals] = useState<GBFGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchGBFGoals();
      if (mountedRef.current) {
        setGoals(data);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load indicators');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { goals, loading, error, refetch: load };
}

// ── RBIS Data Streams Hook ────────────────────────────────────────────────────

/**
 * Hook for fetching RBIS data streams (signal feed)
 * Supports auto-refresh with configurable interval
 * 
 * @param autoRefresh - Enable automatic refresh (default: true)
 * @param refreshInterval - Refresh interval in milliseconds (default: 60000 = 60 seconds)
 * @returns Data streams, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { dataStreams, loading, error, refetch } = useRBISDataStreams();
 * 
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
 * 
 * return (
 *   <div>
 *     {dataStreams.map(stream => (
 *       <DataStreamCard key={stream.id} stream={stream} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useRBISDataStreams(autoRefresh = true, refreshInterval = 60000) {
  const [dataStreams, setDataStreams] = useState<RBISDataStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchRBISDataStreams();
      if (mountedRef.current) {
        setDataStreams(data);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load data streams');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, load]);

  return { dataStreams, loading, error, refetch: load };
}

/**
 * Alias for useRBISDataStreams to match design document naming
 * @deprecated Use useRBISDataStreams instead for better semantic clarity
 */
export const useRBISSignalFeed = useRBISDataStreams;

// ── Dashboard Summary Hook ────────────────────────────────────────────────────

/**
 * Hook for fetching RBIS dashboard summary statistics
 * Provides aggregated metrics across all goals, targets, indicators, and data streams
 * 
 * @returns Summary data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { summary, loading, error, refetch } = useRBISDashboardSummary();
 * 
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
 * 
 * return (
 *   <div>
 *     <p>Total Indicators: {summary?.totalIndicators}</p>
 *     <p>Linked: {summary?.linkedIndicators} ({summary?.linkagePercentage}%)</p>
 *     <p>On Track: {summary?.onTrackIndicators}</p>
 *   </div>
 * );
 * ```
 */
export function useRBISDashboardSummary() {
  const [summary, setSummary] = useState<RBISDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchRBISDashboardSummary();
      if (mountedRef.current) {
        setSummary(data);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load summary');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { summary, loading, error, refetch: load };
}

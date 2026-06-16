// ══════════════════════════════════════════════════════════════════════════════
// RBIS Service Module
// ══════════════════════════════════════════════════════════════════════════════
// API integration functions for RBIS (Rwanda Biodiversity Information System)
// Handles connection management, metrics fetching, data stream operations,
// and GBIF API integration with rate limiting.
// ══════════════════════════════════════════════════════════════════════════════

import { supabase } from '../../supabase';
import type {
  RBISConnection,
  RBISMetrics,
  RBISOccurrence,
  RBISDataStream,
  GBFGoal,
  NBSAPTarget,
  Indicator,
  RBISDashboardSummary,
  SearchFilters,
} from '../types/rbis';

// ── Constants ─────────────────────────────────────────────────────────────────

const RBIS_BASE_URL = 'https://rbis.ur.ac.rw/api';
const GBIF_BASE_URL = 'https://api.gbif.org/v1';
const RWANDA_CODE = 'RW';

// Rate limiting: 1 request per second for GBIF API
const GBIF_RATE_LIMIT_MS = 1000;
let lastGBIFRequest = 0;

// ── Rate Limiting Helper ──────────────────────────────────────────────────────

/**
 * Enforces rate limiting for GBIF API calls (1 req/sec)
 * Waits if necessary before allowing the next request
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastGBIFRequest;
  
  if (timeSinceLastRequest < GBIF_RATE_LIMIT_MS) {
    const waitTime = GBIF_RATE_LIMIT_MS - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastGBIFRequest = Date.now();
}

// ── RBIS Connection Management ────────────────────────────────────────────────

/**
 * Attempts to establish connection to RBIS server
 * @returns Connection status object with server details and error info
 */
export async function connectToRBIS(): Promise<RBISConnection> {
  try {
    const response = await fetch(`${RBIS_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`RBIS connection failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Log successful connection
    await logRBISConnection('connected', null);

    return {
      status: 'connected',
      serverUrl: 'rbis.ur.ac.rw',
      lastSync: new Date().toISOString(),
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
    await logRBISConnection('error', errorMessage);
    
    return {
      status: 'error',
      serverUrl: 'rbis.ur.ac.rw',
      lastSync: null,
      error: errorMessage,
    };
  }
}

/**
 * Disconnects from RBIS server and logs the event
 */
export async function disconnectFromRBIS(): Promise<void> {
  await logRBISConnection('disconnected', null);
}

/**
 * Gets the current RBIS connection status from the connection log
 * @returns Most recent connection status or default disconnected state
 */
export async function getConnectionStatus(): Promise<RBISConnection> {
  try {
    const { data, error } = await supabase
      .from('rbis_connection_log')
      .select('status, server_url, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return {
        status: 'disconnected',
        serverUrl: 'rbis.ur.ac.rw',
        lastSync: null,
        error: null,
      };
    }

    return {
      status: data.status as RBISConnection['status'],
      serverUrl: data.server_url,
      lastSync: data.status === 'connected' ? data.created_at : null,
      error: data.error_message,
    };
  } catch (error) {
    console.error('getConnectionStatus error:', error);
    return {
      status: 'disconnected',
      serverUrl: 'rbis.ur.ac.rw',
      lastSync: null,
      error: null,
    };
  }
}

/**
 * Logs RBIS connection events to the database
 * @param status - Connection status (connected, disconnected, error)
 * @param errorMessage - Error message if status is 'error'
 */
async function logRBISConnection(
  status: string,
  errorMessage: string | null
): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    
    await supabase.from('rbis_connection_log').insert({
      status,
      server_url: 'rbis.ur.ac.rw',
      error_message: errorMessage,
      user_id: sessionData.session?.user.id || null,
    });
  } catch (error) {
    console.error('logRBISConnection error:', error);
  }
}

// ── RBIS Metrics ──────────────────────────────────────────────────────────────

/**
 * Fetches real-time RBIS metrics from GBIF API
 * Includes total occurrences, recent additions, and active data streams
 * @returns Metrics object with occurrence counts and stream information
 */
export async function fetchRBISMetrics(): Promise<RBISMetrics> {
  try {
    // Fetch occurrence counts with rate limiting
    const [total, last24h, last7d] = await Promise.all([
      fetchGBIFCount({}),
      fetchGBIFCount({ eventDate: getDateRange(1) }),
      fetchGBIFCount({ eventDate: getDateRange(7) }),
    ]);

    // Fetch active data streams count from database
    const { count: activeStreams } = await supabase
      .from('rbis_data_streams')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    return {
      totalOccurrences: total,
      last24Hours: last24h,
      last7Days: last7d,
      activeDataStreams: activeStreams || 0,
      lastDataUpdate: new Date().toISOString(),
    };
  } catch (error) {
    console.error('fetchRBISMetrics error:', error);
    throw new Error('Failed to fetch RBIS metrics');
  }
}

/**
 * Fetches occurrence count from GBIF API with optional filters
 * @param params - Query parameters for filtering (e.g., eventDate)
 * @returns Total count of matching occurrences
 */
async function fetchGBIFCount(params: Record<string, string>): Promise<number> {
  await enforceRateLimit();
  
  const queryParams = new URLSearchParams({
    country: RWANDA_CODE,
    limit: '0',
    ...params,
  });

  try {
    const response = await fetch(`${GBIF_BASE_URL}/occurrence/search?${queryParams}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`GBIF API error: HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.error('fetchGBIFCount error:', error);
    return 0;
  }
}

/**
 * Generates date range string for GBIF API queries
 * @param days - Number of days to look back from today
 * @returns Date range string in format "YYYY-MM-DD,YYYY-MM-DD"
 */
function getDateRange(days: number): string {
  const now = new Date();
  const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return `${past.toISOString().split('T')[0]},${now.toISOString().split('T')[0]}`;
}

// ── Recent Occurrences ────────────────────────────────────────────────────────

/**
 * Fetches most recent occurrence records from GBIF
 * @param limit - Maximum number of records to return (default: 5)
 * @returns Array of recent occurrence records
 */
export async function fetchRecentOccurrences(limit = 5): Promise<RBISOccurrence[]> {
  await enforceRateLimit();
  
  const queryParams = new URLSearchParams({
    country: RWANDA_CODE,
    limit: limit.toString(),
    hasCoordinate: 'true',
  });

  try {
    const response = await fetch(`${GBIF_BASE_URL}/occurrence/search?${queryParams}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!response.ok) {
      throw new Error(`GBIF API error: HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    return (data.results || []).map((record: any) => ({
      id: record.key?.toString() || Math.random().toString(),
      scientificName: record.scientificName || 'Unknown species',
      location: record.stateProvince || record.locality || 'Rwanda',
      timestamp: record.eventDate || record.modified || new Date().toISOString(),
      dataStream: record.datasetName || 'GBIF',
      coordinates: record.decimalLatitude && record.decimalLongitude ? {
        latitude: record.decimalLatitude,
        longitude: record.decimalLongitude,
      } : undefined,
    }));
  } catch (error) {
    console.error('fetchRecentOccurrences error:', error);
    return [];
  }
}

// ── Indicators with RBIS Linkages ─────────────────────────────────────────────

/**
 * Fetches all indicators with their RBIS linkage information
 * @returns Array of indicators with linkage status and data streams
 */
export async function fetchIndicatorsWithLinkages(): Promise<Indicator[]> {
  try {
    const { data: indicators, error } = await supabase
      .from('indicators')
      .select(`
        *,
        rbis_linkages (
          linkage_status,
          data_stream_id,
          last_sync
        )
      `)
      .order('id', { ascending: true });

    if (error) {
      console.error('fetchIndicatorsWithLinkages error:', error);
      return [];
    }

    return (indicators || []).map((ind: any) => {
      // Extract RBIS linkages
      const linkages = ind.rbis_linkages || [];
      const linkageStatus = linkages.length > 0 ? linkages[0].linkage_status : 'not-linked';
      const dataStreams = linkages.map((l: any) => l.data_stream_id);
      const lastSync = linkages.length > 0 ? linkages[0].last_sync : undefined;

      return {
        id: ind.id,
        targetId: ind.nbsap_target_id,
        number: `${ind.nbsap_target_id}.${ind.id}`,
        title: ind.name,
        definition: ind.definition,
        measurementUnit: ind.periodicity || 'Annual',
        progress: ind.progress || 0,
        status: mapIndicatorStatus(ind.status),
        baseline: ind.baseline,
        target2030: ind.final_target,
        currentValue: ind.current_value,
        rbisLinkage: {
          status: linkageStatus,
          dataStreams,
          lastSync,
        },
      };
    });
  } catch (error) {
    console.error('fetchIndicatorsWithLinkages error:', error);
    return [];
  }
}

/**
 * Maps database indicator status to RBIS indicator status
 * @param dbStatus - Status from database ('on-track', 'at-risk', 'behind')
 * @returns Mapped indicator status
 */
function mapIndicatorStatus(dbStatus: string): 'on-track' | 'at-risk' | 'off-track' {
  if (dbStatus === 'on-track') return 'on-track';
  if (dbStatus === 'at-risk') return 'at-risk';
  return 'off-track'; // 'behind' maps to 'off-track'
}

// ── Targets with Indicators ───────────────────────────────────────────────────

/**
 * Fetches all NBSAP targets with their associated indicators
 * @returns Array of targets with nested indicators and calculated progress
 */
export async function fetchTargetsWithIndicators(): Promise<NBSAPTarget[]> {
  try {
    const { data: targets, error } = await supabase
      .from('nbsap_targets')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('fetchTargetsWithIndicators error:', error);
      return [];
    }

    const indicators = await fetchIndicatorsWithLinkages();
    
    return (targets || []).map((target: any) => {
      const targetIndicators = indicators.filter(ind => ind.targetId === target.id);
      const avgProgress = targetIndicators.length > 0
        ? Math.round(targetIndicators.reduce((sum, ind) => sum + ind.progress, 0) / targetIndicators.length)
        : 0;

      return {
        id: target.id,
        goalId: target.goal,
        number: `Target ${target.id}`,
        title: target.title,
        description: target.description,
        indicators: targetIndicators,
        averageProgress: avgProgress,
      };
    });
  } catch (error) {
    console.error('fetchTargetsWithIndicators error:', error);
    return [];
  }
}

// ── GBF Goals with Targets ────────────────────────────────────────────────────

/**
 * Fetches all GBF goals with their targets and indicators
 * @returns Array of GBF goals with nested targets and calculated progress
 */
export async function fetchGBFGoals(): Promise<GBFGoal[]> {
  try {
    const targets = await fetchTargetsWithIndicators();
    
    const goalDefinitions = [
      { 
        id: 'A' as const, 
        title: 'Goal A: Ecosystem Integrity', 
        description: 'Maintain and restore ecosystem integrity, connectivity, and resilience' 
      },
      { 
        id: 'B' as const, 
        title: 'Goal B: Sustainable Use', 
        description: 'Ensure sustainable use and equitable benefit-sharing' 
      },
      { 
        id: 'C' as const, 
        title: 'Goal C: Benefit Sharing', 
        description: 'Fair and equitable sharing of benefits from genetic resources' 
      },
      { 
        id: 'D' as const, 
        title: 'Goal D: Implementation', 
        description: 'Adequate means of implementation and capacity building' 
      },
    ];

    return goalDefinitions.map(goal => {
      const goalTargets = targets.filter(t => t.goalId === goal.id);
      const avgProgress = goalTargets.length > 0
        ? Math.round(goalTargets.reduce((sum, t) => sum + t.averageProgress, 0) / goalTargets.length)
        : 0;

      return {
        ...goal,
        targets: goalTargets,
        averageProgress: avgProgress,
      };
    });
  } catch (error) {
    console.error('fetchGBFGoals error:', error);
    return [];
  }
}

// ── RBIS Data Streams ─────────────────────────────────────────────────────────

/**
 * Fetches all RBIS data streams from the database
 * @returns Array of data streams with occurrence counts and status
 */
export async function fetchRBISDataStreams(): Promise<RBISDataStream[]> {
  try {
    const { data: streams, error } = await supabase
      .from('rbis_data_streams')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('fetchRBISDataStreams error:', error);
      return [];
    }

    return (streams || []).map((stream: any) => ({
      id: stream.id,
      name: stream.name,
      description: stream.description,
      targetNumbers: stream.target_numbers || [],
      occurrenceCount: stream.occurrence_count || 0,
      status: stream.status,
      errorMessage: stream.error_message,
      lastUpdate: stream.last_update || new Date().toISOString(),
      icon: stream.icon,
      color: stream.color,
    }));
  } catch (error) {
    console.error('fetchRBISDataStreams error:', error);
    return [];
  }
}

/**
 * Updates the occurrence count for a specific data stream
 * @param streamId - ID of the data stream to update
 * @param count - New occurrence count
 */
export async function updateDataStreamCount(
  streamId: string,
  count: number
): Promise<void> {
  try {
    await supabase
      .from('rbis_data_streams')
      .update({
        occurrence_count: count,
        last_update: new Date().toISOString(),
      })
      .eq('id', streamId);
  } catch (error) {
    console.error('updateDataStreamCount error:', error);
  }
}

/**
 * Updates the status of a data stream
 * @param streamId - ID of the data stream to update
 * @param status - New status ('active', 'inactive', 'error')
 * @param errorMessage - Optional error message if status is 'error'
 */
export async function updateDataStreamStatus(
  streamId: string,
  status: 'active' | 'inactive' | 'error',
  errorMessage?: string
): Promise<void> {
  try {
    await supabase
      .from('rbis_data_streams')
      .update({
        status,
        error_message: errorMessage || null,
        last_update: new Date().toISOString(),
      })
      .eq('id', streamId);
  } catch (error) {
    console.error('updateDataStreamStatus error:', error);
  }
}

// ── Dashboard Summary ─────────────────────────────────────────────────────────

/**
 * Fetches comprehensive dashboard summary statistics
 * @returns Summary object with counts, percentages, and aggregated metrics
 */
export async function fetchRBISDashboardSummary(): Promise<RBISDashboardSummary> {
  try {
    const [goals, streams, metrics] = await Promise.all([
      fetchGBFGoals(),
      fetchRBISDataStreams(),
      fetchRBISMetrics(),
    ]);

    const allIndicators = goals.flatMap(g => g.targets.flatMap(t => t.indicators));
    const linkedIndicators = allIndicators.filter(i => i.rbisLinkage.status === 'linked');
    const linkagePercentage = allIndicators.length > 0
      ? Math.round((linkedIndicators.length / allIndicators.length) * 100)
      : 0;

    return {
      totalTargets: goals.flatMap(g => g.targets).length,
      totalIndicators: allIndicators.length,
      linkedIndicators: linkedIndicators.length,
      linkagePercentage,
      onTrackIndicators: allIndicators.filter(i => i.status === 'on-track').length,
      atRiskIndicators: allIndicators.filter(i => i.status === 'at-risk').length,
      offTrackIndicators: allIndicators.filter(i => i.status === 'off-track').length,
      activeDataStreams: streams.filter(s => s.status === 'active').length,
      totalOccurrences: metrics.totalOccurrences,
    };
  } catch (error) {
    console.error('fetchRBISDashboardSummary error:', error);
    throw new Error('Failed to fetch dashboard summary');
  }
}

// ── Search and Filter Functions ───────────────────────────────────────────────

/**
 * Filters GBF goals based on search term and goal filter
 * @param goals - Array of GBF goals to filter
 * @param filters - Search and filter parameters
 * @returns Filtered array of GBF goals
 */
export function filterGoals(goals: GBFGoal[], filters: SearchFilters): GBFGoal[] {
  let filtered = [...goals];

  // Apply goal filter
  if (filters.goalFilter !== 'all') {
    filtered = filtered.filter(goal => goal.id === filters.goalFilter);
  }

  // Apply search term
  if (filters.searchTerm.trim()) {
    const term = filters.searchTerm.toLowerCase();
    
    filtered = filtered.map(goal => ({
      ...goal,
      targets: goal.targets
        .map(target => ({
          ...target,
          indicators: target.indicators.filter(indicator =>
            indicator.title.toLowerCase().includes(term) ||
            indicator.number.toLowerCase().includes(term) ||
            target.title.toLowerCase().includes(term) ||
            target.description.toLowerCase().includes(term)
          ),
        }))
        .filter(target => target.indicators.length > 0),
    })).filter(goal => goal.targets.length > 0);
  }

  // Apply status filter
  if (filters.statusFilter && filters.statusFilter !== 'all') {
    filtered = filtered.map(goal => ({
      ...goal,
      targets: goal.targets
        .map(target => ({
          ...target,
          indicators: target.indicators.filter(
            indicator => indicator.status === filters.statusFilter
          ),
        }))
        .filter(target => target.indicators.length > 0),
    })).filter(goal => goal.targets.length > 0);
  }

  // Apply linkage filter
  if (filters.linkageFilter && filters.linkageFilter !== 'all') {
    filtered = filtered.map(goal => ({
      ...goal,
      targets: goal.targets
        .map(target => ({
          ...target,
          indicators: target.indicators.filter(
            indicator => indicator.rbisLinkage.status === filters.linkageFilter
          ),
        }))
        .filter(target => target.indicators.length > 0),
    })).filter(goal => goal.targets.length > 0);
  }

  return filtered;
}

/**
 * Searches for a specific target by ID across all goals
 * @param goals - Array of GBF goals to search
 * @param targetId - ID of the target to find
 * @returns Target object if found, undefined otherwise
 */
export function findTargetById(goals: GBFGoal[], targetId: number): NBSAPTarget | undefined {
  for (const goal of goals) {
    const target = goal.targets.find(t => t.id === targetId);
    if (target) return target;
  }
  return undefined;
}

/**
 * Gets all data streams that support a specific target
 * @param streams - Array of data streams
 * @param targetId - ID of the target
 * @returns Array of data streams supporting the target
 */
export function getDataStreamsForTarget(
  streams: RBISDataStream[],
  targetId: number
): RBISDataStream[] {
  return streams.filter(stream => stream.targetNumbers.includes(targetId));
}

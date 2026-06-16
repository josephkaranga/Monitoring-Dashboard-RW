// ══════════════════════════════════════════════════════════════════════════════
// RBIS Type Definitions
// ══════════════════════════════════════════════════════════════════════════════
// TypeScript interfaces for the RBIS (Rwanda Biodiversity Information System)
// Comprehensive Dashboard. These types define the data structures for connection
// management, metrics, indicators, targets, data streams, and filtering.
// ══════════════════════════════════════════════════════════════════════════════

// ── RBIS Connection ──────────────────────────────────────────────────────────

/**
 * Represents the current state of the RBIS connection
 */
export interface RBISConnection {
  /** Current connection status */
  status: RBISConnectionStatus;
  /** RBIS server URL */
  serverUrl: string;
  /** Timestamp of last successful sync, null if never synced */
  lastSync: string | null;
  /** Error message if connection failed, null otherwise */
  error: string | null;
}

/**
 * Possible RBIS connection states
 */
export type RBISConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// ── RBIS Metrics ─────────────────────────────────────────────────────────────

/**
 * Real-time metrics from RBIS and GBIF
 */
export interface RBISMetrics {
  /** Total number of occurrence records in RBIS */
  totalOccurrences: number;
  /** Number of records added in the last 24 hours */
  last24Hours: number;
  /** Number of records added in the last 7 days */
  last7Days: number;
  /** Number of active data streams */
  activeDataStreams: number;
  /** Timestamp of the last data update */
  lastDataUpdate: string;
}

/**
 * Individual biodiversity occurrence record from RBIS/GBIF
 */
export interface RBISOccurrence {
  /** Unique identifier for the occurrence */
  id: string;
  /** Scientific name of the species */
  scientificName: string;
  /** Location where the occurrence was recorded */
  location: string;
  /** Timestamp when the occurrence was recorded */
  timestamp: string;
  /** Data stream that provided this occurrence */
  dataStream: string;
  /** Optional geographic coordinates */
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// ── Indicators and Targets ───────────────────────────────────────────────────

/**
 * Global Biodiversity Framework (GBF) Goal
 * Represents one of the 4 high-level biodiversity goals
 */
export interface GBFGoal {
  /** Goal identifier (A, B, C, or D) */
  id: 'A' | 'B' | 'C' | 'D';
  /** Goal title */
  title: string;
  /** Goal description */
  description: string;
  /** National targets associated with this goal */
  targets: NBSAPTarget[];
  /** Average progress across all targets in this goal (0-100) */
  averageProgress: number;
}

/**
 * National Biodiversity Strategy and Action Plan (NBSAP) Target
 * Represents a specific national biodiversity goal aligned with GBF goals
 */
export interface NBSAPTarget {
  /** Unique target identifier */
  id: number;
  /** Parent GBF goal identifier */
  goalId: 'A' | 'B' | 'C' | 'D';
  /** Target number (e.g., "Target 1") */
  number: string;
  /** Target title */
  title: string;
  /** Target description */
  description: string;
  /** Indicators associated with this target */
  indicators: Indicator[];
  /** Average progress across all indicators in this target (0-100) */
  averageProgress: number;
}

/**
 * Biodiversity indicator
 * Represents a measurable metric tracking progress toward a national target
 */
export interface Indicator {
  /** Unique indicator identifier */
  id: number;
  /** Parent target identifier */
  targetId: number;
  /** Indicator number (e.g., "1.1") */
  number: string;
  /** Indicator title */
  title: string;
  /** Detailed definition of the indicator */
  definition: string;
  /** Unit of measurement (e.g., "Hectares", "Percentage", "Annual") */
  measurementUnit: string;
  /** Current progress percentage (0-100) */
  progress: number;
  /** On-track status based on expected progress */
  status: IndicatorStatus;
  /** RBIS linkage information */
  rbisLinkage: RBISLinkage;
  /** Baseline value at the start of NBSAP period */
  baseline: string;
  /** Target value to achieve by 2030 */
  target2030: string;
  /** Current measured value */
  currentValue: string;
}

/**
 * Indicator on-track status
 * Determined by comparing current progress to expected progress
 */
export type IndicatorStatus = 'on-track' | 'at-risk' | 'off-track';

/**
 * RBIS linkage information for an indicator
 * Describes how the indicator is connected to RBIS data streams
 */
export interface RBISLinkage {
  /** Linkage status */
  status: RBISLinkageStatus;
  /** Names of connected RBIS data streams */
  dataStreams: string[];
  /** Timestamp of last sync with RBIS, if linked */
  lastSync?: string;
}

/**
 * RBIS linkage status
 * - linked: Indicator is fully connected to RBIS data streams
 * - not-linked: Indicator has no RBIS connection
 * - partial: Indicator is partially connected (some data from RBIS, some manual)
 */
export type RBISLinkageStatus = 'linked' | 'not-linked' | 'partial';

// ── RBIS Data Streams ────────────────────────────────────────────────────────

/**
 * RBIS data stream
 * Represents a source of biodiversity data (e.g., Protected Areas, Threatened Species)
 */
export interface RBISDataStream {
  /** Unique data stream identifier */
  id: string;
  /** Data stream name */
  name: string;
  /** Data stream description */
  description: string;
  /** National target IDs this stream supports */
  targetNumbers: number[];
  /** Live occurrence record count from GBIF */
  occurrenceCount: number;
  /** Current stream status */
  status: DataStreamStatus;
  /** Error message if status is 'error' */
  errorMessage?: string;
  /** Timestamp of last update */
  lastUpdate: string;
  /** Optional icon identifier for UI display */
  icon?: string;
  /** Optional color code for UI display */
  color?: string;
}

/**
 * Data stream status
 * - active: Stream is operational and providing data
 * - inactive: Stream is not currently providing data
 * - error: Stream encountered an error
 */
export type DataStreamStatus = 'active' | 'inactive' | 'error';

// ── Filter and Search ────────────────────────────────────────────────────────

/**
 * GBF goal filter option
 * Used to filter indicators and targets by GBF goal
 */
export type GBFGoalFilter = 'all' | 'A' | 'B' | 'C' | 'D';

/**
 * Search and filter parameters for the indicators matrix
 */
export interface SearchFilters {
  /** Search term to match against indicator/target titles and descriptions */
  searchTerm: string;
  /** GBF goal filter */
  goalFilter: GBFGoalFilter;
  /** Optional indicator status filter */
  statusFilter?: IndicatorStatus | 'all';
  /** Optional RBIS linkage status filter */
  linkageFilter?: RBISLinkageStatus | 'all';
}

// ── Dashboard Summary ────────────────────────────────────────────────────────

/**
 * Dashboard-wide summary statistics
 * Provides high-level overview of NBSAP progress and RBIS integration
 */
export interface RBISDashboardSummary {
  /** Total number of national targets */
  totalTargets: number;
  /** Total number of indicators */
  totalIndicators: number;
  /** Number of indicators linked to RBIS */
  linkedIndicators: number;
  /** Percentage of indicators linked to RBIS (0-100) */
  linkagePercentage: number;
  /** Number of indicators on track */
  onTrackIndicators: number;
  /** Number of indicators at risk */
  atRiskIndicators: number;
  /** Number of indicators off track */
  offTrackIndicators: number;
  /** Number of active data streams */
  activeDataStreams: number;
  /** Total occurrence records across all data streams */
  totalOccurrences: number;
}

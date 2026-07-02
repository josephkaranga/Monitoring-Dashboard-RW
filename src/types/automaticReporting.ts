// ============================================================
// Automatic Reporting Updates System — TypeScript Interfaces
// ============================================================

import type { ReportType, SubmissionStatus } from './index';

// ── ENUMS ────────────────────────────────────────────────────

/**
 * Enum for all reporting tool IDs used in the system
 */
export enum ToolId {
  T01 = 'T01', // National Institutional Reporting
  T02 = 'T02', // District Biodiversity Monitoring
  T03 = 'T03', // Protected Area Monitoring
  T04 = 'T04', // Community Biodiversity Monitoring
  T05 = 'T05', // Biodiversity Finance Tracking
  T06 = 'T06', // Private Sector Compliance
  T07 = 'T07', // Research & Academic Contribution
}

/**
 * Enum for EIA compliance states
 */
export enum ComplianceState {
  COMPLIANT = 'compliant',
  PARTIAL_COMPLIANT = 'partial_compliant',
  NON_COMPLIANT = 'non_compliant',
  PENDING_REVIEW = 'pending_review',
  NOT_APPLICABLE = 'not_applicable',
}

/**
 * Enum for update processing status
 */
export enum UpdateStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

// ── CORE INTERFACES ──────────────────────────────────────────

/**
 * Interface for tool weight configuration
 */
export interface ToolWeight {
  /** Tool identifier (T01-T07) */
  toolId: ToolId;
  /** Numerical weight factor (0-1, all weights must sum to 1.0) */
  weight: number;
  /** Human-readable description of the tool */
  description: string;
  /** Whether this tool weight is currently active */
  active: boolean;
  /** When this weight configuration was last updated */
  updatedAt: Date;
}

/**
 * Interface for progress calculation operations
 */
export interface ProgressCalculation {
  /** The target ID being updated */
  targetId: number;
  /** The tool ID contributing to the progress */
  toolId: ToolId;
  /** The tool weight applied in this calculation */
  toolWeight: number;
  /** The base contribution value from the report */
  baseContribution: number;
  /** The weighted contribution (baseContribution * toolWeight) */
  weightedContribution: number;
  /** The previous progress value before this update */
  previousProgress: number;
  /** The new progress value after this update (capped at 100) */
  newProgress: number;
  /** Timestamp when this calculation was performed */
  calculatedAt: Date;
  /** The report ID that triggered this calculation */
  reportId: string;
}

/**
 * Interface for update operation results
 */
export interface UpdateResult {
  /** Whether the update operation was successful */
  success: boolean;
  /** The target ID that was updated */
  targetId: number;
  /** Whether progress was actually updated */
  progressUpdated: boolean;
  /** Whether EIA compliance was updated (for T06 reports) */
  eiaComplianceUpdated: boolean;
  /** Time taken to process the update (in milliseconds) */
  processingTime: number;
  /** The new progress value after update */
  newProgress?: number;
  /** Any error message if the update failed */
  errorMessage?: string;
  /** Details of the calculation performed */
  calculationDetails?: ProgressCalculation;
  /** Timestamp when the update was completed */
  updatedAt: Date;
}

// ── EIA COMPLIANCE INTERFACES ────────────────────────────────

/**
 * Interface for EIA compliance metrics
 */
export interface EIAMetrics {
  /** Total number of T06 reports processed */
  totalReports: number;
  /** Number of compliant reports */
  compliantReports: number;
  /** Number of partially compliant reports */
  partialCompliant: number;
  /** Number of non-compliant reports */
  nonCompliant: number;
  /** Overall compliance percentage (0-100) */
  compliancePercentage: number;
  /** Number of active compliance issues */
  activeIssues: number;
  /** Timestamp of last update */
  lastUpdated: Date;
}

/**
 * Interface for EIA compliance tracking data
 */
export interface EIAComplianceData {
  /** Report ID */
  reportId: string;
  /** Compliance state */
  complianceState: ComplianceState;
  /** Compliance score (0-100) */
  complianceScore: number;
  /** Issues identified in the report */
  issues: string[];
  /** Mitigation measures proposed */
  mitigationMeasures: string[];
  /** Date of compliance assessment */
  assessmentDate: Date;
}

// ── ORGANIZATION CONFIGURATION ───────────────────────────────

/**
 * Interface for organization-specific automatic update configuration
 */
export interface OrganizationConfig {
  /** Organization identifier */
  organizationId: string;
  /** Organization name */
  organizationName: string;
  /** Whether automatic updates are enabled for this organization */
  automaticUpdatesEnabled: boolean;
  /** Whether reports require verification before automatic processing */
  requireVerification: boolean;
  /** Level of audit logging detail */
  auditLevel: 'minimal' | 'standard' | 'comprehensive';
  /** Maximum processing time before timeout (in seconds) */
  processingTimeout: number;
  /** Whether to send notifications for automatic updates */
  enableNotifications: boolean;
  /** When this configuration was created */
  createdAt: Date;
  /** When this configuration was last updated */
  updatedAt: Date;
}

// ── PROCESSING INTERFACES ─────────────────────────────────────

/**
 * Interface for report submissions in the automatic processing pipeline
 */
export interface ReportSubmission {
  /** Report ID */
  id: string;
  /** Tool ID used for the report */
  toolId: ToolId;
  /** Tool name for display purposes */
  toolName: string;
  /** ID of the user who submitted the report */
  submittedBy: string;
  /** Current submission status */
  status: SubmissionStatus;
  /** Target ID this report contributes to */
  nbsapTargetId: number | null;
  /** Form data from the report */
  formData: Record<string, unknown>;
  /** When the report was submitted */
  submissionTime: Date;
  /** Contribution value calculated from the form data */
  contributionValue: number;
  /** Organization configuration for processing */
  organizationConfig?: OrganizationConfig;
}

/**
 * Interface for processing results
 */
export interface ProcessingResult {
  /** Whether processing was successful */
  success: boolean;
  /** Whether progress was updated */
  progressUpdated: boolean;
  /** Time taken to process (in milliseconds) */
  processingTime: number;
  /** Any error that occurred during processing */
  error?: string;
  /** Details of updates performed */
  updateResults?: UpdateResult[];
  /** Processing status */
  status: UpdateStatus;
}

// ── REAL-TIME UPDATE INTERFACES ──────────────────────────────

/**
 * Interface for real-time update events
 */
export interface UpdateEvent {
  /** Type of update event */
  type:
    'progress_updated' | 'eia_compliance_updated' | 'processing_started' | 'processing_completed';
  /** Target ID affected by the update */
  targetId: number;
  /** New values after the update */
  newValues: {
    progress?: number;
    eiaMetrics?: EIAMetrics;
  };
  /** Timestamp of the event */
  timestamp: Date;
  /** Source report that triggered the update */
  sourceReportId: string;
}

/**
 * Interface for batch update operations
 */
export interface BatchUpdate {
  /** Updates to be processed in this batch */
  updates: Array<{
    targetId: number;
    contribution: number;
    toolId: ToolId;
  }>;
  /** When this batch was created */
  createdAt: Date;
  /** Processing timeout for this batch */
  timeout: number;
}

// ── VALIDATION AND CONSTANTS ─────────────────────────────────

/**
 * Predefined tool weights as specified in requirements
 */
export const TOOL_WEIGHTS: Record<ToolId, number> = {
  [ToolId.T01]: 0.25, // National Institutional Reporting
  [ToolId.T02]: 0.2, // District Biodiversity Monitoring
  [ToolId.T03]: 0.15, // Protected Area Monitoring
  [ToolId.T04]: 0.15, // Community Biodiversity Monitoring
  [ToolId.T05]: 0.1, // Biodiversity Finance Tracking
  [ToolId.T06]: 0.1, // Private Sector Compliance
  [ToolId.T07]: 0.05, // Research & Academic Contribution
} as const;

/**
 * Tool descriptions for display purposes
 */
export const TOOL_DESCRIPTIONS: Record<ToolId, string> = {
  [ToolId.T01]: 'National Institutional Reporting',
  [ToolId.T02]: 'District Biodiversity Monitoring',
  [ToolId.T03]: 'Protected Area Monitoring',
  [ToolId.T04]: 'Community Biodiversity Monitoring',
  [ToolId.T05]: 'Biodiversity Finance Tracking',
  [ToolId.T06]: 'Private Sector Compliance',
  [ToolId.T07]: 'Research & Academic Contribution',
} as const;

/**
 * Validate that tool weights sum to 1.0 (within floating point precision)
 */
export function validateToolWeights(weights: Record<ToolId, number>): boolean {
  const sum = Object.values(weights).reduce((total, weight) => total + weight, 0);
  return Math.abs(sum - 1.0) < 0.0001; // Allow for floating point precision issues
}

/**
 * Get tool weight for a specific tool ID
 */
export function getToolWeight(toolId: ToolId): number {
  return TOOL_WEIGHTS[toolId];
}

/**
 * Get tool description for a specific tool ID
 */
export function getToolDescription(toolId: ToolId): string {
  return TOOL_DESCRIPTIONS[toolId];
}

/**
 * Convert ReportType to ToolId enum
 */
export function reportTypeToToolId(reportType: ReportType): ToolId {
  return reportType as ToolId;
}

/**
 * Convert ToolId enum to ReportType
 */
export function toolIdToReportType(toolId: ToolId): ReportType {
  return toolId as ReportType;
}

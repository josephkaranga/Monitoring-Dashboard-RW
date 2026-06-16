// ============================================================
// Automatic Reporting Types — Usage Examples
// ============================================================

import {
  ToolId,
  ComplianceState,
  UpdateStatus,
  ToolWeight,
  ProgressCalculation,
  UpdateResult,
  EIAMetrics,
  OrganizationConfig,
  ReportSubmission,
  ProcessingResult,
  UpdateEvent,
  BatchUpdate,
  TOOL_WEIGHTS,
  TOOL_DESCRIPTIONS,
  validateToolWeights,
  getToolWeight,
  getToolDescription,
  reportTypeToToolId,
  toolIdToReportType
} from './automaticReporting';

/**
 * Example usage of TypeScript interfaces for tool weights and progress calculation
 * This file demonstrates how the interfaces support the requirements:
 * - Tool weights: T01: 0.25, T02: 0.20, T03: 0.15, T04: 0.15, T05: 0.10, T06: 0.10, T07: 0.05
 * - Real-time progress calculation support
 * - EIA compliance state management
 * - Integration with existing NBSAP target system
 */

// Example 1: Creating tool weight configurations
const exampleToolWeights: ToolWeight[] = [
  {
    toolId: ToolId.T01,
    weight: TOOL_WEIGHTS[ToolId.T01], // 0.25
    description: TOOL_DESCRIPTIONS[ToolId.T01],
    active: true,
    updatedAt: new Date()
  },
  {
    toolId: ToolId.T06,
    weight: TOOL_WEIGHTS[ToolId.T06], // 0.10 - for EIA compliance
    description: TOOL_DESCRIPTIONS[ToolId.T06],
    active: true,
    updatedAt: new Date()
  }
];

// Example 2: Progress calculation for T01 National Institutional Reporting
const exampleProgressCalculation: ProgressCalculation = {
  targetId: 1,
  toolId: ToolId.T01,
  toolWeight: getToolWeight(ToolId.T01), // 0.25 - highest weight
  baseContribution: 20, // base contribution from report
  weightedContribution: 20 * getToolWeight(ToolId.T01), // 20 * 0.25 = 5
  previousProgress: 30,
  newProgress: 35, // 30 + 5 = 35
  calculatedAt: new Date(),
  reportId: 'report-123'
};

// Example 3: Update result with successful progress update
const exampleUpdateResult: UpdateResult = {
  success: true,
  targetId: 1,
  progressUpdated: true,
  eiaComplianceUpdated: false, // not a T06 report
  processingTime: 250, // milliseconds
  newProgress: exampleProgressCalculation.newProgress,
  updatedAt: new Date(),
  calculationDetails: exampleProgressCalculation
};

// Example 4: EIA Compliance metrics from T06 reports
const exampleEIAMetrics: EIAMetrics = {
  totalReports: 100,
  compliantReports: 80,
  partialCompliant: 15,
  nonCompliant: 5,
  compliancePercentage: 80, // 80/100 * 100
  activeIssues: 5, // non-compliant reports
  lastUpdated: new Date()
};

// Example 5: Organization configuration for automatic updates
const exampleOrgConfig: OrganizationConfig = {
  organizationId: 'rema-001',
  organizationName: 'Rwanda Environment Management Authority',
  automaticUpdatesEnabled: true, // enables immediate processing
  requireVerification: false, // no manual approval needed
  auditLevel: 'comprehensive', // detailed logging
  processingTimeout: 30, // 30 seconds
  enableNotifications: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Example 6: Report submission with T06 EIA compliance data
const exampleT06ReportSubmission: ReportSubmission = {
  id: 'report-t06-001',
  toolId: ToolId.T06, // Private Sector Compliance
  toolName: getToolDescription(ToolId.T06),
  submittedBy: 'user-123',
  status: 'pending',
  nbsapTargetId: 5, // linked to specific NBSAP target
  formData: {
    companyName: 'Example Mining Corp',
    eiaCompliance: ComplianceState.COMPLIANT,
    mitigationMeasures: ['Water quality monitoring', 'Biodiversity offset'],
    complianceScore: 85
  },
  submissionTime: new Date(),
  contributionValue: 15 // base contribution value
};

// Example 7: Real-time update event for progress change
const exampleUpdateEvent: UpdateEvent = {
  type: 'progress_updated',
  targetId: 1,
  newValues: {
    progress: exampleProgressCalculation.newProgress
  },
  timestamp: new Date(),
  sourceReportId: exampleProgressCalculation.reportId
};

// Example 8: Batch update for multiple targets
const exampleBatchUpdate: BatchUpdate = {
  updates: [
    { targetId: 1, contribution: 10, toolId: ToolId.T01 }, // National reporting
    { targetId: 2, contribution: 8, toolId: ToolId.T02 },  // District monitoring
    { targetId: 3, contribution: 5, toolId: ToolId.T06 }   // EIA compliance
  ],
  createdAt: new Date(),
  timeout: 30
};

// Example 9: Processing result for successful automatic update
const exampleProcessingResult: ProcessingResult = {
  success: true,
  progressUpdated: true,
  processingTime: 180, // milliseconds
  status: UpdateStatus.COMPLETED,
  updateResults: [exampleUpdateResult]
};

// Example 10: Validation functions usage
export function demonstrateValidation(): void {
  // Validate tool weights sum to 1.0
  const isValid = validateToolWeights(TOOL_WEIGHTS);
  console.log('Tool weights valid:', isValid); // true

  // Get specific tool information
  const t01Weight = getToolWeight(ToolId.T01);
  const t01Description = getToolDescription(ToolId.T01);
  console.log(`${ToolId.T01}: ${t01Description} (weight: ${t01Weight})`);
  
  // Convert between types
  const reportType = toolIdToReportType(ToolId.T06);
  const toolId = reportTypeToToolId(reportType);
  console.log(`Conversion: ${ToolId.T06} <-> ${reportType} <-> ${toolId}`);
}

// Example 11: Calculate weighted contribution for different tools
export function calculateWeightedContributions(baseContribution: number): Record<ToolId, number> {
  const contributions: Record<ToolId, number> = {} as Record<ToolId, number>;
  
  Object.values(ToolId).forEach(toolId => {
    const weight = getToolWeight(toolId);
    contributions[toolId] = baseContribution * weight;
  });
  
  return contributions;
}

// Example usage:
// T01: 20 * 0.25 = 5.0  (highest contribution)
// T02: 20 * 0.20 = 4.0
// T03: 20 * 0.15 = 3.0
// T04: 20 * 0.15 = 3.0
// T05: 20 * 0.10 = 2.0
// T06: 20 * 0.10 = 2.0  (EIA compliance)
// T07: 20 * 0.05 = 1.0  (lowest contribution)

// Example 12: EIA compliance state management
export function getComplianceColor(state: ComplianceState): string {
  switch (state) {
    case ComplianceState.COMPLIANT:
      return '#10b981'; // green
    case ComplianceState.PARTIAL_COMPLIANT:
      return '#f59e0b'; // yellow
    case ComplianceState.NON_COMPLIANT:
      return '#ef4444'; // red
    case ComplianceState.PENDING_REVIEW:
      return '#6b7280'; // gray
    case ComplianceState.NOT_APPLICABLE:
      return '#8b5cf6'; // purple
    default:
      return '#6b7280'; // default gray
  }
}

// Export examples for documentation
export {
  exampleToolWeights,
  exampleProgressCalculation,
  exampleUpdateResult,
  exampleEIAMetrics,
  exampleOrgConfig,
  exampleT06ReportSubmission,
  exampleUpdateEvent,
  exampleBatchUpdate,
  exampleProcessingResult
};
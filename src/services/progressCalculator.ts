// ============================================================
// Progress Calculator Engine
// ============================================================

import {
  ToolId,
  TOOL_WEIGHTS,
  getToolWeight,
  validateToolWeights,
  type ProgressCalculation,
  type ReportSubmission,
  type UpdateResult,
} from '../types/automaticReporting';

/**
 * Core calculation engine that applies tool-specific weights to determine
 * NBSAP target completion percentages from approved report submissions.
 */
export class ProgressCalculator {
  /**
   * Calculate the new target progress by applying tool weights to a set of
   * report contributions, clamped to the 0-100 range.
   */
  calculateWeightedProgress(reports: ReportSubmission[], currentProgress: number): number {
    const weightedContribution = reports.reduce((total, report) => {
      const toolWeight = getToolWeight(report.toolId);
      return total + report.contributionValue * toolWeight;
    }, 0);

    return Math.min(100, Math.max(0, currentProgress + weightedContribution));
  }

  /**
   * Ensure tool weights remain mathematically consistent (sum to 1.0).
   */
  validateWeightSum(): boolean {
    return validateToolWeights(TOOL_WEIGHTS);
  }

  /**
   * Calculate the weighted contribution details for a single report submission
   * against a specific target's current progress.
   */
  calculateContribution(
    report: ReportSubmission,
    targetId: number,
    previousProgress: number
  ): ProgressCalculation {
    const toolWeight = getToolWeight(report.toolId);
    const weightedContribution = report.contributionValue * toolWeight;
    const newProgress = Math.min(100, Math.max(0, previousProgress + weightedContribution));

    return {
      targetId,
      toolId: report.toolId,
      toolWeight,
      baseContribution: report.contributionValue,
      weightedContribution,
      previousProgress,
      newProgress,
      calculatedAt: new Date(),
      reportId: report.id,
    };
  }

  /**
   * Build the update result for a calculated progress contribution, including
   * whether the EIA compliance metrics should also be refreshed (T06 reports).
   */
  buildUpdateResult(calculation: ProgressCalculation, toolId: ToolId): UpdateResult {
    return {
      success: true,
      targetId: calculation.targetId,
      progressUpdated: calculation.newProgress !== calculation.previousProgress,
      eiaComplianceUpdated: toolId === ToolId.T06,
      processingTime: 0,
      newProgress: calculation.newProgress,
      calculationDetails: calculation,
      updatedAt: new Date(),
    };
  }
}

export const progressCalculator = new ProgressCalculator();

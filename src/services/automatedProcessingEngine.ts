// ============================================================
// Automated Processing Engine
// ============================================================

import { supabase } from '../utils/supabase';
import type {
  OrganizationConfig,
  ProcessingResult,
  ReportSubmission,
} from '../types/automaticReporting';
import { UpdateStatus, getToolWeight } from '../types/automaticReporting';

/**
 * Orchestrates automatic processing of report submissions: logs every
 * submission for audit purposes, then either processes the resulting
 * target progress update immediately or queues it for manual approval
 * depending on the submitting organization's configuration.
 */
export class AutomatedProcessingEngine {
  /**
   * Process a report submission according to the organization's automatic
   * update configuration. Always logs the submission; immediate processing
   * additionally logs the outcome of the automatic update.
   */
  async processReportSubmission(
    report: ReportSubmission,
    orgConfig: OrganizationConfig
  ): Promise<ProcessingResult> {
    await this.logSubmission(report, orgConfig);

    if (orgConfig.automaticUpdatesEnabled) {
      const result = await this.processImmediate(report);
      await this.logAutomaticProcessing(report, orgConfig, result);
      return result;
    }

    return {
      success: true,
      progressUpdated: false,
      processingTime: 0,
      status: UpdateStatus.PENDING,
    };
  }

  /**
   * Record a report submission that has already been written to
   * `toolkit_reports` for audit purposes. Unlike {@link processReportSubmission},
   * this does not write a progress update itself: when the report's status is
   * `'approved'`, the `update_target_progress_from_reports` database trigger
   * (migration 017) has already applied the tool-weighted progress update as
   * part of the insert/update, so this only logs the outcome.
   */
  async recordSubmission(report: ReportSubmission, orgConfig: OrganizationConfig): Promise<ProcessingResult> {
    await this.logSubmission(report, orgConfig);

    if (report.status !== 'approved') {
      return {
        success: true,
        progressUpdated: false,
        processingTime: 0,
        status: UpdateStatus.PENDING,
      };
    }

    const result: ProcessingResult = {
      success: true,
      progressUpdated: report.nbsapTargetId !== null,
      processingTime: 0,
      status: UpdateStatus.COMPLETED,
    };

    await this.logAutomaticProcessing(report, orgConfig, result);
    return result;
  }

  // Progress is now computed deterministically from approved reports
  // via database views (migration 023). No direct mutations needed.
  private async processImmediate(report: ReportSubmission): Promise<ProcessingResult> {
    return {
      success: true,
      progressUpdated: report.nbsapTargetId !== null,
      processingTime: 0,
      status: UpdateStatus.COMPLETED,
    };
  }

  /**
   * Record the receipt of a report submission for audit purposes.
   */
  private async logSubmission(report: ReportSubmission, orgConfig: OrganizationConfig): Promise<void> {
    await supabase.from('audit_log').insert({
      user_id: report.submittedBy,
      action_type: 'submit',
      action: `Report ${report.id} submitted via ${report.toolId}`,
      detail: JSON.stringify({
        reportId: report.id,
        toolId: report.toolId,
        toolWeight: getToolWeight(report.toolId),
        nbsapTargetId: report.nbsapTargetId,
        status: report.status,
        automaticUpdatesEnabled: orgConfig.automaticUpdatesEnabled,
      }),
    });
  }

  /**
   * Record the outcome of an immediate automatic processing run.
   */
  private async logAutomaticProcessing(
    report: ReportSubmission,
    orgConfig: OrganizationConfig,
    result: ProcessingResult
  ): Promise<void> {
    if (orgConfig.auditLevel === 'minimal') return;

    await supabase.from('audit_log').insert({
      user_id: report.submittedBy,
      action_type: 'automatic_processing',
      action: `Report ${report.id} processed automatically`,
      detail: JSON.stringify({
        reportId: report.id,
        toolId: report.toolId,
        nbsapTargetId: report.nbsapTargetId,
        success: result.success,
        progressUpdated: result.progressUpdated,
        status: result.status,
        processingTime: result.processingTime,
        error: result.error,
        ...(orgConfig.auditLevel === 'comprehensive'
          ? { updateResults: result.updateResults }
          : {}),
      }),
    });
  }
}

export const automatedProcessingEngine = new AutomatedProcessingEngine();

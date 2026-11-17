import { supabase } from '../utils/supabase';
import { formatFieldValue } from '../utils/formData';
import { declarationPayload } from '../utils/dataQuality';

import { automatedProcessingEngine } from './automatedProcessingEngine';
import { writeAuditEntry } from './dataService';
import { eventBus } from './eventBus';
import { getToolWeight, getToolDescription, ToolId } from '../types/automaticReporting';
import type {
  OrganizationConfig,
  ProcessingResult,
  ReportSubmission,
} from '../types/automaticReporting';
import type {
  ToolkitReport,
  ReportType,
  SubmissionStatus,
  ApiResponse,
  PaginatedResponse,
  ReportAttachment,
  ValidationStage,
  ReportHistoryEntry,
  WorkflowStatus,
  DqaDeclaration,
} from '../types/index';

export interface ToolWeightInfo {
  toolId: string;
  weight: number;
  description: string;
}

// ── TOOL WEIGHT LOOKUP ────────────────────────────────────────
/**
 * Look up a tool's weight and description from the `tool_weights` table,
 * falling back to the built-in TOOL_WEIGHTS constants if the table is
 * unavailable or has no active entry for this tool.
 */
export async function fetchToolWeight(toolId: ReportType): Promise<ToolWeightInfo> {
  const { data, error } = await supabase
    .from('tool_weights')
    .select('tool_id, weight, description')
    .eq('tool_id', toolId)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) {
    return {
      toolId,
      weight: getToolWeight(toolId as ToolId),
      description: getToolDescription(toolId as ToolId),
    };
  }

  return {
    toolId: data.tool_id,
    weight: Number(data.weight),
    description: data.description,
  };
}

export interface ReportFilters {
  toolId?: ReportType | 'ALL';
  status?: SubmissionStatus | 'ALL';
  /** M02 workflow states to include (empty/undefined = all). */
  workflowStatuses?: WorkflowStatus[];
  /** Reports currently waiting at this validation stage. */
  currentStageId?: number;
  period?: string;
  district?: string;
  submittedBy?: string;
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  realtime?: boolean;
}

// Evidence content types (the bucket stores what we send; 'application/xlsx' is not a real type).
const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

/**
 * Upload evidence files to storage. Returns the stored attachments and the
 * names of any that failed, so callers never save a report with evidence
 * silently missing (previously failures were only logged).
 */
export async function uploadEvidence(
  userId: string,
  attachments: ReportAttachment[]
): Promise<{ uploaded: ReportAttachment[]; failed: string[] }> {
  const uploaded: ReportAttachment[] = [];
  const failed: string[] = [];
  for (const att of attachments) {
    if (!att.data_url) {
      // Already stored (e.g. kept from a returned report).
      if (att.storage_path) uploaded.push(att);
      continue;
    }
    try {
      const base64 = att.data_url.split(',')[1];
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const storagePath = `${userId}/${Date.now()}_${att.name}`;
      const { error } = await supabase.storage
        .from('report-attachments')
        .upload(storagePath, new Blob([bytes]), {
          contentType: MIME_BY_EXT[att.ext] || 'application/octet-stream',
        });
      if (error) {
        failed.push(att.name);
        continue;
      }
      uploaded.push({
        name: att.name,
        ext: att.ext,
        size: att.size,
        storage_path: storagePath,
        evidence_type: att.evidence_type || undefined,
        description: att.description?.trim() || undefined,
      });
    } catch {
      failed.push(att.name);
    }
  }
  return { uploaded, failed };
}

// ── SUBMIT REPORT ────────────────────────────────────────────
export async function submitReport(
  toolId: ReportType,
  toolName: string,
  formData: Record<string, unknown>,
  _requireVerification: boolean = true,
  attachments: ReportAttachment[] = [],
  nbsapTargetId?: number | null,
  indicatorId?: number | null,
  /** M04: the completed checklist; the database refuses a report without it. */
  declaration?: DqaDeclaration | null
): Promise<ApiResponse<ToolkitReport>> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { data: null, error: 'Not authenticated' };

  const userId = sessionData.session.user.id;

  // Upload evidence first; if any file fails, nothing is submitted.
  const { uploaded: uploadedAttachments, failed } = await uploadEvidence(userId, attachments);
  if (failed.length > 0) {
    return {
      data: null,
      error: `Could not upload: ${failed.join(', ')}. Nothing was submitted; please try again.`,
    };
  }

  const reportData = {
    tool_id: toolId,
    tool_name: toolName,
    submitted_by: userId,
    // Every report enters as pending: nobody approves their own submission,
    // and the database refuses anything else (migration 037). The
    // requireVerification argument is kept for callers but no longer skips review.
    status: 'pending' as SubmissionStatus,
    reviewed_by: null,
    reviewed_at: null,
    period: (formData.period as string) || null,
    form_data: formData,
    attachments: uploadedAttachments,
    district: (formData.district as string) || null,
    institution: (formData.institution as string) || null,
    nbsap_target_id: nbsapTargetId || null,
    indicator_id: indicatorId || null,
    dqa_declaration: declaration ? declarationPayload(declaration) : null,
    submitted_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('toolkit_reports')
    .insert(reportData)
    .select(
      `
      *,
      submitted_by_profile:profiles!toolkit_reports_submitted_by_fkey(
        id, full_name, email, role, organization
      )
    `
    )
    .single();

  if (error) return { data: null, error: error.message };

  return { data: data as ToolkitReport, error: null };
}

// ── AUTOMATIC PROCESSING ──────────────────────────────────────
/**
 * Record a freshly-submitted report with the automated processing engine for
 * audit logging. When the report was submitted as `'approved'`, the
 * `update_target_progress_from_reports` database trigger has already applied
 * the tool-weighted progress update as part of the insert, so this only logs
 * the submission and its outcome.
 */
export async function processReportAutomatic(
  report: ToolkitReport,
  orgConfig: OrganizationConfig
): Promise<ProcessingResult> {
  const submission: ReportSubmission = {
    id: report.id,
    toolId: report.tool_id as ToolId,
    toolName: report.tool_name,
    submittedBy: report.submitted_by,
    status: report.status,
    nbsapTargetId: report.nbsap_target_id,
    formData: report.form_data || {},
    submissionTime: new Date(report.submitted_at),
    contributionValue: 20 * getToolWeight(report.tool_id as ToolId),
    organizationConfig: orgConfig,
  };

  return automatedProcessingEngine.recordSubmission(submission, orgConfig);
}

// ── FETCH REPORTS ────────────────────────────────────────────
export async function fetchReports(
  filters: ReportFilters = {}
): Promise<PaginatedResponse<ToolkitReport>> {
  const {
    toolId,
    status,
    workflowStatuses,
    currentStageId,
    period,
    district,
    page = 1,
    pageSize = 20,
    fromDate,
    toDate,
  } = filters;

  let query = supabase
    .from('toolkit_reports')
    .select(
      `
      *,
      submitted_by_profile:profiles!toolkit_reports_submitted_by_fkey(
        id, full_name, email, role, organization
      ),
      reviewed_by_profile:profiles!toolkit_reports_reviewed_by_fkey(
        id, full_name, email, role, organization
      ),
      nbsap_target:nbsap_targets(
        id, title, progress, goal
      ),
      nbsap_indicator:indicators!toolkit_reports_indicator_id_fkey(
        id, name, tier, baseline, target_2030, definition, periodicity
      )
    `,
      { count: 'exact' }
    )
    .order('submitted_at', { ascending: false });

  if (toolId && toolId !== 'ALL') query = query.eq('tool_id', toolId);
  if (status && status !== 'ALL') query = query.eq('status', status);
  if (workflowStatuses && workflowStatuses.length > 0)
    query = query.in('workflow_status', workflowStatuses);
  if (currentStageId != null) query = query.eq('current_stage_id', currentStageId);
  if (period) query = query.ilike('period', `%${period}%`);
  if (district) query = query.eq('district', district);
  if (fromDate) query = query.gte('submitted_at', fromDate);
  if (toDate) query = query.lte('submitted_at', toDate + 'T23:59:59');

  // Pagination
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('fetchReports error:', error);
    return { data: [], count: 0, page, pageSize, totalPages: 0 };
  }

  const totalPages = Math.ceil((count || 0) / pageSize);
  return {
    data: (data || []) as ToolkitReport[],
    count: count || 0,
    page,
    pageSize,
    totalPages,
  };
}

// ── VALIDATION WORKFLOW (M02, migration 040) ─────────────────
// Reports change only through these database functions; the database
// checks the stage, the validator's scope and self-review.

export type ReviewAction = 'approve' | 'return' | 'reject';

export async function reviewReport(
  reportId: string,
  action: ReviewAction,
  note?: string
): Promise<ApiResponse<ToolkitReport>> {
  const { data, error } = await supabase.rpc('review_report', {
    p_report: reportId,
    p_action: action,
    p_note: note?.trim() || null,
  });
  if (error) return { data: null, error: error.message };
  _statsCache = { data: null, ts: 0 };
  // Rejection notices to the submitter come from a database trigger (migration 024).
  return { data: data as ToolkitReport, error: null };
}

/** The submitter corrects a returned report and sends it back into validation. */
export async function resubmitReport(
  reportId: string,
  formData?: Record<string, unknown>,
  attachments?: ReportAttachment[],
  note?: string,
  declaration?: DqaDeclaration | null
): Promise<ApiResponse<ToolkitReport>> {
  const { data, error } = await supabase.rpc('resubmit_report', {
    p_report: reportId,
    p_form_data: formData ?? null,
    p_attachments: attachments ?? null,
    p_note: note?.trim() || null,
    p_declaration: declaration ? declarationPayload(declaration) : null,
  });
  if (error) return { data: null, error: error.message };
  _statsCache = { data: null, ts: 0 };
  return { data: data as ToolkitReport, error: null };
}

export async function fetchValidationStages(): Promise<ValidationStage[]> {
  const { data, error } = await supabase
    .from('validation_stages')
    .select('*')
    .order('ordinal')
    .order('id');
  if (error) throw new Error(`Could not load the validation workflow: ${error.message}`);
  return (data || []) as ValidationStage[];
}

/** REMA administrators only (RLS). Applies to reports submitted afterwards. */
export async function updateValidationStage(
  id: number,
  changes: Partial<Pick<ValidationStage, 'name' | 'ordinal' | 'is_active' | 'applies_to'>>
): Promise<ApiResponse<ValidationStage>> {
  const { data, error } = await supabase
    .from('validation_stages')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'You do not have permission to change the workflow.' };
  return { data: data as ValidationStage, error: null };
}

export interface PipelineRow {
  workflow_status: WorkflowStatus;
  current_stage_id: number | null;
  stage_code: string | null;
  stage_name: string | null;
  stage_ordinal: number | null;
  reports: number;
}

/** Reports per state and stage (v_validation_pipeline, migration 041), under the caller's access. */
export async function fetchValidationPipeline(): Promise<PipelineRow[]> {
  const { data, error } = await supabase.from('v_validation_pipeline').select('*');
  if (error) throw new Error(`Could not load the validation pipeline: ${error.message}`);
  return (data || []) as PipelineRow[];
}

export async function fetchReportHistory(reportId: string): Promise<ReportHistoryEntry[]> {
  const { data, error } = await supabase
    .from('report_status_history')
    .select('*, actor_profile:profiles!report_status_history_actor_fkey(full_name, email)')
    .eq('report_id', reportId)
    .order('id');
  if (error) throw new Error(`Could not load the report history: ${error.message}`);
  return (data || []) as ReportHistoryEntry[];
}

// ── DELETE REPORT ────────────────────────────────────────────
export async function deleteReport(reportId: string): Promise<ApiResponse<null>> {
  // Fetch the report first so we can log what was deleted
  const { data: report } = await supabase
    .from('toolkit_reports')
    .select('id, tool_id, tool_name, status, nbsap_target_id, submitted_by, period')
    .eq('id', reportId)
    .maybeSingle();

  const { error } = await supabase.from('toolkit_reports').delete().eq('id', reportId);

  if (error) return { data: null, error: error.message };

  // Audit log — DB triggers handle the actual data reversal
  void writeAuditEntry(
    'delete',
    `Report deleted: ${report?.tool_name ?? report?.tool_id ?? reportId}`,
    report
      ? `Tool: ${report.tool_id}, Status: ${report.status}, Period: ${report.period ?? 'N/A'}, Target: ${report.nbsap_target_id ?? 'none'}`
      : reportId
  );

  // Invalidate stats cache so next getDashboardStats() fetches fresh data
  _statsCache = { data: null, ts: 0 };

  // Notify UI so dashboards and charts refresh
  eventBus.emit('dashboard-refresh', {});
  if (report?.nbsap_target_id) {
    eventBus.emit('target-progress-updated', { targetId: report.nbsap_target_id, progress: 0 });
  }

  return { data: null, error: null };
}

// ── BULK DELETE REPORTS ───────────────────────────────────────
export async function clearAllReports(): Promise<ApiResponse<null>> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { data: null, error: 'Not authenticated' };

  const { error } = await supabase
    .from('toolkit_reports')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// ── GET DASHBOARD AGGREGATES ──────────────────────────────────
let _statsCache: { data: ReturnType<typeof buildStats> | null; ts: number } = { data: null, ts: 0 };
const STATS_TTL = 60_000; // 60 seconds — increased from 30s

function buildStats(
  reports: any[],
  indicators: any[],
  districts: any[],
  compliance: any[],
  targetCount: number
) {
  const approved = reports.filter(r => r.status === 'approved' || !r.status);
  const pending = reports.filter(r => r.status === 'pending');
  const reportsByTool = {} as Record<string, number>;
  reports.forEach(r => {
    reportsByTool[r.tool_id] = (reportsByTool[r.tool_id] || 0) + 1;
  });
  const t02 = approved.filter(r => r.tool_id === 'T02');
  const forestHa = t02.reduce(
    (a, r) => a + (Number((r.form_data as Record<string, unknown>)?.forest_ha) || 0),
    0
  );
  const wetlandHa = t02.reduce(
    (a, r) => a + (Number((r.form_data as Record<string, unknown>)?.wetland_ha) || 0),
    0
  );
  const t04 = approved.filter(r => r.tool_id === 'T04');
  const hwcIncidents = t04.reduce(
    (a, r) => a + (Number((r.form_data as Record<string, unknown>)?.hwc_incidents) || 0),
    0
  );
  const t05 = approved.filter(r => r.tool_id === 'T05');
  const financeAllocated = t05.reduce(
    (a, r) => a + (Number((r.form_data as Record<string, unknown>)?.budget_allocated) || 0),
    0
  );
  const financeDisbursed = t05.reduce(
    (a, r) => a + (Number((r.form_data as Record<string, unknown>)?.budget_disbursed) || 0),
    0
  );
  const totalDistricts = Math.max(districts.length, 30); // Rwanda has 30 districts
  const submittedDistricts = districts.filter(d => d.status === 'submitted').length;
  const missingDistricts = districts.filter(d => d.status === 'missing').length;
  const onTrack = indicators.filter(i => i.status === 'on-track').length;
  const atRisk = indicators.filter(i => i.status === 'at-risk').length;
  const behind = indicators.filter(i => i.status === 'behind').length;
  const avgProgress = indicators.length
    ? Math.round(indicators.reduce((a, i) => a + i.progress, 0) / indicators.length)
    : 0;
  // Per-tier indicator counts for dashboard
  const headlineCount = indicators.filter(i => i.tier === 'headline').length;
  const componentCount = indicators.filter(i => i.tier === 'component').length;
  const binaryCount = indicators.filter(i => i.tier === 'binary').length;
  return {
    totalTargets: targetCount || 22,
    totalSubmissions: reports.length,
    activeDistricts: `${submittedDistricts}/${totalDistricts}`,
    missingDistricts,
    complianceIssues: compliance.length,
    onTrackIndicators: onTrack,
    atRiskIndicators: atRisk,
    behindIndicators: behind,
    avgProgress,
    forestHa,
    wetlandHa,
    hwcIncidents,
    financeAllocated,
    financeDisbursed,
    reportsByTool,
    pendingVerifications: pending.length,
    headlineIndicators: headlineCount,
    componentIndicators: componentCount,
    binaryIndicators: binaryCount,
    totalIndicators: indicators.length,
  };
}

export async function getDashboardStats() {
  if (_statsCache.data && Date.now() - _statsCache.ts < STATS_TTL) {
    return _statsCache.data;
  }
  const [reportsRes, indicatorsRes, districtsRes, complianceRes, targetsRes] = await Promise.all([
    supabase
      .from('toolkit_reports')
      .select('tool_id, status, form_data')
      .order('submitted_at', { ascending: false }),
    supabase.from('indicators').select('status, progress, tier'),
    supabase.from('districts').select('status, compliance'),
    supabase
      .from('compliance_records')
      .select('id, severity, is_resolved')
      .eq('is_resolved', false),
    supabase.from('nbsap_targets').select('id', { count: 'exact', head: true }),
  ]);

  const reports = reportsRes.data || [];
  const indicators = indicatorsRes.data || [];
  const districts = districtsRes.data || [];
  const compliance = complianceRes.data || [];
  const targetCount = targetsRes.count ?? 22;

  const result = buildStats(reports, indicators, districts, compliance, targetCount);
  _statsCache = { data: result, ts: Date.now() };
  return result;
}

// ── EXPORT TO CSV ────────────────────────────────────────────
export function exportReportsToCSV(reports: ToolkitReport[]): string {
  if (!reports.length) return '';

  const skip = ['form_data', 'attachments'];
  const keys = Object.keys(reports[0]).filter(k => !skip.includes(k));

  // Add flattened form fields
  const allFormKeys = new Set<string>();
  reports.forEach(r => {
    Object.keys(r.form_data || {}).forEach(k => allFormKeys.add(k));
  });

  const headers = [...keys, ...allFormKeys].join(',');
  const rows = reports.map(r => {
    const baseValues = keys.map(k => {
      const val = (r as unknown as Record<string, unknown>)[k];
      if (typeof val === 'object' && val !== null)
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val ?? '').replace(/"/g, '""')}"`;
    });
    const formValues = [...allFormKeys].map(k => {
      const val = (r.form_data || {})[k];
      return `"${formatFieldValue(val ?? '').replace(/"/g, '""')}"`;
    });
    return [...baseValues, ...formValues].join(',');
  });

  return [headers, ...rows].join('\n');
}

// ── EXPORT TO JSON ───────────────────────────────────────────
export function exportReportsToJSON(reports: ToolkitReport[]): string {
  return JSON.stringify(
    {
      exported: new Date().toISOString(),
      system: 'NBSAP Monitoring Dashboard · Rwanda',
      totalRecords: reports.length,
      submissions: reports,
    },
    null,
    2
  );
}

// ── IMPORT FROM JSON ──────────────────────────────────────────
export async function importReportsFromJSON(
  jsonString: string
): Promise<ApiResponse<{ imported: number; skipped: number }>> {
  try {
    const parsed = JSON.parse(jsonString);
    const records = Array.isArray(parsed) ? parsed : parsed.submissions || [];

    if (!records.length) {
      return { data: null, error: 'No valid records in file' };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return { data: null, error: 'Not authenticated' };

    // Fetch existing to avoid duplicates
    const { data: existing } = await supabase
      .from('toolkit_reports')
      .select('submitted_at, tool_id');

    const existingKeys = new Set((existing || []).map(r => `${r.tool_id}_${r.submitted_at}`));

    const newRecords = records.filter(
      (r: ToolkitReport) => !existingKeys.has(`${r.tool_id}_${r.submitted_at}`)
    );

    if (!newRecords.length) {
      return {
        data: { imported: 0, skipped: records.length },
        error: null,
      };
    }

    // Sanitize records for import
    const sanitized = newRecords.map((r: ToolkitReport) => ({
      tool_id: r.tool_id,
      tool_name: r.tool_name,
      submitted_by: sessionData.session!.user.id,
      // Imported records are re-reviewed: approval does not travel with the file.
      status: 'pending' as SubmissionStatus,
      period: r.period,
      form_data: r.form_data || {},
      attachments: [],
      district: r.district,
      institution: r.institution,
      nbsap_target_id: r.nbsap_target_id || null,
      submitted_at: r.submitted_at || new Date().toISOString(),
    }));

    const { error } = await supabase.from('toolkit_reports').insert(sanitized);

    if (error) return { data: null, error: error.message };

    return {
      data: {
        imported: newRecords.length,
        skipped: records.length - newRecords.length,
      },
      error: null,
    };
  } catch {
    return { data: null, error: 'Invalid JSON format' };
  }
}

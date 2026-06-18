import { supabase } from '../utils/supabase';

import { automatedProcessingEngine } from './automatedProcessingEngine';
import { writeAuditEntry } from './dataService';
import { eventBus } from './eventBus';
import { getToolWeight, getToolDescription, ToolId } from '../types/automaticReporting';
import type { OrganizationConfig, ProcessingResult, ReportSubmission } from '../types/automaticReporting';
import type {
  ToolkitReport,
  ReportType,
  SubmissionStatus,
  ApiResponse,
  PaginatedResponse,
  ReportAttachment,
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
  period?: string;
  district?: string;
  submittedBy?: string;
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  realtime?: boolean;
}

// ── SUBMIT REPORT ────────────────────────────────────────────
export async function submitReport(
  toolId: ReportType,
  toolName: string,
  formData: Record<string, unknown>,
  requireVerification: boolean = true,
  attachments: ReportAttachment[] = [],
  nbsapTargetId?: number | null
): Promise<ApiResponse<ToolkitReport>> {
  // Enhanced logging for data pipeline debugging
  console.log('🔄 [submitReport] Starting report submission for data pipeline tracking');
  console.log('📊 [submitReport] Pipeline parameters:', {
    toolId,
    toolName,
    nbsapTargetId,
    requireVerification,
    attachmentCount: attachments.length,
    timestamp: new Date().toISOString()
  });

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { data: null, error: 'Not authenticated' };

  const userId = sessionData.session.user.id;
  
  // Log target and indicator associations for debugging
  const indicatorId = formData.indicator ? parseInt(formData.indicator as string, 10) : null;
  const stakeholderId = formData.stakeholder || null;
  
  console.log('🎯 [submitReport] Target and Indicator associations:', {
    nbsapTargetId: nbsapTargetId || 'None selected',
    indicatorId: indicatorId || 'None selected', 
    stakeholderId: stakeholderId || 'None selected',
    targetInfo: formData.target_info || null,
    indicatorInfo: formData.indicator_info || null,
    stakeholderInfo: formData.stakeholder_info || null
  });

  // Upload attachments to Storage first
  const uploadedAttachments: ReportAttachment[] = [];
  for (const att of attachments) {
    if (!att.data_url) continue;
    try {
      const base64 = att.data_url.split(',')[1];
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes]);
      const storagePath = `${userId}/${Date.now()}_${att.name}`;
      const { error: uploadError } = await supabase.storage
        .from('report-attachments')
        .upload(storagePath, blob, { contentType: `application/${att.ext}` });

      if (!uploadError) {
        uploadedAttachments.push({
          name: att.name,
          ext: att.ext,
          size: att.size,
          storage_path: storagePath,
        });
      }
    } catch {
      console.warn(`Failed to upload ${att.name}`);
    }
  }

  // Attach tool weight info so the contribution this report makes toward
  // its target's weighted progress is visible alongside the submission.
  const toolWeightInfo = await fetchToolWeight(toolId);

  const reportData = {
    tool_id: toolId,
    tool_name: toolName,
    submitted_by: userId,
    status: (requireVerification ? 'pending' : 'approved') as SubmissionStatus,
    reviewed_by: requireVerification ? null : userId,
    reviewed_at: requireVerification ? null : new Date().toISOString(),
    period: (formData.period as string) || null,
    form_data: { ...formData, tool_weight_info: toolWeightInfo },
    attachments: uploadedAttachments,
    district: (formData.district as string) || null,
    institution: (formData.institution as string) || null,
    nbsap_target_id: nbsapTargetId || null,
    submitted_at: new Date().toISOString(),
  };

  // Log pipeline status for audit trail and debugging
  console.log('📋 [submitReport] Pipeline status in audit entry:', {
    reportStatus: reportData.status,
    requiresVerification: requireVerification,
    hasTargetAssociation: !!nbsapTargetId,
    hasIndicatorAssociation: !!indicatorId,
    pipelineState: requireVerification ? 'awaiting_verification' : 'direct_approval',
    dataFlowComplete: !!(nbsapTargetId && indicatorId && stakeholderId),
    attachmentCount: uploadedAttachments.length
  });

  const { data, error } = await supabase
    .from('toolkit_reports')
    .insert(reportData)
    .select(`
      *,
      submitted_by_profile:profiles!toolkit_reports_submitted_by_fkey(
        id, full_name, email, role, organization
      )
    `)
    .single();

  if (error) {
    console.error('❌ [submitReport] Database insertion failed:', {
      error: error.message,
      toolId,
      nbsapTargetId,
      indicatorId,
      timestamp: new Date().toISOString()
    });
    return { data: null, error: error.message };
  }

  // Log successful submission with target and indicator associations
  console.log('✅ [submitReport] Report submitted successfully with target and indicator associations:', {
    reportId: data.id,
    toolId: data.tool_id,
    status: data.status,
    nbsapTargetId: data.nbsap_target_id,
    indicatorId: indicatorId,
    stakeholderId: stakeholderId,
    pipelineStatus: data.status === 'pending' ? 'queued_for_verification' : 'approved_direct',
    submissionTime: data.submitted_at,
    dataFlowIntegrityCheck: {
      targetLinked: !!data.nbsap_target_id,
      indicatorDataPresent: !!indicatorId,
      stakeholderMapped: !!stakeholderId,
      formDataComplete: Object.keys(formData).length > 0
    }
  });

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
    period,
    district,
    page = 1,
    pageSize = 20,
    fromDate,
    toDate,
  } = filters;

  let query = supabase
    .from('toolkit_reports')
    .select(`
      *,
      submitted_by_profile:profiles!toolkit_reports_submitted_by_fkey(
        id, full_name, email, role, organization
      ),
      nbsap_target:nbsap_targets(
        id, title, progress, goal
      )
    `, { count: 'exact' })
    .order('submitted_at', { ascending: false });

  if (toolId && toolId !== 'ALL') query = query.eq('tool_id', toolId);
  if (status && status !== 'ALL') query = query.eq('status', status);
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

// ── VERIFY REPORT (approve / reject) ─────────────────────────
export async function verifyReport(
  reportId: string,
  newStatus: SubmissionStatus,
  reviewNote?: string
): Promise<ApiResponse<ToolkitReport>> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('toolkit_reports')
    .update({
      status: newStatus,
      reviewed_by: sessionData.session.user.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote || null,
    })
    .eq('id', reportId)
    .select('*')
    .single();

  if (error) return { data: null, error: error.message };
  // Invalidate stats cache — pending count changes when a report is verified
  _statsCache = { data: null, ts: 0 };
  return { data: data as ToolkitReport, error: null };
}

// ── DELETE REPORT ────────────────────────────────────────────
export async function deleteReport(
  reportId: string
): Promise<ApiResponse<null>> {
  // Fetch the report first so we can log what was deleted
  const { data: report } = await supabase
    .from('toolkit_reports')
    .select('id, tool_id, tool_name, status, nbsap_target_id, submitted_by, period')
    .eq('id', reportId)
    .maybeSingle();

  const { error } = await supabase
    .from('toolkit_reports')
    .delete()
    .eq('id', reportId);

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

function buildStats(reports: any[], indicators: any[], districts: any[], compliance: any[], targetCount: number) {
  const approved = reports.filter(r => r.status === 'approved' || !r.status);
  const pending = reports.filter(r => r.status === 'pending');
  const reportsByTool = {} as Record<string, number>;
  reports.forEach(r => { reportsByTool[r.tool_id] = (reportsByTool[r.tool_id] || 0) + 1; });
  const t02 = approved.filter(r => r.tool_id === 'T02');
  const forestHa = t02.reduce((a, r) => a + (Number((r.form_data as Record<string,unknown>)?.forest_ha) || 0), 0);
  const wetlandHa = t02.reduce((a, r) => a + (Number((r.form_data as Record<string,unknown>)?.wetland_ha) || 0), 0);
  const t04 = approved.filter(r => r.tool_id === 'T04');
  const hwcIncidents = t04.reduce((a, r) => a + (Number((r.form_data as Record<string,unknown>)?.hwc_incidents) || 0), 0);
  const t05 = approved.filter(r => r.tool_id === 'T05');
  const financeAllocated = t05.reduce((a, r) => a + (Number((r.form_data as Record<string,unknown>)?.budget_allocated) || 0), 0);
  const financeDisbursed = t05.reduce((a, r) => a + (Number((r.form_data as Record<string,unknown>)?.budget_disbursed) || 0), 0);
  const totalDistricts = Math.max(districts.length, 30); // Rwanda has 30 districts
  const submittedDistricts = districts.filter(d => d.status === 'submitted').length;
  const missingDistricts = districts.filter(d => d.status === 'missing').length;
  const onTrack = indicators.filter(i => i.status === 'on-track').length;
  const atRisk = indicators.filter(i => i.status === 'at-risk').length;
  const behind = indicators.filter(i => i.status === 'behind').length;
  const avgProgress = indicators.length ? Math.round(indicators.reduce((a, i) => a + i.progress, 0) / indicators.length) : 0;
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
    forestHa, wetlandHa, hwcIncidents, financeAllocated, financeDisbursed,
    reportsByTool, pendingVerifications: pending.length,
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
  const [reportsRes, indicatorsRes, districtsRes, complianceRes, targetsRes] =
    await Promise.all([
      supabase
        .from('toolkit_reports')
        .select('tool_id, status, form_data')
        .order('submitted_at', { ascending: false }),
      supabase
        .from('indicators')
        .select('status, progress, tier'),
      supabase
        .from('districts')
        .select('status, compliance'),
      supabase
        .from('compliance_records')
        .select('id, severity, is_resolved')
        .eq('is_resolved', false),
      supabase
        .from('nbsap_targets')
        .select('id', { count: 'exact', head: true }),
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
  const keys = Object.keys(reports[0]).filter((k) => !skip.includes(k));

  // Add flattened form fields
  const allFormKeys = new Set<string>();
  reports.forEach((r) => {
    Object.keys(r.form_data || {}).forEach((k) => allFormKeys.add(k));
  });

  const headers = [...keys, ...allFormKeys].join(',');
  const rows = reports.map((r) => {
    const baseValues = keys.map((k) => {
      const val = (r as unknown as Record<string, unknown>)[k];
      if (typeof val === 'object' && val !== null)
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val ?? '').replace(/"/g, '""')}"`;
    });
    const formValues = [...allFormKeys].map((k) => {
      const val = (r.form_data || {})[k];
      return `"${String(val ?? '').replace(/"/g, '""')}"`;
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
    const records = Array.isArray(parsed)
      ? parsed
      : parsed.submissions || [];

    if (!records.length) {
      return { data: null, error: 'No valid records in file' };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return { data: null, error: 'Not authenticated' };

    // Fetch existing to avoid duplicates
    const { data: existing } = await supabase
      .from('toolkit_reports')
      .select('submitted_at, tool_id');

    const existingKeys = new Set(
      (existing || []).map(
        (r) => `${r.tool_id}_${r.submitted_at}`
      )
    );

    const newRecords = records.filter(
      (r: ToolkitReport) =>
        !existingKeys.has(`${r.tool_id}_${r.submitted_at}`)
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
      status: r.status || 'pending',
      period: r.period,
      form_data: r.form_data || {},
      attachments: [],
      district: r.district,
      institution: r.institution,
      submitted_at: r.submitted_at || new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('toolkit_reports')
      .insert(sanitized);

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

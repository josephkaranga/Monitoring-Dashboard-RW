// ============================================================
// AI Extraction Service
// Async analysis layer that runs after every report submission.
// Analyzes manual fields + uploaded documents, generates structured
// proposals, stores results in ai_extractions + ai_extraction_proposals.
// Does NOT modify any official target/indicator data without reviewer approval.
// ============================================================

import { supabase } from '../utils/supabase';
import { updateIndicatorProgress, writeAuditEntry } from './dataService';
import type {
  ToolkitReport,
  AIExtraction,
  AIExtractionProposal,
  AIExtractionResult,
  AIProposalType,
  NBSAPTarget,
  Indicator,
} from '../types/index';

// ── Text field keys to extract from form_data (all tools) ────
const TEXT_FIELD_KEYS: string[] = [
  'activities', 'challenges', 'notes', 'key_findings', 'policy_relevance',
  'observations', 'species_sightings', 'activity_funded', 'outcomes',
  'narrative', 'summary', 'progress_update', 'achievements', 'outputs',
  'constraints', 'risks', 'lessons_learned', 'recommendations',
  'next_steps', 'stakeholder_engagement', 'beneficiaries',
  'geographic_coverage', 'evidence_description', 'comments',
];

// ── Build combined analysis text from all form fields ────────
function buildAnalysisText(report: ToolkitReport): string {
  const lines: string[] = [
    `TOOL: ${report.tool_id} — ${report.tool_name}`,
    `PERIOD: ${report.period ?? 'Not specified'}`,
    `DISTRICT: ${report.district ?? 'N/A'}`,
    `INSTITUTION: ${report.institution ?? 'N/A'}`,
  ];

  // Include every text field that has a non-empty string value
  for (const key of TEXT_FIELD_KEYS) {
    const val = report.form_data[key];
    if (val && typeof val === 'string' && val.trim()) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      lines.push(`\n${label}:\n"${val.trim()}"`);
    }
  }

  // Also capture numeric fields that might carry progress info
  const numericKeys = [
    'current_status', 'implementation_pct', 'forest_ha', 'wetland_ha',
    'restoration_ha', 'agroforestry_hh', 'coverage_change_ha',
    'budget_allocated', 'budget_disbursed', 'budget_utilized',
    'esg_score', 'habitat_quality',
  ];
  const numericLines: string[] = [];
  for (const key of numericKeys) {
    const val = report.form_data[key];
    if (val !== null && val !== undefined && val !== '') {
      numericLines.push(`${key}: ${val}`);
    }
  }
  if (numericLines.length > 0) {
    lines.push('\nNUMERIC FIELDS:\n' + numericLines.join(', '));
  }

  // Capture select fields that may carry status information
  const selectKeys = ['eia_compliance', 'species_trend', 'water_source_status', 'waste_management'];
  for (const key of selectKeys) {
    const val = report.form_data[key];
    if (val && typeof val === 'string') {
      lines.push(`${key}: ${val}`);
    }
  }

  return lines.join('\n');
}

// ── Fetch and extract document text from Supabase Storage ────
async function fetchDocumentContent(report: ToolkitReport): Promise<string> {
  if (!report.attachments || report.attachments.length === 0) return '';

  const parts: string[] = [];

  for (const att of report.attachments) {
    if (!att.storage_path) continue;

    try {
      const { data, error } = await supabase.storage
        .from('report-attachments')
        .download(att.storage_path);

      if (error || !data) continue;

      const ext = (att.ext || '').toLowerCase();

      if (ext === 'csv' || ext === 'txt') {
        const text = await data.text();
        parts.push(`[File: ${att.name}]\n${text.slice(0, 3000)}`);
      } else if (ext === 'pdf') {
        // Send PDF as base64 — Claude API handles PDFs natively
        const buffer = await data.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let b64 = '';
        for (let i = 0; i < bytes.byteLength; i++) b64 += String.fromCharCode(bytes[i]);
        parts.push(`[PDF attached: ${att.name} — will be sent as document]`);
        // Store b64 on the att object so the Claude call can use it
        (att as unknown as Record<string, unknown>).__b64 = btoa(b64);
      } else {
        parts.push(`[Attached file: ${att.name} (${ext}) — binary content not extracted]`);
      }
    } catch {
      parts.push(`[File: ${att.name} — could not fetch from storage]`);
    }
  }

  return parts.join('\n\n');
}

// ── Call Claude API for structured extraction ─────────────────
async function callClaudeExtraction(
  analysisText: string,
  documentText: string,
  report: ToolkitReport,
  targets: NBSAPTarget[],
  indicators: Indicator[]
): Promise<AIExtractionResult> {
  const targetList = targets
    .map(t => `T${t.id}: ${t.title.slice(0, 60)}`)
    .join('\n');

  const indicatorList = indicators
    .filter(i => i.nbsap_target_id === report.nbsap_target_id)
    .map(i => `ID:${i.id} | "${i.name.slice(0, 50)}" | current: ${i.current_value ?? 'N/A'} | progress: ${i.progress}%`)
    .join('\n');

  const selectedTarget = targets.find(t => t.id === report.nbsap_target_id);

  const systemPrompt = `You are an expert NBSAP biodiversity monitoring analyst for Rwanda (REMA).
Your task is to extract structured information from a submitted monitoring report.
You must return ONLY valid JSON — no explanations, no markdown, no preamble.`;

  const userPrompt = `Analyze this NBSAP monitoring report submission and extract structured information.

REPORT CONTEXT:
- Tool: ${report.tool_id} — ${report.tool_name}
- Submitted Target: T${report.nbsap_target_id ?? 'Not specified'} — ${selectedTarget?.title ?? 'Unknown'}
- Period: ${report.period ?? 'Not specified'}
- District: ${report.district ?? 'N/A'}

FORM FIELD CONTENT:
${analysisText}

${documentText ? `UPLOADED DOCUMENT CONTENT:\n${documentText}` : ''}

ALL NBSAP TARGETS (for reference):
${targetList}

INDICATORS FOR SELECTED TARGET:
${indicatorList || 'No indicators found for this target'}

INSTRUCTIONS:
1. targets_mentioned: List IDs of ANY NBSAP targets (beyond the already-selected one) referenced anywhere in the text.
2. progress_updates: If you find a numeric value or percentage that could update an indicator, list it with the most likely indicator_id. Be conservative — only include when clearly evident.
3. milestone_completions: If text mentions completing a milestone/deliverable (e.g., "baseline assessment completed", "report validated"), extract it.
4. budget_info: Extract any financial figures mentioned (amounts, currency, type).
5. locations: Extract named geographic locations (districts, forests, wetlands, lakes, sectors, cells).
6. activities: List key activities mentioned.
7. challenges: Extract challenges — classify type (Weather, Funding, Capacity, Policy, Infrastructure, Community, Other).
8. risks: Extract risks with severity estimate.
9. evidence_references: References to data sources, studies, surveys, photographs, GPS coordinates.
10. summary: Write 2–3 sentences synthesizing the key findings from this report.

IMPORTANT RULES:
- confidence scores must be between 0.0 and 1.0
- Only propose indicator_value updates you are at least 70% confident about
- Only propose target_progress if the text explicitly states a progress percentage for the target
- If uncertain, set confidence lower and still include the finding
- extracted_value must be a string (e.g., "60%", "5000 ha", "RWF 2,500,000")

Return this exact JSON structure (no other text):
{
  "targets_mentioned": [],
  "progress_updates": [
    { "indicator_id": 0, "extracted_value": "", "confidence": 0.0, "source": "" }
  ],
  "milestone_completions": [
    { "description": "", "milestone_keyword": "", "confidence": 0.0 }
  ],
  "budget_info": [
    { "amount": 0, "currency": "RWF", "type": "utilized", "source": "" }
  ],
  "locations": [],
  "activities": [],
  "challenges": [
    { "type": "", "description": "", "delay_mentioned": "" }
  ],
  "risks": [
    { "description": "", "severity": "medium" }
  ],
  "evidence_references": [],
  "summary": ""
}`;

  // Build message content — include PDF attachments if available
  const messageContent: unknown[] = [{ type: 'text', text: userPrompt }];
  for (const att of (report.attachments || [])) {
    const b64 = (att as unknown as Record<string, unknown>).__b64 as string | undefined;
    if (b64 && att.ext?.toLowerCase() === 'pdf') {
      messageContent.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: b64 },
      });
    }
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const rawText: string = data.content?.[0]?.text ?? '{}';

  // Strip markdown fences if Claude wraps the JSON
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned) as AIExtractionResult;
}

// ── Convert extraction result into proposal rows ──────────────
function buildProposals(
  extractionId: string,
  reportId: string,
  result: AIExtractionResult,
  report: ToolkitReport,
  indicators: Indicator[],
  targets: NBSAPTarget[]
): Omit<AIExtractionProposal, 'id' | 'created_at' | 'updated_at'>[] {
  const proposals: Omit<AIExtractionProposal, 'id' | 'created_at' | 'updated_at'>[] = [];

  // 1. Indicator value updates
  for (const pu of (result.progress_updates ?? [])) {
    if (!pu.indicator_id || pu.confidence < 0.70) continue;
    const ind = indicators.find(i => i.id === pu.indicator_id);
    if (!ind) continue;

    proposals.push({
      extraction_id: extractionId,
      report_id: reportId,
      proposal_type: 'indicator_value' as AIProposalType,
      target_id: ind.nbsap_target_id ?? undefined,
      indicator_id: ind.id,
      proposed_value: JSON.stringify({ current_value: pu.extracted_value }),
      current_value: ind.current_value ?? 'Not set',
      confidence_score: pu.confidence,
      reasoning: `Extracted from ${pu.source}: value "${pu.extracted_value}" appears to reflect current indicator status.`,
      source_field: pu.source,
      status: 'pending',
    });
  }

  // 2. Additional target associations
  for (const tid of (result.targets_mentioned ?? [])) {
    if (tid === report.nbsap_target_id) continue;
    const t = targets.find(x => x.id === tid);
    if (!t) continue;

    proposals.push({
      extraction_id: extractionId,
      report_id: reportId,
      proposal_type: 'target_association' as AIProposalType,
      target_id: tid,
      proposed_value: JSON.stringify({ target_id: tid }),
      current_value: `Currently linked to T${report.nbsap_target_id}`,
      confidence_score: 0.75,
      reasoning: `Report content references T${tid}: "${t.title.slice(0, 60)}" — consider adding secondary target association.`,
      source_field: 'text analysis',
      status: 'pending',
    });
  }

  // 3. Budget updates
  for (const bi of (result.budget_info ?? [])) {
    if (!bi.amount || bi.amount <= 0) continue;

    proposals.push({
      extraction_id: extractionId,
      report_id: reportId,
      proposal_type: 'budget_update' as AIProposalType,
      target_id: report.nbsap_target_id ?? undefined,
      proposed_value: JSON.stringify({ amount: bi.amount, currency: bi.currency, type: bi.type }),
      current_value: 'Not yet recorded in dashboard',
      confidence_score: 0.80,
      reasoning: `Budget figure detected: ${bi.currency} ${bi.amount.toLocaleString()} (${bi.type}) from "${bi.source}".`,
      source_field: bi.source,
      status: 'pending',
    });
  }

  // 4. Geographic updates
  if ((result.locations ?? []).length > 0) {
    proposals.push({
      extraction_id: extractionId,
      report_id: reportId,
      proposal_type: 'geographic_update' as AIProposalType,
      target_id: report.nbsap_target_id ?? undefined,
      proposed_value: JSON.stringify({ locations: result.locations }),
      current_value: report.district ?? 'District field only',
      confidence_score: 0.85,
      reasoning: `Report mentions geographic areas: ${result.locations.join(', ')}.`,
      source_field: 'text analysis',
      status: 'pending',
    });
  }

  return proposals;
}

// ── Public: trigger extraction (fire-and-forget) ──────────────
export async function triggerExtraction(report: ToolkitReport): Promise<void> {
  // Create the extraction row in 'processing' state
  const { data: extraction, error: createErr } = await supabase
    .from('ai_extractions')
    .insert({
      report_id: report.id,
      status: 'processing',
      model_used: 'claude-sonnet-4-20250514',
    })
    .select()
    .single();

  if (createErr || !extraction) {
    console.error('[AI Extraction] Failed to create extraction row:', createErr);
    return;
  }

  const startTime = Date.now();

  try {
    // Fetch targets and indicators for context
    const [{ data: targets }, { data: indicators }] = await Promise.all([
      supabase.from('nbsap_targets').select('id, title, goal').order('id'),
      supabase.from('indicators').select('id, name, nbsap_target_id, current_value, progress, status'),
    ]);

    const rawText = buildAnalysisText(report);
    const documentText = await fetchDocumentContent(report);

    const result = await callClaudeExtraction(
      rawText,
      documentText,
      report,
      (targets ?? []) as NBSAPTarget[],
      (indicators ?? []) as Indicator[]
    );

    const processingMs = Date.now() - startTime;

    // Update extraction row with results
    await supabase
      .from('ai_extractions')
      .update({
        status: 'complete',
        raw_text_analyzed: rawText,
        document_text: documentText || null,
        extraction_result: result,
        processing_time_ms: processingMs,
      })
      .eq('id', extraction.id);

    // Build and insert proposals
    const proposals = buildProposals(
      extraction.id,
      report.id,
      result,
      report,
      (indicators ?? []) as Indicator[],
      (targets ?? []) as NBSAPTarget[]
    );

    if (proposals.length > 0) {
      await supabase.from('ai_extraction_proposals').insert(proposals);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[AI Extraction] Extraction failed:', errorMsg);

    await supabase
      .from('ai_extractions')
      .update({
        status: 'failed',
        error_message: errorMsg,
        processing_time_ms: Date.now() - startTime,
      })
      .eq('id', extraction.id);
  }
}

// ── Public: fetch extraction + proposals for a report ─────────
export async function fetchExtraction(reportId: string): Promise<AIExtraction | null> {
  const { data, error } = await supabase
    .from('ai_extractions')
    .select(`
      *,
      proposals:ai_extraction_proposals(*)
    `)
    .eq('report_id', reportId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as AIExtraction;
}

// ── Public: approve a proposal ────────────────────────────────
export async function approveProposal(
  proposal: AIExtractionProposal,
  reviewerId: string,
  modifiedValue?: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ai_extraction_proposals')
    .update({
      status: modifiedValue ? 'modified' : 'approved',
      reviewer_id: reviewerId,
      reviewed_at: new Date().toISOString(),
      modified_value: modifiedValue ?? null,
    })
    .eq('id', proposal.id);

  return { error: error?.message ?? null };
}

// ── Public: reject a proposal ─────────────────────────────────
export async function rejectProposal(
  proposalId: string,
  reviewerId: string,
  note?: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ai_extraction_proposals')
    .update({
      status: 'rejected',
      reviewer_id: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_note: note ?? null,
    })
    .eq('id', proposalId);

  return { error: error?.message ?? null };
}

// ── Public: apply all approved proposals for a report ─────────
export async function applyApprovedProposals(
  reportId: string,
  reviewerId: string
): Promise<{ applied: number; errors: string[] }> {
  const { data: proposals, error } = await supabase
    .from('ai_extraction_proposals')
    .select('*')
    .eq('report_id', reportId)
    .in('status', ['approved', 'modified']);

  if (error || !proposals) {
    return { applied: 0, errors: [error?.message ?? 'Failed to fetch proposals'] };
  }

  let applied = 0;
  const errors: string[] = [];

  for (const p of proposals as AIExtractionProposal[]) {
    try {
      const valueStr = p.modified_value ?? p.proposed_value;
      const value = JSON.parse(valueStr);

      if (p.proposal_type === 'indicator_value' && p.indicator_id) {
        // Extract numeric progress from the value string (e.g. "65%" → 65)
        const rawVal: string = value.current_value ?? '';
        const numericMatch = rawVal.match(/(\d+(?:\.\d+)?)/);
        const numericProgress = numericMatch ? Math.min(100, Math.max(0, parseFloat(numericMatch[1]))) : null;

        if (numericProgress !== null) {
          const result = await updateIndicatorProgress(p.indicator_id, numericProgress);
          if (result.error) {
            errors.push(`Indicator ${p.indicator_id}: ${result.error}`);
          } else {
            applied++;
            await writeAuditEntry(
              'ai_proposal_applied',
              `Applied AI proposal: indicator #${p.indicator_id} progress set to ${numericProgress}%`,
              `Report ${reportId} | Proposal ${p.id} | Reviewer ${reviewerId}`
            );
          }
        }
      } else if (p.proposal_type === 'target_progress' && p.target_id) {
        const progress = typeof value.progress === 'number' ? value.progress : parseInt(value.progress ?? '0', 10);
        const { error: targErr } = await supabase
          .from('nbsap_targets')
          .update({ progress: Math.min(100, Math.max(0, progress)) })
          .eq('id', p.target_id);
        if (targErr) {
          errors.push(`Target ${p.target_id}: ${targErr.message}`);
        } else {
          applied++;
          await writeAuditEntry(
            'ai_proposal_applied',
            `Applied AI proposal: target #${p.target_id} progress set to ${progress}%`,
            `Report ${reportId} | Proposal ${p.id} | Reviewer ${reviewerId}`
          );
        }
      } else {
        // For non-data-modifying proposals (geographic, budget, association)
        // just mark as acknowledged — no DB update needed
        applied++;
        await writeAuditEntry(
          'ai_proposal_acknowledged',
          `Acknowledged AI ${p.proposal_type} proposal`,
          `Report ${reportId} | Proposal ${p.id}`
        );
      }

      // Mark this proposal as applied
      await supabase
        .from('ai_extraction_proposals')
        .update({ reviewer_note: (p.reviewer_note ?? '') + ' [applied]' })
        .eq('id', p.id);
    } catch (err) {
      errors.push(`Proposal ${p.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { applied, errors };
}

// ── Public: re-trigger extraction for a specific report ───────
export async function retriggerExtraction(reportId: string): Promise<void> {
  // Delete existing extraction (cascade deletes proposals)
  await supabase.from('ai_extractions').delete().eq('report_id', reportId);

  const { data: report } = await supabase
    .from('toolkit_reports')
    .select(`
      *,
      submitted_by_profile:profiles!submitted_by(id, full_name, email, role, organization),
      reviewed_by_profile:profiles!reviewed_by(id, full_name, email, role)
    `)
    .eq('id', reportId)
    .single();

  if (report) {
    void triggerExtraction(report as ToolkitReport);
  }
}

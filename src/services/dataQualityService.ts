// ============================================================
// M04 — Data-quality checklist and checks (migration 043)
// The checklist, field rules and jump threshold are data that REMA
// administrators maintain. The database checks every submission; the
// preview here runs the same function so the form can show the result
// before the user submits.
// ============================================================

import { supabase } from '../utils/supabase';
import type { DqaChecklistItem, QualityFlag, ReportType } from '../types/index';

export async function fetchChecklistItems(): Promise<DqaChecklistItem[]> {
  const { data, error } = await supabase
    .from('dqa_checklist_items')
    .select('id, ordinal, text, source, is_active')
    .eq('is_active', true)
    .order('ordinal')
    .order('id');
  if (error) throw new Error(`Could not load the data-quality checklist: ${error.message}`);
  return (data || []) as DqaChecklistItem[];
}

/** Run the submission checks on unsaved form values. */
export async function previewReportQuality(
  toolId: ReportType,
  formData: Record<string, unknown>,
  targetId: number | null,
  indicatorId: number | null
): Promise<QualityFlag[]> {
  const { data, error } = await supabase.rpc('preview_report_quality', {
    p_tool: toolId,
    p_form: formData,
    p_target: targetId,
    p_indicator: indicatorId,
  });
  if (error) throw new Error(error.message);
  return (data || []) as QualityFlag[];
}

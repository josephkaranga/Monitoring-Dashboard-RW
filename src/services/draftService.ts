// ============================================================
// M03 — Report drafts (migration 042)
// Drafts are private to their author and never counted or validated.
// Saves are versioned: a save based on an older version is refused, so
// two devices editing one draft cannot silently overwrite each other.
// ============================================================

import { supabase } from '../utils/supabase';
import type { ApiResponse, ReportAttachment, ReportType } from '../types/index';

export interface ReportDraft {
  id: string;
  user_id: string;
  tool_id: ReportType;
  form_data: Record<string, string>;
  attachments: ReportAttachment[];
  version: number;
  created_at: string;
  updated_at: string;
}

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

/** What a draft stores: uploaded evidence only, never file contents. */
export function attachmentsForDraft(attachments: ReportAttachment[]): ReportAttachment[] {
  return attachments.filter(a => !!a.storage_path).map(({ data_url: _dataUrl, ...rest }) => rest);
}

/** Has the user entered anything worth keeping? */
export function hasDraftContent(
  formData: Record<string, unknown>,
  attachments: ReportAttachment[]
): boolean {
  return (
    Object.values(formData).some(v => v !== '' && v !== null && v !== undefined) ||
    attachments.length > 0
  );
}

export async function listMyDrafts(): Promise<ReportDraft[]> {
  const { data, error } = await supabase
    .from('report_drafts')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Could not load your drafts: ${error.message}`);
  return (data || []) as ReportDraft[];
}

export async function fetchDraft(id: string): Promise<ReportDraft | null> {
  const { data, error } = await supabase
    .from('report_drafts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the draft: ${error.message}`);
  return (data as ReportDraft) ?? null;
}

export async function createDraft(
  toolId: ReportType,
  formData: Record<string, string>,
  attachments: ReportAttachment[]
): Promise<ApiResponse<ReportDraft>> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return { data: null, error: 'Not signed in' };
  const { data, error } = await supabase
    .from('report_drafts')
    .insert({
      user_id: uid,
      tool_id: toolId,
      form_data: formData,
      attachments: attachmentsForDraft(attachments),
    })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as ReportDraft, error: null };
}

export type SaveDraftResult =
  | { ok: true; draft: ReportDraft }
  | { ok: false; conflict: true }
  | { ok: false; conflict: false; error: string };

/** Save on top of `version`. If the draft moved on (another device), nothing changes. */
export async function saveDraft(
  id: string,
  version: number,
  formData: Record<string, string>,
  attachments: ReportAttachment[]
): Promise<SaveDraftResult> {
  const { data, error } = await supabase
    .from('report_drafts')
    .update({ form_data: formData, attachments: attachmentsForDraft(attachments) })
    .eq('id', id)
    .eq('version', version)
    .select();
  if (error) return { ok: false, conflict: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, conflict: true };
  return { ok: true, draft: data[0] as ReportDraft };
}

/**
 * Delete a draft. When it is discarded, its evidence files go too; when it
 * was submitted, the files now belong to the report and are kept.
 */
export async function deleteDraft(
  draft: Pick<ReportDraft, 'id' | 'attachments'>,
  { keepFiles = false }: { keepFiles?: boolean } = {}
): Promise<ApiResponse<null>> {
  if (!keepFiles) {
    const paths = (draft.attachments || [])
      .map(a => a.storage_path)
      .filter((p): p is string => !!p && p.includes('/drafts/'));
    if (paths.length) await supabase.storage.from('report-attachments').remove(paths);
  }
  const { error } = await supabase.from('report_drafts').delete().eq('id', draft.id);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

/** Upload one evidence file for a draft, so it survives a closed browser or another device. */
export async function uploadDraftEvidence(
  userId: string,
  draftId: string,
  att: ReportAttachment
): Promise<ApiResponse<ReportAttachment>> {
  if (att.storage_path) return { data: att, error: null };
  if (!att.data_url) return { data: null, error: `${att.name} has no content` };
  try {
    const base64 = att.data_url.split(',')[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const path = `${userId}/drafts/${draftId}/${Date.now()}_${att.name}`;
    const { error } = await supabase.storage
      .from('report-attachments')
      .upload(path, new Blob([bytes]), {
        contentType: MIME_BY_EXT[att.ext] || 'application/octet-stream',
      });
    if (error) return { data: null, error: error.message };
    return { data: { ...att, storage_path: path }, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

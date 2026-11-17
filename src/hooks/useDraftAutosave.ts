// ============================================================
// M03 — Auto-save a report form as a server draft.
// PDF: "Save drafts to the server every 5 minutes and on field change."
// Done when: closing the browser mid-form loses at most 5 minutes of work.
//
// - A draft is created on the first meaningful change.
// - Each change is saved DEBOUNCE_MS after typing stops (normally seconds
//   of work at risk, not minutes).
// - A save also runs every INTERVAL_MS while anything is unsaved, and a
//   failed save is retried, so even a flaky connection stays within the
//   5-minute bound once the network returns.
// - Saves are versioned; if the draft changed elsewhere, auto-save stops
//   and the user chooses whose version to keep.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createDraft,
  deleteDraft,
  fetchDraft,
  hasDraftContent,
  saveDraft,
  type ReportDraft,
} from '../services/draftService';
import type { ReportAttachment, ReportType } from '../types/index';

export const DEBOUNCE_MS = 2000;
export const INTERVAL_MS = 5 * 60 * 1000;
export const RETRY_MS = 15000;

export type DraftStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

function snapshot(formData: Record<string, string>, attachments: ReportAttachment[]): string {
  return JSON.stringify({
    formData,
    attachments: attachments
      .filter(a => a.storage_path)
      .map(a => [a.storage_path, a.evidence_type ?? '', a.description ?? '']),
  });
}

export function useDraftAutosave({
  toolId,
  formData,
  attachments,
  initialDraft,
  enabled = true,
}: {
  toolId: ReportType;
  formData: Record<string, string>;
  attachments: ReportAttachment[];
  initialDraft?: ReportDraft | null;
  enabled?: boolean;
}) {
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id ?? null);
  const [status, setStatus] = useState<DraftStatus>(initialDraft ? 'saved' : 'idle');
  const [savedAt, setSavedAt] = useState<Date | null>(
    initialDraft ? new Date(initialDraft.updated_at) : null
  );
  const [error, setError] = useState<string | null>(null);

  const idRef = useRef<string | null>(initialDraft?.id ?? null);
  const versionRef = useRef<number>(initialDraft?.version ?? 0);
  const latestRef = useRef({ formData, attachments });
  const savedSnapshotRef = useRef<string | null>(
    initialDraft ? snapshot(initialDraft.form_data, initialDraft.attachments) : null
  );
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const conflictRef = useRef(false);
  const stoppedRef = useRef(false);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  latestRef.current = { formData, attachments };

  const isDirty = () => {
    const { formData: f, attachments: a } = latestRef.current;
    return hasDraftContent(f, a) && snapshot(f, a) !== savedSnapshotRef.current;
  };

  const saveNow = useCallback(async (): Promise<void> => {
    if (!enabled || conflictRef.current || stoppedRef.current) return;
    if (savingRef.current) {
      queuedRef.current = true;
      return;
    }
    if (!isDirty()) return;
    savingRef.current = true;
    setStatus('saving');
    const { formData: f, attachments: a } = latestRef.current;
    const snap = snapshot(f, a);
    try {
      if (!idRef.current) {
        const r = await createDraft(toolId, f, a);
        if (r.error || !r.data) throw new Error(r.error || 'Could not create the draft');
        idRef.current = r.data.id;
        versionRef.current = r.data.version;
        setDraftId(r.data.id);
      } else {
        const r = await saveDraft(idRef.current, versionRef.current, f, a);
        if ('conflict' in r && r.conflict) {
          conflictRef.current = true;
          setStatus('conflict');
          return;
        }
        if ('error' in r) throw new Error(r.error);
        if (!('draft' in r)) throw new Error('Unexpected save result');
        versionRef.current = r.draft.version;
      }
      savedSnapshotRef.current = snap;
      setSavedAt(new Date());
      setError(null);
      setStatus('saved');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
      if (retryRef.current) clearTimeout(retryRef.current);
      retryRef.current = setTimeout(() => void saveNow(), RETRY_MS);
    } finally {
      savingRef.current = false;
      if (queuedRef.current && !conflictRef.current) {
        queuedRef.current = false;
        void saveNow();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, toolId]);

  // Save shortly after each change.
  const changeKey = snapshot(formData, attachments);
  useEffect(() => {
    if (!enabled || !isDirty()) return;
    const t = setTimeout(() => void saveNow(), DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeKey, enabled, saveNow]);

  // ...and every 5 minutes while anything is unsaved.
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      if (isDirty()) void saveNow();
    }, INTERVAL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, saveNow]);

  useEffect(
    () => () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    },
    []
  );

  /** Make sure a draft exists (e.g. before uploading evidence to it). */
  const ensureDraft = useCallback(async (): Promise<string | null> => {
    if (idRef.current) return idRef.current;
    const { formData: f, attachments: a } = latestRef.current;
    const r = await createDraft(toolId, f, a);
    if (r.error || !r.data) {
      setError(r.error);
      setStatus('error');
      return null;
    }
    idRef.current = r.data.id;
    versionRef.current = r.data.version;
    savedSnapshotRef.current = snapshot(f, a);
    setDraftId(r.data.id);
    setSavedAt(new Date());
    setStatus('saved');
    return r.data.id;
  }, [toolId]);

  /** Conflict: overwrite the other device's version with this one. */
  const keepMine = useCallback(async () => {
    if (!idRef.current) return;
    const server = await fetchDraft(idRef.current);
    if (!server) return;
    versionRef.current = server.version;
    conflictRef.current = false;
    savedSnapshotRef.current = null;
    await saveNow();
  }, [saveNow]);

  /** Conflict: load the other device's version (the caller puts it in the form). */
  const takeTheirs = useCallback(async (): Promise<ReportDraft | null> => {
    if (!idRef.current) return null;
    const server = await fetchDraft(idRef.current);
    if (!server) return null;
    versionRef.current = server.version;
    savedSnapshotRef.current = snapshot(server.form_data, server.attachments);
    conflictRef.current = false;
    setStatus('saved');
    setSavedAt(new Date(server.updated_at));
    return server;
  }, []);

  /**
   * Stop auto-saving and delete the draft: after submission (files kept,
   * they now belong to the report) or when the user discards it.
   */
  const finish = useCallback(async ({ discarded }: { discarded: boolean }) => {
    stoppedRef.current = true;
    if (retryRef.current) clearTimeout(retryRef.current);
    if (!idRef.current) return;
    await deleteDraft(
      { id: idRef.current, attachments: latestRef.current.attachments },
      { keepFiles: !discarded }
    );
    idRef.current = null;
    setDraftId(null);
    setStatus('idle');
  }, []);

  return { draftId, status, savedAt, error, saveNow, ensureDraft, keepMine, takeTheirs, finish };
}

// M04 — the checklist items, and a live preview of the submission checks
// for the values being typed (debounced; the database decides on submit).
import { useEffect, useState } from 'react';
import { fetchChecklistItems, previewReportQuality } from '../services/dataQualityService';
import type { DqaChecklistItem, QualityFlag, ReportType } from '../types/index';

export const PREVIEW_DEBOUNCE_MS = 700;

export function useChecklistItems() {
  const [items, setItems] = useState<DqaChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchChecklistItems()
      .then(r => alive && setItems(r))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { items, loading, error };
}

/**
 * Preview flags for unsaved values. `formData` must be stable between
 * renders when unchanged (component state is).
 */
export function useQualityPreview(
  toolId: ReportType,
  formData: Record<string, unknown>,
  targetId: number | null,
  indicatorId: number | null,
  enabled = true
) {
  const [flags, setFlags] = useState<QualityFlag[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setFlags([]);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      previewReportQuality(toolId, formData, targetId, indicatorId)
        .then(r => {
          if (!alive) return;
          setFlags(r);
          setError(null);
        })
        .catch((e: Error) => alive && setError(e.message));
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [toolId, formData, targetId, indicatorId, enabled]);

  return { flags, error };
}

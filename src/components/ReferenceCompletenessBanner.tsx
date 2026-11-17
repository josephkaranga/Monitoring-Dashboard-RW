// ============================================================
// M05 — "Done when: all indicators in use have complete reference data."
// Shows the count and which fields are still missing across indicators,
// so REMA can see what blocks completion (e.g. RBIS codes).
// ============================================================

import React, { useEffect, useState } from 'react';
import { fetchIndicatorReferences } from '../services/indicatorReferenceService';
import { referenceSummary, type ReferenceSummary } from '../utils/referenceSummary';

export default function ReferenceCompletenessBanner() {
  const [summary, setSummary] = useState<ReferenceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchIndicatorReferences()
      .then(r => alive && setSummary(referenceSummary(r)))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  if (error)
    return (
      <div role="alert" style={{ fontSize: '0.76rem', color: '#b91c1c', marginBottom: 12 }}>
        {error}
      </div>
    );
  if (!summary) return null;

  const done = summary.complete === summary.inUse;
  return (
    <div
      role="status"
      style={{
        border: `1px solid ${done ? '#bbf7d0' : '#fde68a'}`,
        background: done ? '#f0fdf4' : '#fffbeb',
        borderRadius: 10,
        padding: '10px 14px',
        marginBottom: 14,
        fontSize: '0.78rem',
        color: 'var(--text-1)',
      }}
    >
      <strong>Reference data:</strong> {summary.complete} of {summary.inUse} indicators in use
      complete · {summary.approved} approved by the TWG
      {summary.missing.length > 0 && (
        <span style={{ color: 'var(--text-2)' }}>
          {' '}
          · Missing: {summary.missing.map(([field, n]) => `${field} (${n})`).join(', ')}
        </span>
      )}
      <span style={{ color: 'var(--text-3)' }}>
        {' '}
        · Open an indicator for its reference sheet (PDF).
      </span>
    </div>
  );
}

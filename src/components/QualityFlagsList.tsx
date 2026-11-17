// ============================================================
// M04 — Data-quality findings: errors (submission refused) and warnings
// (recorded on the report and shown to validators, e.g. a 50% jump).
// ============================================================

import React from 'react';
import type { QualityFlag } from '../types/index';
import { qualityErrors, validatorAttention } from '../utils/dataQuality';

export default function QualityFlagsList({
  flags,
  title,
  compact = false,
}: {
  flags: QualityFlag[] | null | undefined;
  title?: string;
  compact?: boolean;
}) {
  const errors = qualityErrors(flags);
  const warnings = validatorAttention(flags);
  if (errors.length === 0 && warnings.length === 0) return null;

  const row = (f: QualityFlag, i: number, kind: 'error' | 'warning') => (
    <li
      key={`${kind}-${f.code}-${f.field ?? ''}-${i}`}
      style={{
        display: 'flex',
        gap: 6,
        fontSize: compact ? '0.72rem' : '0.78rem',
        color: kind === 'error' ? '#991b1b' : '#92400e',
        marginBottom: 3,
      }}
    >
      <span aria-hidden="true">{kind === 'error' ? '⛔' : f.code === 'jump' ? '📈' : '⚠️'}</span>
      <span>{f.message}</span>
    </li>
  );

  return (
    <div
      role={errors.length ? 'alert' : 'status'}
      style={{
        border: `1px solid ${errors.length ? '#fecaca' : '#fde68a'}`,
        background: errors.length ? '#fef2f2' : '#fffbeb',
        borderRadius: 8,
        padding: compact ? '6px 9px' : '9px 12px',
        margin: compact ? '6px 0' : '10px 0',
      }}
    >
      {title && (
        <div
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: errors.length ? '#991b1b' : '#92400e',
            marginBottom: 4,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </div>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {errors.map((f, i) => row(f, i, 'error'))}
        {warnings.map((f, i) => row(f, i, 'warning'))}
      </ul>
    </div>
  );
}

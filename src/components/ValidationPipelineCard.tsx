// ============================================================
// Dashboard stage filters (PDF: "Dashboard — add stage filters after M02")
// How many reports wait at each validation stage, and how many are
// returned, published or rejected. Counts come from v_validation_pipeline
// (migration 041) under the viewer's own access rules. Clicking a chip
// filters the dashboard's activity list to that stage.
// ============================================================

import React from 'react';
import type { PipelineRow } from '../services/reportService';

export type ActivityFilter =
  | { kind: 'published' }
  | { kind: 'returned' }
  | { kind: 'rejected' }
  | { kind: 'stage'; stageId: number; name: string };

export function sameFilter(a: ActivityFilter, b: ActivityFilter): boolean {
  return (
    a.kind === b.kind && (a.kind !== 'stage' || (b.kind === 'stage' && a.stageId === b.stageId))
  );
}

const chip = (active: boolean, bg: string, fg: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 12px',
  borderRadius: 10,
  border: `1.5px solid ${active ? fg : 'transparent'}`,
  background: bg,
  color: fg,
  fontSize: '0.78rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

export default function ValidationPipelineCard({
  rows,
  filter,
  onFilter,
  style,
}: {
  rows: PipelineRow[];
  filter: ActivityFilter;
  onFilter: (f: ActivityFilter) => void;
  style?: React.CSSProperties;
}) {
  const inValidation = rows
    .filter(
      r =>
        (r.workflow_status === 'submitted' || r.workflow_status === 'in_validation') &&
        r.current_stage_id
    )
    .reduce<Map<number, { name: string; ordinal: number; reports: number }>>((m, r) => {
      const prev = m.get(r.current_stage_id!);
      m.set(r.current_stage_id!, {
        name: r.stage_name ?? 'Validation',
        ordinal: r.stage_ordinal ?? 0,
        reports: (prev?.reports ?? 0) + r.reports,
      });
      return m;
    }, new Map());
  const stages = [...inValidation.entries()].sort((a, b) => a[1].ordinal - b[1].ordinal);
  const total = (ws: string) =>
    rows.filter(r => r.workflow_status === ws).reduce((n, r) => n + r.reports, 0);

  return (
    <div style={style}>
      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
        Validation pipeline
      </div>
      <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 12 }}>
        Only published reports count toward progress. Click a stage to list its reports below.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {stages.length === 0 && (
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Nothing is waiting for validation.
          </span>
        )}
        {stages.map(([id, s]) => {
          const f: ActivityFilter = { kind: 'stage', stageId: id, name: s.name };
          return (
            <button
              key={id}
              onClick={() => onFilter(f)}
              style={chip(sameFilter(filter, f), '#e0f2fe', '#0369a1')}
            >
              {s.name} <strong>{s.reports}</strong>
            </button>
          );
        })}
        <span style={{ color: '#cbd5e1' }}>|</span>
        <button
          onClick={() => onFilter({ kind: 'returned' })}
          style={chip(filter.kind === 'returned', '#ffedd5', '#9a3412')}
        >
          Returned <strong>{total('returned')}</strong>
        </button>
        <button
          onClick={() => onFilter({ kind: 'published' })}
          style={chip(filter.kind === 'published', '#dcfce7', '#166534')}
        >
          Published <strong>{total('published')}</strong>
        </button>
        <button
          onClick={() => onFilter({ kind: 'rejected' })}
          style={chip(filter.kind === 'rejected', '#fee2e2', '#991b1b')}
        >
          Rejected <strong>{total('rejected')}</strong>
        </button>
      </div>
    </div>
  );
}

// ============================================================
// M02 — Validation panel for one report (Verification Queue dialog).
// Route position, the actions this user may take, and the history the
// database recorded. Actions call review_report(); the database decides.
// ============================================================

import React, { useEffect, useState } from 'react';
import { fetchReportHistory, type ReviewAction } from '../services/reportService';
import { WORKFLOW_LABELS, isFinalStage, stageProgress } from '../utils/workflow';
import type { ReportHistoryEntry, ToolkitReport, ValidationStage } from '../types/index';

const ACTION_LABEL: Record<string, string> = {
  submit: 'Submitted',
  resubmit: 'Corrected and resubmitted',
  approve: 'Approved',
  publish: 'Published',
  return: 'Returned for correction',
  reject: 'Rejected',
};

const btn = (bg: string, fg = '#fff', border = 'none'): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: '0.8rem',
  fontWeight: 700,
  cursor: 'pointer',
  border,
  background: bg,
  color: fg,
  fontFamily: "'DM Sans', sans-serif",
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
});

export default function WorkflowPanel({
  report,
  stages,
  canAct,
  isOwnSubmission,
  busy,
  onReview,
  onDelete,
}: {
  report: ToolkitReport;
  stages: ValidationStage[];
  canAct: boolean;
  isOwnSubmission: boolean;
  busy: boolean;
  onReview: (action: ReviewAction, note: string) => void;
  onDelete?: () => void;
}) {
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<ReportHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchReportHistory(report.id)
      .then(h => !cancelled && setHistory(h))
      .catch(e => !cancelled && setHistoryError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [report.id, report.workflow_status, report.current_stage_id]);

  const stageName = (id: number | null | undefined) =>
    stages.find(s => s.id === id)?.name ?? (id ? `Stage ${id}` : '');
  const progress = stageProgress(report, stages);
  const published = report.workflow_status === 'published';
  const final = isFinalStage(report);
  const noteMissing = note.trim() === '';

  return (
    <div
      style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface-2)',
        flexShrink: 0,
        maxHeight: '45vh',
        overflowY: 'auto',
      }}
    >
      {/* Route */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span
          style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', marginRight: 4 }}
        >
          ROUTE
        </span>
        {(report.route ?? []).map((id, i) => {
          const current = id === report.current_stage_id && !published;
          const passed = published || (progress != null && i < progress.position - 1);
          return (
            <span
              key={id}
              style={{
                fontSize: '0.7rem',
                padding: '3px 9px',
                borderRadius: 12,
                border: `1px solid ${current ? '#0ea5e9' : 'var(--border)'}`,
                background: passed ? '#dcfce7' : current ? '#e0f2fe' : 'var(--surface)',
                color: passed ? '#166534' : current ? '#0369a1' : 'var(--text-3)',
                fontWeight: current ? 700 : 500,
              }}
            >
              {i + 1}. {stageName(id)}
            </span>
          );
        })}
        <span style={{ fontSize: '0.72rem', color: 'var(--text-2)', marginLeft: 6 }}>
          {report.workflow_status ? WORKFLOW_LABELS[report.workflow_status] : ''}
          {report.workflow_status === 'returned' && report.returned_at_stage_id
            ? ` at ${stageName(report.returned_at_stage_id)}`
            : ''}
        </span>
      </div>

      {/* Actions */}
      {isOwnSubmission ? (
        <div
          style={{
            fontSize: '0.8rem',
            color: 'var(--text-3)',
            fontStyle: 'italic',
            marginBottom: 12,
          }}
        >
          <i className="fa-solid fa-user-lock" style={{ marginRight: 6 }} />
          You submitted this report, so other validators must review it.
        </div>
      ) : canAct ? (
        <div style={{ marginBottom: 14 }}>
          <textarea
            aria-label="Validator note"
            placeholder={
              published
                ? 'Why is this publication being withdrawn? (required)'
                : 'Note for the submitter and the next stage (required to return or reject)'
            }
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontFamily: "'DM Sans', sans-serif",
              resize: 'vertical',
              marginBottom: 8,
              background: 'var(--surface)',
              color: 'var(--text-1)',
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {published ? (
              <button
                disabled={busy || noteMissing}
                onClick={() => onReview('return', note)}
                style={{
                  ...btn('#fff7ed', '#9a3412', '1px solid #fed7aa'),
                  opacity: noteMissing ? 0.5 : 1,
                }}
              >
                <i className="fa-solid fa-rotate-left" /> Withdraw publication
              </button>
            ) : (
              <>
                <button
                  disabled={busy}
                  onClick={() => onReview('approve', note)}
                  style={btn('#16a34a')}
                >
                  <i className="fa-solid fa-check" />
                  {busy ? 'Working…' : final ? 'Approve and publish' : 'Approve and send on'}
                </button>
                <button
                  disabled={busy || noteMissing}
                  onClick={() => onReview('return', note)}
                  title={noteMissing ? 'Write a note first' : undefined}
                  style={{ ...btn('#f59e0b'), opacity: noteMissing ? 0.5 : 1 }}
                >
                  <i className="fa-solid fa-rotate-left" /> Return for correction
                </button>
                <button
                  disabled={busy || noteMissing}
                  onClick={() => onReview('reject', note)}
                  title={noteMissing ? 'Write a note first' : undefined}
                  style={{ ...btn('#dc2626'), opacity: noteMissing ? 0.5 : 1 }}
                >
                  <i className="fa-solid fa-xmark" /> Reject
                </button>
              </>
            )}
            {final && !published && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                Publishing makes this report count toward target progress.
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 12 }}>
          {report.workflow_status === 'submitted' || report.workflow_status === 'in_validation'
            ? `Waiting for ${progress?.name ?? 'validation'}. You are not a validator for this stage.`
            : 'No action is waiting for you on this report.'}
        </div>
      )}

      {/* History */}
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>
        HISTORY
      </div>
      {historyError ? (
        <div style={{ fontSize: '0.78rem', color: '#b91c1c' }}>{historyError}</div>
      ) : (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {history.map(h => (
            <li
              key={h.id}
              style={{
                fontSize: '0.76rem',
                padding: '5px 0',
                borderBottom: '1px dashed var(--border)',
              }}
            >
              <strong>{ACTION_LABEL[h.action] ?? h.action}</strong>
              {h.stage_id ? ` · ${stageName(h.stage_id)}` : ''}
              {' · '}
              {h.actor_profile?.full_name || h.actor_profile?.email || 'System'}
              {' · '}
              <span style={{ color: 'var(--text-3)' }}>
                {new Date(h.created_at).toLocaleString()}
              </span>
              {h.note && (
                <div style={{ color: 'var(--text-2)', marginTop: 2, whiteSpace: 'pre-wrap' }}>
                  “{h.note}”
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {onDelete && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={onDelete} style={btn('#fff1f2', '#dc2626', '1px solid #fecaca')}>
            <i className="fa-solid fa-trash-can" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

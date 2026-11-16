// ============================================================
// M02 — Correct and resubmit a returned report (the submitter's side).
// Shows why the report came back, lets the submitter correct the values
// and add evidence, and sends it back through resubmit_report(). The
// institution and district stay as they were (the database refuses a
// change); the route starts again from the first stage.
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../services/AuthContext';
import { fetchReportHistory, resubmitReport, uploadEvidence } from '../services/reportService';
import { formatFieldLabel } from '../utils/formData';
import {
  EVIDENCE_ACCEPTED_EXT,
  EVIDENCE_TYPES,
  evidenceFileProblem,
  evidenceSubmissionProblem,
  fileExtension,
} from '../utils/evidence';
import type { ReportAttachment, ReportHistoryEntry, ToolkitReport } from '../types/index';

// Changing these would move the report to another institution, district,
// target or period: that is a new report, not a correction.
const LOCKED = new Set([
  'stakeholder',
  'district',
  'institution',
  'nbsap_target',
  'indicator',
  'period',
]);

const field: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid var(--border)',
  borderRadius: 7,
  fontSize: '0.8rem',
  fontFamily: "'DM Sans', sans-serif",
  background: 'var(--surface)',
  color: 'var(--text-1)',
};

export default function ResubmitReportModal({
  report,
  onClose,
  onDone,
}: {
  report: ToolkitReport;
  onClose: () => void;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const original = report.form_data || {};
  // Only plain values are editable here; structured values are kept as they are.
  const editableKeys = useMemo(
    () =>
      Object.keys(original).filter(
        k => !LOCKED.has(k) && ['string', 'number', 'boolean'].includes(typeof original[k])
      ),
    [original]
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(editableKeys.map(k => [k, String(original[k] ?? '')]))
  );
  const [attachments, setAttachments] = useState<ReportAttachment[]>(report.attachments || []);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [returnEntry, setReturnEntry] = useState<ReportHistoryEntry | null>(null);

  useEffect(() => {
    fetchReportHistory(report.id)
      .then(h => setReturnEntry([...h].reverse().find(e => e.action === 'return') ?? null))
      .catch(() => setReturnEntry(null));
  }, [report.id]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted = [...attachments];
    Array.from(files).forEach(f => {
      const problem = evidenceFileProblem(f, accepted);
      if (problem) {
        toast.error(problem);
        return;
      }
      const placeholder: ReportAttachment = {
        name: f.name,
        ext: fileExtension(f.name),
        size: f.size,
      };
      accepted.push(placeholder);
      const reader = new FileReader();
      reader.onload = e =>
        setAttachments(prev => [
          ...prev,
          {
            ...placeholder,
            data_url: e.target?.result as string,
            evidence_type: '',
            description: '',
          },
        ]);
      reader.readAsDataURL(f);
    });
  };

  const submit = async () => {
    const evidenceProblem = evidenceSubmissionProblem(
      attachments.map(a =>
        a.storage_path && !a.evidence_type
          ? { ...a, evidence_type: 'other', description: a.description || a.name }
          : a
      )
    );
    if (evidenceProblem) {
      toast.error(evidenceProblem);
      return;
    }
    if (!user) return;
    setBusy(true);
    const { uploaded, failed } = await uploadEvidence(user.id, attachments);
    if (failed.length) {
      setBusy(false);
      toast.error(`Could not upload: ${failed.join(', ')}. Nothing was resubmitted.`);
      return;
    }
    const formData: Record<string, unknown> = { ...original };
    for (const k of editableKeys) {
      formData[k] =
        typeof original[k] === 'number' && values[k] !== '' && !isNaN(Number(values[k]))
          ? Number(values[k])
          : typeof original[k] === 'boolean'
            ? values[k] === 'true'
            : values[k];
    }
    const r = await resubmitReport(report.id, formData, uploaded, note);
    setBusy(false);
    if (r.error) toast.error(r.error);
    else {
      toast.success('Resubmitted: the report goes back through validation');
      onDone();
    }
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,39,68,0.6)',
        zIndex: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Correct and resubmit"
        style={{
          background: 'var(--surface)',
          borderRadius: 14,
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>Correct and resubmit</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-3)' }}>
              {report.tool_name} · {report.period ?? ''}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              borderRadius: 8,
              cursor: 'pointer',
              padding: '4px 10px',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <div
            style={{
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 16,
            }}
          >
            <div
              style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9a3412', marginBottom: 4 }}
            >
              RETURNED
              {returnEntry?.actor_profile?.full_name
                ? ` BY ${returnEntry.actor_profile.full_name.toUpperCase()}`
                : ''}
            </div>
            <div style={{ fontSize: '0.84rem', color: '#7c2d12', whiteSpace: 'pre-wrap' }}>
              {report.review_note || returnEntry?.note || 'No reason recorded.'}
            </div>
          </div>

          <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 8 }}>Values</div>
          {editableKeys.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 14 }}>
              This report has no editable values; add evidence or a note below.
            </div>
          ) : (
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}
            >
              {editableKeys.map(k => (
                <label key={k} style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                  {formatFieldLabel(k)}
                  <input
                    value={values[k]}
                    onChange={e => setValues(v => ({ ...v, [k]: e.target.value }))}
                    style={{ ...field, marginTop: 3 }}
                  />
                </label>
              ))}
            </div>
          )}

          <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 8 }}>Evidence</div>
          {attachments.map((a, i) => (
            <div
              key={`${a.name}-${i}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.3fr 1fr auto',
                gap: 8,
                alignItems: 'center',
                marginBottom: 6,
                fontSize: '0.78rem',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.storage_path ? '📎' : '🆕'} {a.name}
              </span>
              {a.storage_path ? (
                <span style={{ color: 'var(--text-3)' }}>
                  {EVIDENCE_TYPES.find(t => t.value === a.evidence_type)?.label ??
                    'Submitted earlier'}
                </span>
              ) : (
                <select
                  aria-label={`Evidence type for ${a.name}`}
                  value={a.evidence_type || ''}
                  onChange={e =>
                    setAttachments(prev =>
                      prev.map((x, j) => (j === i ? { ...x, evidence_type: e.target.value } : x))
                    )
                  }
                  style={field}
                >
                  <option value="">— Evidence type —</option>
                  {EVIDENCE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          ))}
          <label
            style={{
              display: 'inline-block',
              fontSize: '0.78rem',
              color: '#0369a1',
              cursor: 'pointer',
              margin: '4px 0 16px',
            }}
          >
            + Add evidence
            <input
              type="file"
              multiple
              accept={EVIDENCE_ACCEPTED_EXT.map(e => `.${e}`).join(',')}
              onChange={e => addFiles(e.target.files)}
              style={{ display: 'none' }}
            />
          </label>

          <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 6 }}>Your response</div>
          <textarea
            aria-label="Response to the validator"
            placeholder="What did you correct? (seen by the validators)"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            style={{ ...field, resize: 'vertical', marginBottom: 14 }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
              The report goes through every validation stage again.
            </span>
            <button
              onClick={submit}
              disabled={busy}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: 'none',
                background: '#1e3a5f',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {busy ? 'Sending…' : 'Resubmit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

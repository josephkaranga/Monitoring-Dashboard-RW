import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useReports } from '../hooks/useData';
import { fetchValidationStages, reviewReport, type ReviewAction } from '../services/reportService';
import WorkflowPanel from '../components/WorkflowPanel';
import { useInstitutions, useMyScopes } from '../hooks/useInstitutions';
import { WORKFLOW_LABELS, canActOnReport, stageProgress } from '../utils/workflow';
import { validatorAttention } from '../utils/dataQuality';
import type { ValidationStage, WorkflowStatus } from '../types/index';
import { writeAuditEntry } from '../services/dataService';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';
// Lazy-loaded to avoid bundling ~800KB on initial page load
// Spreadsheet preview without the `xlsx` package (security annex: vulnerable library).
const loadSpreadsheetPreview = () => import('../utils/spreadsheetPreview');
const loadMammoth = () => import('mammoth');
import DOMPurify from 'dompurify';
import type { ToolkitReport, ReportAttachment } from '../types/index';
import { flattenFormData, groupedFormData } from '../utils/formData';
import { evidenceTypeLabel } from '../utils/evidence';

const TOOL_EMOJI: Record<string, string> = {
  T01: '\u{1F3DB}️',
  T02: '\u{1F33F}',
  T03: '\u{1F6E1}️',
  T04: '\u{1F465}',
  T05: '\u{1F4B0}',
  T06: '\u{1F3D7}️',
  T07: '\u{1F52C}',
};

// Badge per validation state (M02). The derived status is used only for
// reports loaded before migration 040.
const WORKFLOW_CFG: Record<WorkflowStatus, { bg: string; color: string }> = {
  draft: { bg: '#f1f5f9', color: '#475569' },
  submitted: { bg: '#fef9c3', color: '#854d0e' },
  in_validation: { bg: '#e0f2fe', color: '#0369a1' },
  returned: { bg: '#ffedd5', color: '#9a3412' },
  published: { bg: '#dcfce7', color: '#166534' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
};

function statusBadge(report: ToolkitReport): { bg: string; color: string; label: string } {
  const ws: WorkflowStatus =
    report.workflow_status ??
    (report.status === 'approved'
      ? 'published'
      : report.status === 'rejected'
        ? 'rejected'
        : 'submitted');
  return { ...WORKFLOW_CFG[ws], label: WORKFLOW_LABELS[ws].toUpperCase() };
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius)',
  border: '1.5px solid var(--border)',
  boxShadow: 'var(--shadow-sm)',
};

async function getSignedUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('report-attachments')
    .createSignedUrl(storagePath, 600);
  return data?.signedUrl ?? null;
}

async function downloadFileBytes(storagePath: string): Promise<ArrayBuffer | null> {
  const { data, error } = await supabase.storage.from('report-attachments').download(storagePath);
  if (error || !data) return null;
  return data.arrayBuffer();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(ext: string): { icon: string; color: string } {
  if (ext === 'pdf') return { icon: 'fa-file-pdf', color: '#dc2626' };
  if (['xlsx', 'xls', 'csv'].includes(ext)) return { icon: 'fa-file-excel', color: '#16a34a' };
  if (['doc', 'docx'].includes(ext)) return { icon: 'fa-file-word', color: '#2563eb' };
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
    return { icon: 'fa-file-image', color: '#8b5cf6' };
  return { icon: 'fa-file', color: '#6b7280' };
}

const headerBtn: React.CSSProperties = {
  padding: '5px 12px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  fontSize: '0.72rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

/* ── Attachment Preview Component ────────────────────────── */
function AttachmentPreview({ att }: { att: ReportAttachment }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PDF
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  // Image
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  // Excel
  const [excelHtml, setExcelHtml] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const sheetsRef = useRef<import('../utils/spreadsheetPreview').PreviewSheet[]>([]);
  const toHtmlRef = useRef<
    ((sheet: import('../utils/spreadsheetPreview').PreviewSheet) => string) | null
  >(null);
  // Word
  const [wordHtml, setWordHtml] = useState<string | null>(null);

  const ext = (att.ext || '').toLowerCase().replace('.', '');
  const { icon, color } = getFileIcon(ext);

  const renderExcelSheet = useCallback((idx: number) => {
    const sheet = sheetsRef.current[idx];
    if (!sheet || !toHtmlRef.current) return;
    setExcelHtml(toHtmlRef.current(sheet));
    setActiveSheet(idx);
  }, []);

  useEffect(() => {
    if (!att.storage_path) {
      setLoading(false);
      setError('No file path');
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        if (ext === 'pdf') {
          const url = await getSignedUrl(att.storage_path!);
          if (!cancelled) {
            setPdfUrl(url);
            setLoading(false);
          }
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          const url = await getSignedUrl(att.storage_path!);
          if (!cancelled) {
            setImgUrl(url);
            setLoading(false);
          }
        } else if (ext === 'xls') {
          // Legacy binary Excel cannot be previewed in the browser; download instead.
          if (!cancelled) {
            setError('Preview is not available for .xls files. Download the file to open it.');
            setLoading(false);
          }
        } else if (['xlsx', 'csv'].includes(ext)) {
          const [buf, sp] = await Promise.all([
            downloadFileBytes(att.storage_path!),
            loadSpreadsheetPreview(),
          ]);
          if (cancelled || !buf) {
            if (!cancelled) {
              setError('Failed to load file');
              setLoading(false);
            }
            return;
          }
          sheetsRef.current =
            ext === 'csv' ? [sp.parseCsv(new TextDecoder('utf-8').decode(buf))] : sp.parseXlsx(buf);
          toHtmlRef.current = sp.sheetToHtml;
          setSheetNames(sheetsRef.current.map(sh => sh.name));
          renderExcelSheet(0);
          if (!cancelled) setLoading(false);
        } else if (['doc', 'docx'].includes(ext)) {
          const [buf, mam] = await Promise.all([
            downloadFileBytes(att.storage_path!),
            loadMammoth(),
          ]);
          if (cancelled || !buf) {
            if (!cancelled) {
              setError('Failed to load file');
              setLoading(false);
            }
            return;
          }
          const result = await mam.default.convertToHtml({ arrayBuffer: buf });
          if (!cancelled) {
            setWordHtml(result.value);
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to preview file');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [att.storage_path, ext, renderExcelSheet]);

  const handleDownload = useCallback(async () => {
    if (!att.storage_path) return;
    const signed = await getSignedUrl(att.storage_path);
    if (signed) window.open(signed, '_blank');
    else toast.error('Could not generate download link');
  }, [att.storage_path]);

  const hasPreview = pdfUrl || imgUrl || excelHtml || wordHtml;

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'var(--surface-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`fa-solid ${icon}`} style={{ color, fontSize: '1rem' }} />
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)' }}>
              {att.name}
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-3)',
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {ext.toUpperCase()} {att.size ? `· ${formatFileSize(att.size)}` : ''}
            </div>
            {att.evidence_type ? (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', marginTop: 2 }}>
                <strong>{evidenceTypeLabel(att.evidence_type) ?? att.evidence_type}</strong>
                {att.description ? ` — ${att.description}` : ''}
              </div>
            ) : (
              <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: 2 }}>
                Evidence type not recorded (submitted before classification was required)
              </div>
            )}
          </div>
        </div>
        <button onClick={handleDownload} style={headerBtn}>
          <i className="fa-solid fa-download" /> Download
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div
          style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem' }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              border: '2px solid var(--border)',
              borderTopColor: 'var(--sky-dim)',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              margin: '0 auto 10px',
            }}
          />
          Loading preview...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ padding: 20, textAlign: 'center', color: '#dc2626', fontSize: '0.78rem' }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
          {error}
        </div>
      )}

      {/* PDF */}
      {pdfUrl && (
        <iframe
          src={pdfUrl}
          title={att.name}
          style={{ width: '100%', height: 550, border: 'none', background: '#f3f4f6' }}
        />
      )}

      {/* Image */}
      {imgUrl && (
        <div style={{ padding: 16, textAlign: 'center', background: '#f9fafb' }}>
          <img
            src={imgUrl}
            alt={att.name}
            style={{
              maxWidth: '100%',
              maxHeight: 500,
              borderRadius: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
        </div>
      )}

      {/* Excel */}
      {excelHtml && (
        <div>
          {sheetNames.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: 0,
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            >
              {sheetNames.map((name, i) => (
                <button
                  key={name}
                  onClick={() => renderExcelSheet(i)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.72rem',
                    fontWeight: activeSheet === i ? 700 : 500,
                    border: 'none',
                    borderBottom:
                      activeSheet === i ? '2px solid var(--sky-dim)' : '2px solid transparent',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: activeSheet === i ? 'var(--sky-dim)' : 'var(--text-3)',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          <div style={{ maxHeight: 400, overflow: 'auto', fontSize: '0.75rem' }}>
            <style>{`
              .excel-preview table { width: 100%; border-collapse: collapse; }
              .excel-preview td, .excel-preview th {
                border: 1px solid var(--border); padding: 4px 8px;
                text-align: left; font-size: 0.75rem; white-space: nowrap;
              }
              .excel-preview tr:first-child td, .excel-preview tr:first-child th {
                background: var(--surface-2); font-weight: 700; position: sticky; top: 0;
              }
              .excel-preview tr:nth-child(even) td { background: #f9fafb; }
            `}</style>
            <div
              className="excel-preview"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(excelHtml) }}
            />
          </div>
        </div>
      )}

      {/* Word */}
      {wordHtml && (
        <div
          style={{
            maxHeight: 500,
            overflow: 'auto',
            padding: '16px 20px',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            color: 'var(--text-1)',
          }}
        >
          <style>{`
            .word-preview h1, .word-preview h2, .word-preview h3 { margin: 12px 0 6px; }
            .word-preview p { margin: 6px 0; }
            .word-preview table { border-collapse: collapse; width: 100%; margin: 10px 0; }
            .word-preview td, .word-preview th { border: 1px solid var(--border); padding: 4px 8px; font-size: 0.8rem; }
            .word-preview img { max-width: 100%; }
          `}</style>
          <div
            className="word-preview"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(wordHtml) }}
          />
        </div>
      )}

      {/* Unsupported file type */}
      {!loading && !error && !hasPreview && (
        <div
          style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.78rem' }}
        >
          Preview not available for this file type. Use the download button above.
        </div>
      )}
    </div>
  );
}

/* ── Report Detail Modal — helpers ──────────────────────── */

interface EvalResult {
  completion_pct: number | null;
  performance_status: string | null;
  trend_direction: string | null;
  change_pct: number | null;
  latest_period: string | null;
}

const PERF_CFG: Record<string, { bg: string; color: string; label: string }> = {
  'on-track': { bg: '#dcfce7', color: '#166534', label: 'On Track' },
  'at-risk': { bg: '#fef9c3', color: '#854d0e', label: 'At Risk' },
  behind: { bg: '#fee2e2', color: '#991b1b', label: 'Behind' },
};

const TREND_ICON: Record<string, string> = {
  improving: '↑',
  declining: '↓',
  stable: '→',
  insufficient_data: '—',
};

// form_data keys displayed in dedicated sections — excluded from Reported Data
const REPORTED_STRIP = new Set([
  'institution',
  'period',
  'stakeholder',
  'nbsap_target',
  'indicator',
  'district',
]);

const cLabel: React.CSSProperties = {
  fontSize: '0.58rem',
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontFamily: "'DM Mono', monospace",
  marginBottom: 3,
};
const cValue: React.CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--text-1)',
  wordBreak: 'break-word',
};
const cSub: React.CSSProperties = {
  fontSize: '0.65rem',
  color: 'var(--text-3)',
  fontFamily: "'DM Mono', monospace",
  marginTop: 2,
};

function InfoChip({
  label,
  primary,
  sub,
}: {
  label: string;
  primary: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px' }}>
      <div style={cLabel}>{label}</div>
      <div style={cValue}>{primary ?? '—'}</div>
      {sub && <div style={cSub}>{sub}</div>}
    </div>
  );
}

function SectionHead({ icon, title }: { icon: string; title: string }) {
  return (
    <div
      style={{
        fontSize: '0.62rem',
        fontWeight: 700,
        color: 'var(--text-3)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: "'DM Mono', monospace",
        marginBottom: 10,
        paddingBottom: 7,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <i className={`fa-solid ${icon}`} />
      {title}
    </div>
  );
}

/* ── Report Detail Modal ─────────────────────────────────── */
function ReportDetailModal({
  report,
  onReview,
  stages,
  canAct,
  canDelete,
  onDelete,
  onClose,
  actioning,
  currentUserId,
}: {
  report: ToolkitReport;
  onReview: (id: string, action: ReviewAction, note: string) => void;
  stages: ValidationStage[];
  canAct: boolean;
  canDelete: boolean;
  onDelete: (id: string, name: string) => void;
  onClose: () => void;
  actioning: string | null;
  currentUserId?: string;
}) {
  const st = statusBadge(report);
  // Nobody reviews their own submission (also enforced by the database, migration 037).
  const isOwnSubmission = !!currentUserId && report.submitted_by === currentUserId;
  const attachments = report.attachments || [];
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Load computed indicator performance when the modal opens
  useEffect(() => {
    const indId = report.indicator_id;
    if (!indId) return;
    setEvalResult(null);
    supabase
      .from('v_eval_performance_status')
      .select('completion_pct, performance_status, trend_direction, change_pct, latest_period')
      .eq('indicator_id', indId)
      .maybeSingle()
      .then(({ data }) => setEvalResult(data as EvalResult | null));
  }, [report.id, report.indicator_id]);

  // Reported data: strip keys shown in other sections so nothing appears twice
  const reportedData = Object.fromEntries(
    Object.entries(report.form_data || {}).filter(([k]) => !REPORTED_STRIP.has(k))
  );
  const dataSections = groupedFormData(reportedData);

  const perfCfg = evalResult?.performance_status ? PERF_CFG[evalResult.performance_status] : null;
  const trendIcon = evalResult?.trend_direction
    ? (TREND_ICON[evalResult.trend_direction] ?? '—')
    : null;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          width: '90%',
          maxWidth: 840,
          maxHeight: '90vh',
          background: 'var(--surface)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.5rem' }}>{TOOL_EMOJI[report.tool_id] || ''}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)' }}>
                {report.tool_name}
              </div>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-3)',
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {report.id.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                background: st.bg,
                color: st.color,
                fontSize: '0.68rem',
                padding: '3px 10px',
                borderRadius: 10,
                fontWeight: 700,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {st.label}
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: 'var(--text-3)',
                padding: '4px 8px',
              }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* ── §1  Submission Details ─────────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <SectionHead icon="fa-inbox" title="Submission Details" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <InfoChip
                label="Submitted By"
                primary={report.submitted_by_profile?.full_name || 'Unknown'}
                sub={report.submitted_by_profile?.email}
              />
              <InfoChip label="Institution" primary={report.institution} />
              <InfoChip
                label="Submitted At"
                primary={fmtDate(report.submitted_at)}
                sub={fmtTime(report.submitted_at)}
              />
              <InfoChip label="Reporting Period" primary={report.period} />
              <InfoChip
                label="Stakeholder"
                primary={(report.form_data?.stakeholder as string) || '—'}
              />
              <InfoChip label="Module" primary={report.tool_id} sub={report.tool_name} />
            </div>
          </div>

          {/* ── §2  Reported Data ──────────────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <SectionHead icon="fa-pen-to-square" title="Reported Data" />
            {dataSections.length === 0 ? (
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-3)',
                  fontStyle: 'italic',
                  margin: 0,
                }}
              >
                No data fields recorded.
              </p>
            ) : (
              dataSections.map(sec => (
                <div key={sec.id} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color: 'var(--sky-dim)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontFamily: "'DM Mono', monospace",
                      marginBottom: 6,
                    }}
                  >
                    {sec.label}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {sec.fields.map(f => (
                      <div
                        key={f.key}
                        style={{
                          background: 'var(--surface-2)',
                          borderRadius: 8,
                          padding: '8px 12px',
                        }}
                      >
                        <div style={cLabel}>{f.label}</div>
                        <div style={cValue}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            {attachments.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    color: 'var(--sky-dim)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontFamily: "'DM Mono', monospace",
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <i className="fa-solid fa-paperclip" />
                  Attachments ({attachments.length})
                </div>
                {attachments.map((att, i) => (
                  <AttachmentPreview key={att.storage_path || i} att={att} />
                ))}
              </div>
            )}
          </div>

          {/* ── §3  Reference Information ──────────────────── */}
          {(report.nbsap_target || report.nbsap_indicator) && (
            <div style={{ marginBottom: 24 }}>
              <SectionHead icon="fa-book-open" title="Reference Information" />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    report.nbsap_target && report.nbsap_indicator ? '1fr 1fr' : '1fr',
                  gap: 10,
                }}
              >
                {report.nbsap_target && (
                  <div
                    style={{
                      background: 'var(--surface-2)',
                      borderRadius: 8,
                      padding: '10px 14px',
                    }}
                  >
                    <div style={{ ...cLabel, marginBottom: 5 }}>NBSAP Target</div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: 'var(--text-1)',
                        marginBottom: 4,
                      }}
                    >
                      T{report.nbsap_target.id}: {report.nbsap_target.title}
                    </div>
                    <div style={cSub}>Goal {report.nbsap_target.goal}</div>
                    {report.district && <div style={cSub}>District: {report.district}</div>}
                  </div>
                )}

                {report.nbsap_indicator && (
                  <div
                    style={{
                      background: 'var(--surface-2)',
                      borderRadius: 8,
                      padding: '10px 14px',
                    }}
                  >
                    <div style={{ ...cLabel, marginBottom: 5 }}>Indicator</div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: 'var(--text-1)',
                        marginBottom: 4,
                      }}
                    >
                      {report.nbsap_indicator.id}: {report.nbsap_indicator.name}
                    </div>
                    <div style={cSub}>
                      Tier {report.nbsap_indicator.tier}
                      {report.nbsap_indicator.periodicity &&
                        ` · ${report.nbsap_indicator.periodicity}`}
                    </div>
                    <div style={{ ...cSub, marginTop: 3 }}>
                      Baseline: {report.nbsap_indicator.baseline || '—'} · 2030 Target:{' '}
                      {report.nbsap_indicator.target_2030 || '—'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── §4  Computed Results ───────────────────────── */}
          {evalResult && (
            <div style={{ marginBottom: 24 }}>
              <SectionHead icon="fa-chart-line" title="Computed Results" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {evalResult.completion_pct != null && (
                  <InfoChip label="Completion" primary={`${evalResult.completion_pct}%`} />
                )}

                {evalResult.performance_status && perfCfg && (
                  <div
                    style={{
                      background: perfCfg.bg,
                      borderRadius: 8,
                      padding: '8px 12px',
                    }}
                  >
                    <div style={{ ...cLabel, color: perfCfg.color }}>Performance</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: perfCfg.color }}>
                      {perfCfg.label}
                    </div>
                  </div>
                )}

                {evalResult.trend_direction && trendIcon && (
                  <div
                    style={{
                      background: 'var(--surface-2)',
                      borderRadius: 8,
                      padding: '8px 12px',
                    }}
                  >
                    <div style={cLabel}>Trend</div>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color:
                          evalResult.trend_direction === 'improving'
                            ? '#16a34a'
                            : evalResult.trend_direction === 'declining'
                              ? '#dc2626'
                              : 'var(--text-1)',
                      }}
                    >
                      {trendIcon}{' '}
                      {evalResult.change_pct != null
                        ? `${evalResult.change_pct > 0 ? '+' : ''}${evalResult.change_pct}%`
                        : evalResult.trend_direction}
                    </div>
                    {evalResult.latest_period && (
                      <div style={cSub}>since {evalResult.latest_period}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── §5  Workflow ───────────────────────────────── */}
          <div style={{ marginBottom: 8 }}>
            <SectionHead icon="fa-arrows-spin" title="Workflow" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div style={{ background: st.bg, borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ ...cLabel, color: st.color }}>Status</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: st.color }}>
                  {st.label}
                </div>
              </div>

              {report.reviewed_by_profile ? (
                <InfoChip
                  label="Reviewed By"
                  primary={report.reviewed_by_profile.full_name}
                  sub={report.reviewed_at ? fmtDate(report.reviewed_at) : undefined}
                />
              ) : (
                <InfoChip
                  label="Reviewed By"
                  primary={report.reviewed_at ? fmtDate(report.reviewed_at) : 'Not yet reviewed'}
                />
              )}

              <InfoChip
                label="Report ID"
                primary={report.id.slice(0, 8).toUpperCase()}
                sub={report.id.slice(8).toUpperCase()}
              />
            </div>

            {report.review_note && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: '#92400e',
                    fontWeight: 700,
                    marginBottom: 4,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  REVIEWER NOTE
                </div>
                <div style={{ fontSize: '0.82rem', color: '#78350f' }}>{report.review_note}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer — validation workflow (M02) */}
        <WorkflowPanel
          report={report}
          stages={stages}
          canAct={canAct}
          isOwnSubmission={isOwnSubmission}
          busy={actioning === report.id}
          onReview={(action, note) => onReview(report.id, action, note)}
          onDelete={canDelete ? () => onDelete(report.id, report.tool_name) : undefined}
        />
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function VerifQueuePage() {
  const { permissions, user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'dashboard_management';
  // M02 views. "My queue" = reports waiting at a stage this user validates.
  type View = 'my_queue' | 'in_validation' | 'returned' | 'published' | 'rejected' | 'all';
  const [view, setView] = useState<View>('my_queue');
  const [stages, setStages] = useState<ValidationStage[]>([]);
  const { scopes } = useMyScopes();
  const { institutions } = useInstitutions();
  const [actioning, setActioning] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ToolkitReport | null>(null);
  const VIEW_STATES: Record<View, WorkflowStatus[] | undefined> = {
    my_queue: ['submitted', 'in_validation'],
    in_validation: ['submitted', 'in_validation'],
    returned: ['returned'],
    published: ['published'],
    rejected: ['rejected'],
    all: undefined,
  };
  const {
    reports: loadedReports,
    count,
    loading,
    refetch,
  } = useReports({
    workflowStatuses: VIEW_STATES[view],
    pageSize: view === 'my_queue' ? 200 : 25,
  });

  useEffect(() => {
    fetchValidationStages()
      .then(setStages)
      .catch(e => toast.error((e as Error).message));
  }, []);

  const canAct = useCallback(
    (r: ToolkitReport) => canActOnReport(r, currentUser?.id, stages, scopes, institutions),
    [currentUser?.id, stages, scopes, institutions]
  );
  const reports = view === 'my_queue' ? loadedReports.filter(canAct) : loadedReports;

  const handleReview = useCallback(
    async (reportId: string, action: ReviewAction, note: string) => {
      setActioning(reportId);
      const result = await reviewReport(reportId, action, note);
      if (result.error) {
        toast.error(result.error);
      } else {
        const ws = result.data?.workflow_status;
        toast.success(
          action === 'approve'
            ? ws === 'published'
              ? 'Published: the report now counts toward progress'
              : 'Approved and sent to the next stage'
            : action === 'return'
              ? 'Returned to the submitter'
              : 'Rejected'
        );
        setSelectedReport(null);
        refetch();
      }
      setActioning(null);
    },
    [refetch]
  );

  const handleDeleteSubmission = useCallback(
    async (reportId: string, toolName: string) => {
      if (
        !window.confirm(
          `Permanently delete this "${toolName}" submission?\n\nThis cannot be undone.`
        )
      )
        return;
      setActioning(reportId);
      const { error } = await supabase.from('toolkit_reports').delete().eq('id', reportId);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Submission deleted');
        await writeAuditEntry('delete', `Deleted submission: ${toolName}`);
        setSelectedReport(null);
        refetch();
      }
      setActioning(null);
    },
    [refetch]
  );

  const pendingCount = loadedReports.filter(canAct).length;
  const approvedCount = reports.filter(r => r.workflow_status === 'published').length;
  const rejectedCount = reports.filter(r => r.workflow_status === 'rejected').length;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <i className="fa-solid fa-file-circle-check" style={{ color: 'var(--sky-dim)' }} />
            Submission Verification Queue
            {pendingCount > 0 && (
              <span
                style={{
                  background: '#f59e0b',
                  color: '#fff',
                  fontSize: '0.6rem',
                  padding: '1px 7px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {pendingCount}
              </span>
            )}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: 4 }}>
            Review, approve or reject toolkit submissions. Click a submission to review attachments
            and full form data.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={view}
            onChange={e => setView(e.target.value as View)}
            aria-label="Which reports to show"
            style={{
              padding: '7px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontFamily: "'DM Sans', sans-serif",
              outline: 'none',
              background: 'var(--surface)',
            }}
          >
            <option value="my_queue">My queue (waiting for me)</option>
            <option value="in_validation">All in validation</option>
            <option value="returned">Returned for correction</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
          <button
            onClick={() => refetch()}
            style={{
              padding: '7px 14px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: 'var(--surface)',
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <i className="fa-solid fa-rotate" /> Refresh
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: 'PENDING', value: pendingCount, color: '#f59e0b' },
          { label: 'APPROVED', value: approvedCount, color: '#10b981' },
          { label: 'REJECTED', value: rejectedCount, color: '#f43f5e' },
          { label: 'TOTAL', value: count, color: 'var(--sky-dim)' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: 14, textAlign: 'center' }}>
            <div
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                fontFamily: "'Playfair Display', serif",
                color: s.color,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-3)',
                fontFamily: "'DM Mono', monospace",
                marginTop: 3,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Queue list */}
      {loading ? (
        <div
          style={{ color: 'var(--text-3)', fontSize: '0.82rem', padding: 40, textAlign: 'center' }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              border: '2px solid var(--border)',
              borderTopColor: 'var(--sky-dim)',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          Loading submissions...
        </div>
      ) : reports.length === 0 ? (
        <div style={{ ...card, padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
          <i
            className="fa-solid fa-inbox"
            style={{ fontSize: '2rem', display: 'block', marginBottom: 10, opacity: 0.5 }}
          />
          <p style={{ fontSize: '0.85rem' }}>No submissions match this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map(report => {
            const st = statusBadge(report);
            const hasAttachments = (report.attachments || []).length > 0;
            return (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                style={{
                  ...card,
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--sky-dim)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                }}
              >
                {/* Card header */}
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>{TOOL_EMOJI[report.tool_id] || ''}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-1)' }}>
                        {report.tool_name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-3)',
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        {new Date(report.submitted_at).toLocaleString()}
                        {report.submitted_by_profile?.full_name &&
                          ` · ${report.submitted_by_profile.full_name}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {hasAttachments && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          color: 'var(--text-3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <i className="fa-solid fa-paperclip" /> {report.attachments.length}
                      </span>
                    )}
                    {(() => {
                      // M04: data-quality warnings recorded on submission
                      const warnings = validatorAttention(report.quality_flags);
                      const jumps = warnings.filter(f => f.code === 'jump').length;
                      if (warnings.length === 0) return null;
                      return (
                        <span
                          title={warnings.map(f => f.message).join(' · ')}
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            color: '#92400e',
                            background: '#fef3c7',
                            padding: '2px 8px',
                            borderRadius: 10,
                          }}
                        >
                          {jumps > 0
                            ? `📈 ${jumps} jump${jumps > 1 ? 's' : ''}`
                            : `⚠ ${warnings.length} check${warnings.length > 1 ? 's' : ''}`}
                        </span>
                      );
                    })()}
                    <span
                      style={{
                        background: st.bg,
                        color: st.color,
                        fontSize: '0.62rem',
                        padding: '2px 9px',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {st.label}
                    </span>
                    {(() => {
                      const sp = stageProgress(report, stages);
                      return sp ? (
                        <span style={{ fontSize: '0.66rem', color: 'var(--text-2)' }}>
                          Stage {sp.position}/{sp.total} · {sp.name}
                        </span>
                      ) : null;
                    })()}
                    {canAct(report) && (
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color: '#0369a1',
                          background: '#e0f2fe',
                          padding: '2px 8px',
                          borderRadius: 10,
                        }}
                      >
                        YOUR ACTION
                      </span>
                    )}
                    <i
                      className="fa-solid fa-chevron-right"
                      style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}
                    />
                  </div>
                </div>

                {/* Form data preview — first 4 fields */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  {flattenFormData(report.form_data || {})
                    .slice(0, 4)
                    .map(f => (
                      <div
                        key={f.key}
                        style={{
                          background: 'var(--surface-2)',
                          borderRadius: 7,
                          padding: '6px 10px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.58rem',
                            color: 'var(--text-3)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.07em',
                            fontFamily: "'DM Mono', monospace",
                            marginBottom: 2,
                          }}
                        >
                          {f.label}
                        </div>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: 'var(--text-1)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {f.value}
                        </div>
                      </div>
                    ))}
                </div>

                {report.review_note && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: '0.72rem',
                      color: 'var(--text-2)',
                      fontStyle: 'italic',
                    }}
                  >
                    Note: {report.review_note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onReview={handleReview}
          stages={stages}
          canAct={canAct(selectedReport)}
          canDelete={isAdmin}
          onDelete={handleDeleteSubmission}
          onClose={() => setSelectedReport(null)}
          actioning={actioning}
          currentUserId={currentUser?.id}
        />
      )}
    </div>
  );
}

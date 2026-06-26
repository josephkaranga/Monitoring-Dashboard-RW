import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useReports } from '../hooks/useData';
import { verifyReport } from '../services/reportService';
import { writeAuditEntry } from '../services/dataService';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';
// Lazy-loaded to avoid bundling ~800KB on initial page load
const loadXLSX = () => import('xlsx');
const loadMammoth = () => import('mammoth');
import type { ToolkitReport, ReportAttachment } from '../types/index';
import { flattenFormData, groupedFormData } from '../utils/formData';

const TOOL_EMOJI: Record<string, string> = {
  T01: '\u{1F3DB}️', T02: '\u{1F33F}', T03: '\u{1F6E1}️',
  T04: '\u{1F465}', T05: '\u{1F4B0}', T06: '\u{1F3D7}️', T07: '\u{1F52C}',
};

const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: '#fef9c3', color: '#854d0e', label: 'PENDING'  },
  approved: { bg: '#dcfce7', color: '#166534', label: 'APPROVED' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'REJECTED' },
};

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1.5px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

async function getSignedUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('report-attachments')
    .createSignedUrl(storagePath, 600);
  return data?.signedUrl ?? null;
}

async function downloadFileBytes(storagePath: string): Promise<ArrayBuffer | null> {
  const { data, error } = await supabase.storage
    .from('report-attachments')
    .download(storagePath);
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
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return { icon: 'fa-file-image', color: '#8b5cf6' };
  return { icon: 'fa-file', color: '#6b7280' };
}

const headerBtn: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--surface)', fontSize: '0.72rem', fontWeight: 600,
  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
  display: 'flex', alignItems: 'center', gap: 4,
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
  const workbookRef = useRef<any>(null);
  const xlsxRef = useRef<typeof import('xlsx') | null>(null);
  // Word
  const [wordHtml, setWordHtml] = useState<string | null>(null);

  const ext = (att.ext || '').toLowerCase().replace('.', '');
  const { icon, color } = getFileIcon(ext);

  const renderExcelSheet = useCallback((wb: any, idx: number) => {
    const name = wb.SheetNames[idx];
    const ws = wb.Sheets[name];
    if (!ws || !xlsxRef.current) return;
    setExcelHtml(xlsxRef.current.utils.sheet_to_html(ws, { editable: false }));
    setActiveSheet(idx);
  }, []);

  useEffect(() => {
    if (!att.storage_path) { setLoading(false); setError('No file path'); return; }
    let cancelled = false;

    (async () => {
      try {
        if (ext === 'pdf') {
          const url = await getSignedUrl(att.storage_path!);
          if (!cancelled) { setPdfUrl(url); setLoading(false); }

        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          const url = await getSignedUrl(att.storage_path!);
          if (!cancelled) { setImgUrl(url); setLoading(false); }

        } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
          const [buf, xlsx] = await Promise.all([downloadFileBytes(att.storage_path!), loadXLSX()]);
          if (cancelled || !buf) { if (!cancelled) { setError('Failed to load file'); setLoading(false); } return; }
          xlsxRef.current = xlsx;
          const wb = xlsx.read(buf, { type: 'array' });
          workbookRef.current = wb;
          setSheetNames(wb.SheetNames);
          renderExcelSheet(wb, 0);
          if (!cancelled) setLoading(false);

        } else if (['doc', 'docx'].includes(ext)) {
          const [buf, mam] = await Promise.all([downloadFileBytes(att.storage_path!), loadMammoth()]);
          if (cancelled || !buf) { if (!cancelled) { setError('Failed to load file'); setLoading(false); } return; }
          const result = await mam.default.convertToHtml({ arrayBuffer: buf });
          if (!cancelled) { setWordHtml(result.value); setLoading(false); }

        } else {
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setError('Failed to preview file'); setLoading(false); }
      }
    })();

    return () => { cancelled = true; };
  }, [att.storage_path, ext, renderExcelSheet]);

  const handleDownload = useCallback(async () => {
    if (!att.storage_path) return;
    const signed = await getSignedUrl(att.storage_path);
    if (signed) window.open(signed, '_blank');
    else toast.error('Could not generate download link');
  }, [att.storage_path]);

  const hasPreview = pdfUrl || imgUrl || excelHtml || wordHtml;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`fa-solid ${icon}`} style={{ color, fontSize: '1rem' }} />
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)' }}>{att.name}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
              {ext.toUpperCase()} {att.size ? `· ${formatFileSize(att.size)}` : ''}
            </div>
          </div>
        </div>
        <button onClick={handleDownload} style={headerBtn}>
          <i className="fa-solid fa-download" /> Download
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem' }}>
          <div style={{ width: 18, height: 18, border: '2px solid var(--border)', borderTopColor: 'var(--sky-dim)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
          Loading preview...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ padding: 20, textAlign: 'center', color: '#dc2626', fontSize: '0.78rem' }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />{error}
        </div>
      )}

      {/* PDF */}
      {pdfUrl && (
        <iframe src={pdfUrl} title={att.name}
          style={{ width: '100%', height: 550, border: 'none', background: '#f3f4f6' }} />
      )}

      {/* Image */}
      {imgUrl && (
        <div style={{ padding: 16, textAlign: 'center', background: '#f9fafb' }}>
          <img src={imgUrl} alt={att.name}
            style={{ maxWidth: '100%', maxHeight: 500, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
        </div>
      )}

      {/* Excel */}
      {excelHtml && (
        <div>
          {sheetNames.length > 1 && (
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              {sheetNames.map((name, i) => (
                <button key={name} onClick={() => workbookRef.current && renderExcelSheet(workbookRef.current, i)}
                  style={{
                    padding: '6px 14px', fontSize: '0.72rem', fontWeight: activeSheet === i ? 700 : 500,
                    border: 'none', borderBottom: activeSheet === i ? '2px solid var(--sky-dim)' : '2px solid transparent',
                    background: 'transparent', cursor: 'pointer', color: activeSheet === i ? 'var(--sky-dim)' : 'var(--text-3)',
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
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
            <div className="excel-preview" dangerouslySetInnerHTML={{ __html: excelHtml }} />
          </div>
        </div>
      )}

      {/* Word */}
      {wordHtml && (
        <div style={{ maxHeight: 500, overflow: 'auto', padding: '16px 20px', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-1)' }}>
          <style>{`
            .word-preview h1, .word-preview h2, .word-preview h3 { margin: 12px 0 6px; }
            .word-preview p { margin: 6px 0; }
            .word-preview table { border-collapse: collapse; width: 100%; margin: 10px 0; }
            .word-preview td, .word-preview th { border: 1px solid var(--border); padding: 4px 8px; font-size: 0.8rem; }
            .word-preview img { max-width: 100%; }
          `}</style>
          <div className="word-preview" dangerouslySetInnerHTML={{ __html: wordHtml }} />
        </div>
      )}

      {/* Unsupported file type */}
      {!loading && !error && !hasPreview && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.78rem' }}>
          Preview not available for this file type. Use the download button above.
        </div>
      )}
    </div>
  );
}

/* ── Report Detail Modal ─────────────────────────────────── */
function ReportDetailModal({
  report, noteValue, onNoteChange, onVerify, onDelete, onClose, actioning,
}: {
  report: ToolkitReport;
  noteValue: string;
  onNoteChange: (v: string) => void;
  onVerify: (id: string, status: 'approved' | 'rejected' | 'pending') => void;
  onDelete: (id: string, name: string) => void;
  onClose: () => void;
  actioning: string | null;
}) {
  const st = STATUS_CFG[report.status] || STATUS_CFG.pending;
  const sections = groupedFormData(report.form_data || {});
  const attachments = report.attachments || [];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }} />

      {/* Modal */}
      <div style={{
        position: 'relative', width: '90%', maxWidth: 800, maxHeight: '90vh',
        background: 'var(--surface)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Modal header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.6rem' }}>{TOOL_EMOJI[report.tool_id] || ''}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)' }}>{report.tool_name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
                {new Date(report.submitted_at).toLocaleString()}
                {report.submitted_by_profile?.full_name && ` · ${report.submitted_by_profile.full_name}`}
                {report.period && ` · ${report.period}`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: st.bg, color: st.color, fontSize: '0.68rem', padding: '3px 10px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
              {st.label}
            </span>
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-3)', padding: '4px 8px' }}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Submission info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {report.district && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace", marginBottom: 2 }}>District</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>{report.district}</div>
              </div>
            )}
            {report.institution && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace", marginBottom: 2 }}>Institution</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>{report.institution}</div>
              </div>
            )}
            {report.submitted_by_profile?.organization && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace", marginBottom: 2 }}>Organization</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>{report.submitted_by_profile.organization}</div>
              </div>
            )}
          </div>

          {/* Form data — grouped by section */}
          {sections.map(sec => (
            <div key={sec.id} style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sky-dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Mono', monospace", display: 'flex', alignItems: 'center', gap: 6 }}>
                {sec.label}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {sec.fields.map(f => (
                  <div key={f.key} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'DM Mono', monospace", marginBottom: 3 }}>
                      {f.label}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)', wordBreak: 'break-word' }}>
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Attachments */}
          {attachments.length > 0 && (
            <>
              <h3 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fa-solid fa-paperclip" style={{ color: 'var(--sky-dim)' }} /> Attachments ({attachments.length})
              </h3>
              {attachments.map((att, i) => (
                <AttachmentPreview key={att.storage_path || i} att={att} />
              ))}
            </>
          )}

          {/* Review note from previous reviewer */}
          {report.review_note && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
              <div style={{ fontSize: '0.65rem', color: '#92400e', fontWeight: 700, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>REVIEWER NOTE</div>
              <div style={{ fontSize: '0.82rem', color: '#78350f' }}>{report.review_note}</div>
              {report.reviewed_at && (
                <div style={{ fontSize: '0.65rem', color: '#a16207', marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
                  {new Date(report.reviewed_at).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — actions */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0 }}>
          <div style={{ marginBottom: 10 }}>
            <input type="text" placeholder="Add a reviewer note..."
              value={noteValue}
              onChange={e => onNoteChange(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: 'var(--text-1)', background: 'var(--surface)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {report.status === 'pending' ? (
              <>
                <button onClick={() => onVerify(report.id, 'approved')} disabled={actioning === report.id}
                  style={{ padding: '8px 20px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: "'DM Sans', sans-serif", background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa-solid fa-check" /> {actioning === report.id ? 'Processing...' : 'Approve'}
                </button>
                <button onClick={() => onVerify(report.id, 'rejected')} disabled={actioning === report.id}
                  style={{ padding: '8px 20px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: "'DM Sans', sans-serif", background: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa-solid fa-xmark" /> Reject
                </button>
              </>
            ) : (
              <button onClick={() => onVerify(report.id, report.status === 'approved' ? 'rejected' : 'approved')} disabled={actioning === report.id}
                style={{ padding: '8px 20px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', fontFamily: "'DM Sans', sans-serif", background: 'var(--surface)', color: 'var(--text-2)' }}>
                {report.status === 'approved' ? 'Revoke Approval' : 'Reinstate'}
              </button>
            )}
            <button onClick={() => onVerify(report.id, 'pending')}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', fontFamily: "'DM Sans', sans-serif", background: 'var(--surface)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="fa-solid fa-floppy-disk" /> Save Note
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={() => onDelete(report.id, report.tool_name)}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', border: '1px solid #fecaca', fontFamily: "'DM Sans', sans-serif", background: '#fff1f2', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="fa-solid fa-trash-can" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function VerifQueuePage() {
  const { permissions, user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'dashboard_management';
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ToolkitReport | null>(null);
  const { reports, count, loading, refetch } = useReports({
    status: statusFilter === 'all' ? undefined : statusFilter as 'pending' | 'approved' | 'rejected',
    pageSize: 25,
  });

  const handleVerify = useCallback(async (reportId: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    if (!permissions?.canApproveReports) {
      toast.error('You do not have permission to verify reports');
      return;
    }
    setActioning(reportId);
    const note = noteInputs[reportId] || '';
    const result = await verifyReport(reportId, newStatus, note);
    if (result.error) {
      toast.error(result.error);
    } else {
      const label = newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'updated';
      toast.success(`Submission ${label}`);
      await writeAuditEntry(
        newStatus === 'approved' ? 'approve' : newStatus === 'rejected' ? 'reject' : 'view',
        `${newStatus === 'approved' ? 'Approved' : newStatus === 'rejected' ? 'Rejected' : 'Updated'} report: ${result.data?.tool_name}`,
        note ? `Note: ${note}` : undefined
      );
      setSelectedReport(null);
      refetch();
    }
    setActioning(null);
  }, [permissions, noteInputs, refetch]);

  const handleDeleteSubmission = useCallback(async (reportId: string, toolName: string) => {
    if (!window.confirm(`Permanently delete this "${toolName}" submission?\n\nThis cannot be undone.`)) return;
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
  }, [refetch]);

  const pendingCount  = reports.filter(r => r.status === 'pending').length;
  const approvedCount = reports.filter(r => r.status === 'approved').length;
  const rejectedCount = reports.filter(r => r.status === 'rejected').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-file-circle-check" style={{ color: 'var(--sky-dim)' }} />
            Submission Verification Queue
            {pendingCount > 0 && (
              <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.6rem', padding: '1px 7px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
                {pendingCount}
              </span>
            )}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: 4 }}>
            Review, approve or reject toolkit submissions. Click a submission to review attachments and full form data.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: 'var(--surface)' }}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button onClick={() => refetch()}
            style={{ padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: 'var(--surface)', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="fa-solid fa-rotate" /> Refresh
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'PENDING',  value: pendingCount,  color: '#f59e0b' },
          { label: 'APPROVED', value: approvedCount, color: '#10b981' },
          { label: 'REJECTED', value: rejectedCount, color: '#f43f5e' },
          { label: 'TOTAL',    value: count,         color: 'var(--sky-dim)' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Queue list */}
      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', padding: 40, textAlign: 'center' }}>
          <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--sky-dim)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          Loading submissions...
        </div>
      ) : reports.length === 0 ? (
        <div style={{ ...card, padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
          <i className="fa-solid fa-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: 10, opacity: 0.5 }} />
          <p style={{ fontSize: '0.85rem' }}>No submissions match this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map(report => {
            const st = STATUS_CFG[report.status] || STATUS_CFG.pending;
            const hasAttachments = (report.attachments || []).length > 0;
            return (
              <div key={report.id}
                onClick={() => isAdmin && setSelectedReport(report)}
                style={{ ...card, padding: 16, cursor: isAdmin ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
                onMouseEnter={e => { if (isAdmin) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--sky-dim)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>{TOOL_EMOJI[report.tool_id] || ''}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-1)' }}>{report.tool_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
                        {new Date(report.submitted_at).toLocaleString()}
                        {report.submitted_by_profile?.full_name && ` · ${report.submitted_by_profile.full_name}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {hasAttachments && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <i className="fa-solid fa-paperclip" /> {report.attachments.length}
                      </span>
                    )}
                    <span style={{ background: st.bg, color: st.color, fontSize: '0.62rem', padding: '2px 9px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
                      {st.label}
                    </span>
                    {isAdmin && (
                      <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem', color: 'var(--text-3)' }} />
                    )}
                  </div>
                </div>

                {/* Form data preview — first 4 fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 10 }}>
                  {flattenFormData(report.form_data || {}).slice(0, 4).map(f => (
                    <div key={f.key} style={{ background: 'var(--surface-2)', borderRadius: 7, padding: '6px 10px' }}>
                      <div style={{ fontSize: '0.58rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Mono', monospace", marginBottom: 2 }}>
                        {f.label}
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.value}
                      </div>
                    </div>
                  ))}
                </div>

                {report.review_note && (
                  <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-2)', fontStyle: 'italic' }}>
                    Note: {report.review_note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedReport && isAdmin && (
        <ReportDetailModal
          report={selectedReport}
          noteValue={noteInputs[selectedReport.id] || ''}
          onNoteChange={v => setNoteInputs(prev => ({ ...prev, [selectedReport.id]: v }))}
          onVerify={handleVerify}
          onDelete={handleDeleteSubmission}
          onClose={() => setSelectedReport(null)}
          actioning={actioning}
        />
      )}
    </div>
  );
}

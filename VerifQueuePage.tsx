import React, { useState, useCallback } from 'react';
import { useReports } from './useData';
import { verifyReport } from './reportService';
import { writeAuditEntry } from './dataService';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';
import toast from 'react-hot-toast';

const TOOL_ICONS: Record<string, string> = {
  T01: 'fa-landmark', T02: 'fa-tree', T03: 'fa-shield',
  T04: 'fa-people-group', T05: 'fa-coins', T06: 'fa-building', T07: 'fa-flask',
};
const TOOL_EMOJI: Record<string, string> = {
  T01: '🏛️', T02: '🌿', T03: '🛡️', T04: '👥', T05: '💰', T06: '🏗️', T07: '🔬',
};

const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: '#fef9c3', color: '#854d0e', label: '⏳ PENDING'  },
  approved: { bg: '#dcfce7', color: '#166534', label: '✓ APPROVED'  },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: '✕ REJECTED'  },
};

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1.5px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

export default function VerifQueuePage() {
  const { permissions, user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'dashboard_management';
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);
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
      const label = newStatus === 'approved' ? 'approved ✓' : newStatus === 'rejected' ? 'rejected' : 'updated';
      toast.success(`Submission ${label}`);
      await writeAuditEntry(
        newStatus === 'approved' ? 'approve' : newStatus === 'rejected' ? 'reject' : 'view',
        `${newStatus === 'approved' ? 'Approved' : newStatus === 'rejected' ? 'Rejected' : 'Updated'} report: ${result.data?.tool_name}`,
        note ? `Note: ${note}` : undefined
      );
      refetch();
    }
    setActioning(null);
  }, [permissions, noteInputs, refetch]);

  const handleDeleteSubmission = useCallback(async (reportId: string, toolName: string) => {
    if (!window.confirm(`Permanently delete this "${toolName}" submission?\n\nThis cannot be undone.`)) return;
    setActioning(reportId);
    const { error } = await supabase
      .from('toolkit_reports')
      .delete()
      .eq('id', reportId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Submission deleted`);
      await writeAuditEntry('delete', `Deleted submission: ${toolName}`);
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
            <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.6rem', padding: '1px 7px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
              {pendingCount}
            </span>
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: 4 }}>
            Review, approve or reject toolkit submissions before they update live dashboard metrics. Only approved records influence indicator calculations.
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
          Loading submissions…
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
            return (
              <div key={report.id} style={{ ...card, padding: 16 }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>{TOOL_EMOJI[report.tool_id] || '📋'}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-1)' }}>{report.tool_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
                        Submitted {new Date(report.submitted_at).toLocaleString()}
                        {report.submitted_by_profile?.full_name && ` · ${report.submitted_by_profile.full_name}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: st.bg, color: st.color, fontSize: '0.62rem', padding: '2px 9px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
                      {st.label}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: 'var(--text-3)' }}>
                      #{String(reports.indexOf(report) + 1).padStart(3, '0')}
                    </span>
                  </div>
                </div>

                {/* Form data preview */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                  {Object.entries(report.form_data || {}).slice(0, 6).map(([key, val]) => (
                    <div key={key} style={{ background: 'var(--surface-2)', borderRadius: 7, padding: '8px 10px' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Mono', monospace", marginBottom: 3 }}>
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)', wordBreak: 'break-word' }}>
                        {String(val) || '—'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Attachments */}
                {(report.attachments || []).length > 0 && (
                  <div style={{ marginBottom: 10, fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    <i className="fa-solid fa-paperclip" style={{ marginRight: 4 }} />
                    {report.attachments.map(a => a.name).join(', ')}
                  </div>
                )}

                {/* Reviewer note */}
                <div style={{ marginBottom: 10 }}>
                  <input type="text" placeholder="Reviewer note (optional)…"
                    value={noteInputs[report.id] || ''}
                    onChange={e => setNoteInputs(prev => ({ ...prev, [report.id]: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: 'var(--text-1)' }}
                  />
                </div>

                {/* Actions */}
                {report.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleVerify(report.id, 'approved')} disabled={actioning === report.id}
                      style={{ padding: '7px 16px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: "'DM Sans', sans-serif", background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <i className="fa-solid fa-check" />
                      {actioning === report.id ? '⟳' : 'Approve'}
                    </button>
                    <button onClick={() => handleVerify(report.id, 'rejected')} disabled={actioning === report.id}
                      style={{ padding: '7px 16px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: "'DM Sans', sans-serif", background: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <i className="fa-solid fa-times" />
                      Reject
                    </button>
                    <button onClick={() => handleVerify(report.id, 'pending')}
                      style={{ padding: '7px 16px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', fontFamily: "'DM Sans', sans-serif", background: 'var(--surface-3)', color: 'var(--text-2)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <i className="fa-solid fa-comment" /> Save Note
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleVerify(report.id, report.status === 'approved' ? 'rejected' : 'approved')} disabled={actioning === report.id}
                      style={{ padding: '7px 16px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', fontFamily: "'DM Sans', sans-serif", background: 'var(--surface-3)', color: 'var(--text-2)' }}>
                      ↩ {report.status === 'approved' ? 'Revoke Approval' : 'Reinstate'}
                    </button>
                    <button onClick={() => handleVerify(report.id, 'pending')}
                      style={{ padding: '7px 16px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', fontFamily: "'DM Sans', sans-serif", background: 'var(--surface-3)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <i className="fa-solid fa-comment" /> Save Note
                    </button>
                  </div>
                )}

                {report.review_note && (
                  <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-2)', fontStyle: 'italic' }}>
                    Note: {report.review_note}
                  </div>
                )}

                {/* Delete — admin only */}
                {isAdmin && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--surface-3)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleDeleteSubmission(report.id, report.tool_name)}
                      disabled={actioning === report.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 14px', borderRadius: 7, border: '1px solid #fecaca',
                        background: '#fff1f2', color: '#dc2626',
                        fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        opacity: actioning === report.id ? 0.5 : 1,
                      }}
                    >
                      <i className="fa-solid fa-trash-can" style={{ fontSize: '0.7rem' }} />
                      Delete Submission
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

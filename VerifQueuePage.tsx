import React, { useState, useCallback } from 'react';
import { useReports } from '../../hooks/useData';
import { verifyReport } from '../../services/reportService';
import { writeAuditEntry } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const TOOL_ICONS: Record<string, string> = {
  T01: '🏛️', T02: '🌿', T03: '🛡️', T04: '👥', T05: '💰', T06: '🏗️', T07: '🔬',
};

const StatusBadge = ({ status }: { status: string }) => {
  const configs: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: '#fef9c3', color: '#854d0e', label: '⏳ PENDING' },
    approved: { bg: '#dcfce7', color: '#166534', label: '✓ APPROVED' },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: '✕ REJECTED' },
  };
  const c = configs[status] || configs.pending;
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: '0.62rem', padding: '2px 9px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace", display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {c.label}
    </span>
  );
};

export default function VerifQueuePage() {
  const { permissions } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);

  const { reports, count, loading, refetch } = useReports({
    status: statusFilter === 'all' ? undefined : statusFilter as 'pending' | 'approved' | 'rejected',
    pageSize: 25,
  });

  const { reports: allReports } = useReports({ pageSize: 1 });

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

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const approvedCount = reports.filter(r => r.status === 'approved').length;
  const rejectedCount = reports.filter(r => r.status === 'rejected').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            📋 Submission Verification Queue
            <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.6rem', padding: '1px 7px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
              {pendingCount}
            </span>
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Review, approve or reject toolkit submissions. Only approved records influence indicator calculations.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff' }}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'PENDING', value: pendingCount, color: '#f59e0b' },
          { label: 'APPROVED', value: approvedCount, color: '#10b981' },
          { label: 'REJECTED', value: rejectedCount, color: '#f43f5e' },
          { label: 'TOTAL', value: count, color: '#0ea5e9' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 14, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: "'DM Mono', monospace", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Queue list */}
      {loading ? (
        <div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: 40, textAlign: 'center' }}>Loading submissions…</div>
      ) : reports.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '48px 24px', textAlign: 'center', color: '#94a3b8', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>📥</div>
          <p style={{ fontSize: '0.85rem' }}>No submissions match this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map((report) => (
            <div
              key={report.id}
              style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              {/* Card header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.4rem' }}>{TOOL_ICONS[report.tool_id] || '📋'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{report.tool_name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
                      Submitted {new Date(report.submitted_at).toLocaleString()}
                      {report.submitted_by_profile?.full_name && ` · ${report.submitted_by_profile.full_name}`}
                    </div>
                  </div>
                </div>
                <StatusBadge status={report.status} />
              </div>

              {/* Form data preview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                {Object.entries(report.form_data || {}).slice(0, 6).map(([key, val]) => (
                  <div key={key} style={{ background: '#f8fafc', borderRadius: 7, padding: '8px 10px' }}>
                    <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Mono', monospace", marginBottom: 3 }}>
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', wordBreak: 'break-word' }}>
                      {String(val) || '—'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Attachments */}
              {(report.attachments || []).length > 0 && (
                <div style={{ marginBottom: 10, fontSize: '0.75rem', color: '#94a3b8' }}>
                  📎 {report.attachments.map(a => a.name).join(', ')}
                </div>
              )}

              {/* Reviewer note input */}
              <div style={{ marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Reviewer note (optional)…"
                  value={noteInputs[report.id] || ''}
                  onChange={e => setNoteInputs(prev => ({ ...prev, [report.id]: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
                />
              </div>

              {/* Actions */}
              {report.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleVerify(report.id, 'approved')}
                    disabled={actioning === report.id}
                    style={{ padding: '7px 16px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: "'DM Sans', sans-serif", background: '#dcfce7', color: '#166534', transition: '0.2s' }}
                  >
                    {actioning === report.id ? '⟳' : '✓'} Approve
                  </button>
                  <button
                    onClick={() => handleVerify(report.id, 'rejected')}
                    disabled={actioning === report.id}
                    style={{ padding: '7px 16px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: "'DM Sans', sans-serif", background: '#fee2e2', color: '#991b1b', transition: '0.2s' }}
                  >
                    ✕ Reject
                  </button>
                </div>
              )}
              {report.status !== 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleVerify(report.id, report.status === 'approved' ? 'rejected' : 'approved')}
                    disabled={actioning === report.id}
                    style={{ padding: '7px 16px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: '1px solid #e2e8f0', fontFamily: "'DM Sans', sans-serif", background: '#f8fafc', color: '#475569' }}
                  >
                    ↩ {report.status === 'approved' ? 'Revoke' : 'Reinstate'}
                  </button>
                </div>
              )}
              {report.review_note && (
                <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
                  Note: {report.review_note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

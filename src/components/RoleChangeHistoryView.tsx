import React, { useState, useEffect } from 'react';
import { getRoleChangeRequests, cancelRoleChangeRequest } from '../services/roleChangeService';
import { useAuth } from '../services/AuthContext';
import type { RoleChangeRequest } from '../services/roleChangeService';
import { USER_ROLE_LABELS } from '../types/index';
import toast from 'react-hot-toast';

export default function RoleChangeHistoryView() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RoleChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    setLoading(true);
    const result = await getRoleChangeRequests({ userId: user.id });
    if (result.data) {
      setRequests(result.data);
    }
    setLoading(false);
  };

  const handleCancel = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;

    setCancelling(requestId);
    const result = await cancelRoleChangeRequest(requestId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Request cancelled successfully');
      loadHistory();
    }
    setCancelling(null);
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, { icon: string; color: string }> = {
      pending: { icon: 'fa-clock', color: '#f59e0b' },
      approved: { icon: 'fa-check-circle', color: '#10b981' },
      rejected: { icon: 'fa-times-circle', color: '#ef4444' },
      cancelled: { icon: 'fa-ban', color: '#6b7280' },
      stale: { icon: 'fa-hourglass-end', color: '#ec4899' },
    };
    const { icon, color } = icons[status] || icons.pending;
    return <i className={`fa-solid ${icon}`} style={{ color, fontSize: '1.2rem' }} />;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      pending: { bg: '#fef3c7', text: '#92400e' },
      approved: { bg: '#d1fae5', text: '#065f46' },
      rejected: { bg: '#fee2e2', text: '#991b1b' },
      cancelled: { bg: '#e5e7eb', text: '#374151' },
      stale: { bg: '#fce7f3', text: '#831843' },
    };
    const color = colors[status] || colors.pending;
    return (
      <span
        style={{
          padding: '4px 10px',
          borderRadius: 12,
          fontSize: '0.75rem',
          fontWeight: 600,
          background: color.bg,
          color: color.text,
          textTransform: 'capitalize',
        }}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
        Loading your request history...
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <i
          className="fa-solid fa-inbox"
          style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 12 }}
        />
        <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>No role change requests yet</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#0f172a' }}>
        Request History
      </h3>

      {/* History Display */}
      <div style={{ position: 'relative', paddingLeft: 40 }}>
        {/* History line */}
        <div
          style={{
            position: 'absolute',
            left: 16,
            top: 0,
            bottom: 0,
            width: 2,
            background: '#e2e8f0',
          }}
        />

        {requests.map((request, index) => (
          <div
            key={request.id}
            style={{ position: 'relative', marginBottom: index < requests.length - 1 ? 24 : 0 }}
          >
            {/* History dot */}
            <div
              style={{
                position: 'absolute',
                left: -28,
                top: 4,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#fff',
                border: '2px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getStatusIcon(request.status)}
            </div>

            {/* Request card */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {getStatusBadge(request.status)}
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>
                {request.status === 'pending' && (
                  <button
                    onClick={() => handleCancel(request.id)}
                    disabled={cancelling === request.id}
                    style={{
                      padding: '6px 12px',
                      background: '#fee2e2',
                      color: '#991b1b',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: cancelling === request.id ? 'not-allowed' : 'pointer',
                      opacity: cancelling === request.id ? 0.7 : 1,
                    }}
                  >
                    {cancelling === request.id ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: 12,
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    padding: 10,
                    background: '#f8fafc',
                    borderRadius: 8,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4 }}>FROM</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                    {USER_ROLE_LABELS[request.from_role]}
                  </div>
                </div>
                <i className="fa-solid fa-arrow-right" style={{ color: '#cbd5e1' }} />
                <div
                  style={{
                    padding: 10,
                    background: '#e0f2fe',
                    borderRadius: 8,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: '#0369a1', marginBottom: 4 }}>TO</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0ea5e9' }}>
                    {USER_ROLE_LABELS[request.to_role]}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: '#94a3b8',
                    marginBottom: 4,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Justification
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                  {request.justification}
                </div>
              </div>

              {request.status === 'approved' && (
                <div
                  style={{
                    padding: 10,
                    background: '#d1fae5',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    color: '#065f46',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <i className="fa-solid fa-check-circle" />
                    <strong>Approved</strong>
                  </div>
                  <div>
                    By {request.reviewer_name} on{' '}
                    {new Date(request.reviewed_at!).toLocaleDateString()}
                  </div>
                  {request.review_note && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #a7f3d0' }}>
                      <strong>Note:</strong> {request.review_note}
                    </div>
                  )}
                </div>
              )}

              {request.status === 'rejected' && (
                <div
                  style={{
                    padding: 10,
                    background: '#fee2e2',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    color: '#991b1b',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <i className="fa-solid fa-times-circle" />
                    <strong>Rejected</strong>
                  </div>
                  <div>
                    By {request.reviewer_name} on{' '}
                    {new Date(request.reviewed_at!).toLocaleDateString()}
                  </div>
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #fecaca' }}>
                    <strong>Reason:</strong> {request.rejection_reason}
                  </div>
                </div>
              )}

              {request.status === 'cancelled' && (
                <div
                  style={{
                    padding: 10,
                    background: '#f3f4f6',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    color: '#374151',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-ban" />
                    <strong>Cancelled by you</strong>
                  </div>
                </div>
              )}

              {request.status === 'stale' && (
                <div
                  style={{
                    padding: 10,
                    background: '#fce7f3',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    color: '#831843',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-hourglass-end" />
                    <strong>Request expired (no response after 30 days)</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { getRoleChangeRequests, approveRoleChangeRequest, rejectRoleChangeRequest } from '../services/roleChangeService';
import type { RoleChangeRequest } from '../services/roleChangeService';
import { USER_ROLE_LABELS } from '../types/index';
import toast from 'react-hot-toast';

export default function RoleChangeApprovalPanel() {
  const [requests, setRequests] = useState<RoleChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [selectedRequest, setSelectedRequest] = useState<RoleChangeRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    setLoading(true);
    const result = await getRoleChangeRequests({ status: filter });
    if (result.data) {
      setRequests(result.data);
    }
    setLoading(false);
  };

  const getRequestAge = (createdAt: string) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const openModal = (request: RoleChangeRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setNote('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setActionType(null);
    setNote('');
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    if (actionType === 'reject' && note.trim().length < 10) {
      toast.error('Rejection reason must be at least 10 characters');
      return;
    }

    setProcessing(true);
    let result;
    
    if (actionType === 'approve') {
      result = await approveRoleChangeRequest(selectedRequest.id, note.trim() || undefined);
    } else {
      result = await rejectRoleChangeRequest(selectedRequest.id, note.trim());
    }

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Request ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`);
      closeModal();
      loadRequests();
    }
    setProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      pending: { bg: '#fef3c7', text: '#92400e' },
      approved: { bg: '#d1fae5', text: '#065f46' },
      rejected: { bg: '#fee2e2', text: '#991b1b' },
      cancelled: { bg: '#e5e7eb', text: '#374151' },
      stale: { bg: '#fce7f3', text: '#831843' }
    };
    const color = colors[status] || colors.pending;
    return (
      <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: color.bg, color: color.text, textTransform: 'capitalize' }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Role Change Requests</h2>
        <button onClick={loadRequests} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
          <i className="fa-solid fa-rotate-right" style={{ marginRight: 6 }} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['pending', 'approved', 'rejected', 'stale', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{ padding: '8px 16px', border: filter === status ? '2px solid #0ea5e9' : '1px solid #e2e8f0', borderRadius: 8, background: filter === status ? '#e0f2fe' : '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: filter === status ? '#0369a1' : '#64748b', textTransform: 'capitalize' }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No {filter} requests found</div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {requests.map(request => {
            const age = getRequestAge(request.created_at);
            const isStale = age > 30 && request.status === 'pending';
            
            return (
              <div key={request.id} style={{ background: '#fff', border: isStale ? '2px solid #f472b6' : '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>{request.requester_name}</h4>
                      {getStatusBadge(request.status)}
                      {isStale && <span style={{ fontSize: '0.75rem', color: '#ec4899', fontWeight: 600 }}>⚠️ STALE ({age} days)</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{request.requester_email}</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {new Date(request.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Role</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>{USER_ROLE_LABELS[request.from_role]}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Requested Role</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0ea5e9' }}>{USER_ROLE_LABELS[request.to_role]}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Justification</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>{request.justification}</div>
                </div>

                {request.status === 'approved' && request.reviewer_name && (
                  <div style={{ padding: 10, background: '#d1fae5', borderRadius: 6, fontSize: '0.8rem', color: '#065f46', marginBottom: 12 }}>
                    <strong>Approved by:</strong> {request.reviewer_name} on {new Date(request.reviewed_at!).toLocaleDateString()}
                    {request.review_note && <div style={{ marginTop: 4 }}><strong>Note:</strong> {request.review_note}</div>}
                  </div>
                )}

                {request.status === 'rejected' && request.reviewer_name && (
                  <div style={{ padding: 10, background: '#fee2e2', borderRadius: 6, fontSize: '0.8rem', color: '#991b1b', marginBottom: 12 }}>
                    <strong>Rejected by:</strong> {request.reviewer_name} on {new Date(request.reviewed_at!).toLocaleDateString()}
                    <div style={{ marginTop: 4 }}><strong>Reason:</strong> {request.rejection_reason}</div>
                  </div>
                )}

                {request.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => openModal(request, 'approve')}
                      style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <i className="fa-solid fa-check" style={{ marginRight: 6 }} />
                      Approve
                    </button>
                    <button
                      onClick={() => openModal(request, 'reject')}
                      style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <i className="fa-solid fa-times" style={{ marginRight: 6 }} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && selectedRequest && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={closeModal}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 500, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#0f172a' }}>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Request
            </h3>
            
            <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}>
                <strong>{selectedRequest.requester_name}</strong> wants to change from <strong>{USER_ROLE_LABELS[selectedRequest.from_role]}</strong> to <strong>{USER_ROLE_LABELS[selectedRequest.to_role]}</strong>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                {actionType === 'approve' ? 'Approval Note (Optional)' : 'Rejection Reason (Required, min 10 chars)'}
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={actionType === 'approve' ? 'Add an optional note...' : 'Explain why this request is being rejected...'}
                rows={3}
                style={{ width: '100%', padding: '10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', resize: 'vertical' }}
              />
              {actionType === 'reject' && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>{note.length}/10 characters</div>}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={closeModal}
                disabled={processing}
                style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: processing ? 'not-allowed' : 'pointer', color: '#64748b' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={processing}
                style={{ flex: 1, padding: '10px', background: actionType === 'approve' ? '#10b981' : '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.7 : 1 }}
              >
                {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

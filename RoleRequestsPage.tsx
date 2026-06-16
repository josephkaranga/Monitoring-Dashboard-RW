import React from 'react';
import RoleChangeRequestForm from './RoleChangeRequestForm';
import RoleChangeHistoryView from './RoleChangeHistoryView';

export default function RoleRequestsPage() {
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', color: '#0f172a', fontFamily: "'Playfair Display', serif" }}>
          Role Change Requests
        </h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
          Request a role change or view your request history. All requests require REMA Administrator approval.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <RoleChangeRequestForm />
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <i className="fa-solid fa-info-circle" style={{ fontSize: 20, color: '#0ea5e9' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>How It Works</h3>
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', color: '#475569', lineHeight: 1.8 }}>
            <li>Select the role you want to request</li>
            <li>Provide a detailed justification (minimum 20 characters)</li>
            <li>Submit your request</li>
            <li>REMA Administrators will be notified</li>
            <li>Wait for approval or rejection</li>
            <li>You'll be notified of the decision</li>
          </ol>
          <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: '0.8rem', color: '#92400e', borderLeft: '3px solid #f59e0b' }}>
            <strong>Note:</strong> You can only have one pending request at a time. If your request is rejected, you can submit a new one.
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <RoleChangeHistoryView />
      </div>
    </div>
  );
}

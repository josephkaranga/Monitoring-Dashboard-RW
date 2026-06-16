import React, { useState, useEffect } from 'react';
import { submitRoleChangeRequest, getRoleChangeRequests } from './roleChangeService';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import type { UserRole } from './index';
import { USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS } from './index';

export default function RoleChangeRequestForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [justification, setJustification] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    checkPendingRequest();
  }, []);

  const checkPendingRequest = async () => {
    if (!user) return;
    const result = await getRoleChangeRequests({ status: 'pending', userId: user.id });
    if (result.data && result.data.length > 0) {
      setHasPendingRequest(true);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!selectedRole) errs.role = 'Please select a role';
    if (!justification.trim()) errs.justification = 'Justification is required';
    else if (justification.trim().length < 20) errs.justification = 'Justification must be at least 20 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const result = await submitRoleChangeRequest(selectedRole as UserRole, justification.trim());
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Role change request submitted! Awaiting REMA Administrator approval.');
      setSelectedRole('');
      setJustification('');
      setHasPendingRequest(true);
    }
    setLoading(false);
  };

  if (hasPendingRequest) {
    return (
      <div style={{ padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <i className="fa-solid fa-clock" style={{ fontSize: 24, color: '#f59e0b' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Pending Request</h3>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
          You have a pending role change request. Please wait for a REMA Administrator to review your request.
        </p>
      </div>
    );
  }

  const availableRoles = (Object.keys(USER_ROLE_LABELS) as UserRole[]).filter(
    role => role !== user?.role
  );

  return (
    <div style={{ padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#0f172a' }}>Request Role Change</h3>
      
      <form onSubmit={handleSubmit}>
        {/* Role Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Requested Role
          </label>
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value as UserRole)}
            style={{ width: '100%', padding: '10px 12px', border: errors.role ? '1.5px solid #f43f5e' : '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', cursor: 'pointer' }}
          >
            <option value="">Select a role...</option>
            {availableRoles.map(role => (
              <option key={role} value={role}>{USER_ROLE_LABELS[role]}</option>
            ))}
          </select>
          {errors.role && <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: 4 }}>{errors.role}</div>}
          
          {selectedRole && (
            <div style={{ marginTop: 8, padding: 10, background: '#f0f9ff', borderRadius: 6, fontSize: '0.8rem', color: '#0369a1', borderLeft: '3px solid #0ea5e9' }}>
              {USER_ROLE_DESCRIPTIONS[selectedRole as UserRole]}
            </div>
          )}
        </div>

        {/* Justification */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Justification <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({justification.length}/20 min)</span>
          </label>
          <textarea
            value={justification}
            onChange={e => setJustification(e.target.value)}
            placeholder="Explain why you need this role change..."
            rows={4}
            style={{ width: '100%', padding: '10px 12px', border: errors.justification ? '1.5px solid #f43f5e' : '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', resize: 'vertical' }}
          />
          {errors.justification && <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: 4 }}>{errors.justification}</div>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '11px 0', background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0f2744, #1e3a5f)', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />}
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

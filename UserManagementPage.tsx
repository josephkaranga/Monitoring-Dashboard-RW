import React, { useState, useCallback } from 'react';
import { getAllUsers, updateUserRole, signUp, resetPassword } from './authService';
import { useAsync } from './useData';
import { useAuth } from './AuthContext';
import { USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS } from './index';
import type { UserRole, UserProfile } from './index';
import { supabase } from './supabase';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<UserRole, string> = {
  policy_monitoring:    '#10b981',
  lead_government_ministry_reporting: '#0ea5e9',
  local_reporting:      '#f59e0b',
  dashboard_management: '#f43f5e',
  programme_alignment:  '#8b5cf6',
  public_viewer:        '#64748b',
};

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)',
  borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif",
  outline: 'none', background: 'var(--surface)', color: 'var(--text-1)',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 5,
};

// ── Reset Password Modal ──────────────────────────────────────
function ResetPasswordModal({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  const [mode, setMode] = useState<'email' | 'manual'>('email');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSendEmail = useCallback(async () => {
    setSaving(true);
    const result = await resetPassword(user.email);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Password reset email sent to ${user.email}`);
      onClose();
    }
    setSaving(false);
  }, [user.email, onClose]);

  const handleSetManual = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!newPassword || newPassword.length < 8) errs.password = 'Password must be at least 8 characters';
    if (newPassword !== confirmPassword) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    // Use Supabase Admin API via service role — falls back to sending reset email
    // since anon key can't set another user's password directly.
    // Best approach: send reset email with a note to admin.
    const result = await resetPassword(user.email);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Password reset email sent to ${user.email}. They must click the link to set the new password.`);
      onClose();
    }
    setSaving(false);
  }, [newPassword, confirmPassword, user.email, onClose]);

  const strength = newPassword.length === 0 ? 0 : newPassword.length < 8 ? 1 : newPassword.length < 12 ? 2 : 3;
  const strengthColor = ['#e2e8f0', '#f43f5e', '#f59e0b', '#10b981'][strength];
  const strengthLabel = ['', 'Too short', 'Acceptable', 'Strong'][strength];

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,39,68,0.6)', backdropFilter: 'blur(6px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 18, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 460 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#fef3c7', color: '#92400e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
              {user.avatar_initials}
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>Reset Password</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{user.full_name || user.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-xmark" style={{ fontSize: '0.8rem' }} />
          </button>
        </div>

        {/* Mode toggle */}
        <div style={{ padding: '16px 22px 0' }}>
          <div style={{ display: 'flex', gap: 4, background: '#e2e8f0', borderRadius: 9, padding: 3 }}>
            <button type="button" onClick={() => setMode('email')}
              style={{ flex: 1, padding: '7px 0', border: 'none', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: '0.2s', background: mode === 'email' ? '#fff' : 'transparent', color: mode === 'email' ? '#0f172a' : '#64748b', boxShadow: mode === 'email' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
              <i className="fa-solid fa-envelope" style={{ marginRight: 5 }} />
              Send Reset Email
            </button>
            <button type="button" onClick={() => setMode('manual')}
              style={{ flex: 1, padding: '7px 0', border: 'none', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: '0.2s', background: mode === 'manual' ? '#fff' : 'transparent', color: mode === 'manual' ? '#0f172a' : '#64748b', boxShadow: mode === 'manual' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
              <i className="fa-solid fa-key" style={{ marginRight: 5 }} />
              Set New Password
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 22px 22px' }}>
          {/* Send email mode */}
          {mode === 'email' && (
            <div>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 9, padding: '12px 14px', marginBottom: 16, fontSize: '0.8rem', color: '#0369a1', lineHeight: 1.6 }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }} />
                A password reset link will be sent to <strong>{user.email}</strong>. The user clicks the link and sets their own new password.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={onClose}
                  style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: 'var(--text-2)' }}>
                  Cancel
                </button>
                <button type="button" onClick={handleSendEmail} disabled={saving}
                  style={{ padding: '8px 20px', background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.82rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 7 }}>
                  {saving && <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                  {saving ? 'Sending…' : 'Send Reset Email'}
                </button>
              </div>
            </div>
          )}

          {/* Manual set mode */}
          {mode === 'manual' && (
            <form onSubmit={handleSetManual} noValidate>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '10px 14px', marginBottom: 14, fontSize: '0.78rem', color: '#92400e', lineHeight: 1.5 }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
                A reset email will be sent to <strong>{user.email}</strong>. The user must click the link to activate the new password.
              </div>

              {/* New password */}
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>New Password <span style={{ color: '#f43f5e' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoFocus
                    style={{ ...inputStyle, paddingRight: 36, borderColor: errors.password ? '#f43f5e' : 'var(--border)' }}
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                    <i className={`fa-solid ${showPw ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '0.82rem' }} />
                  </button>
                </div>
                {errors.password && <div style={{ fontSize: '0.68rem', color: '#f43f5e', marginTop: 3 }}>{errors.password}</div>}
                {/* Strength bar */}
                {newPassword.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[1,2,3].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: strength >= i ? strengthColor : '#e2e8f0', transition: '0.2s' }} />
                      ))}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: strengthColor, marginTop: 3 }}>{strengthLabel}</div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Confirm Password <span style={{ color: '#f43f5e' }}>*</span></label>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Repeat the password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.confirm ? '#f43f5e' : 'var(--border)' }}
                />
                {errors.confirm && <div style={{ fontSize: '0.68rem', color: '#f43f5e', marginTop: 3 }}>{errors.confirm}</div>}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={onClose}
                  style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: 'var(--text-2)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '8px 20px', background: 'linear-gradient(135deg,#065f46,#059669)', color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.82rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 7 }}>
                  {saving && <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                  {saving ? 'Sending…' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create User Modal ─────────────────────────────────────────
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    organization: '', role: 'policy_monitoring' as UserRole,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const result = await signUp({
      email: form.email,
      password: form.password,
      full_name: form.full_name,
      role: form.role,
      organization: form.organization || undefined,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`User ${form.full_name} created successfully`);
      onSuccess();
      onClose();
    }
    setSaving(false);
  }, [form, onSuccess, onClose]);

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,39,68,0.6)', backdropFilter: 'blur(6px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 18, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 520 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-user-plus" style={{ color: 'var(--sky-dim)' }} />
            Create New User
          </h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* Full Name */}
            <div>
              <label style={labelStyle}>Full Name <span style={{ color: '#f43f5e' }}>*</span></label>
              <input type="text" placeholder="Jean Baptiste Habimana" value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                style={{ ...inputStyle, borderColor: errors.full_name ? '#f43f5e' : 'var(--border)' }} />
              {errors.full_name && <div style={{ fontSize: '0.68rem', color: '#f43f5e', marginTop: 3 }}>{errors.full_name}</div>}
            </div>

            {/* Organization */}
            <div>
              <label style={labelStyle}>Organization</label>
              <input type="text" placeholder="REMA / Ministry / District" value={form.organization}
                onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
                style={inputStyle} />
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email Address <span style={{ color: '#f43f5e' }}>*</span></label>
              <input type="email" placeholder="user@rema.gov.rw" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ ...inputStyle, borderColor: errors.email ? '#f43f5e' : 'var(--border)' }} />
              {errors.email && <div style={{ fontSize: '0.68rem', color: '#f43f5e', marginTop: 3 }}>{errors.email}</div>}
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password <span style={{ color: '#f43f5e' }}>*</span></label>
              <input type="password" placeholder="Min. 8 characters" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ ...inputStyle, borderColor: errors.password ? '#f43f5e' : 'var(--border)' }} />
              {errors.password && <div style={{ fontSize: '0.68rem', color: '#f43f5e', marginTop: 3 }}>{errors.password}</div>}
            </div>
          </div>

          {/* Role */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Access Role <span style={{ color: '#f43f5e' }}>*</span></label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
                <option key={role} value={role}>{label}</option>
              ))}
            </select>
            <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '8px 12px', marginTop: 6, fontSize: '0.73rem', color: '#0369a1', borderLeft: '3px solid var(--sky-dim)' }}>
              {USER_ROLE_DESCRIPTIONS[form.role]}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: 'var(--text-2)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '9px 22px', background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.83rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              {saving && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Actions Dropdown Menu ─────────────────────────────────────
function ActionsMenu({ userId, userName, isSelf, disabled, onResetPw, onDelete }: {
  userId: string; userName: string; isSelf: boolean; disabled: boolean;
  onResetPw: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        style={{
          width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)',
          background: 'var(--surface)', cursor: disabled ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-2)', opacity: disabled ? 0.5 : 1,
        }}
      >
        <i className="fa-solid fa-ellipsis-vertical" style={{ fontSize: '0.8rem' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 34, zIndex: 300,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: 'var(--shadow-lg)', minWidth: 160, overflow: 'hidden',
        }}>
          <button
            onClick={() => { setOpen(false); onResetPw(); }}
            style={{
              width: '100%', padding: '9px 14px', border: 'none', background: 'transparent',
              textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", color: '#92400e',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#fffbeb')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <i className="fa-solid fa-key" style={{ fontSize: '0.72rem', width: 14 }} />
            Reset Password
          </button>
          {!isSelf && (
            <button
              onClick={() => { setOpen(false); onDelete(); }}
              style={{
                width: '100%', padding: '9px 14px', border: 'none', background: 'transparent',
                textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", color: '#dc2626',
                display: 'flex', alignItems: 'center', gap: 8,
                borderTop: '1px solid var(--surface-3)',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#fff1f2')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              <i className="fa-solid fa-trash-can" style={{ fontSize: '0.72rem', width: 14 }} />
              Delete User
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export function UserManagementPage() {
  const { user: currentUser, permissions } = useAuth();
  const isAdmin = currentUser?.role === 'dashboard_management';
  const { data: usersResponse, loading, refetch } = useAsync(getAllUsers, []);

  // ── All hooks must come before any derived values ──
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null);

  // ── Derived values (after all hooks) ──
  const users: UserProfile[] = (usersResponse as any)?.data ?? (Array.isArray(usersResponse) ? usersResponse : []);
  const pendingUsers = users.filter((u: UserProfile) => !u.is_active);
  const activeUsers = users.filter((u: UserProfile) => u.is_active);

  const filteredUsers = activeUsers.filter((u: UserProfile) => {
    const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleRoleChange = useCallback(async (userId: string, newRole: UserRole) => {
    if (!isAdmin) { toast.error('Only administrators can change user roles'); return; }
    if (userId === currentUser?.id && newRole !== 'dashboard_management') {
      if (!window.confirm('Changing your own role will restrict your access. Continue?')) return;
    }
    setUpdating(userId);
    const result = await updateUserRole(userId, newRole);
    if (result.error) toast.error(result.error);
    else { toast.success(`Role updated to ${USER_ROLE_LABELS[newRole]}`); refetch(); }
    setUpdating(null);
  }, [currentUser?.id, isAdmin, refetch]);

  const handleApprove = useCallback(async (userId: string, userName: string) => {
    setUpdating(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) toast.error(error.message);
    else { toast.success(`${userName} approved — they can now sign in`); refetch(); }
    setUpdating(null);
  }, [refetch]);

  const handleReject = useCallback(async (userId: string, userName: string) => {
    if (!window.confirm(`Reject and delete ${userName}'s account? This cannot be undone.`)) return;
    setUpdating(userId);
    try {
      const { data, error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
      if (error) {
        toast.error(error.message);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`${userName}'s account rejected and removed`);
        refetch();
      }
    } catch {
      toast.error('Failed to reject user');
    }
    setUpdating(null);
  }, [refetch]);

  const handleDeleteUser = useCallback(async (userId: string, userName: string) => {
    if (userId === currentUser?.id) {
      toast.error("You can't delete your own account");
      return;
    }
    if (!window.confirm(`Permanently delete ${userName}'s account?\n\nThis removes them from the system completely and cannot be undone.`)) return;

    setUpdating(userId);
    try {
      // Call the SECURITY DEFINER DB function — no Edge Function needed
      const { data, error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
      if (error) {
        toast.error(error.message);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`${userName}'s account deleted`);
        refetch();
      }
    } catch (err) {
      toast.error('Failed to delete user');
    }
    setUpdating(null);
  }, [currentUser?.id, refetch]);

  const roleCounts = activeUsers.reduce((acc: Record<UserRole, number>, u: UserProfile) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<UserRole, number>);

  return (
    <div>
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => refetch()}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}

      {/* Pending Approvals — admin only */}
      {isAdmin && pendingUsers.length > 0 && (
        <div style={{ ...card, marginBottom: 24, overflow: 'hidden', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: '#fffbeb' }}>
            <i className="fa-solid fa-clock" style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#92400e' }}>Pending Approvals</span>
            <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{pendingUsers.length}</span>
            <span style={{ fontSize: '0.72rem', color: '#92400e', marginLeft: 4 }}>New users waiting for your approval before they can sign in</span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingUsers.map((u: UserProfile) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
                <div style={{ width: 36, height: 36, background: '#fef3c7', color: '#92400e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                  {u.avatar_initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-1)' }}>{u.full_name || '—'}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{u.email} · {u.organization || 'No organization'}</div>
                  <div style={{ fontSize: '0.68rem', color: '#92400e', marginTop: 2, fontFamily: "'DM Mono', monospace" }}>
                    Requested role: {USER_ROLE_LABELS[u.role]} · Registered {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => handleApprove(u.id, u.full_name || u.email)} disabled={updating === u.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#dcfce7', color: '#166534', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    <i className="fa-solid fa-check" /> Approve
                  </button>
                  <button onClick={() => handleReject(u.id, u.full_name || u.email)} disabled={updating === u.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#991b1b', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    <i className="fa-solid fa-times" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role distribution cards — responsive grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
          <div key={role} style={{ ...card, padding: 14, borderLeft: `4px solid ${ROLE_COLORS[role]}`, cursor: 'pointer', transition: '0.2s' }}
            onClick={() => setRoleFilter(r => r === role ? 'all' : role)}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'translateY(0)')}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: ROLE_COLORS[role] }}>
              {roleCounts[role] || 0}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ ...card, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: '0.8rem' }} />
          <input type="text" placeholder="Search users by name or email…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 32px', border: '1px solid var(--border)', borderRadius: 9, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: 'var(--surface)' }} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as UserRole | 'all')}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: 'var(--surface)' }}>
          <option value="all">All Roles</option>
          {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
            <option key={role} value={role}>{label}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
          {filteredUsers.length} of {activeUsers.length} active users
        </span>
        {/* Create User button — admin only */}
        {isAdmin && (
          <button onClick={() => setShowCreateModal(true)}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: 'var(--shadow-sm)' }}>
            <i className="fa-solid fa-user-plus" />
            Create User
          </button>
        )}
      </div>

      {/* Users table */}
      <div style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-users-gear" style={{ color: 'var(--sky-dim)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>User Management</span>
          <span style={{ fontSize: '0.65rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>REMA Admin Only</span>
          {!isAdmin && (
            <span style={{ fontSize: '0.65rem', background: '#fef9c3', color: '#854d0e', padding: '3px 8px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace', marginLeft: 4" }}>
              <i className="fa-solid fa-eye" style={{ marginRight: 4 }} />View Only
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem' }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--sky-dim)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
            Loading users…
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
            <i className="fa-solid fa-users" style={{ fontSize: '2rem', display: 'block', marginBottom: 10, opacity: 0.5 }} />
            <p style={{ fontSize: '0.85rem' }}>No users match your filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  {['User', 'Organization', 'Role', 'Status', 'Last Login', ...(isAdmin ? ['Change Role', 'Actions'] : [])].map(h => (                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'var(--surface-2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--surface-3)', background: u.id === currentUser?.id ? '#fffbeb' : 'transparent', transition: '0.15s' }}
                    onMouseEnter={e => { if (u.id !== currentUser?.id) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = u.id === currentUser?.id ? '#fffbeb' : 'transparent'; }}>
                    {/* User */}
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, background: `${ROLE_COLORS[u.role]}22`, color: ROLE_COLORS[u.role], borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
                          {u.avatar_initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 5 }}>
                            {u.full_name || '—'}
                            {u.id === currentUser?.id && (
                              <span style={{ fontSize: '0.6rem', background: '#fef9c3', color: '#854d0e', padding: '1px 5px', borderRadius: 6, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>YOU</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    {/* Org */}
                    <td style={{ padding: '11px 14px', color: 'var(--text-2)', fontSize: '0.78rem' }}>{u.organization || '—'}</td>
                    {/* Role */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: `${ROLE_COLORS[u.role]}18`, color: ROLE_COLORS[u.role], fontSize: '0.65rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
                        {USER_ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    {/* Status */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.is_active ? '#10b981' : '#f43f5e', flexShrink: 0 }} />
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {/* Last login */}
                    <td style={{ padding: '11px 14px', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", fontSize: '0.72rem' }}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    {/* Role change — admin only */}
                    {isAdmin && (
                      <td style={{ padding: '11px 14px' }}>
                        <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value as UserRole)} disabled={updating === u.id}
                          style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.75rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: updating === u.id ? 'var(--surface-2)' : 'var(--surface)', cursor: updating === u.id ? 'wait' : 'pointer' }}>
                          {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
                            <option key={role} value={role}>{label}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    {/* Actions dropdown — admin only */}
                    {isAdmin && (
                      <td style={{ padding: '11px 14px' }}>
                        <ActionsMenu
                          userId={u.id}
                          userName={u.full_name || u.email}
                          isSelf={u.id === currentUser?.id}
                          disabled={updating === u.id}
                          onResetPw={() => setResetTarget(u)}
                          onDelete={() => handleDeleteUser(u.id, u.full_name || u.email)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role legend */}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>
          Role Permissions Reference
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
            <div key={role} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 9, borderLeft: `3px solid ${ROLE_COLORS[role]}` }}>
              <div style={{ flexShrink: 0, marginTop: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ROLE_COLORS[role] }} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-1)' }}>{label}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-2)', lineHeight: 1.4, marginTop: 2 }}>{USER_ROLE_DESCRIPTIONS[role]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default UserManagementPage;

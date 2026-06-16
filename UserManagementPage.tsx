import React, { useState, useCallback } from 'react';
import { getAllUsers, updateUserRole } from './authService';
import { useAsync } from './useData';
import { useAuth } from './AuthContext';
import { USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS } from './index';
import type { UserRole, UserProfile } from './index';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<UserRole, string> = {
  policy_monitoring: '#10b981',
  sector_reporting: '#0ea5e9',
  local_reporting: '#f59e0b',
  dashboard_management: '#f43f5e',
  programme_alignment: '#8b5cf6',
};

export function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { data: users = [], loading, refetch } = useAsync(getAllUsers, []);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  const filteredUsers = (users as UserProfile[]).filter(u => {
    const matchSearch = !search || u.email.toLowerCase().includes(search) || u.full_name?.toLowerCase().includes(search);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleRoleChange = useCallback(async (userId: string, newRole: UserRole) => {
    if (userId === currentUser?.id && newRole !== 'dashboard_management') {
      if (!window.confirm('Changing your own role will restrict your access. Continue?')) return;
    }
    setUpdating(userId);
    const result = await updateUserRole(userId, newRole);
    if (result.error) toast.error(result.error);
    else { toast.success(`Role updated to ${USER_ROLE_LABELS[newRole]}`); refetch(); }
    setUpdating(null);
  }, [currentUser?.id, refetch]);

  const roleCounts = (users as UserProfile[]).reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<UserRole, number>);

  return (
    <div>
      {/* Role distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
          <div key={role} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 14, borderLeft: `4px solid ${ROLE_COLORS[role]}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: ROLE_COLORS[role] }}>{roleCounts[role] || 0}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', marginTop: 3, lineHeight: 1.3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
          <input type="text" placeholder="Search users by name or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as UserRole | 'all')} style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff' }}>
          <option value="all">All Roles</option>
          {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
            <option key={role} value={role}>{label}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>{filteredUsers.length} of {(users as UserProfile[]).length} users</span>
      </div>

      {/* Users table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>👥 User Management</span>
          <span style={{ fontSize: '0.65rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>REMA Admin Only</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>Loading users…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['User', 'Organization', 'Role', 'Status', 'Last Login', 'Change Role'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', background: u.id === currentUser?.id ? '#fffbeb' : 'transparent' }}>
                    {/* User */}
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, background: `${ROLE_COLORS[u.role]}22`, color: ROLE_COLORS[u.role], borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
                          {u.avatar_initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {u.full_name || '—'}
                            {u.id === currentUser?.id && <span style={{ marginLeft: 6, fontSize: '0.6rem', background: '#fef9c3', color: '#854d0e', padding: '1px 5px', borderRadius: 6, fontWeight: 700 }}>YOU</span>}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    {/* Org */}
                    <td style={{ padding: '11px 14px', color: '#64748b', fontSize: '0.78rem' }}>{u.organization || '—'}</td>
                    {/* Role */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: `${ROLE_COLORS[u.role]}18`, color: ROLE_COLORS[u.role], fontSize: '0.65rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace", display: 'inline-block' }}>
                        {USER_ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    {/* Status */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.is_active ? '#10b981' : '#f43f5e' }} />
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {/* Last login */}
                    <td style={{ padding: '11px 14px', color: '#94a3b8', fontFamily: "'DM Mono', monospace", fontSize: '0.72rem' }}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    {/* Role change */}
                    <td style={{ padding: '11px 14px' }}>
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                        disabled={updating === u.id}
                        style={{ padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.75rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: updating === u.id ? '#f8fafc' : '#fff', cursor: updating === u.id ? 'wait' : 'pointer' }}
                      >
                        {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
                          <option key={role} value={role}>{label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role legend */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, marginTop: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>Role Permissions Reference</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
            <div key={role} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, borderLeft: `3px solid ${ROLE_COLORS[role]}` }}>
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ROLE_COLORS[role] }} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{label}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.4, marginTop: 2 }}>{USER_ROLE_DESCRIPTIONS[role]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default UserManagementPage;

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAsync } from '../hooks/useData';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';
import {
  getAllUsers,
  updateUserRole,
  deactivateUserAccount,
  suspendUserAccount,
  reactivateUserAccount,
  signUp,
  resetPassword,
} from '../services/authService';

/* =========================================================
   TYPES
========================================================= */

export type UserRole =
  | 'policy_monitoring'
  | 'lead_government_ministry_reporting'
  | 'local_reporting'
  | 'dashboard_management'
  | 'programme_alignment'
  | 'public_viewer';

export interface UserProfile {
  id: string;
  full_name?: string;
  email: string;
  organization?: string;
  role: UserRole;
  is_active: boolean;
  suspended_at?: string | null;
  suspended_by?: string | null;
  suspension_reason?: string | null;
  suspension_end_date?: string | null;
  last_login?: string;
  avatar_initials: string;
  created_at?: string;
}

/* =========================================================
   ROLE LABELS & STYLING
========================================================= */

const ROLE_LABELS: Record<UserRole, string> = {
  policy_monitoring: 'Policy Monitor',
  lead_government_ministry_reporting: 'Lead Government Ministry Reporter',
  local_reporting: 'Local Reporter',
  dashboard_management: 'REMA Administrator',
  programme_alignment: 'Development Partner',
  public_viewer: 'Public Viewer',
};

const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  dashboard_management: { bg: '#EEEDFE', text: '#3C3489' },
  policy_monitoring: { bg: '#E6F1FB', text: '#0C447C' },
  programme_alignment: { bg: '#FAEEDA', text: '#633806' },
  public_viewer: { bg: '#EAF3DE', text: '#27500A' },
  lead_government_ministry_reporting: { bg: '#E6F1FB', text: '#0C447C' },
  local_reporting: { bg: '#EAF3DE', text: '#27500A' },
};

const AVATAR_COLORS = ['#8B5CF6', '#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#6366F1'];
/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getAccountStatus(user: UserProfile): { status: string; color: string; message?: string } {
  if (!user.is_active) {
    return { status: 'Deactivated', color: '#ef4444' };
  }

  if (user.suspended_at) {
    if (user.suspension_end_date) {
      const endDate = new Date(user.suspension_end_date);
      if (endDate < new Date()) {
        return { status: 'Suspended (Expired)', color: '#f59e0b', message: `Suspension expired on ${endDate.toLocaleDateString()}` };
      }
      return { 
        status: 'Suspended', 
        color: '#ef4444', 
        message: `Until ${endDate.toLocaleDateString()}${user.suspension_reason ? ` - ${user.suspension_reason}` : ''}` 
      };
    }
    return { 
      status: 'Suspended', 
      color: '#ef4444', 
      message: user.suspension_reason || 'Indefinite suspension' 
    };
  }

  return { status: 'Active', color: '#10b981' };
}

/* =========================================================
   FLOATING MENU COMPONENT
========================================================= */

interface FloatingMenuProps {
  user: UserProfile;
  isOpen: boolean;
  position: { top: number; left: number };
  onClose: () => void;
  onDeactivate: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onResetPassword: () => void;
  onAssignRole: () => void;
  onDelete: () => void;
}

function FloatingMenu({ 
  user, 
  isOpen, 
  position, 
  onClose, 
  onDeactivate, 
  onSuspend, 
  onReactivate, 
  onResetPassword, 
  onAssignRole, 
  onDelete 
}: FloatingMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        background: 'white',
        border: '0.5px solid #e5e7eb',
        borderRadius: 8,
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        zIndex: 1000,
        minWidth: 160,
        overflow: 'hidden'
      }}
    >
      {!user.is_active ? (
        <button
          onClick={onReactivate}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            background: 'none',
            textAlign: 'left',
            fontSize: 13,
            cursor: 'pointer',
            color: '#10b981'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          Reactivate
        </button>
      ) : user.suspended_at ? (
        <button
          onClick={onReactivate}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            background: 'none',
            textAlign: 'left',
            fontSize: 13,
            cursor: 'pointer',
            color: '#10b981'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          Unsuspend
        </button>
      ) : (
        <>
          <button
            onClick={onDeactivate}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              fontSize: 13,
              cursor: 'pointer',
              color: '#BA7517'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            Deactivate
          </button>
          <button
            onClick={onSuspend}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              fontSize: 13,
              cursor: 'pointer',
              color: '#BA7517'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            Suspend
          </button>
        </>
      )}
      
      <div style={{ height: '0.5px', background: '#e5e7eb', margin: '4px 0' }} />
      
      <button
        onClick={onResetPassword}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: 'none',
          background: 'none',
          textAlign: 'left',
          fontSize: 13,
          cursor: 'pointer',
          color: '#374151'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >
        Reset PWD
      </button>
      
      <button
        onClick={onAssignRole}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: 'none',
          background: 'none',
          textAlign: 'left',
          fontSize: 13,
          cursor: 'pointer',
          color: '#374151'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >
        Assign Role
      </button>
      
      <div style={{ height: '0.5px', background: '#e5e7eb', margin: '4px 0' }} />
      
      <button
        onClick={onDelete}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: 'none',
          background: 'none',
          textAlign: 'left',
          fontSize: 13,
          cursor: 'pointer',
          color: '#dc2626'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >
        Delete
      </button>
    </div>
  );
}
/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function UserManagementPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'dashboard_management';

  const { data, loading, refetch } = useAsync(getAllUsers, []);
  const users: UserProfile[] = (data as any)?.data ?? (Array.isArray(data) ? data : []);

  /* ---------------- STATE ---------------- */
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Floating menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  
  // Modal states
  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<UserProfile | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendEndDate, setSuspendEndDate] = useState<string>('');
  const [roleAssignTarget, setRoleAssignTarget] = useState<UserProfile | null>(null);
  const [createUserModal, setCreateUserModal] = useState(false);

  /* ---------------- DERIVED DATA ---------------- */
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users.length };
    users.forEach(u => {
      counts[u.role] = (counts[u.role] || 0) + 1;
    });
    return counts;
  }, [users]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  /* ---------------- ACTION HANDLERS ---------------- */
  const handleRoleChange = useCallback(
    async (userId: string, role: UserRole) => {
      if (!isAdmin) return;
      setUpdating(userId);
      const res = await updateUserRole(userId, role);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Role updated');
        refetch();
      }
      setUpdating(null);
      setRoleAssignTarget(null);
    },
    [isAdmin, refetch]
  );

  const handleDeactivate = useCallback(async (userId: string, userName: string) => {
    if (!window.confirm(`Deactivate ${userName}'s account? This will prevent them from logging in.`)) return;
    setUpdating(userId);
    const reason = prompt('Reason for deactivation (optional):');
    const res = await deactivateUserAccount(userId, reason || undefined);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Account deactivated');
      refetch();
    }
    setUpdating(null);
    setOpenMenuId(null);
  }, [refetch]);

  const handleSuspend = useCallback((user: UserProfile) => {
    setSuspendTarget(user);
    setSuspendReason('');
    setSuspendEndDate('');
    setOpenMenuId(null);
  }, []);

  const handleSuspendConfirm = useCallback(async () => {
    if (!suspendTarget || !suspendReason.trim()) {
      toast.error('Suspension reason is required');
      return;
    }
    setUpdating(suspendTarget.id);
    const endDate = suspendEndDate ? new Date(suspendEndDate) : undefined;
    const res = await suspendUserAccount(suspendTarget.id, suspendReason, endDate);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Account suspended');
      refetch();
      setSuspendTarget(null);
    }
    setUpdating(null);
  }, [suspendTarget, suspendReason, suspendEndDate, refetch]);

  const handleReactivate = useCallback(async (userId: string, userName: string) => {
    if (!window.confirm(`Reactivate ${userName}'s account?`)) return;
    setUpdating(userId);
    const res = await reactivateUserAccount(userId);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Account reactivated');
      refetch();
    }
    setUpdating(null);
    setOpenMenuId(null);
  }, [refetch]);
  const handleDelete = useCallback(async (userId: string, userName: string) => {
    if (!window.confirm(`Delete ${userName}? This action cannot be undone.`)) return;
    setUpdating(userId);
    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
    if (error) toast.error(error.message);
    else {
      toast.success('User deleted');
      refetch();
    }
    setUpdating(null);
    setOpenMenuId(null);
  }, [refetch]);

  const handleMenuToggle = useCallback((userId: string, event: React.MouseEvent) => {
    if (openMenuId === userId) {
      setOpenMenuId(null);
      return;
    }
    
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 160;
    const menuHeight = 200;
    
    let left = rect.right + 8;
    let top = rect.top;
    
    // Adjust if menu would overflow viewport
    if (left + menuWidth > viewportWidth) {
      left = rect.left - menuWidth - 8;
    }
    if (top + menuHeight > viewportHeight) {
      top = viewportHeight - menuHeight - 8;
    }
    
    setMenuPosition({ top, left });
    setOpenMenuId(userId);
  }, [openMenuId]);

  const handleSelectAll = useCallback(() => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map(u => u.id)));
    }
  }, [selectedUsers.size, paginatedUsers]);

  const handleUserSelect = useCallback((userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  }, [selectedUsers]);
  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: 'auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* ================= TOP TOOLBAR ================= */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20,
        gap: 16 
      }}>
        
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '0 0 300px' }}>
          <div style={{ 
            position: 'absolute', 
            left: 12, 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: '#9ca3af',
            fontSize: 14
          }}>
            🔍
          </div>
          <input
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              border: '0.5px solid #d1d5db',
              borderRadius: 8,
              fontSize: 13,
              outline: 'none'
            }}
          />
        </div>

        {/* Role Filter Dropdown */}
        <select
          value={roleFilter}
          onChange={e => {
            const newRole = e.target.value as UserRole | 'all';
            setRoleFilter(newRole);
            setCurrentPage(1);
          }}
          style={{
            padding: '10px 12px',
            border: '0.5px solid #d1d5db',
            borderRadius: 8,
            fontSize: 13,
            background: 'white',
            minWidth: 160
          }}
        >
          <option value="all">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Create User Button */}
        {isAdmin && (
          <button
            onClick={() => setCreateUserModal(true)}
            style={{
              background: '#1e3a5f',
              color: 'white',
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>+</span>
            Create User
          </button>
        )}
      </div>
      {/* ================= ROLE FILTER TABS ================= */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 24, 
        flexWrap: 'wrap' 
      }}>
        <button
          onClick={() => {
            setRoleFilter('all');
            setCurrentPage(1);
          }}
          style={{
            padding: '8px 16px',
            borderRadius: 20,
            border: roleFilter === 'all' ? 'none' : '0.5px solid #d1d5db',
            background: roleFilter === 'all' ? '#1e3a5f' : 'white',
            color: roleFilter === 'all' ? 'white' : '#6b7280',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500
          }}
        >
          All ({roleCounts.all || 0})
        </button>
        
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <button
            key={role}
            onClick={() => {
              setRoleFilter(role as UserRole);
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: roleFilter === role ? 'none' : '0.5px solid #d1d5db',
              background: roleFilter === role ? '#1e3a5f' : 'white',
              color: roleFilter === role ? 'white' : '#6b7280',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500
            }}
          >
            {label} ({roleCounts[role] || 0})
          </button>
        ))}
      </div>

      {/* ================= TABLE ================= */}
      <div style={{ 
        background: 'white', 
        borderRadius: 12, 
        border: '0.5px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse' 
        }}>
          
          <thead>
            <tr style={{ 
              background: '#f9fafb',
              borderBottom: '0.5px solid #e5e7eb'
            }}>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontSize: 13, 
                fontWeight: 600,
                color: '#374151',
                width: 50
              }}>
                <input
                  type="checkbox"
                  checked={selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontSize: 13, 
                fontWeight: 600,
                color: '#374151'
              }}>
                User
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontSize: 13, 
                fontWeight: 600,
                color: '#374151'
              }}>
                Role
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontSize: 13, 
                fontWeight: 600,
                color: '#374151'
              }}>
                Status
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontSize: 13, 
                fontWeight: 600,
                color: '#374151'
              }}>
                Last Login
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'center', 
                fontSize: 13, 
                fontWeight: 600,
                color: '#374151',
                width: 80
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  Loading users...
                </td>
              </tr>
            ) : paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  No users found
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u, index) => {
                const statusInfo = getAccountStatus(u);
                const roleColors = ROLE_COLORS[u.role];
                const avatarColor = getAvatarColor(u.full_name || u.email);
                
                return (
                  <tr 
                    key={u.id}
                    style={{ 
                      borderBottom: index < paginatedUsers.length - 1 ? '0.5px solid #f3f4f6' : 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    
                    {/* CHECKBOX */}
                    <td style={{ padding: '16px 20px' }}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(u.id)}
                        onChange={() => handleUserSelect(u.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {/* USER */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: avatarColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: 14,
                            fontWeight: 600
                          }}
                        >
                          {u.avatar_initials}
                        </div>
                        <div>
                          <div style={{ 
                            fontSize: 13, 
                            fontWeight: 500, 
                            color: '#111827',
                            marginBottom: 2
                          }}>
                            {u.full_name || 'No name'}
                          </div>
                          <div style={{ 
                            fontSize: 11, 
                            color: '#6b7280'
                          }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* ROLE */}
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: 16,
                          background: roleColors.bg,
                          color: roleColors.text,
                          fontSize: 11,
                          fontWeight: 500
                        }}
                      >
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: statusInfo.status === 'Active' ? '#10b981' : '#ef4444'
                          }}
                        />
                        <span style={{ 
                          fontSize: 13, 
                          color: '#374151',
                          fontWeight: 500
                        }}>
                          {statusInfo.status}
                        </span>
                      </div>
                    </td>

                    {/* LAST LOGIN */}
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        fontSize: 13, 
                        color: u.last_login ? '#6b7280' : '#BA7517',
                        fontWeight: u.last_login ? 400 : 500
                      }}>
                        {u.last_login 
                          ? new Date(u.last_login).toLocaleDateString()
                          : 'Never'
                        }
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      {isAdmin && (
                        <button
                          onClick={(e) => handleMenuToggle(u.id, e)}
                          disabled={updating === u.id}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: updating === u.id ? 'not-allowed' : 'pointer',
                            fontSize: 16,
                            color: '#6b7280',
                            padding: '4px 8px',
                            borderRadius: 4
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          ⋮
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* ================= FOOTER ================= */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: 20 
      }}>
        
        {/* Entries per page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{
              padding: '4px 8px',
              border: '0.5px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              background: 'white'
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span style={{ fontSize: 13, color: '#6b7280' }}>entries</span>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            
            {/* Previous button */}
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                border: '0.5px solid #d1d5db',
                borderRadius: 6,
                background: 'white',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: 13,
                color: currentPage === 1 ? '#9ca3af' : '#374151'
              }}
            >
              Prev
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: '6px 10px',
                    border: currentPage === pageNum ? 'none' : '0.5px solid #d1d5db',
                    borderRadius: 6,
                    background: currentPage === pageNum ? '#1e3a5f' : 'white',
                    color: currentPage === pageNum ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: currentPage === pageNum ? 600 : 400,
                    minWidth: 32
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next button */}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px',
                border: '0.5px solid #d1d5db',
                borderRadius: 6,
                background: 'white',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: 13,
                color: currentPage === totalPages ? '#9ca3af' : '#374151'
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
      {/* ================= FLOATING MENU ================= */}
      {openMenuId && (
        <FloatingMenu
          user={users.find(u => u.id === openMenuId)!}
          isOpen={!!openMenuId}
          position={menuPosition}
          onClose={() => setOpenMenuId(null)}
          onDeactivate={() => {
            const user = users.find(u => u.id === openMenuId)!;
            handleDeactivate(user.id, user.full_name || user.email);
          }}
          onSuspend={() => {
            const user = users.find(u => u.id === openMenuId)!;
            handleSuspend(user);
          }}
          onReactivate={() => {
            const user = users.find(u => u.id === openMenuId)!;
            handleReactivate(user.id, user.full_name || user.email);
          }}
          onResetPassword={() => {
            const user = users.find(u => u.id === openMenuId)!;
            setResetTarget(user);
            setOpenMenuId(null);
          }}
          onAssignRole={() => {
            const user = users.find(u => u.id === openMenuId)!;
            setRoleAssignTarget(user);
            setOpenMenuId(null);
          }}
          onDelete={() => {
            const user = users.find(u => u.id === openMenuId)!;
            handleDelete(user.id, user.full_name || user.email);
          }}
        />
      )}

      {/* ================= MODALS ================= */}
      
      {/* Role Assignment Modal */}
      {roleAssignTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setRoleAssignTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 12,
              minWidth: 400,
              maxWidth: 500
            }}
          >
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: 20, 
              fontSize: 16, 
              fontWeight: 600,
              color: '#111827'
            }}>
              Assign Role: {roleAssignTarget.full_name || roleAssignTarget.email}
            </h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                fontSize: 13, 
                fontWeight: 500,
                color: '#374151'
              }}>
                Select new role
              </label>
              <select
                defaultValue={roleAssignTarget.role}
                onChange={(e) => {
                  handleRoleChange(roleAssignTarget.id, e.target.value as UserRole);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '0.5px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 13,
                  background: 'white'
                }}
              >
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRoleAssignTarget(null)}
                style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  border: '0.5px solid #d1d5db',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#374151'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reset Password Modal */}
      {resetTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setResetTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 12,
              minWidth: 400
            }}
          >
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: 16, 
              fontSize: 16, 
              fontWeight: 600,
              color: '#111827'
            }}>
              Reset Password
            </h3>
            
            <p style={{ 
              marginBottom: 20, 
              fontSize: 13, 
              color: '#6b7280'
            }}>
              Reset password for {resetTarget.email}? A new temporary password will be sent to their email.
            </p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setResetTarget(null)}
                style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  border: '0.5px solid #d1d5db',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#374151'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const res = await resetPassword(resetTarget.email);
                  if (res.error) toast.error(res.error);
                  else toast.success('Password reset email sent');
                  setResetTarget(null);
                }}
                style={{
                  padding: '8px 16px',
                  background: '#1e3a5f',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                Send Reset Email
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Suspend Modal */}
      {suspendTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setSuspendTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 12,
              minWidth: 500
            }}
          >
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: 20, 
              fontSize: 16, 
              fontWeight: 600,
              color: '#111827'
            }}>
              Suspend Account: {suspendTarget.full_name || suspendTarget.email}
            </h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                fontSize: 13, 
                fontWeight: 500,
                color: '#374151'
              }}>
                Reason for suspension *
              </label>
              <textarea
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                placeholder="Enter the reason for suspending this account..."
                style={{
                  width: '100%',
                  minHeight: 80,
                  padding: 10,
                  border: '0.5px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 13,
                  resize: 'vertical',
                  outline: 'none'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                fontSize: 13, 
                fontWeight: 500,
                color: '#374151'
              }}>
                Suspension end date (optional)
              </label>
              <input
                type="date"
                value={suspendEndDate}
                onChange={e => setSuspendEndDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '0.5px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 13,
                  outline: 'none'
                }}
              />
              <div style={{ 
                fontSize: 11, 
                color: '#9ca3af', 
                marginTop: 4 
              }}>
                Leave empty for indefinite suspension
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setSuspendTarget(null);
                  setSuspendReason('');
                  setSuspendEndDate('');
                }}
                style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  border: '0.5px solid #d1d5db',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#374151'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendConfirm}
                disabled={!suspendReason.trim() || updating === suspendTarget.id}
                style={{
                  padding: '8px 16px',
                  background: !suspendReason.trim() ? '#d1d5db' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: !suspendReason.trim() ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                {updating === suspendTarget.id ? 'Suspending...' : 'Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
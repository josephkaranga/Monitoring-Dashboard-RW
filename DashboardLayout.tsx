import React, { useState, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Leaf, BarChart3, Layers, Target, RefreshCw, Landmark, Tree, Shield,
  Users, Coins, Building, FlaskConical, ClipboardCheck, TriangleAlert,
  FileContract, UserCheck, Database, GitBranch, MapPin, FilePen, Bell,
  Settings, Download, LogOut, Menu, X, ChevronDown,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNotifications } from './useData';
import { usePendingCount } from './useData';
import { markAllNotificationsRead } from './dataService';
import { USER_ROLE_LABELS } from './index';
import toast from 'react-hot-toast';

// ── Nav Item Config ───────────────────────────────────────────

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number | string;
  minRole?: string[];
}

export default function DashboardLayout() {
  const { user, permissions, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications, unreadCount, refetch: refetchNotifs } = useNotifications();
  const pendingCount = usePendingCount();

  const handleSignOut = useCallback(async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/auth');
  }, [signOut, navigate]);

  const handleMarkAllRead = useCallback(async () => {
    if (!user?.id) return;
    await markAllNotificationsRead(user.id);
    refetchNotifs();
  }, [user?.id, refetchNotifs]);

  const canSeeReporting =
    permissions?.canSubmitReports ?? false;
  const canSeeVerifQueue =
    permissions?.canViewVerifQueue ?? false;
  const canSeeRisk = permissions?.canViewRiskRegister ?? false;
  const canSeeAudit = permissions?.canViewAuditLog ?? false;

  const mainNav: NavItem[] = [
    { to: '/dashboard', icon: <BarChart3 size={15} />, label: 'Dashboard' },
    { to: '/indicators', icon: <Layers size={15} />, label: 'Indicator Hierarchy' },
    { to: '/risk', icon: <TriangleAlert size={15} />, label: 'Risk Register', minRole: ['policy_monitoring', 'sector_reporting', 'dashboard_management', 'programme_alignment'] },
  ];

  const reportingNav: NavItem[] = [
    { to: '/reporting-toolkit?tool=T01', icon: <Landmark size={15} />, label: 'T01 · Institutional' },
    { to: '/reporting-toolkit?tool=T02', icon: <Tree size={15} />, label: 'T02 · District' },
    { to: '/reporting-toolkit?tool=T03', icon: <Shield size={15} />, label: 'T03 · Protected Areas' },
    { to: '/reporting-toolkit?tool=T04', icon: <Users size={15} />, label: 'T04 · Community' },
    { to: '/reporting-toolkit?tool=T05', icon: <Coins size={15} />, label: 'T05 · Finance' },
    { to: '/reporting-toolkit?tool=T06', icon: <Building size={15} />, label: 'T06 · Private Sector' },
    { to: '/reporting-toolkit?tool=T07', icon: <FlaskConical size={15} />, label: 'T07 · Research' },
  ];

  const governanceNav: NavItem[] = [
    ...(canSeeVerifQueue
      ? [{ to: '/verification-queue', icon: <UserCheck size={15} />, label: 'Verification Queue', badge: pendingCount || undefined }]
      : []),
    { to: '/compliance', icon: <ClipboardCheck size={15} />, label: 'Compliance' },
    { to: '/reports', icon: <FileContract size={15} />, label: 'Reports' },
  ];

  const systemNav: NavItem[] = [
    { to: '/map', icon: <MapPin size={15} />, label: 'District Map' },
    { to: '/settings', icon: <Settings size={15} />, label: 'Settings' },
  ];

  const NavSection = ({ title, items }: { title: string; items: NavItem[] }) => (
    <div style={{ padding: '4px 0' }}>
      <div
        style={{
          fontSize: '0.6rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(125,211,252,0.5)',
          padding: '8px 20px 4px',
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {title}
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 18px',
            color: isActive ? '#38bdf8' : '#bfdbfe',
            textDecoration: 'none',
            fontSize: '0.82rem',
            fontWeight: 500,
            borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
            background: isActive ? 'rgba(56,189,248,0.15)' : 'transparent',
            transition: 'all 0.15s',
          })}
          onClick={() => setSidebarOpen(false)}
        >
          <span style={{ width: 16, textAlign: 'center', opacity: 0.85 }}>
            {item.icon}
          </span>
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.badge ? (
            <span
              style={{
                background: '#f59e0b',
                color: '#fff',
                fontSize: '0.58rem',
                padding: '1px 6px',
                borderRadius: 10,
                fontWeight: 700,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {item.badge}
            </span>
          ) : null}
        </NavLink>
      ))}
    </div>
  );

  const sidebarContent = (
    <>
      {/* Brand */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
            }}
          >
            <Leaf size={16} />
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', color: '#fff', letterSpacing: 0.5 }}>
              NBSAP
            </div>
            <div style={{ fontSize: '0.65rem', color: '#7dd3fc', fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em' }}>
              Monitoring System
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <NavSection title="Analytics" items={mainNav} />
        {canSeeReporting && (
          <NavSection title="Reporting Modules" items={reportingNav} />
        )}
        <NavSection title="Governance" items={governanceNav} />
        <NavSection title="System" items={systemNav} />
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 9, padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <div
            style={{
              width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0,
              boxShadow: '0 0 0 3px rgba(16,185,129,0.3)',
            }}
          />
          <div>
            <div style={{ fontSize: '0.68rem', color: '#a5f3fc', fontWeight: 600 }}>
              System Online
            </div>
            <div style={{ fontSize: '0.62rem', color: '#7dd3fc' }}>
              {user
                ? USER_ROLE_LABELS[user.role]
                : 'Not signed in'}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0,
          width: 248,
          background: 'linear-gradient(175deg, #0f2744 0%, #0c1e38 100%)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '4px 0 20px rgba(0,0,0,0.2)',
          zIndex: 200,
          transition: 'transform 0.3s ease',
        }}
        className="desktop-sidebar"
      >
        {sidebarContent}
      </aside>

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 199,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0,
          width: 248, zIndex: 200,
          background: 'linear-gradient(175deg, #0f2744 0%, #0c1e38 100%)',
          display: 'flex', flexDirection: 'column',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          boxShadow: '4px 0 20px rgba(0,0,0,0.2)',
        }}
        className="mobile-sidebar"
      >
        {sidebarContent}
      </aside>

      {/* ── MAIN ── */}
      <main style={{ marginLeft: 248, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header
          style={{
            position: 'sticky', top: 0, zIndex: 100,
            background: 'rgba(248,250,252,0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid #e2e8f0',
            padding: '12px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSidebarOpen((s) => !s)}
              style={{
                display: 'none',
                width: 36, height: 36,
                borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#fff', cursor: 'pointer',
                alignItems: 'center', justifyContent: 'center',
                color: '#64748b',
              }}
              className="hamburger-btn"
            >
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {getPageTitle(location.pathname)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: "'DM Mono', monospace", marginTop: 1 }}>
                National Biodiversity Strategy & Action Plan 2025–2030
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Notification button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setNotifOpen((s) => !s)}
                style={{
                  width: 36, height: 36, borderRadius: 9,
                  border: '1px solid #e2e8f0', background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#64748b',
                }}
              >
                <Bell size={14} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute', top: -4, right: -4,
                      background: '#f43f5e', color: '#fff',
                      fontSize: '0.55rem', width: 16, height: 16,
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, border: '2px solid #f8fafc',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer */}
              {notifOpen && (
                <div
                  style={{
                    position: 'absolute', top: 44, right: 0, width: 340,
                    background: '#fff', borderRadius: 14,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
                    zIndex: 300, overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                      Notifications
                      {unreadCount > 0 && (
                        <span style={{ marginLeft: 6, background: '#fee2e2', color: '#991b1b', fontSize: '0.65rem', padding: '1px 6px', borderRadius: 8, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
                          {unreadCount}
                        </span>
                      )}
                    </span>
                    <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                      Mark all read
                    </button>
                  </div>
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                        No notifications
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div
                          key={n.id}
                          style={{
                            padding: '12px 16px', borderBottom: '1px solid #f8fafc',
                            cursor: 'pointer', background: n.is_read ? 'transparent' : '#fafbff',
                          }}
                          onClick={() => {
                            if (n.action_tab) navigate('/' + n.action_tab);
                            setNotifOpen(false);
                          }}
                        >
                          <p style={{ fontSize: '0.78rem', fontWeight: 500, color: '#0f172a', lineHeight: 1.4 }}>
                            {n.title}
                          </p>
                          <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                            {n.message}
                          </p>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 4, display: 'block' }}>
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User chip */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 4px 4px 12px',
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                {user ? (user.full_name || user.email) : '—'}
              </span>
              <div
                style={{
                  width: 28, height: 28,
                  background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '0.65rem', fontWeight: 700,
                }}
              >
                {user?.avatar_initials ?? '??'}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              title="Sign Out"
              style={{
                width: 36, height: 36, borderRadius: 9,
                border: '1px solid #e2e8f0', background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#64748b',
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div style={{ padding: '24px 28px', flex: 1 }}>
          <Outlet />
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          main { margin-left: 0 !important; }
          .hamburger-btn { display: flex !important; }
        }
        nav a:hover { background: rgba(56,189,248,0.1) !important; color: #7dd3fc !important; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }
      `}</style>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/dashboard': 'Monitoring Dashboard',
    '/indicators': 'Indicator Hierarchy',
    '/reporting-toolkit': 'Reporting Modules',
    '/verification-queue': 'Verification Queue',
    '/compliance': 'Compliance & Accountability',
    '/risk': 'Risk Register',
    '/reports': 'Reports & Documentation',
    '/map': 'District Map',
    '/settings': 'Settings',
    '/users': 'User Management',
  };
  return titles[pathname] || 'NBSAP Dashboard';
}

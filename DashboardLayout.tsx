import React, { useState, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { useAuth } from './AuthContext';
import { useNotifications, usePendingCount } from './useData';
import { markAllNotificationsRead } from './dataService';
import { USER_ROLE_LABELS } from './index';
import toast from 'react-hot-toast';

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

  const canSeeReporting = permissions?.canSubmitReports ?? false;
  const canSeeVerifQueue = permissions?.canViewVerifQueue ?? false;

  // ── Nav sections ──────────────────────────────────────────
  const analyticsNav = [
    { to: '/dashboard',           icon: 'fa-chart-line',          label: 'Dashboard' },
    { to: '/indicators',          icon: 'fa-layer-group',          label: 'Indicator Hierarchy' },
    { to: '/targets',             icon: 'fa-bullseye',             label: '22 National Targets', badge: 22 },
    { to: '/adaptive-management', icon: 'fa-rotate',               label: 'Adaptive Management' },
    { to: '/risk',                icon: 'fa-triangle-exclamation', label: 'Risk Register' },
  ];

  const reportingNav = [
    { to: '/reporting-toolkit?tool=T01', icon: 'fa-landmark',    label: 'T01 · Institutional' },
    { to: '/reporting-toolkit?tool=T02', icon: 'fa-tree',         label: 'T02 · District' },
    { to: '/reporting-toolkit?tool=T03', icon: 'fa-shield',       label: 'T03 · Protected Areas' },
    { to: '/reporting-toolkit?tool=T04', icon: 'fa-people-group', label: 'T04 · Community' },
    { to: '/reporting-toolkit?tool=T05', icon: 'fa-coins',        label: 'T05 · Finance' },
    { to: '/reporting-toolkit?tool=T06', icon: 'fa-building',     label: 'T06 · Private Sector' },
    { to: '/reporting-toolkit?tool=T07', icon: 'fa-flask',        label: 'T07 · Research' },
  ];

  const governanceNav = [
    ...(canSeeVerifQueue ? [{ to: '/verification-queue', icon: 'fa-file-circle-check', label: 'Verification Queue', badge: pendingCount || 0 }] : []),
    { to: '/compliance',  icon: 'fa-clipboard-check',  label: 'Compliance', badge: 0 },
    { to: '/reports',     icon: 'fa-file-contract',    label: 'Reports' },
    { to: '/stakeholders',icon: 'fa-users',             label: 'Stakeholders' },
    { to: '/map',         icon: 'fa-map-location-dot',  label: 'District Map' },
  ];

  const systemNav = [
    { to: '/rbis',          icon: 'fa-database',       label: 'RBIS Integration' },
    { to: '/data-pipeline', icon: 'fa-diagram-project', label: 'Data Pipeline' },
    { to: '/settings',      icon: 'fa-gear',            label: 'Settings' },
    { to: '/users',         icon: 'fa-users-gear',      label: 'User Management' },
  ];

  const isActive = (to: string) => location.pathname === to.split('?')[0];

  const NavItem = ({ to, icon, label, badge }: { to: string; icon: string; label: string; badge?: number }) => (
    <NavLink
      to={to}
      onClick={() => setSidebarOpen(false)}
      style={({ isActive: a }) => ({
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 18px',
        color: a ? '#38bdf8' : '#bfdbfe',
        textDecoration: 'none',
        fontSize: '0.82rem', fontWeight: 500,
        borderLeft: a ? '3px solid #38bdf8' : '3px solid transparent',
        background: a ? 'rgba(56,189,248,0.15)' : 'transparent',
        transition: 'all 0.2s',
        position: 'relative' as const,
      })}
    >
      <i className={`fa-solid ${icon}`} style={{ width: 16, textAlign: 'center', fontSize: '0.8rem', opacity: 0.85 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge ? (
        <span style={{
          background: '#f43f5e', color: '#fff',
          fontSize: '0.58rem', padding: '1px 6px',
          borderRadius: 10, fontWeight: 700,
          fontFamily: "'DM Mono', monospace",
        }}>{badge}</span>
      ) : null}
    </NavLink>
  );

  const NavSection = ({ title, items }: { title: string; items: any[] }) => (
    <div style={{ padding: '4px 0' }}>
      <div style={{
        fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'rgba(125,211,252,0.5)', padding: '8px 20px 4px',
        fontFamily: "'DM Mono', monospace",
      }}>
        {title}
      </div>
      {items.map(item => <NavItem key={item.to} {...item} />)}
    </div>
  );

  const sidebarContent = (
    <>
      {/* Brand */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38,
            background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, flexShrink: 0,
          }}>
            <i className="fa-solid fa-leaf" />
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', color: '#fff', letterSpacing: 0.5 }}>
              NBSAP
            </div>
            <div style={{ fontSize: '0.65rem', color: '#7dd3fc', fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em', marginTop: 1 }}>
              Monitoring System
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <NavSection title="Analytics" items={analyticsNav} />
        {canSeeReporting && <NavSection title="Reporting Modules" items={reportingNav} />}
        <NavSection title="Governance" items={governanceNav} />
        <NavSection title="System" items={systemNav} />
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{
          background: 'rgba(255,255,255,0.06)', borderRadius: 9,
          padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0,
            animation: 'pulse-green 2s infinite',
          }} />
          <div>
            <div style={{ fontSize: '0.7rem', color: '#a5f3fc', fontWeight: 600 }}>System Online</div>
            <div style={{ fontSize: '0.62rem', color: '#7dd3fc' }}>
              {user ? (USER_ROLE_LABELS[user.role] ?? user.role) : 'Not signed in'}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-2)' }}>

      {/* Desktop sidebar */}
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 'var(--sidebar-w)',
        background: 'linear-gradient(175deg, #0f2744 0%, #0c1e38 100%)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 20px rgba(0,0,0,0.2)', zIndex: 200,
      }} className="desktop-sidebar">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 'var(--sidebar-w)', zIndex: 200,
        background: 'linear-gradient(175deg, #0f2744 0%, #0c1e38 100%)',
        display: 'flex', flexDirection: 'column',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        boxShadow: '4px 0 20px rgba(0,0,0,0.2)',
      }} className="mobile-sidebar">
        {sidebarContent}
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Topbar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(248,250,252,0.95)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Hamburger */}
            <button
              onClick={() => setSidebarOpen(s => !s)}
              className="hamburger-btn"
              style={{
                display: 'none', width: 36, height: 36, borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface)',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-2)',
              }}
            >
              <i className={`fa-solid ${sidebarOpen ? 'fa-xmark' : 'fa-bars'}`} style={{ fontSize: 14 }} />
            </button>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-1)' }}>
                {getPageTitle(location.pathname)}
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", marginTop: 1 }}>
                National Biodiversity Strategy &amp; Action Plan 2025–2030
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setNotifOpen(s => !s)}
                style={{
                  position: 'relative', width: 36, height: 36, borderRadius: 9,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-2)',
                }}
              >
                <i className="fa-solid fa-bell" style={{ fontSize: '0.85rem' }} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: '#f43f5e', color: '#fff',
                    fontSize: '0.55rem', width: 16, height: 16,
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, border: '2px solid var(--surface-2)',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div style={{
                  position: 'absolute', top: 44, right: 0, width: 340,
                  background: 'var(--surface)', borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
                  zIndex: 400, overflow: 'hidden',
                }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                      Notifications
                      {unreadCount > 0 && (
                        <span style={{ marginLeft: 6, background: '#fee2e2', color: '#991b1b', fontSize: '0.7rem', padding: '1px 6px', borderRadius: 8, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
                          {unreadCount}
                        </span>
                      )}
                    </h4>
                    <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: 'var(--sky-dim)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                      Mark all read
                    </button>
                  </div>
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem' }}>No notifications</div>
                    ) : notifications.slice(0, 8).map(n => (
                      <div
                        key={n.id}
                        onClick={() => { if (n.action_tab) navigate('/' + n.action_tab); setNotifOpen(false); }}
                        style={{
                          display: 'flex', gap: 10, padding: '12px 16px',
                          borderBottom: '1px solid var(--surface-3)',
                          cursor: 'pointer', background: n.is_read ? 'transparent' : '#fafbff',
                          transition: '0.15s',
                        }}
                      >
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>
                          <i className="fa-solid fa-bell" />
                        </div>
                        <div>
                          <p style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-1)', lineHeight: 1.3 }}>{n.title}</p>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 2, display: 'block' }}>
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Settings shortcut */}
            <button
              onClick={() => navigate('/settings')}
              style={{
                width: 36, height: 36, borderRadius: 9,
                border: '1px solid var(--border)', background: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-2)',
              }}
            >
              <i className="fa-solid fa-gear" style={{ fontSize: '0.85rem' }} />
            </button>

            {/* User chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 4px 4px 12px',
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20,
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)' }}>
                {user ? (user.full_name || user.email) : '—'}
              </span>
              <div style={{
                width: 28, height: 28,
                background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.65rem', fontWeight: 700,
              }}>
                {user?.avatar_initials ?? '??'}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              title="Sign Out"
              style={{
                width: 36, height: 36, borderRadius: 9,
                border: '1px solid var(--border)', background: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-2)',
              }}
            >
              <i className="fa-solid fa-right-from-bracket" style={{ fontSize: '0.85rem' }} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div style={{ padding: '24px 28px', flex: 1 }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      <style>{`
        .desktop-sidebar { display: flex !important; }
        .mobile-sidebar  { display: flex !important; }
        nav a:hover { background: rgba(56,189,248,0.1) !important; color: #7dd3fc !important; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          main { margin-left: 0 !important; }
          .hamburger-btn { display: flex !important; }
          header { padding: 10px 16px 10px 56px !important; flex-wrap: wrap; gap: 8px; }
        }
      `}</style>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/dashboard':           'Monitoring Dashboard',
    '/indicators':          '4-Tier Indicator Hierarchy',
    '/targets':             '22 National Targets',
    '/adaptive-management': 'Adaptive Management & Decision Support',
    '/reporting-toolkit':   'Reporting Modules',
    '/verification-queue':  'Verification Queue',
    '/compliance':          'Compliance & Accountability',
    '/risk':                'Risk Register & Mitigation Matrix',
    '/reports':             'Reports & Documentation',
    '/stakeholders':        'Stakeholder Engagement Matrix',
    '/map':                 'District Map',
    '/rbis':                'RBIS Integration & Data Governance',
    '/data-pipeline':       '5-Tier Data Pipeline & Implementation Roadmap',
    '/settings':            'Settings',
    '/users':               'User Management',
  };
  return map[pathname] ?? 'NBSAP Dashboard';
}

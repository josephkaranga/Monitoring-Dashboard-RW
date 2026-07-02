import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import type { UserRole, RolePermissions } from '../types/index';

interface ProtectedRouteProps {
  /**
   * Minimum roles allowed to access this route.
   * If empty, any authenticated user can access.
   */
  allowedRoles?: UserRole[];
  /**
   * Specific permission required (from RolePermissions).
   * If set, the user must have this permission.
   */
  requiredPermission?: keyof RolePermissions;
  /** Where to redirect if access is denied. Defaults to /unauthorized */
  redirectTo?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

const LoadingScreen = () => (
  <div
    style={{
      minHeight: '100vh',
      background: 'var(--surface-2, #f8fafc)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
      fontFamily: "'DM Sans', sans-serif",
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 36,
          height: 36,
          background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)',
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: '#fff', fontSize: 16 }}>🌿</span>
      </div>
      <div>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1rem',
            color: '#0f2744',
            fontWeight: 700,
          }}
        >
          NBSAP
        </div>
        <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
          Monitoring System
        </div>
      </div>
    </div>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: '3px solid #e2e8f0',
        borderTopColor: '#0ea5e9',
        animation: 'spin 0.7s linear infinite',
      }}
    />
    <p style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Loading your dashboard…</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const UnauthorizedScreen = ({ role }: { role: string }) => (
  <div
    style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 12,
      fontFamily: "'DM Sans', sans-serif",
      textAlign: 'center',
      padding: 24,
    }}
  >
    <div style={{ fontSize: '3rem' }}>🔒</div>
    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Access Restricted</h2>
    <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: 360, lineHeight: 1.6 }}>
      Your role (<strong>{role}</strong>) does not have permission to view this page. Contact your
      REMA system administrator if you believe this is an error.
    </p>
    <a
      href="/dashboard"
      style={{
        marginTop: 12,
        padding: '9px 22px',
        background: '#0f2744',
        color: '#fff',
        borderRadius: 9,
        textDecoration: 'none',
        fontSize: '0.82rem',
        fontWeight: 600,
      }}
    >
      ← Return to Dashboard
    </a>
  </div>
);

/**
 * ProtectedRoute wraps any route that requires authentication and/or
 * specific role-based access control.
 *
 * Usage:
 *   <ProtectedRoute />                          — any authenticated user
 *   <ProtectedRoute allowedRoles={['dashboard_management']} />
 *   <ProtectedRoute requiredPermission="canViewAuditLog" />
 */
export default function ProtectedRoute({
  allowedRoles,
  requiredPermission,
  redirectTo = '/auth',
  loadingComponent,
}: ProtectedRouteProps) {
  const { user, session, loading, permissions } = useAuth();
  const location = useLocation();
  const [stableReady, setStableReady] = React.useState(false);

  // Give auth one extra tick to settle after loading=false
  // This prevents the flash-redirect when TOKEN_REFRESHED fires
  // slightly before SET_SESSION completes
  React.useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setStableReady(true), 50);
      return () => clearTimeout(t);
    } else {
      setStableReady(false);
    }
  }, [loading]);

  // Show loading while auth is initialising OR settling
  if (loading || !stableReady) {
    return <>{loadingComponent ?? <LoadingScreen />}</>;
  }

  // Not authenticated → redirect to login, preserving intended destination
  if (!session || !user) {
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }

  // Role check
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return <UnauthorizedScreen role={user.role} />;
    }
  }

  // Permission check
  if (requiredPermission && permissions) {
    if (!permissions[requiredPermission]) {
      return <UnauthorizedScreen role={user.role} />;
    }
  }

  // Inactive account check
  if (!user.is_active) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'DM Sans', sans-serif",
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
          Your account has been deactivated. Contact REMA support.
        </p>
      </div>
    );
  }

  return <Outlet />;
}

// ── Convenience wrappers for common role restrictions ─────────

/** Only REMA admins */
export function AdminOnly() {
  return <ProtectedRoute allowedRoles={['dashboard_management']} />;
}

/** Anyone who can submit reports */
export function ReporterRoute() {
  return (
    <ProtectedRoute
      allowedRoles={[
        'lead_government_ministry_reporting',
        'local_reporting',
        'dashboard_management',
      ]}
    />
  );
}

/** Anyone who can approve reports */
export function ApproverRoute() {
  return (
    <ProtectedRoute allowedRoles={['lead_government_ministry_reporting', 'dashboard_management']} />
  );
}

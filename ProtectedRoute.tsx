import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole, RolePermissions } from '../../types';

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
      background: '#0c1e38',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
      fontFamily: "'DM Sans', sans-serif",
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '3px solid rgba(56,189,248,0.2)',
        borderTopColor: '#38bdf8',
        animation: 'spin 0.8s linear infinite',
      }}
    />
    <p style={{ color: '#7dd3fc', fontSize: '0.82rem' }}>Loading…</p>
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
    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
      Access Restricted
    </h2>
    <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: 360, lineHeight: 1.6 }}>
      Your role (<strong>{role}</strong>) does not have permission to view this page.
      Contact your REMA system administrator if you believe this is an error.
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

  // Show loading state while auth is initialising
  if (loading) {
    return <>{loadingComponent ?? <LoadingScreen />}</>;
  }

  // Not authenticated → redirect to login, preserving intended destination
  if (!session || !user) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location.pathname }}
        replace
      />
    );
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
  return (
    <ProtectedRoute allowedRoles={['dashboard_management']} />
  );
}

/** Anyone who can submit reports */
export function ReporterRoute() {
  return (
    <ProtectedRoute
      allowedRoles={['sector_reporting', 'local_reporting', 'dashboard_management']}
    />
  );
}

/** Anyone who can approve reports */
export function ApproverRoute() {
  return (
    <ProtectedRoute
      allowedRoles={['sector_reporting', 'dashboard_management']}
    />
  );
}

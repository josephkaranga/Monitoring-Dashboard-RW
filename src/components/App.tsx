import React, { Suspense, lazy, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../services/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import AuthPage from './AuthPage';

// ── Lazy-loaded pages ─────────────────────────────────────────
const DashboardLayout = lazy(() => import('./DashboardLayout'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const IndicatorsPage = lazy(() => import('../pages/IndicatorsPage'));
const NationalTargetsPage = lazy(() => import('../pages/NationalTargetsPage'));
const AdaptiveManagementPage = lazy(() => import('../pages/AdaptiveManagementPage'));
const ReportingToolkitPage = lazy(() => import('../pages/ReportingToolkitPage'));
const VerifQueuePage = lazy(() => import('../pages/VerifQueuePage'));
const CompliancePage = lazy(() => import('../pages/CompliancePage'));
const RiskPage = lazy(() => import('../pages/RiskPage'));
const MapPage = lazy(() => import('../pages/MapPage'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));
const StakeholdersPage = lazy(() => import('../pages/StakeholdersPage'));
const RBISPage = lazy(() => import('../pages/BiodiversityDataPage'));
const DataPipelinePage = lazy(() => import('../pages/DataPipelinePage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const UserManagementPage = lazy(() => import('../pages/UserManagementPage'));
const RoleRequestsPage = lazy(() => import('../pages/RoleRequestsPage'));
const RoleChangeApprovalPanel = lazy(() => import('./RoleChangeApprovalPanel'));

// ── Loading fallback ──────────────────────────────────────────
const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      gap: 12,
      fontFamily: "'DM Sans', sans-serif",
      color: '#64748b',
      fontSize: '0.82rem',
    }}
  >
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: '2px solid #e2e8f0',
        borderTopColor: '#0ea5e9',
        animation: 'spin 0.7s linear infinite',
      }}
    />
    Loading…
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ── Stale chunk error boundary ────────────────────────────────
// When Vercel deploys a new build, old chunk URLs (e.g. DashboardPage-abc123.js)
// no longer exist. This catches the "Failed to fetch dynamically imported module"
// error and forces a hard reload to pick up the new build.
interface ChunkErrorState {
  hasError: boolean;
}

class ChunkErrorBoundary extends Component<{ children: React.ReactNode }, ChunkErrorState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ChunkErrorState {
    // Detect stale chunk / dynamic import failure
    const isChunkError =
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Importing a module script failed') ||
      error.message?.includes('Unable to preload CSS') ||
      error.name === 'ChunkLoadError';
    if (isChunkError) return { hasError: true };
    throw error; // re-throw non-chunk errors to the next boundary
  }

  componentDidUpdate(_: unknown, prevState: ChunkErrorState) {
    if (this.state.hasError && !prevState.hasError) {
      // Hard reload once to pick up the new deployment
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 12,
            fontFamily: "'DM Sans', sans-serif",
            color: '#64748b',
            textAlign: 'center',
            padding: 24,
          }}
        >
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
          <p style={{ fontSize: '0.85rem' }}>New version available — reloading…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.82rem',
              borderRadius: '10px',
              background: '#0f2744',
              color: '#fff',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
              style: { background: '#065f46', borderLeft: '4px solid #10b981' },
            },
            error: {
              iconTheme: { primary: '#f43f5e', secondary: '#fff' },
              style: { background: '#991b1b', borderLeft: '4px solid #f43f5e' },
            },
          }}
        />

        <ChunkErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/reset-password" element={<AuthPage />} />

              {/* Protected dashboard routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  {/* All authenticated users */}
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/indicators" element={<IndicatorsPage />} />
                  <Route path="/targets" element={<NationalTargetsPage />} />
                  <Route path="/adaptive-management" element={<AdaptiveManagementPage />} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/compliance" element={<CompliancePage />} />
                  <Route path="/stakeholders" element={<StakeholdersPage />} />
                  <Route path="/rbis" element={<RBISPage />} />
                  <Route path="/data-pipeline" element={<DataPipelinePage />} />

                  {/* Reporters only */}
                  <Route
                    element={
                      <ProtectedRoute
                        allowedRoles={[
                          'lead_government_ministry_reporting',
                          'local_reporting',
                          'dashboard_management',
                        ]}
                      />
                    }
                  >
                    <Route path="/reporting-toolkit" element={<ReportingToolkitPage />} />
                  </Route>

                  {/* Risk register: hide from local reporters */}
                  <Route
                    element={
                      <ProtectedRoute
                        allowedRoles={[
                          'policy_monitoring',
                          'lead_government_ministry_reporting',
                          'dashboard_management',
                          'programme_alignment',
                        ]}
                      />
                    }
                  >
                    <Route path="/risk" element={<RiskPage />} />
                  </Route>

                  {/* Verification queue: approvers only */}
                  <Route
                    element={
                      <ProtectedRoute
                        allowedRoles={[
                          'lead_government_ministry_reporting',
                          'dashboard_management',
                        ]}
                        requiredPermission="canApproveReports"
                      />
                    }
                  >
                    <Route path="/verification-queue" element={<VerifQueuePage />} />
                  </Route>

                  {/* Settings: all */}
                  <Route path="/settings" element={<SettingsPage />} />

                  {/* Role change requests: all authenticated users */}
                  <Route path="/role-requests" element={<RoleRequestsPage />} />

                  {/* User management: admin only */}
                  <Route
                    element={
                      <ProtectedRoute
                        allowedRoles={['dashboard_management']}
                        requiredPermission="canManageUsers"
                      />
                    }
                  >
                    <Route path="/users" element={<UserManagementPage />} />
                  </Route>

                  {/* Role change approval: admin only */}
                  <Route element={<ProtectedRoute allowedRoles={['dashboard_management']} />}>
                    <Route path="/role-requests/admin" element={<RoleChangeApprovalPanel />} />
                  </Route>
                </Route>
              </Route>

              {/* Redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </ChunkErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

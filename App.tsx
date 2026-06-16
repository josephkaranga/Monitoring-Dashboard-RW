import React, { Suspense, lazy } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import AuthPage from './AuthPage';

// ── Lazy-loaded pages ─────────────────────────────────────────
const DashboardLayout = lazy(() => import('./DashboardLayout'));
const DashboardPage = lazy(() => import('./DashboardPage'));
const IndicatorsPage = lazy(() => import('./IndicatorsPage'));
const NationalTargetsPage = lazy(() => import('./NationalTargetsPage'));
const AdaptiveManagementPage = lazy(() => import('./AdaptiveManagementPage'));
const ReportingToolkitPage = lazy(() => import('./ReportingToolkitPage'));
const VerifQueuePage = lazy(() => import('./VerifQueuePage'));
const CompliancePage = lazy(() => import('./CompliancePage'));
const RiskPage = lazy(() => import('./RiskPage'));
const MapPage = lazy(() => import('./MapPage'));
const ReportsPage = lazy(() => import('./ReportsPage'));
const StakeholdersPage = lazy(() => import('./StakeholdersPage'));
const RBISPage = lazy(() => import('./RBISPage'));
const DataPipelinePage = lazy(() => import('./DataPipelinePage'));
const SettingsPage = lazy(() => import('./SettingsPage'));
const UserManagementPage = lazy(() => import('./UserManagementPage'));

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
                        'sector_reporting',
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
                        'sector_reporting',
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
                      allowedRoles={['sector_reporting', 'dashboard_management']}
                      requiredPermission="canApproveReports"
                    />
                  }
                >
                  <Route path="/verification-queue" element={<VerifQueuePage />} />
                </Route>

                {/* Settings: all */}
                <Route path="/settings" element={<SettingsPage />} />

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
              </Route>
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

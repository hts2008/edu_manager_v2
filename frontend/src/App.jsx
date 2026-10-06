import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExperienceProvider } from './context/ExperienceContext';

// Layout
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { RouteLoading } from './components/ui/LoadingStates';

// Pages
import LoginPage from './pages/LoginPage';
import ParentPortalLoginPage from './pages/ParentPortalLoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const ParentsPage = lazy(() => import('./pages/ParentsPage'));
const ClassesPage = lazy(() => import('./pages/ClassesPage'));
const TeachersPage = lazy(() => import('./pages/TeachersPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const AttendanceInsightsPage = lazy(() => import('./pages/AttendanceInsightsPage'));
const AttendancePeriodsPage = lazy(() => import('./pages/AttendancePeriodsPage'));
const ReceiptsPage = lazy(() => import('./pages/ReceiptsPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const FeeCollectionPage = lazy(() => import('./pages/FeeCollectionPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AdvancedReportsPage = lazy(() => import('./pages/AdvancedReportsPage'));
const StudentProgressReportPage = lazy(() => import('./pages/StudentProgressReportPage'));
const StudentProgressDetailPage = lazy(() => import('./pages/StudentProgressDetailPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const TemplateDesignerPage = lazy(() => import('./pages/TemplateDesignerPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const CenterSettingsPage = lazy(() => import('./pages/CenterSettingsPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const ImportPage = lazy(() => import('./pages/ImportPage'));
const FeeRemindersPage = lazy(() => import('./pages/FeeRemindersPage'));
const BackupsPage = lazy(() => import('./pages/BackupsPage'));
const RecycleBinPage = lazy(() => import('./pages/RecycleBinPage'));
const ParentPortalPage = lazy(() => import('./pages/ParentPortalPage'));
const ConsoleLayout = lazy(() => import('./console/ConsoleLayout'));
const ConsoleHomePage = lazy(() => import('./console/ConsoleHomePage'));
const ConsoleSectionPage = lazy(() => import('./console/ConsoleSectionPage'));
const ConsoleSettingsPage = lazy(() => import('./console/ConsoleSettingsPage'));
const TenantsPage = lazy(() => import('./console/TenantsPage'));
const AccessPage = lazy(() => import('./console/AccessPage'));
const IntegrationsPage = lazy(() => import('./console/IntegrationsPage'));
const ExperiencePage = lazy(() => import('./console/ExperiencePage'));

// Placeholder pages (will be implemented later)
const PlaceholderPage = ({ title }) => (
  <div className="card">
    <div className="card-body text-center py-12">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500">Trang này đang được phát triển.</p>
    </div>
  </div>
);

const RequirePermission = ({ permission, children }) => (
  <ProtectedRoute requiredPermission={permission}>{children}</ProtectedRoute>
);

const RequirePlatformOwner = ({ children }) => {
  const { user } = useAuth();

  if (user?.is_platform_owner === true || user?.isPlatformOwner === true) {
    return children;
  }

  return (
    <ProtectedRoute requiredPermission="platform.tenants.manage">
      {children}
    </ProtectedRoute>
  );
};

const withSuspense = (element) => (
  <Suspense fallback={<RouteLoading />}>{element}</Suspense>
);

export default function App() {
  return (
    <AuthProvider>
      <ExperienceProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/parent-login" element={<ParentPortalLoginPage />} />
            <Route path="/parent-portal" element={withSuspense(<ParentPortalPage />)} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={withSuspense(<DashboardPage />)} />
              <Route path="students" element={withSuspense(<RequirePermission permission="students.manage"><StudentsPage /></RequirePermission>)} />
              <Route path="parents" element={withSuspense(<RequirePermission permission="students.manage"><ParentsPage /></RequirePermission>)} />
              <Route path="classes" element={withSuspense(<RequirePermission permission="classes.manage"><ClassesPage /></RequirePermission>)} />
              <Route path="teachers" element={withSuspense(<RequirePermission permission="users.manage"><TeachersPage /></RequirePermission>)} />
              <Route path="attendance" element={withSuspense(<RequirePermission permission="attendance.manage"><AttendancePage /></RequirePermission>)} />
              <Route path="attendance-insights" element={withSuspense(<RequirePermission permission="attendance.manage"><AttendanceInsightsPage /></RequirePermission>)} />
              <Route path="attendance-periods" element={withSuspense(<RequirePermission permission="attendance.manage"><AttendancePeriodsPage /></RequirePermission>)} />
              <Route path="receipts" element={withSuspense(<RequirePermission permission="receipts.manage"><ReceiptsPage /></RequirePermission>)} />
              <Route path="payments" element={withSuspense(<RequirePermission permission="reports.view"><PaymentsPage /></RequirePermission>)} />
              <Route path="fee-collection" element={withSuspense(<RequirePermission permission="fees.collect"><FeeCollectionPage /></RequirePermission>)} />
              <Route path="history" element={withSuspense(<RequirePermission permission="receipts.manage"><HistoryPage /></RequirePermission>)} />
              <Route path="templates" element={withSuspense(<RequirePermission permission="templates.manage"><TemplatesPage /></RequirePermission>)} />
              <Route path="reports" element={withSuspense(<RequirePermission permission="reports.view"><ReportsPage /></RequirePermission>)} />
              <Route path="student-progress" element={withSuspense(<RequirePermission permission="progress.view"><StudentProgressReportPage /></RequirePermission>)} />
              <Route path="student-progress/:studentId" element={withSuspense(<RequirePermission permission="progress.view"><StudentProgressDetailPage /></RequirePermission>)} />
              <Route path="advanced-reports" element={withSuspense(<RequirePermission permission="reports.view"><AdvancedReportsPage /></RequirePermission>)} />
              <Route path="audit-logs" element={withSuspense(<RequirePermission permission="audit_logs.view"><AuditLogsPage /></RequirePermission>)} />
              <Route path="settings" element={withSuspense(<RequirePermission permission="console.organization.view"><CenterSettingsPage /></RequirePermission>)} />
              <Route path="users" element={withSuspense(<RequirePermission permission="users.manage"><UserManagementPage /></RequirePermission>)} />
              <Route path="imports" element={withSuspense(<RequirePermission permission="imports.run"><ImportPage /></RequirePermission>)} />
              <Route path="fee-reminders" element={withSuspense(<RequirePermission permission="fee_reminders.send"><FeeRemindersPage /></RequirePermission>)} />
              <Route path="backups" element={withSuspense(<RequirePermission permission="backups.manage"><BackupsPage /></RequirePermission>)} />
              <Route path="recycle-bin" element={withSuspense(<RequirePermission permission="recycle_bin.manage"><RecycleBinPage /></RequirePermission>)} />
            </Route>

            {/* Template Designer - Full screen without sidebar */}
            <Route
              path="/templates/:id/design"
              element={
                <ProtectedRoute>
                  {withSuspense(<RequirePermission permission="templates.manage"><TemplateDesignerPage /></RequirePermission>)}
                </ProtectedRoute>
              }
            />

            {/* Admin Console - isolated control-plane shell */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredPermission="console.access">
                  {withSuspense(<ConsoleLayout />)}
                </ProtectedRoute>
              }
            >
              <Route index element={<RequirePermission permission="console.access"><ConsoleHomePage /></RequirePermission>} />
              <Route path="tenants" element={<RequirePlatformOwner><TenantsPage /></RequirePlatformOwner>} />
              <Route path="organization" element={<RequirePermission permission="console.organization.view"><ConsoleSettingsPage /></RequirePermission>} />
              <Route path="academic" element={<RequirePermission permission="console.academic.edit"><ConsoleSettingsPage /></RequirePermission>} />
              <Route path="finance" element={<RequirePermission permission="console.finance.edit"><ConsoleSettingsPage /></RequirePermission>} />
              <Route path="access" element={<RequirePermission permission="console.access.edit"><AccessPage /></RequirePermission>} />
              <Route path="integrations" element={<RequirePermission permission="console.integrations.edit"><IntegrationsPage /></RequirePermission>} />
              <Route path="experience" element={<RequirePermission permission="console.experience.view"><ExperiencePage /></RequirePermission>} />
              <Route path="system" element={<RequirePermission permission="console.access"><ConsoleSectionPage /></RequirePermission>} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
      </ExperienceProvider>
    </AuthProvider>
  );
}
import './utils/draftNavigationEvents';

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

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

// Placeholder pages (will be implemented later)
const PlaceholderPage = ({ title }) => (
  <div className="card">
    <div className="card-body text-center py-12">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500">Trang này đang được phát triển.</p>
    </div>
  </div>
);

const AdminOnly = ({ children }) => (
  <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>
);

const withSuspense = (element) => (
  <Suspense fallback={<RouteLoading />}>{element}</Suspense>
);

export default function App() {
  return (
    <AuthProvider>
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
              <Route path="students" element={withSuspense(<StudentsPage />)} />
              <Route path="parents" element={withSuspense(<ParentsPage />)} />
              <Route path="classes" element={withSuspense(<ClassesPage />)} />
              <Route path="teachers" element={withSuspense(<AdminOnly><TeachersPage /></AdminOnly>)} />
              <Route path="attendance" element={withSuspense(<AttendancePage />)} />
              <Route path="attendance-insights" element={withSuspense(<AttendanceInsightsPage />)} />
              <Route path="attendance-periods" element={withSuspense(<AttendancePeriodsPage />)} />
              <Route path="receipts" element={withSuspense(<ReceiptsPage />)} />
              <Route path="payments" element={withSuspense(<AdminOnly><PaymentsPage /></AdminOnly>)} />
              <Route path="fee-collection" element={withSuspense(<FeeCollectionPage />)} />
              <Route path="history" element={withSuspense(<HistoryPage />)} />
              <Route path="templates" element={withSuspense(<AdminOnly><TemplatesPage /></AdminOnly>)} />
              <Route path="reports" element={withSuspense(<AdminOnly><ReportsPage /></AdminOnly>)} />
              <Route path="student-progress" element={withSuspense(<AdminOnly><StudentProgressReportPage /></AdminOnly>)} />
              <Route path="advanced-reports" element={withSuspense(<AdminOnly><AdvancedReportsPage /></AdminOnly>)} />
              <Route path="audit-logs" element={withSuspense(<AdminOnly><AuditLogsPage /></AdminOnly>)} />
              <Route path="settings" element={withSuspense(<AdminOnly><CenterSettingsPage /></AdminOnly>)} />
              <Route path="users" element={withSuspense(<AdminOnly><UserManagementPage /></AdminOnly>)} />
              <Route path="imports" element={withSuspense(<AdminOnly><ImportPage /></AdminOnly>)} />
              <Route path="fee-reminders" element={withSuspense(<AdminOnly><FeeRemindersPage /></AdminOnly>)} />
              <Route path="backups" element={withSuspense(<AdminOnly><BackupsPage /></AdminOnly>)} />
              <Route path="recycle-bin" element={withSuspense(<AdminOnly><RecycleBinPage /></AdminOnly>)} />
            </Route>

            {/* Template Designer - Full screen without sidebar */}
            <Route
              path="/templates/:id/design"
              element={
                <ProtectedRoute>
                  {withSuspense(<AdminOnly><TemplateDesignerPage /></AdminOnly>)}
                </ProtectedRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

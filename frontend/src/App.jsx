import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layout
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import ParentsPage from './pages/ParentsPage';
import ClassesPage from './pages/ClassesPage';
import TeachersPage from './pages/TeachersPage';
import AttendancePage from './pages/AttendancePage';
import AttendanceInsightsPage from './pages/AttendanceInsightsPage';
import AttendancePeriodsPage from './pages/AttendancePeriodsPage';
import ReceiptsPage from './pages/ReceiptsPage';
import PaymentsPage from './pages/PaymentsPage';
import FeeCollectionPage from './pages/FeeCollectionPage';
import HistoryPage from './pages/HistoryPage';
import ReportsPage from './pages/ReportsPage';
import AdvancedReportsPage from './pages/AdvancedReportsPage';
import TemplatesPage from './pages/TemplatesPage';
import TemplateDesignerPage from './pages/TemplateDesignerPage';
import AuditLogsPage from './pages/AuditLogsPage';
import CenterSettingsPage from './pages/CenterSettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import ImportPage from './pages/ImportPage';
import FeeRemindersPage from './pages/FeeRemindersPage';
import BackupsPage from './pages/BackupsPage';
import RecycleBinPage from './pages/RecycleBinPage';
import ParentPortalLoginPage from './pages/ParentPortalLoginPage';
import ParentPortalPage from './pages/ParentPortalPage';

// Placeholder pages (will be implemented later)
const PlaceholderPage = ({ title }) => (
  <div className="card">
    <div className="card-body text-center py-12">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500">Trang này đang được phát triển.</p>
    </div>
  </div>
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
            <Route path="/parent-portal" element={<ParentPortalPage />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="parents" element={<ParentsPage />} />
              <Route path="classes" element={<ClassesPage />} />
              <Route path="teachers" element={<TeachersPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="attendance-insights" element={<AttendanceInsightsPage />} />
              <Route path="attendance-periods" element={<AttendancePeriodsPage />} />
              <Route path="receipts" element={<ReceiptsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="fee-collection" element={<FeeCollectionPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="advanced-reports" element={<AdvancedReportsPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="settings" element={<CenterSettingsPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="imports" element={<ImportPage />} />
              <Route path="fee-reminders" element={<FeeRemindersPage />} />
              <Route path="backups" element={<BackupsPage />} />
              <Route path="recycle-bin" element={<RecycleBinPage />} />
            </Route>

            {/* Template Designer - Full screen without sidebar */}
            <Route
              path="/templates/:id/design"
              element={
                <ProtectedRoute>
                  <TemplateDesignerPage />
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

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layout
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import ParentsPage from './pages/ParentsPage';
import ClassesPage from './pages/ClassesPage';
import TeachersPage from './pages/TeachersPage';
import AttendancePage from './pages/AttendancePage';
import ReceiptsPage from './pages/ReceiptsPage';
import PaymentsPage from './pages/PaymentsPage';
import FeeCollectionPage from './pages/FeeCollectionPage';
import HistoryPage from './pages/HistoryPage';
import ReportsPage from './pages/ReportsPage';
import TemplatesPage from './pages/TemplatesPage';
import TemplateDesignerPage from './pages/TemplateDesignerPage';

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
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

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
            <Route path="receipts" element={<ReceiptsPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="fee-collection" element={<FeeCollectionPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="reports" element={<ReportsPage />} />
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
      </BrowserRouter>
    </AuthProvider>
  );
}

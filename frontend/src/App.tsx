import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import { authApi } from './services';
import { isBackendConfigured } from './services/api';

// Components
import BackendConfigModal from './components/BackendConfigModal';

// Layouts
import AuthLayout from './components/layouts/AuthLayout';
import DashboardLayout from './components/layouts/DashboardLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Dashboard Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import PatientsPage from './pages/patients/PatientsPage';
import PatientDetailPage from './pages/patients/PatientDetailPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import MedicalRecordsPage from './pages/records/MedicalRecordsPage';
import SearchPage from './pages/search/SearchPage';
import SettingsPage from './pages/settings/SettingsPage';

function App() {
  const { isAuthenticated, isLoading, setUser, setLoading } = useAuthStore();
  const [showBackendConfig, setShowBackendConfig] = useState(!isBackendConfigured());

  useEffect(() => {
    // Only init auth if backend is configured
    if (showBackendConfig) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const user = await authApi.getMe();
          setUser(user);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        }
      } else {
        setLoading(false);
      }
    };

    initAuth();
  }, [setUser, setLoading, showBackendConfig]);

  // Show backend configuration modal
  if (showBackendConfig) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <BackendConfigModal onConfigured={() => setShowBackendConfig(false)} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/register"
          element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" replace />}
        />
      </Route>

      {/* Protected Dashboard Routes */}
      <Route
        element={
          isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" replace />
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/records" element={<MedicalRecordsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Default Route */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
              <p className="text-gray-600 dark:text-gray-400">Page not found</p>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

export default App;

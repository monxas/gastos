import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { OfflineProvider } from './context/OfflineContext';
import { ToastProvider } from './components/Toast';
import { api } from './services/api';
import OfflineIndicator from './components/OfflineIndicator';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AccountDetail from './pages/AccountDetail';
import Recurring from './pages/Recurring';
import Incomes from './pages/Incomes';
import SetupWizard from './pages/SetupWizard';

function PrivateRoute({ children, skipSetupCheck = false }) {
  const { token, loading } = useAuth();
  const location = useLocation();
  const [setupCompleted, setSetupCompleted] = useState(null);
  const [checkingSetup, setCheckingSetup] = useState(!skipSetupCheck);

  useEffect(() => {
    if (token && !skipSetupCheck) {
      api.get('/settings')
        .then(res => {
          setSetupCompleted(res.settings?.setup_completed === 1);
        })
        .catch(() => {
          setSetupCompleted(true); // Default to true on error
        })
        .finally(() => {
          setCheckingSetup(false);
        });
    }
  }, [token, skipSetupCheck]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span>Cargando...</span>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" />;
  }

  // Still checking setup status
  if (!skipSetupCheck && checkingSetup) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span>Cargando...</span>
      </div>
    );
  }

  // Redirect to setup wizard if not completed
  if (!skipSetupCheck && setupCompleted === false && location.pathname !== '/setup') {
    return <Navigate to="/setup" />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return null;
  }

  return token ? <Navigate to="/" /> : children;
}

export default function App() {
  return (
    <ThemeProvider>
      <OfflineProvider>
        <ToastProvider>
          <OfflineIndicator />
          <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/setup" element={<PrivateRoute skipSetupCheck={true}><SetupWizard /></PrivateRoute>} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Home />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="account/:id" element={<AccountDetail />} />
            <Route path="recurring" element={<Recurring />} />
            <Route path="incomes" element={<Incomes />} />
            </Route>
          </Routes>
        </ToastProvider>
      </OfflineProvider>
    </ThemeProvider>
  );
}

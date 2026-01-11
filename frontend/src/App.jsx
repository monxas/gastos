import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
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

function PrivateRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span>Cargando...</span>
      </div>
    );
  }

  return token ? children : <Navigate to="/login" />;
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
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
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
    </ThemeProvider>
  );
}

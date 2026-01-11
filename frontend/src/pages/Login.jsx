import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-logo">$</div>
      <h1 className="auth-title">Gastos</h1>
      <p className="auth-subtitle">Control de gastos personales</p>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: '16px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-input"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Contrasena</label>
          <input
            type="password"
            className="form-input"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Iniciando...' : 'Iniciar Sesion'}
        </button>
      </form>

      <p className="auth-footer">
        No tienes cuenta? <Link to="/register">Registrate</Link>
      </p>
    </div>
  );
}

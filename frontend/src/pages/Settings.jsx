import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import BottomSheet from '../components/BottomSheet';

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, opacity: 0.5 }}>
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );
}

const ACCOUNT_TYPE_LABELS = {
  bank: 'Banco',
  cash: 'Efectivo',
  debit_card: 'Tarjeta Debito',
  credit_card: 'Tarjeta Credito'
};

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [showCategories, setShowCategories] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [showBudgets, setShowBudgets] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewTag, setShowNewTag] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showNewBudget, setShowNewBudget] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '', color: '#000000' });
  const [newTag, setNewTag] = useState({ name: '', color: '#000000' });
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'bank',
    initial_balance: 0,
    card_billing_account_id: '',
    card_close_day: 1,
    card_payment_day: 15,
    credit_limit: 0
  });
  const [newBudget, setNewBudget] = useState({ category_id: '', amount: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, catRes, tagRes, accRes, budgetsRes] = await Promise.all([
        api.get('/settings'),
        api.get('/categories'),
        api.get('/tags'),
        api.get('/accounts'),
        api.get('/budgets').catch(() => ({ budgets: [] }))
      ]);
      setSettings(settingsRes.settings);
      setCategories(catRes.categories);
      setTags(tagRes.tags);
      setAccounts(accRes.accounts);
      setBudgets(budgetsRes.budgets);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories', newCategory);
      setNewCategory({ name: '', icon: '', color: '#000000' });
      setShowNewCategory(false);
      const res = await api.get('/categories');
      setCategories(res.categories);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Eliminar esta categoria?')) return;
    try {
      await api.delete(`/categories/${id}`);
      const res = await api.get('/categories');
      setCategories(res.categories);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tags', newTag);
      setNewTag({ name: '', color: '#000000' });
      setShowNewTag(false);
      const res = await api.get('/tags');
      setTags(res.tags);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTag = async (id) => {
    if (!confirm('Eliminar este tag?')) return;
    try {
      await api.delete(`/tags/${id}`);
      const res = await api.get('/tags');
      setTags(res.tags);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      const accountData = {
        name: newAccount.name,
        type: newAccount.type,
        initial_balance: newAccount.initial_balance || 0
      };

      // Add credit card specific fields
      if (newAccount.type === 'credit_card') {
        accountData.card_billing_account_id = newAccount.card_billing_account_id || null;
        accountData.card_close_day = newAccount.card_close_day || 1;
        accountData.card_payment_day = newAccount.card_payment_day || 15;
        accountData.credit_limit = newAccount.credit_limit || 0;
      }

      await api.post('/accounts', accountData);
      setNewAccount({
        name: '',
        type: 'bank',
        initial_balance: 0,
        card_billing_account_id: '',
        card_close_day: 1,
        card_payment_day: 15,
        credit_limit: 0
      });
      setShowNewAccount(false);
      const res = await api.get('/accounts');
      setAccounts(res.accounts);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!confirm('Eliminar esta cuenta?')) return;
    try {
      await api.delete(`/accounts/${id}`);
      const res = await api.get('/accounts');
      setAccounts(res.accounts);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCloseStatement = async (accountId) => {
    if (!confirm('Cerrar el periodo de esta tarjeta? Se creara un gasto en la cuenta bancaria asociada.')) return;
    try {
      const res = await api.post(`/accounts/${accountId}/close-statement`);
      alert(`Cierre completado. Total: ${res.statement.total_amount.toFixed(2)} EUR`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddBudget = async (e) => {
    e.preventDefault();
    try {
      await api.post('/budgets', {
        category_id: newBudget.category_id || null,
        amount: parseFloat(newBudget.amount)
      });
      setNewBudget({ category_id: '', amount: '' });
      setShowNewBudget(false);
      const res = await api.get('/budgets');
      setBudgets(res.budgets);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!confirm('Eliminar este presupuesto?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      const res = await api.get('/budgets');
      setBudgets(res.budgets);
    } catch (err) {
      alert(err.message);
    }
  };

  const bankAccounts = accounts.filter(a => a.type === 'bank');
  const categoriesWithoutBudget = categories.filter(
    c => !budgets.some(b => b.category_id === c.id)
  );

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Ajustes</h1>
      </header>

      <main className="page">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Cuenta</span>
          </div>
          <div className="list" style={{ background: 'transparent' }}>
            <div className="list-item" style={{ background: 'transparent' }}>
              <div className="list-item-content">
                <div className="list-item-title">{user?.email}</div>
                <div className="list-item-subtitle">Email</div>
              </div>
            </div>
            <div className="list-item" style={{ background: 'transparent' }}>
              <div className="list-item-content">
                <div className="list-item-title">{settings?.base_currency || 'EUR'}</div>
                <div className="list-item-subtitle">Moneda base</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Apariencia</span>
          </div>
          <div className="list" style={{ background: 'transparent' }}>
            <div className="list-item" style={{ background: 'transparent' }}>
              <div className="list-item-content">
                <div className="list-item-title">Modo oscuro</div>
                <div className="list-item-subtitle">{isDark ? 'Activado' : 'Desactivado'}</div>
              </div>
              <button className={`toggle ${isDark ? 'active' : ''}`} onClick={toggleTheme} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Funciones</span>
          </div>
          <div className="list" style={{ background: 'transparent' }}>
            <div className="list-item" onClick={() => navigate('/setup')} style={{ background: 'transparent', cursor: 'pointer' }}>
              <div className="list-item-icon" style={{ background: 'var(--surface)' }}>🧙</div>
              <div className="list-item-content">
                <div className="list-item-title">Asistente de configuracion</div>
                <div className="list-item-subtitle">Configura cuentas, categorias, etc.</div>
              </div>
              <ChevronRight />
            </div>
            <div className="list-item" onClick={() => navigate('/recurring')} style={{ background: 'transparent', cursor: 'pointer' }}>
              <div className="list-item-icon" style={{ background: 'var(--surface)' }}>🔄</div>
              <div className="list-item-content">
                <div className="list-item-title">Gastos recurrentes</div>
                <div className="list-item-subtitle">Suscripciones, alquiler, etc.</div>
              </div>
              <ChevronRight />
            </div>
            <div className="list-item" onClick={() => navigate('/incomes')} style={{ background: 'transparent', cursor: 'pointer' }}>
              <div className="list-item-icon" style={{ background: 'var(--surface)' }}>💰</div>
              <div className="list-item-content">
                <div className="list-item-title">Ingresos</div>
                <div className="list-item-subtitle">Salario, freelance, etc.</div>
              </div>
              <ChevronRight />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Datos</span>
          </div>
          <div className="list" style={{ background: 'transparent' }}>
            <div className="list-item" onClick={() => setShowCategories(true)} style={{ background: 'transparent', cursor: 'pointer' }}>
              <div className="list-item-content">
                <div className="list-item-title">Categorias</div>
                <div className="list-item-subtitle">{categories.length} categorias</div>
              </div>
              <ChevronRight />
            </div>
            <div className="list-item" onClick={() => setShowTags(true)} style={{ background: 'transparent', cursor: 'pointer' }}>
              <div className="list-item-content">
                <div className="list-item-title">Tags</div>
                <div className="list-item-subtitle">{tags.length} tags</div>
              </div>
              <ChevronRight />
            </div>
            <div className="list-item" onClick={() => setShowAccounts(true)} style={{ background: 'transparent', cursor: 'pointer' }}>
              <div className="list-item-content">
                <div className="list-item-title">Cuentas</div>
                <div className="list-item-subtitle">{accounts.length} cuentas</div>
              </div>
              <ChevronRight />
            </div>
            <div className="list-item" onClick={() => setShowBudgets(true)} style={{ background: 'transparent', cursor: 'pointer' }}>
              <div className="list-item-content">
                <div className="list-item-title">Presupuestos</div>
                <div className="list-item-subtitle">{budgets.length} presupuestos activos</div>
              </div>
              <ChevronRight />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Exportar</span>
          </div>
          <div className="list" style={{ background: 'transparent' }}>
            <a
              href="/api/settings/export"
              download
              className="list-item"
              style={{ background: 'transparent', cursor: 'pointer' }}
              onClick={(e) => {
                e.preventDefault();
                const token = localStorage.getItem('token');
                fetch('/api/settings/export', {
                  headers: { Authorization: `Bearer ${token}` }
                })
                  .then(res => res.blob())
                  .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `gastos-backup-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  });
              }}
            >
              <div className="list-item-content">
                <div className="list-item-title">Descargar backup</div>
                <div className="list-item-subtitle">JSON con todos tus datos</div>
              </div>
              <ChevronRight />
            </a>
          </div>
        </div>

        <button className="btn btn-danger btn-block mt-16" onClick={logout}>
          Cerrar Sesion
        </button>
      </main>

      {/* Categories Sheet */}
      <BottomSheet isOpen={showCategories} onClose={() => setShowCategories(false)} title="Categorias">
        <div className="list">
          {categories.map(cat => (
            <div key={cat.id} className="list-item">
              <div className="list-item-icon" style={{ background: cat.color || '#ccc' }}>
                {cat.icon || '📦'}
              </div>
              <div className="list-item-content">
                <div className="list-item-title">{cat.name}</div>
              </div>
              <button
                onClick={() => handleDeleteCategory(cat.id)}
                style={{ color: 'var(--danger)', padding: '8px' }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-block mt-16" onClick={() => setShowNewCategory(true)}>
          Anadir Categoria
        </button>
      </BottomSheet>

      {/* New Category Sheet */}
      <BottomSheet isOpen={showNewCategory} onClose={() => setShowNewCategory(false)} title="Nueva Categoria">
        <form onSubmit={handleAddCategory}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="form-input"
              value={newCategory.name}
              onChange={(e) => setNewCategory(c => ({ ...c, name: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Icono (emoji)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: 🍔"
              value={newCategory.icon}
              onChange={(e) => setNewCategory(c => ({ ...c, icon: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <input
              type="color"
              className="form-input"
              value={newCategory.color}
              onChange={(e) => setNewCategory(c => ({ ...c, color: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">Guardar</button>
        </form>
      </BottomSheet>

      {/* Tags Sheet */}
      <BottomSheet isOpen={showTags} onClose={() => setShowTags(false)} title="Tags">
        <div className="list">
          {tags.map(tag => (
            <div key={tag.id} className="list-item">
              <span className="chip-color" style={{ background: tag.color, width: 12, height: 12, borderRadius: '50%', marginRight: 8 }}></span>
              <div className="list-item-content">
                <div className="list-item-title">{tag.name}</div>
              </div>
              <button
                onClick={() => handleDeleteTag(tag.id)}
                style={{ color: 'var(--danger)', padding: '8px' }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-block mt-16" onClick={() => setShowNewTag(true)}>
          Anadir Tag
        </button>
      </BottomSheet>

      {/* New Tag Sheet */}
      <BottomSheet isOpen={showNewTag} onClose={() => setShowNewTag(false)} title="Nuevo Tag">
        <form onSubmit={handleAddTag}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="form-input"
              value={newTag.name}
              onChange={(e) => setNewTag(t => ({ ...t, name: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <input
              type="color"
              className="form-input"
              value={newTag.color}
              onChange={(e) => setNewTag(t => ({ ...t, color: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">Guardar</button>
        </form>
      </BottomSheet>

      {/* Accounts Sheet */}
      <BottomSheet isOpen={showAccounts} onClose={() => setShowAccounts(false)} title="Cuentas">
        <div className="list">
          {accounts.map(acc => (
            <div key={acc.id} className="list-item">
              <div className="list-item-content">
                <div className="list-item-title">{acc.name}</div>
                <div className="list-item-subtitle">
                  {ACCOUNT_TYPE_LABELS[acc.type] || acc.type}
                  {acc.type === 'credit_card' && acc.card_close_day && (
                    <span> · Cierre dia {acc.card_close_day}</span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="list-item-value" style={{ color: acc.current_balance < 0 ? 'var(--danger)' : 'inherit' }}>
                  {formatCurrency(acc.current_balance)}
                </div>
                {acc.type === 'credit_card' && acc.current_balance < 0 && (
                  <button
                    className="btn btn-sm btn-secondary mt-8"
                    onClick={() => handleCloseStatement(acc.id)}
                  >
                    Cerrar
                  </button>
                )}
              </div>
              <button
                onClick={() => handleDeleteAccount(acc.id)}
                style={{ color: 'var(--danger)', padding: '8px', marginLeft: '8px' }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-block mt-16" onClick={() => setShowNewAccount(true)}>
          Anadir Cuenta
        </button>
      </BottomSheet>

      {/* New Account Sheet */}
      <BottomSheet isOpen={showNewAccount} onClose={() => setShowNewAccount(false)} title="Nueva Cuenta">
        <form onSubmit={handleAddAccount}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="form-input"
              value={newAccount.name}
              onChange={(e) => setNewAccount(a => ({ ...a, name: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select
              className="form-input"
              value={newAccount.type}
              onChange={(e) => setNewAccount(a => ({ ...a, type: e.target.value }))}
            >
              <option value="bank">Banco</option>
              <option value="cash">Efectivo</option>
              <option value="debit_card">Tarjeta Debito</option>
              <option value="credit_card">Tarjeta Credito</option>
            </select>
          </div>

          {/* Initial balance for bank, cash, and debit cards */}
          {(newAccount.type === 'bank' || newAccount.type === 'cash' || newAccount.type === 'debit_card') && (
            <div className="form-group">
              <label className="form-label">Saldo inicial</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={newAccount.initial_balance}
                onChange={(e) => setNewAccount(a => ({ ...a, initial_balance: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          )}

          {/* Credit card specific fields */}
          {newAccount.type === 'credit_card' && (
            <>
              <div className="form-group">
                <label className="form-label">Cuenta de cargo (para cierre)</label>
                <select
                  className="form-input"
                  value={newAccount.card_billing_account_id}
                  onChange={(e) => setNewAccount(a => ({ ...a, card_billing_account_id: e.target.value }))}
                >
                  <option value="">Seleccionar...</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dia de cierre (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="form-input"
                  value={newAccount.card_close_day}
                  onChange={(e) => setNewAccount(a => ({ ...a, card_close_day: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dia de pago (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="form-input"
                  value={newAccount.card_payment_day}
                  onChange={(e) => setNewAccount(a => ({ ...a, card_payment_day: parseInt(e.target.value) || 15 }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Limite de credito (informativo)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={newAccount.credit_limit}
                  onChange={(e) => setNewAccount(a => ({ ...a, credit_limit: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-block">Guardar</button>
        </form>
      </BottomSheet>

      {/* Budgets Sheet */}
      <BottomSheet isOpen={showBudgets} onClose={() => setShowBudgets(false)} title="Presupuestos">
        <div className="list">
          {budgets.map(budget => (
            <div key={budget.id} className="list-item">
              <div className="list-item-icon" style={{ background: budget.category_color || '#666' }}>
                {budget.category_icon || '💰'}
              </div>
              <div className="list-item-content">
                <div className="list-item-title">{budget.category_name || 'Total mensual'}</div>
                <div className="list-item-subtitle">
                  {formatCurrency(budget.spent)} de {formatCurrency(budget.amount)}
                </div>
                <div style={{
                  height: '4px',
                  background: 'var(--border)',
                  borderRadius: '2px',
                  marginTop: '6px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, budget.percent)}%`,
                    background: budget.status === 'exceeded' ? 'var(--danger)' : budget.status === 'warning' ? 'var(--warning)' : 'var(--success)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', marginRight: '8px' }}>
                <div style={{
                  fontWeight: '700',
                  color: budget.status === 'exceeded' ? 'var(--danger)' : budget.status === 'warning' ? 'var(--warning)' : 'inherit'
                }}>
                  {budget.percent.toFixed(0)}%
                </div>
              </div>
              <button
                onClick={() => handleDeleteBudget(budget.id)}
                style={{ color: 'var(--danger)', padding: '8px' }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-block mt-16" onClick={() => setShowNewBudget(true)}>
          Anadir Presupuesto
        </button>
      </BottomSheet>

      {/* New Budget Sheet */}
      <BottomSheet isOpen={showNewBudget} onClose={() => setShowNewBudget(false)} title="Nuevo Presupuesto">
        <form onSubmit={handleAddBudget}>
          <div className="form-group">
            <label className="form-label">Categoria (opcional)</label>
            <select
              className="form-input"
              value={newBudget.category_id}
              onChange={(e) => setNewBudget(b => ({ ...b, category_id: e.target.value }))}
            >
              <option value="">Total mensual (todas las categorias)</option>
              {categoriesWithoutBudget.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Monto mensual</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              placeholder="0.00"
              value={newBudget.amount}
              onChange={(e) => setNewBudget(b => ({ ...b, amount: e.target.value }))}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">Guardar</button>
        </form>
      </BottomSheet>
    </>
  );
}

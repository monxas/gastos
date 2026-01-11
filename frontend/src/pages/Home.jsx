import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import BottomSheet from '../components/BottomSheet';
import ExpenseForm from '../components/ExpenseForm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

const ACCOUNT_TYPE_LABELS = {
  bank: 'Banco',
  cash: 'Efectivo',
  debit_card: 'Debito',
  credit_card: 'Credito'
};

const ACCOUNT_ICONS = {
  bank: '🏦',
  cash: '💵',
  debit_card: '💳',
  credit_card: '💳'
};

export default function Home() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, expensesRes, accountsRes] = await Promise.all([
        api.get(`/expenses/summary/monthly?year=${year}&month=${month}`),
        api.get('/expenses?limit=5'),
        api.get('/accounts')
      ]);
      setSummary(summaryRes.summary);
      setRecentExpenses(expensesRes.expenses);
      setAccounts(accountsRes.accounts);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, compact = false) => {
    if (compact && Math.abs(amount) >= 1000) {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(amount);
    }
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const currentMonth = format(now, 'MMMM yyyy', { locale: es });

  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0);
  const totalAvailable = accounts
    .filter(a => a.type !== 'credit_card')
    .reduce((sum, acc) => sum + acc.current_balance, 0);
  const totalDebt = accounts
    .filter(a => a.type === 'credit_card' && a.current_balance < 0)
    .reduce((sum, acc) => sum + Math.abs(acc.current_balance), 0);
  const totalCreditAvailable = accounts
    .filter(a => a.type === 'credit_card')
    .reduce((sum, acc) => sum + (acc.credit_limit || 0) + acc.current_balance, 0);

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <span>Cargando...</span>
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Inicio</h1>
      </header>

      <main className="page">
        {/* Balance Total Card */}
        <div className="summary-card" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)' }}>
          <div className="summary-label">Balance Total</div>
          <div className="summary-value">{formatCurrency(totalBalance)}</div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '2px' }}>Disponible</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>{formatCurrency(totalAvailable, true)}</div>
            </div>
            {totalDebt > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '2px' }}>Deuda TC</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#ff6b6b' }}>-{formatCurrency(totalDebt, true)}</div>
              </div>
            )}
            {totalCreditAvailable > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '2px' }}>Credito Disp.</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#4ecdc4' }}>{formatCurrency(totalCreditAvailable, true)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Accounts Grid */}
        {accounts.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Mis Cuentas</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {accounts.map(acc => {
                const isCredit = acc.type === 'credit_card';
                const usedCredit = isCredit ? Math.abs(Math.min(0, acc.current_balance)) : 0;
                const creditLimit = acc.credit_limit || 0;
                const usagePercent = isCredit && creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0;

                return (
                  <div
                    key={acc.id}
                    onClick={() => navigate(`/account/${acc.id}`)}
                    style={{
                      background: 'var(--background)',
                      borderRadius: 'var(--radius)',
                      padding: '12px',
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                      transition: 'var(--transition)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{ACCOUNT_ICONS[acc.type]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '500', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {ACCOUNT_TYPE_LABELS[acc.type]}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: acc.current_balance < 0 ? 'var(--danger)' : 'inherit'
                    }}>
                      {formatCurrency(acc.current_balance, true)}
                    </div>
                    {isCredit && creditLimit > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{
                          height: '4px',
                          background: 'var(--border)',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, usagePercent)}%`,
                            background: usagePercent > 80 ? 'var(--danger)' : usagePercent > 50 ? 'var(--warning)' : 'var(--success)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {formatCurrency(creditLimit - usedCredit, true)} disponible
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Monthly Spending Card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Gastos de {currentMonth}</span>
            <span style={{ fontSize: '20px', fontWeight: '700' }}>{formatCurrency(summary?.total || 0)}</span>
          </div>

          {summary?.by_category?.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              {summary.by_category.slice(0, 4).map(cat => {
                const percent = summary.total > 0 ? (cat.total / summary.total) * 100 : 0;
                return (
                  <div key={cat.id} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{cat.icon || '📦'}</span>
                        {cat.name}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{formatCurrency(cat.total)}</span>
                    </div>
                    <div style={{
                      height: '6px',
                      background: 'var(--border)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${percent}%`,
                        background: cat.color || '#000',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
              {summary.by_category.length > 4 && (
                <button
                  onClick={() => navigate('/reports')}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    textAlign: 'center'
                  }}
                >
                  Ver todas las categorias →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        {recentExpenses.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Ultimos Gastos</span>
              <button
                onClick={() => navigate('/expenses')}
                style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
              >
                Ver todos →
              </button>
            </div>
            <div className="list" style={{ background: 'transparent', margin: '0 -16px' }}>
              {recentExpenses.map(expense => (
                <div key={expense.id} className="list-item" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <div className="list-item-icon" style={{ background: expense.category_color || '#ccc', width: 36, height: 36 }}>
                    {expense.category_icon || '📦'}
                  </div>
                  <div className="list-item-content">
                    <div className="list-item-title" style={{ fontSize: '14px' }}>{expense.note || expense.category_name}</div>
                    <div className="list-item-subtitle">{expense.account_name}</div>
                  </div>
                  <div className="list-item-value negative" style={{ fontSize: '14px' }}>-{formatCurrency(expense.amount_base)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {accounts.length === 0 && recentExpenses.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">💰</div>
            <div className="empty-state-title">Bienvenido a Gastos</div>
            <p>Anade tu primer gasto para empezar a controlar tus finanzas</p>
          </div>
        )}
      </main>

      <button className="fab" onClick={() => setShowForm(true)}>
        <PlusIcon />
      </button>

      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="Nuevo Gasto">
        <ExpenseForm
          onSave={() => {
            setShowForm(false);
            loadData();
          }}
          onClose={() => setShowForm(false)}
        />
      </BottomSheet>
    </>
  );
}

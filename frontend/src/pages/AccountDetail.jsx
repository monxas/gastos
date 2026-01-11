import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import BottomSheet from '../components/BottomSheet';
import ExpenseForm from '../components/ExpenseForm';

const ACCOUNT_TYPE_LABELS = {
  bank: 'Cuenta Bancaria',
  cash: 'Efectivo',
  debit_card: 'Tarjeta de Débito',
  credit_card: 'Tarjeta de Crédito'
};

const ACCOUNT_ICONS = {
  bank: '🏦',
  cash: '💵',
  debit_card: '💳',
  credit_card: '💳'
};

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );
}

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAdjustBalance, setShowAdjustBalance] = useState(false);
  const [adjustedBalance, setAdjustedBalance] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = current, -1 = last month, etc.

  useEffect(() => {
    loadData();
  }, [id, selectedMonth]);

  const loadData = async () => {
    try {
      const targetDate = subMonths(new Date(), Math.abs(selectedMonth));
      const startDate = format(startOfMonth(targetDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(targetDate), 'yyyy-MM-dd');

      const [accountRes, expensesRes] = await Promise.all([
        api.get(`/accounts/${id}`),
        api.get(`/expenses?account_id=${id}&start_date=${startDate}&end_date=${endDate}&limit=100`)
      ]);

      setAccount(accountRes.account);
      setExpenses(expensesRes.expenses);

      // Calculate summary from expenses
      const categoryTotals = {};
      let total = 0;

      for (const exp of expensesRes.expenses) {
        total += exp.amount_base;
        if (!categoryTotals[exp.category_id]) {
          categoryTotals[exp.category_id] = {
            id: exp.category_id,
            name: exp.category_name,
            icon: exp.category_icon,
            color: exp.category_color,
            total: 0,
            count: 0
          };
        }
        categoryTotals[exp.category_id].total += exp.amount_base;
        categoryTotals[exp.category_id].count++;
      }

      const byCategory = Object.values(categoryTotals).sort((a, b) => b.total - a.total);

      setSummary({ total, byCategory, count: expensesRes.expenses.length });
    } catch (err) {
      console.error('Error loading account data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseStatement = async () => {
    if (!confirm('¿Cerrar el corte de tarjeta? Los gastos pendientes se cargarán a la cuenta asociada.')) {
      return;
    }

    try {
      const result = await api.post(`/accounts/${id}/close-statement`);
      alert(`Corte cerrado: ${formatCurrency(result.statement.total_amount)} (${result.statement.expenses_count} gastos)`);
      loadData();
    } catch (err) {
      alert(err.response?.error || 'Error al cerrar corte');
    }
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    const newBalance = parseFloat(adjustedBalance);
    if (isNaN(newBalance)) return;

    try {
      // Calculate new initial_balance: new_initial = new_balance + total_expenses
      // Since current_balance = initial_balance - total_expenses
      // We need: new_initial = newBalance + (initial_balance - current_balance)
      const totalExpenses = account.initial_balance - account.current_balance;
      const newInitialBalance = newBalance + totalExpenses;

      await api.put(`/accounts/${id}`, {
        initial_balance: newInitialBalance
      });
      setShowAdjustBalance(false);
      setAdjustedBalance('');
      loadData();
    } catch (err) {
      alert(err.response?.error || 'Error al ajustar saldo');
    }
  };

  const getMonthLabel = (offset) => {
    const date = subMonths(new Date(), Math.abs(offset));
    return format(date, 'MMMM yyyy', { locale: es });
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <span>Cargando...</span>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="page">
        <p>Cuenta no encontrada</p>
        <button onClick={() => navigate('/')}>Volver</button>
      </div>
    );
  }

  const isCredit = account.type === 'credit_card';
  const creditLimit = account.credit_limit || 0;
  const usedCredit = isCredit ? Math.abs(Math.min(0, account.current_balance)) : 0;
  const availableCredit = creditLimit - usedCredit;
  const usagePercent = creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0;

  // Group expenses by date
  const expensesByDate = expenses.reduce((acc, exp) => {
    const date = exp.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(exp);
    return acc;
  }, {});

  return (
    <>
      <header className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={() => navigate(-1)} style={{ padding: '8px', marginLeft: '-8px' }}>
          <BackIcon />
        </button>
        <h1 className="page-title" style={{ flex: 1 }}>{account.name}</h1>
      </header>

      <main className="page">
        {/* Account Summary Card */}
        <div className="summary-card" style={{
          background: isCredit
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            : 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '32px' }}>{ACCOUNT_ICONS[account.type]}</span>
            <div>
              <div style={{ fontSize: '13px', opacity: 0.7 }}>{ACCOUNT_TYPE_LABELS[account.type]}</div>
              <div style={{ fontSize: '11px', opacity: 0.5 }}>{account.currency}</div>
            </div>
          </div>

          <div className="summary-label">
            {isCredit ? 'Deuda Actual' : 'Saldo Actual'}
          </div>
          <div className="summary-value" style={{ color: account.current_balance < 0 ? '#ff6b6b' : 'inherit' }}>
            {formatCurrency(Math.abs(account.current_balance))}
          </div>

          {isCredit && creditLimit > 0 && (
            <>
              <div style={{
                height: '8px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                marginTop: '16px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, usagePercent)}%`,
                  background: usagePercent > 80 ? '#ff6b6b' : usagePercent > 50 ? '#feca57' : '#1dd1a1',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                fontSize: '12px',
                opacity: 0.7
              }}>
                <span>Usado: {formatCurrency(usedCredit, true)} ({usagePercent.toFixed(0)}%)</span>
                <span>Disponible: {formatCurrency(availableCredit, true)}</span>
              </div>
              <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '8px' }}>
                Límite: {formatCurrency(creditLimit)}
                {account.card_close_day && ` • Cierre: día ${account.card_close_day}`}
                {account.card_payment_day && ` • Pago: día ${account.card_payment_day}`}
              </div>
            </>
          )}

          {!isCredit && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <span style={{ fontSize: '12px', opacity: 0.6 }}>
                Saldo inicial: {formatCurrency(account.initial_balance)}
              </span>
              <button
                onClick={() => {
                  setAdjustedBalance(account.current_balance.toString());
                  setShowAdjustBalance(true);
                }}
                style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '20px',
                  color: 'inherit'
                }}
              >
                Ajustar saldo
              </button>
            </div>
          )}
        </div>

        {/* Close Statement Button for Credit Cards */}
        {isCredit && usedCredit > 0 && account.card_billing_account_id && (
          <button
            onClick={handleCloseStatement}
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '16px' }}
          >
            Cerrar Corte ({formatCurrency(usedCredit)})
          </button>
        )}

        {/* Month Selector */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          overflowX: 'auto',
          paddingBottom: '4px'
        }}>
          {[0, -1, -2, -3].map(offset => (
            <button
              key={offset}
              onClick={() => setSelectedMonth(offset)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius)',
                background: selectedMonth === offset ? 'var(--text)' : 'var(--background)',
                color: selectedMonth === offset ? 'var(--background)' : 'var(--text)',
                border: '1px solid var(--border)',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                fontWeight: selectedMonth === offset ? '600' : '400'
              }}
            >
              {offset === 0 ? 'Este mes' : getMonthLabel(offset)}
            </button>
          ))}
        </div>

        {/* Monthly Summary */}
        {summary && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Resumen del Mes</span>
              <span style={{ fontSize: '18px', fontWeight: '700' }}>
                {formatCurrency(summary.total)}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {summary.count} gastos en {getMonthLabel(selectedMonth)}
            </div>

            {summary.byCategory.length > 0 && (
              <div>
                {summary.byCategory.map(cat => {
                  const percent = summary.total > 0 ? (cat.total / summary.total) * 100 : 0;
                  return (
                    <div key={cat.id} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{cat.icon || '📦'}</span>
                          {cat.name}
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            ({cat.count})
                          </span>
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>
                          {formatCurrency(cat.total)}
                        </span>
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
                          background: cat.color || 'var(--primary)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Expenses List */}
        {Object.keys(expensesByDate).length > 0 ? (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Gastos</span>
            </div>
            {Object.entries(expensesByDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, dayExpenses]) => {
                const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount_base, 0);
                return (
                  <div key={date} style={{ marginBottom: '16px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border)',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        {format(new Date(date), 'EEEE d', { locale: es })}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>
                        {formatCurrency(dayTotal)}
                      </span>
                    </div>
                    {dayExpenses.map(expense => (
                      <div
                        key={expense.id}
                        className="list-item"
                        style={{ paddingLeft: 0, paddingRight: 0 }}
                        onClick={() => navigate(`/expenses?expense=${expense.id}`)}
                      >
                        <div
                          className="list-item-icon"
                          style={{
                            background: expense.category_color || '#ccc',
                            width: 36,
                            height: 36
                          }}
                        >
                          {expense.category_icon || '📦'}
                        </div>
                        <div className="list-item-content">
                          <div className="list-item-title" style={{ fontSize: '14px' }}>
                            {expense.note || expense.category_name}
                          </div>
                          <div className="list-item-subtitle">
                            {expense.category_name}
                            {expense.settled_at && (
                              <span style={{
                                marginLeft: '8px',
                                fontSize: '10px',
                                background: 'var(--success)',
                                color: '#fff',
                                padding: '2px 6px',
                                borderRadius: '10px'
                              }}>
                                Liquidado
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="list-item-value negative" style={{ fontSize: '14px' }}>
                          -{formatCurrency(expense.amount_base)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">Sin gastos</div>
            <p>No hay gastos registrados en esta cuenta para {getMonthLabel(selectedMonth)}</p>
          </div>
        )}
      </main>

      <button
        className="fab"
        onClick={() => setShowForm(true)}
        style={{ bottom: '24px' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="Nuevo Gasto">
        <ExpenseForm
          defaultAccountId={id}
          onSave={() => {
            setShowForm(false);
            loadData();
          }}
          onClose={() => setShowForm(false)}
        />
      </BottomSheet>

      <BottomSheet isOpen={showAdjustBalance} onClose={() => setShowAdjustBalance(false)} title="Ajustar Saldo">
        <form onSubmit={handleAdjustBalance}>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Ajusta el saldo actual de la cuenta sin crear un ingreso o gasto. Util para corregir el saldo inicial o sincronizar con tu banco.
          </p>
          <div className="form-group">
            <label className="form-label">Saldo actual real</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              placeholder="0.00"
              value={adjustedBalance}
              onChange={(e) => setAdjustedBalance(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setShowAdjustBalance(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Guardar
            </button>
          </div>
        </form>
      </BottomSheet>
    </>
  );
}

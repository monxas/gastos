import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';
import BottomSheet from '../components/BottomSheet';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '../context/ThemeContext';

const INCOME_SOURCES = [
  { value: 'salary', label: 'Salario', icon: '💼' },
  { value: 'freelance', label: 'Freelance', icon: '💻' },
  { value: 'investment', label: 'Inversiones', icon: '📈' },
  { value: 'rental', label: 'Alquiler', icon: '🏠' },
  { value: 'gift', label: 'Regalo', icon: '🎁' },
  { value: 'refund', label: 'Reembolso', icon: '↩️' },
  { value: 'other', label: 'Otro', icon: '💰' }
];

export default function Incomes() {
  const { isDark } = useTheme();
  const [incomes, setIncomes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expensesSummary, setExpensesSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    currency: 'EUR',
    account_id: '',
    source: 'salary',
    note: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;

    try {
      const [incomesRes, summaryRes, expSummaryRes, accRes] = await Promise.all([
        api.get(`/incomes?year=${year}&month=${month}`),
        api.get(`/incomes/summary?year=${year}&month=${month}`),
        api.get(`/expenses/summary/monthly?year=${year}&month=${month}`),
        api.get('/accounts')
      ]);
      setIncomes(incomesRes.incomes);
      setSummary(summaryRes);
      setExpensesSummary(expSummaryRes.summary);
      setAccounts(accRes.accounts);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingIncome) {
        await api.put(`/incomes/${editingIncome.id}`, form);
      } else {
        await api.post('/incomes', form);
      }
      setShowForm(false);
      setEditingIncome(null);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error saving income:', err);
    }
  };

  const handleEdit = (income) => {
    setEditingIncome(income);
    setForm({
      date: income.date,
      amount: income.amount,
      currency: income.currency,
      account_id: income.account_id,
      source: income.source || 'other',
      note: income.note || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminar este ingreso?')) return;
    try {
      await api.delete(`/incomes/${id}`);
      loadData();
    } catch (err) {
      console.error('Error deleting income:', err);
    }
  };

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      currency: 'EUR',
      account_id: accounts[0]?.id || '',
      source: 'salary',
      note: ''
    });
  };

  const getSourceInfo = (source) => {
    return INCOME_SOURCES.find(s => s.value === source) || INCOME_SOURCES[INCOME_SOURCES.length - 1];
  };

  const prevMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
  const nextMonth = () => {
    const next = new Date(selectedMonth);
    next.setMonth(next.getMonth() + 1);
    if (next <= new Date()) setSelectedMonth(next);
  };

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
        <h1 className="page-title">Ingresos</h1>
        <button
          onClick={() => { resetForm(); setEditingIncome(null); setShowForm(true); }}
          style={{ color: 'var(--primary)', fontWeight: '600' }}
        >
          + Nuevo
        </button>
      </header>

      <main className="page">
        {/* Month Selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button onClick={prevMonth} style={{ padding: '8px 16px', fontSize: '18px' }}>←</button>
          <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>
            {format(selectedMonth, 'MMMM yyyy', { locale: es })}
          </span>
          <button
            onClick={nextMonth}
            disabled={selectedMonth.getMonth() === new Date().getMonth() && selectedMonth.getFullYear() === new Date().getFullYear()}
            style={{ padding: '8px 16px', fontSize: '18px', opacity: selectedMonth.getMonth() === new Date().getMonth() ? 0.3 : 1 }}
          >
            →
          </button>
        </div>

        {/* Balance Card - Income vs Expenses */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">
            <span className="card-title">Balance del mes</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              flex: 1,
              padding: '16px',
              background: 'rgba(46, 204, 113, 0.1)',
              borderRadius: 'var(--radius)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Ingresos</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--success)' }}>
                +{formatCurrency(summary?.total || 0)}
              </div>
            </div>
            <div style={{
              flex: 1,
              padding: '16px',
              background: 'rgba(231, 76, 60, 0.1)',
              borderRadius: 'var(--radius)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Gastos</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--danger)' }}>
                -{formatCurrency(expensesSummary?.total || 0)}
              </div>
            </div>
          </div>
          {/* Net Balance */}
          {(() => {
            const netBalance = (summary?.total || 0) - (expensesSummary?.total || 0);
            const isPositive = netBalance >= 0;
            return (
              <div style={{
                padding: '16px',
                background: isPositive ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                borderRadius: 'var(--radius)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isPositive ? 'Ahorro' : 'Deficit'}
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: isPositive ? 'var(--success)' : 'var(--danger)'
                }}>
                  {isPositive ? '+' : ''}{formatCurrency(netBalance)}
                </div>
                {(summary?.total || 0) > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {isPositive
                      ? `${((netBalance / summary.total) * 100).toFixed(0)}% de tus ingresos`
                      : `Gastas ${(((expensesSummary?.total || 0) / summary.total) * 100).toFixed(0)}% de tus ingresos`
                    }
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Visual Bar Comparison */}
        {((summary?.total || 0) > 0 || (expensesSummary?.total || 0) > 0) && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-header">
              <span className="card-title">Comparativa visual</span>
            </div>
            {(() => {
              const income = summary?.total || 0;
              const expenses = expensesSummary?.total || 0;
              const max = Math.max(income, expenses);
              const incomePercent = max > 0 ? (income / max) * 100 : 0;
              const expensesPercent = max > 0 ? (expenses / max) * 100 : 0;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px' }}>💰 Ingresos</span>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{formatCurrency(income)}</span>
                    </div>
                    <div style={{ height: '24px', background: 'var(--background)', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${incomePercent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #2ecc71, #27ae60)',
                        borderRadius: '12px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px' }}>💸 Gastos</span>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{formatCurrency(expenses)}</span>
                    </div>
                    <div style={{ height: '24px', background: 'var(--background)', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${expensesPercent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #e74c3c, #c0392b)',
                        borderRadius: '12px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* By Source */}
        {summary?.by_source?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Por fuente</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {summary.by_source.map((item, idx) => {
                const sourceInfo = getSourceInfo(item.source);
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 16px',
                      background: 'var(--background)',
                      borderRadius: 'var(--radius)',
                      flex: '1 1 calc(50% - 4px)',
                      minWidth: '140px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span>{sourceInfo.icon}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{sourceInfo.label}</span>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '16px' }}>{formatCurrency(item.total)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Income List */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Movimientos</span>
          </div>

          {incomes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <div className="empty-state-title">Sin ingresos este mes</div>
              <p>Registra tu salario, inversiones, freelance...</p>
            </div>
          ) : (
            <div className="list" style={{ background: 'transparent', margin: '0 -16px' }}>
              {incomes.map(income => {
                const sourceInfo = getSourceInfo(income.source);
                return (
                  <div
                    key={income.id}
                    className="list-item"
                    style={{ paddingLeft: '16px', paddingRight: '16px', cursor: 'pointer' }}
                    onClick={() => handleEdit(income)}
                  >
                    <div className="list-item-icon" style={{ background: 'rgba(46, 204, 113, 0.2)', fontSize: '20px' }}>
                      {sourceInfo.icon}
                    </div>
                    <div className="list-item-content">
                      <div className="list-item-title">{income.note || sourceInfo.label}</div>
                      <div className="list-item-subtitle">{income.account_name} • {income.date}</div>
                    </div>
                    <div className="list-item-value" style={{ color: 'var(--success)' }}>
                      +{formatCurrency(income.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomSheet
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingIncome(null); }}
        title={editingIncome ? 'Editar Ingreso' : 'Nuevo Ingreso'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Monto</label>
            <input
              type="number"
              className="form-input"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fuente</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {INCOME_SOURCES.map(source => (
                <button
                  key={source.value}
                  type="button"
                  onClick={() => setForm({ ...form, source: source.value })}
                  style={{
                    padding: '12px 8px',
                    background: form.source === source.value ? 'var(--primary)' : 'var(--surface)',
                    color: form.source === source.value ? (isDark ? '#000' : '#fff') : 'var(--text)',
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{source.icon}</span>
                  <span style={{ fontSize: '10px' }}>{source.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Cuenta destino</label>
            <select
              className="form-input"
              value={form.account_id}
              onChange={(e) => setForm({ ...form, account_id: e.target.value })}
              required
            >
              <option value="">Seleccionar...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input
              type="date"
              className="form-input"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nota (opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Descripcion..."
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            {editingIncome && (
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--danger)', color: '#fff' }}
                onClick={() => handleDelete(editingIncome.id)}
              >
                Eliminar
              </button>
            )}
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {editingIncome ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </BottomSheet>
    </>
  );
}

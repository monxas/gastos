import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';
import { useToast } from '../components/Toast';
import BottomSheet from '../components/BottomSheet';
import ExpenseForm from '../components/ExpenseForm';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  );
}

export default function Expenses() {
  const { addToast } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    category_id: '',
    account_id: '',
    start_date: '',
    end_date: '',
    min_amount: '',
    max_amount: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [filters, search]);

  const loadData = async () => {
    try {
      const [catRes, accRes] = await Promise.all([
        api.get('/categories'),
        api.get('/accounts')
      ]);
      setCategories(catRes.categories);
      setAccounts(accRes.accounts);
      await loadExpenses();
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const loadExpenses = async () => {
    setLoading(true);
    try {
      let query = '/expenses?limit=100';
      if (filters.category_id) query += `&category_id=${filters.category_id}`;
      if (filters.account_id) query += `&account_id=${filters.account_id}`;
      if (filters.start_date) query += `&start_date=${filters.start_date}`;
      if (filters.end_date) query += `&end_date=${filters.end_date}`;
      if (filters.min_amount) query += `&min_amount=${filters.min_amount}`;
      if (filters.max_amount) query += `&max_amount=${filters.max_amount}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      const res = await api.get(query);
      setExpenses(res.expenses);
    } catch (err) {
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    let query = '/expenses/export/csv?';
    if (filters.category_id) query += `&category_id=${filters.category_id}`;
    if (filters.account_id) query += `&account_id=${filters.account_id}`;
    if (filters.start_date) query += `&start_date=${filters.start_date}`;
    if (filters.end_date) query += `&end_date=${filters.end_date}`;

    const filename = `gastos-${filters.start_date || 'all'}-${filters.end_date || 'all'}.csv`;
    try {
      await api.downloadFile(query, filename);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id, showConfirm = true) => {
    if (showConfirm && !confirm('Eliminar este gasto?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      loadExpenses();

      // Show undo toast
      addToast('Gasto eliminado', {
        actionLabel: 'Deshacer',
        action: async () => {
          try {
            await api.post(`/expenses/${id}/restore`);
            loadExpenses();
          } catch (err) {
            console.error('Error restoring expense:', err);
          }
        },
        duration: 5000
      });
    } catch (err) {
      alert(err.message);
    }
  };

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadExpenses();
    setRefreshing(false);
  }, [filters, search]);

  const formatDate = (dateStr) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoy';
    if (isYesterday(date)) return 'Ayer';
    return format(date, "d 'de' MMMM", { locale: es });
  };

  // Group expenses by date
  const groupedExpenses = expenses.reduce((groups, expense) => {
    const date = expense.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(expense);
    return groups;
  }, {});

  const clearFilters = () => {
    setFilters({ category_id: '', account_id: '', start_date: '', end_date: '', min_amount: '', max_amount: '' });
    setSearch('');
  };

  const hasFilters = filters.category_id || filters.account_id || filters.start_date || filters.end_date || filters.min_amount || filters.max_amount || search;

  const totalFiltered = expenses.reduce((sum, e) => sum + e.amount_base, 0);

  return (
    <>
      <header className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="page-title">Gastos</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleExport}
              style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)' }}
              title="Exportar CSV"
            >
              <DownloadIcon />
            </button>
            <button
              onClick={() => setShowFilters(true)}
              style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: hasFilters ? 'var(--primary)' : 'var(--surface)', color: hasFilters ? 'white' : 'inherit' }}
            >
              <FilterIcon />
            </button>
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <input
            type="search"
            className="form-input"
            placeholder="Buscar gastos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {expenses.length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{expenses.length} gastos</span>
            <span style={{ fontWeight: '600', color: 'var(--danger)' }}>Total: {formatCurrency(totalFiltered)}</span>
          </div>
        )}
      </header>

      <main className="page">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>Cargando...</div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-title">Sin gastos</div>
            <p>{hasFilters ? 'No hay gastos con estos filtros' : 'Anade tu primer gasto'}</p>
            {hasFilters && (
              <button className="btn btn-secondary mt-16" onClick={clearFilters}>
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          Object.entries(groupedExpenses).map(([date, dateExpenses]) => (
            <div key={date}>
              <div className="date-header">{formatDate(date)}</div>
              <div className="list">
                {dateExpenses.map(expense => (
                  <div
                    key={expense.id}
                    className="list-item"
                    onClick={() => setEditingExpense(expense)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="list-item-icon" style={{ background: expense.category_color || '#ccc' }}>
                      {expense.category_icon || '📦'}
                    </div>
                    <div className="list-item-content">
                      <div className="list-item-title">{expense.category_name}</div>
                      <div className="list-item-subtitle">
                        {expense.account_name}
                        {expense.tags?.length > 0 && (
                          <span> · {expense.tags.map(t => t.name).join(', ')}</span>
                        )}
                      </div>
                      {expense.note && (
                        <div className="expense-note-preview">{expense.note}</div>
                      )}
                    </div>
                    <div className="list-item-value negative">-{formatCurrency(expense.amount_base)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      <button className="fab" onClick={() => setShowForm(true)}>
        <PlusIcon />
      </button>

      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="Nuevo Gasto">
        <ExpenseForm
          onSave={() => {
            setShowForm(false);
            loadExpenses();
          }}
          onClose={() => setShowForm(false)}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Editar Gasto"
      >
        {editingExpense && (
          <>
            <ExpenseForm
              expense={editingExpense}
              onSave={() => {
                setEditingExpense(null);
                loadExpenses();
              }}
              onClose={() => setEditingExpense(null)}
            />
            <button
              className="btn btn-danger btn-block mt-16"
              onClick={() => {
                handleDelete(editingExpense.id, false);
                setEditingExpense(null);
              }}
            >
              Eliminar Gasto
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filtros">
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select
            className="form-input"
            value={filters.category_id}
            onChange={(e) => setFilters(f => ({ ...f, category_id: e.target.value }))}
          >
            <option value="">Todas</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Cuenta</label>
          <select
            className="form-input"
            value={filters.account_id}
            onChange={(e) => setFilters(f => ({ ...f, account_id: e.target.value }))}
          >
            <option value="">Todas</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Desde</label>
          <input
            type="date"
            className="form-input"
            value={filters.start_date}
            onChange={(e) => setFilters(f => ({ ...f, start_date: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Hasta</label>
          <input
            type="date"
            className="form-input"
            value={filters.end_date}
            onChange={(e) => setFilters(f => ({ ...f, end_date: e.target.value }))}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Monto min</label>
            <input
              type="number"
              className="form-input"
              placeholder="0"
              value={filters.min_amount}
              onChange={(e) => setFilters(f => ({ ...f, min_amount: e.target.value }))}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Monto max</label>
            <input
              type="number"
              className="form-input"
              placeholder="999999"
              value={filters.max_amount}
              onChange={(e) => setFilters(f => ({ ...f, max_amount: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button className="btn btn-secondary flex-1" onClick={clearFilters}>
            Limpiar
          </button>
          <button className="btn btn-primary flex-1" onClick={() => setShowFilters(false)}>
            Aplicar
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

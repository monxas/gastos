import { useState, useEffect } from 'react';
import { api } from '../services/api';
import BottomSheet from '../components/BottomSheet';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' }
];

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

export default function Recurring() {
  const [rules, setRules] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [processing, setProcessing] = useState(false);

  const [form, setForm] = useState({
    name: '',
    amount: '',
    currency: 'EUR',
    category_id: '',
    account_id: '',
    note: '',
    frequency: 'monthly',
    interval: 1,
    day_of_month: 1,
    day_of_week: 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rulesRes, upcomingRes, catRes, accRes] = await Promise.all([
        api.get('/recurring'),
        api.get('/recurring/upcoming?days=30'),
        api.get('/categories'),
        api.get('/accounts')
      ]);
      setRules(rulesRes.rules);
      setUpcoming(upcomingRes.upcoming);
      setCategories(catRes.categories);
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
      if (editingRule) {
        await api.put(`/recurring/${editingRule.id}`, form);
      } else {
        await api.post('/recurring', form);
      }
      setShowForm(false);
      setEditingRule(null);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error saving rule:', err);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      amount: rule.amount,
      currency: rule.currency,
      category_id: rule.category_id,
      account_id: rule.account_id,
      note: rule.note || '',
      frequency: rule.frequency_data.frequency,
      interval: rule.frequency_data.interval || 1,
      day_of_month: rule.frequency_data.day_of_month || 1,
      day_of_week: rule.frequency_data.day_of_week || 1,
      start_date: rule.start_date,
      end_date: rule.end_date || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminar esta regla recurrente?')) return;
    try {
      await api.delete(`/recurring/${id}`);
      loadData();
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const result = await api.post('/recurring/process');
      if (result.processed > 0) {
        alert(`Se crearon ${result.processed} gastos`);
        loadData();
      } else {
        alert('No hay gastos pendientes');
      }
    } catch (err) {
      console.error('Error processing:', err);
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      amount: '',
      currency: 'EUR',
      category_id: categories[0]?.id || '',
      account_id: accounts[0]?.id || '',
      note: '',
      frequency: 'monthly',
      interval: 1,
      day_of_month: 1,
      day_of_week: 1,
      start_date: new Date().toISOString().split('T')[0],
      end_date: ''
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getFrequencyLabel = (rule) => {
    const freq = rule.frequency_data;
    switch (freq.frequency) {
      case 'daily':
        return freq.interval > 1 ? `Cada ${freq.interval} dias` : 'Diario';
      case 'weekly':
        return freq.interval > 1 ? `Cada ${freq.interval} semanas` : `Semanal (${DAYS_OF_WEEK[freq.day_of_week || 0]})`;
      case 'monthly':
        return freq.interval > 1 ? `Cada ${freq.interval} meses` : `Mensual (dia ${freq.day_of_month || 1})`;
      case 'yearly':
        return 'Anual';
      default:
        return freq.frequency;
    }
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
        <h1 className="page-title">Gastos Recurrentes</h1>
        <button
          onClick={handleProcess}
          disabled={processing}
          style={{
            padding: '8px 16px',
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: 'var(--radius)',
            fontSize: '13px'
          }}
        >
          {processing ? 'Procesando...' : 'Procesar pendientes'}
        </button>
      </header>

      <main className="page">
        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Proximos 30 dias</span>
            </div>
            <div className="list" style={{ background: 'transparent', margin: '0 -16px' }}>
              {upcoming.map(rule => (
                <div key={rule.id} className="list-item" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <div className="list-item-icon" style={{ background: rule.category_color || '#ccc' }}>
                    {rule.category_icon || '📦'}
                  </div>
                  <div className="list-item-content">
                    <div className="list-item-title">{rule.name}</div>
                    <div className="list-item-subtitle">{rule.next_run_at}</div>
                  </div>
                  <div className="list-item-value negative">-{formatCurrency(rule.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rules */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Reglas Activas</span>
            <button
              onClick={() => { resetForm(); setEditingRule(null); setShowForm(true); }}
              style={{ color: 'var(--primary)', fontWeight: '600' }}
            >
              + Nueva
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔄</div>
              <div className="empty-state-title">Sin gastos recurrentes</div>
              <p>Anade suscripciones como Netflix, Spotify, alquiler...</p>
            </div>
          ) : (
            <div className="list" style={{ background: 'transparent', margin: '0 -16px' }}>
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className="list-item"
                  style={{ paddingLeft: 0, paddingRight: 0, cursor: 'pointer' }}
                  onClick={() => handleEdit(rule)}
                >
                  <div className="list-item-icon" style={{ background: rule.category_color || '#ccc' }}>
                    {rule.category_icon || '📦'}
                  </div>
                  <div className="list-item-content">
                    <div className="list-item-title">{rule.name}</div>
                    <div className="list-item-subtitle">
                      {getFrequencyLabel(rule)} • {rule.account_name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="list-item-value negative">-{formatCurrency(rule.amount)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Prox: {rule.next_run_at}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomSheet
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingRule(null); }}
        title={editingRule ? 'Editar Regla' : 'Nueva Regla Recurrente'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="form-input"
              placeholder="Netflix, Spotify, Alquiler..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Monto</label>
            <input
              type="number"
              className="form-input"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Categoria</label>
            <select
              className="form-input"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              required
            >
              <option value="">Seleccionar...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Cuenta</label>
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
            <label className="form-label">Frecuencia</label>
            <select
              className="form-input"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            >
              {FREQUENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {form.frequency === 'weekly' && (
            <div className="form-group">
              <label className="form-label">Dia de la semana</label>
              <select
                className="form-input"
                value={form.day_of_week}
                onChange={(e) => setForm({ ...form, day_of_week: parseInt(e.target.value) })}
              >
                {DAYS_OF_WEEK.map((day, i) => (
                  <option key={i} value={i}>{day}</option>
                ))}
              </select>
            </div>
          )}

          {form.frequency === 'monthly' && (
            <div className="form-group">
              <label className="form-label">Dia del mes</label>
              <select
                className="form-input"
                value={form.day_of_month}
                onChange={(e) => setForm({ ...form, day_of_month: parseInt(e.target.value) })}
              >
                {[...Array(31)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Fecha inicio</label>
            <input
              type="date"
              className="form-input"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fecha fin (opcional)</label>
            <input
              type="date"
              className="form-input"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nota (opcional)</label>
            <input
              type="text"
              className="form-input"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            {editingRule && (
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--danger)', color: '#fff' }}
                onClick={() => handleDelete(editingRule.id)}
              >
                Eliminar
              </button>
            )}
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {editingRule ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </BottomSheet>
    </>
  );
}

import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function ExpenseForm({ expense, onSave, onClose, defaultAccountId }) {
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    date: expense?.date || today,
    amount_original: expense?.amount_original || '',
    currency_original: expense?.currency_original || 'EUR',
    category_id: expense?.category_id || '',
    account_id: expense?.account_id || defaultAccountId || '',
    note: expense?.note || '',
    tag_ids: expense?.tags?.map(t => t.id) || []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [catRes, accRes, tagRes] = await Promise.all([
        api.get('/categories'),
        api.get('/accounts'),
        api.get('/tags')
      ]);
      setCategories(catRes.categories);
      setAccounts(accRes.accounts);
      setTags(tagRes.tags);

      if (!expense && catRes.categories.length > 0 && !form.category_id) {
        setForm(f => ({ ...f, category_id: catRes.categories[0].id }));
      }
      if (!expense && accRes.accounts.length > 0 && !form.account_id && !defaultAccountId) {
        setForm(f => ({ ...f, account_id: accRes.accounts[0].id }));
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        ...form,
        amount_original: parseFloat(form.amount_original),
        amount_base: parseFloat(form.amount_original),
        exchange_rate: 1
      };

      if (expense) {
        await api.put(`/expenses/${expense.id}`, data);
      } else {
        await api.post('/expenses', data);
      }

      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId) => {
    setForm(f => ({
      ...f,
      tag_ids: f.tag_ids.includes(tagId)
        ? f.tag_ids.filter(id => id !== tagId)
        : [...f.tag_ids, tagId]
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: '16px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Importe</label>
        <input
          type="number"
          step="0.01"
          className="form-input form-input-lg"
          placeholder="0.00"
          value={form.amount_original}
          onChange={(e) => setForm(f => ({ ...f, amount_original: e.target.value }))}
          required
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="form-label">Fecha</label>
        <input
          type="date"
          className="form-input"
          value={form.date}
          onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Categoria</label>
        <select
          className="form-input"
          value={form.category_id}
          onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
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
          onChange={(e) => setForm(f => ({ ...f, account_id: e.target.value }))}
          required
        >
          <option value="">Seleccionar...</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Nota</label>
        <input
          type="text"
          className="form-input"
          placeholder="Descripcion opcional..."
          value={form.note}
          onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Tags</label>
        <div className="chips">
          {tags.map(tag => (
            <button
              key={tag.id}
              type="button"
              className={`chip ${form.tag_ids.includes(tag.id) ? 'active' : ''}`}
              onClick={() => toggleTag(tag.id)}
            >
              <span className="chip-color" style={{ background: tag.color }}></span>
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
          {loading ? 'Guardando...' : (expense ? 'Actualizar' : 'Guardar')}
        </button>
      </div>
    </form>
  );
}

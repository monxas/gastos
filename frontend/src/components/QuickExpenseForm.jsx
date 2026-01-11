import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '../context/ThemeContext';

const NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

export default function QuickExpenseForm({ onSave, onClose, defaultAccountId }) {
  const { isDark } = useTheme();
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [tags, setTags] = useState([]);
  const [recentCategories, setRecentCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [step, setStep] = useState('amount'); // amount, category, account, confirm
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const yesterday = subDays(new Date(), 1).toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [catRes, accRes, tagRes, expRes] = await Promise.all([
        api.get('/categories'),
        api.get('/accounts'),
        api.get('/tags'),
        api.get('/expenses?limit=20')
      ]);
      setCategories(catRes.categories);
      setAccounts(accRes.accounts);
      setTags(tagRes.tags);

      // Extract recent categories from recent expenses
      const recentCatIds = new Set();
      const recent = [];
      for (const exp of expRes.expenses) {
        if (!recentCatIds.has(exp.category_id) && recent.length < 6) {
          recentCatIds.add(exp.category_id);
          recent.push({
            id: exp.category_id,
            name: exp.category_name,
            icon: exp.category_icon,
            color: exp.category_color
          });
        }
      }
      setRecentCategories(recent);

      // Set default account - priority: prop > localStorage > first account
      const lastAccountId = localStorage.getItem('lastAccountId');
      if (defaultAccountId) {
        const acc = accRes.accounts.find(a => a.id === defaultAccountId);
        if (acc) setSelectedAccount(acc);
      } else if (lastAccountId) {
        const acc = accRes.accounts.find(a => a.id === lastAccountId);
        if (acc) setSelectedAccount(acc);
        else if (accRes.accounts.length > 0) setSelectedAccount(accRes.accounts[0]);
      } else if (accRes.accounts.length > 0) {
        setSelectedAccount(accRes.accounts[0]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const hapticFeedback = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleNumpad = (key) => {
    hapticFeedback();
    if (key === 'del') {
      setAmount(a => a.slice(0, -1));
    } else if (key === '.') {
      if (!amount.includes('.')) {
        setAmount(a => a + key);
      }
    } else {
      // Limit decimals to 2
      const parts = amount.split('.');
      if (parts[1]?.length >= 2) return;
      setAmount(a => a + key);
    }
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setStep('confirm');
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.some(t => t.id === tag.id)
        ? prev.filter(t => t.id !== tag.id)
        : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!amount || !selectedCategory || !selectedAccount) {
      setError('Completa todos los campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/expenses', {
        date: selectedDate,
        amount_original: parseFloat(amount),
        currency_original: 'EUR',
        amount_base: parseFloat(amount),
        exchange_rate: 1,
        category_id: selectedCategory.id,
        account_id: selectedAccount.id,
        note: note || null,
        tag_ids: selectedTags.map(t => t.id)
      });
      // Remember the last used account for next time
      localStorage.setItem('lastAccountId', selectedAccount.id);
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (val) => {
    if (!val) return '0';
    const num = parseFloat(val);
    if (isNaN(num)) return '0';
    return num.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const getDateLabel = (date) => {
    if (date === today) return 'Hoy';
    if (date === yesterday) return 'Ayer';
    return format(new Date(date), 'd MMM', { locale: es });
  };

  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '8px', marginBottom: '8px' }}>
          {error}
        </div>
      )}

      {/* Amount Display */}
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{ fontSize: '48px', fontWeight: '700', letterSpacing: '-2px' }}>
          {formatAmount(amount)} <span style={{ fontSize: '24px', opacity: 0.5 }}>EUR</span>
        </div>
        {selectedCategory && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
            <span style={{
              background: selectedCategory.color || '#ccc',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>{selectedCategory.icon || '📦'}</span>
              {selectedCategory.name}
            </span>
            <button
              onClick={() => { setSelectedCategory(null); setStep('amount'); }}
              style={{ fontSize: '12px', color: 'var(--text-secondary)' }}
            >
              Cambiar
            </button>
          </div>
        )}
        {selectedAccount && (
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            {selectedAccount.name}
            <button
              onClick={() => setStep('account')}
              style={{ marginLeft: '8px', fontSize: '12px', textDecoration: 'underline' }}
            >
              Cambiar
            </button>
          </div>
        )}
      </div>

      {/* Step Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {step === 'amount' && (
          <>
            {/* Recent Categories */}
            {recentCategories.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Categorias recientes
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {recentCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat)}
                      disabled={!amount}
                      style={{
                        padding: '12px 8px',
                        background: 'var(--surface)',
                        borderRadius: 'var(--radius)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: amount ? 1 : 0.4,
                        transition: 'var(--transition)'
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>{cat.icon || '📦'}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All Categories Button */}
            <button
              onClick={() => setStep('category')}
              disabled={!amount}
              style={{
                padding: '12px',
                background: 'var(--surface)',
                borderRadius: 'var(--radius)',
                fontSize: '14px',
                marginBottom: '16px',
                opacity: amount ? 1 : 0.4
              }}
            >
              Ver todas las categorias
            </button>

            {/* Numpad */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginTop: 'auto'
            }}>
              {NUMPAD.map(key => (
                <button
                  key={key}
                  onClick={() => handleNumpad(key)}
                  style={{
                    padding: '20px',
                    fontSize: key === 'del' ? '16px' : '24px',
                    fontWeight: '500',
                    background: key === 'del' ? 'var(--surface)' : 'transparent',
                    borderRadius: 'var(--radius)',
                    transition: 'var(--transition)',
                    color: 'var(--text)'
                  }}
                >
                  {key === 'del' ? '⌫' : key}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'category' && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Selecciona categoria
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat)}
                  style={{
                    padding: '16px 8px',
                    background: selectedCategory?.id === cat.id ? cat.color || 'var(--primary)' : 'var(--surface)',
                    color: selectedCategory?.id === cat.id ? '#fff' : 'inherit',
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'var(--transition)'
                  }}
                >
                  <span style={{ fontSize: '28px' }}>{cat.icon || '📦'}</span>
                  <span style={{ fontSize: '12px' }}>{cat.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('amount')}
              style={{ width: '100%', padding: '12px', marginTop: '16px', color: 'var(--text-secondary)' }}
            >
              Volver
            </button>
          </div>
        )}

        {step === 'account' && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Selecciona cuenta
            </div>
            <div className="list">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => { setSelectedAccount(acc); setStep(selectedCategory ? 'confirm' : 'amount'); }}
                  className="list-item"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: selectedAccount?.id === acc.id ? 'var(--border)' : 'transparent'
                  }}
                >
                  <div className="list-item-icon" style={{ background: 'var(--surface)' }}>
                    {acc.type === 'credit_card' ? '💳' : acc.type === 'cash' ? '💵' : '🏦'}
                  </div>
                  <div className="list-item-content">
                    <div className="list-item-title">{acc.name}</div>
                  </div>
                  {selectedAccount?.id === acc.id && <span>✓</span>}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(selectedCategory ? 'confirm' : 'amount')}
              style={{ width: '100%', padding: '12px', marginTop: '16px', color: 'var(--text-secondary)' }}
            >
              Volver
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Date Selection */}
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDate(today)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 'var(--radius)',
                    background: selectedDate === today ? 'var(--primary)' : 'var(--surface)',
                    color: selectedDate === today ? (isDark ? '#000' : '#fff') : 'var(--text)',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(yesterday)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 'var(--radius)',
                    background: selectedDate === yesterday ? 'var(--primary)' : 'var(--surface)',
                    color: selectedDate === yesterday ? (isDark ? '#000' : '#fff') : 'var(--text)',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  Ayer
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 'var(--radius)',
                    border: selectedDate !== today && selectedDate !== yesterday ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Note */}
            <div className="form-group">
              <label className="form-label">Nota (opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Descripcion..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="form-group">
                <label className="form-label">Tags (opcional)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {tags.map(tag => {
                    const isSelected = selectedTags.some(t => t.id === tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          background: isSelected ? 'var(--primary)' : 'var(--surface)',
                          color: isSelected ? (isDark ? '#000' : '#fff') : 'var(--text)',
                          fontSize: '13px',
                          fontWeight: '500',
                          transition: 'var(--transition)'
                        }}
                      >
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: isSelected ? (isDark ? '#000' : '#fff') : tag.color
                        }} />
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Tags Display */}
            {selectedTags.length > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} seleccionado{selectedTags.length > 1 ? 's' : ''}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setStep('amount')}
              >
                Editar
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dolar estadounidense' },
  { code: 'GBP', symbol: '£', name: 'Libra esterlina' },
  { code: 'MXN', symbol: '$', name: 'Peso mexicano' },
  { code: 'ARS', symbol: '$', name: 'Peso argentino' },
  { code: 'COP', symbol: '$', name: 'Peso colombiano' },
  { code: 'CLP', symbol: '$', name: 'Peso chileno' },
  { code: 'PEN', symbol: 'S/', name: 'Sol peruano' },
  { code: 'BRL', symbol: 'R$', name: 'Real brasileno' },
];

const DEFAULT_CATEGORIES = [
  { name: 'Comida', icon: '🍔', color: '#FF6B6B' },
  { name: 'Transporte', icon: '🚗', color: '#4ECDC4' },
  { name: 'Compras', icon: '🛍️', color: '#45B7D1' },
  { name: 'Entretenimiento', icon: '🎬', color: '#96CEB4' },
  { name: 'Salud', icon: '💊', color: '#FFEAA7' },
  { name: 'Hogar', icon: '🏠', color: '#DDA0DD' },
  { name: 'Servicios', icon: '💡', color: '#98D8C8' },
  { name: 'Otros', icon: '📦', color: '#B8B8B8' },
];

const INCOME_SOURCES = [
  { value: 'salary', label: 'Salario', icon: '💼' },
  { value: 'freelance', label: 'Freelance', icon: '💻' },
  { value: 'investment', label: 'Inversiones', icon: '📈' },
  { value: 'rental', label: 'Alquiler', icon: '🏠' },
  { value: 'other', label: 'Otros', icon: '💰' },
];

const EXPENSE_FREQUENCIES = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' },
];

export default function SetupWizard() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step data
  const [currency, setCurrency] = useState('EUR');
  const [accounts, setAccounts] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES.map(c => ({ ...c, enabled: true })));
  const [newCategories, setNewCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);

  // Form states
  const [newAccount, setNewAccount] = useState({ name: '', type: 'bank', initial_balance: '' });
  const [newCard, setNewCard] = useState({
    name: '',
    billing_account: '',
    close_day: 15,
    payment_day: 1,
    credit_limit: ''
  });
  const [newCategory, setNewCategory] = useState({ name: '', icon: '', color: '#666666' });
  const [newTag, setNewTag] = useState({ name: '', color: '#666666' });
  const [newIncome, setNewIncome] = useState({
    source: 'salary',
    amount: '',
    account_id: '',
    is_recurring: true,
    day_of_month: 1
  });
  const [newRecurring, setNewRecurring] = useState({
    name: '',
    amount: '',
    category_id: '',
    account_id: '',
    frequency: 'monthly',
    day_of_month: 1
  });

  // Created items from API
  const [createdAccounts, setCreatedAccounts] = useState([]);
  const [createdCategories, setCreatedCategories] = useState([]);

  const steps = [
    { title: 'Bienvenida', icon: '👋' },
    { title: 'Moneda', icon: '💱' },
    { title: 'Cuentas', icon: '🏦' },
    { title: 'Tarjetas', icon: '💳' },
    { title: 'Categorias', icon: '📂' },
    { title: 'Tags', icon: '🏷️' },
    { title: 'Ingresos', icon: '💰' },
    { title: 'Gastos fijos', icon: '🔄' },
    { title: 'Listo!', icon: '🎉' },
  ];

  const nextStep = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const addAccount = () => {
    if (!newAccount.name) return;
    setAccounts([...accounts, {
      ...newAccount,
      initial_balance: parseFloat(newAccount.initial_balance) || 0,
      id: Date.now()
    }]);
    setNewAccount({ name: '', type: 'bank', initial_balance: '' });
  };

  const removeAccount = (id) => {
    setAccounts(accounts.filter(a => a.id !== id));
  };

  const addCreditCard = () => {
    if (!newCard.name) return;
    setCreditCards([...creditCards, {
      ...newCard,
      credit_limit: parseFloat(newCard.credit_limit) || 0,
      id: Date.now()
    }]);
    setNewCard({ name: '', billing_account: '', close_day: 15, payment_day: 1, credit_limit: '' });
  };

  const removeCreditCard = (id) => {
    setCreditCards(creditCards.filter(c => c.id !== id));
  };

  const toggleCategory = (index) => {
    const updated = [...categories];
    updated[index].enabled = !updated[index].enabled;
    setCategories(updated);
  };

  const addCustomCategory = () => {
    if (!newCategory.name) return;
    setNewCategories([...newCategories, { ...newCategory, id: Date.now() }]);
    setNewCategory({ name: '', icon: '', color: '#666666' });
  };

  const removeCustomCategory = (id) => {
    setNewCategories(newCategories.filter(c => c.id !== id));
  };

  const addTag = () => {
    if (!newTag.name) return;
    setTags([...tags, { ...newTag, id: Date.now() }]);
    setNewTag({ name: '', color: '#666666' });
  };

  const removeTag = (id) => {
    setTags(tags.filter(t => t.id !== id));
  };

  const addIncome = () => {
    if (!newIncome.amount || !newIncome.account_id) return;
    setIncomes([...incomes, { ...newIncome, id: Date.now() }]);
    setNewIncome({ source: 'salary', amount: '', account_id: '', is_recurring: true, day_of_month: 1 });
  };

  const removeIncome = (id) => {
    setIncomes(incomes.filter(i => i.id !== id));
  };

  const addRecurringExpense = () => {
    if (!newRecurring.name || !newRecurring.amount) return;
    setRecurringExpenses([...recurringExpenses, { ...newRecurring, id: Date.now() }]);
    setNewRecurring({ name: '', amount: '', category_id: '', account_id: '', frequency: 'monthly', day_of_month: 1 });
  };

  const removeRecurringExpense = (id) => {
    setRecurringExpenses(recurringExpenses.filter(r => r.id !== id));
  };

  const finishSetup = async () => {
    setLoading(true);
    try {
      // 1. Update currency
      await api.put('/settings', { base_currency: currency });

      // 2. Create accounts
      const accountMap = {};
      for (const acc of accounts) {
        const res = await api.post('/accounts', {
          name: acc.name,
          type: acc.type,
          currency: currency,
          initial_balance: acc.initial_balance
        });
        accountMap[acc.id] = res.account.id;
      }
      setCreatedAccounts(Object.values(accountMap));

      // 3. Create credit cards
      for (const card of creditCards) {
        await api.post('/accounts', {
          name: card.name,
          type: 'credit_card',
          currency: currency,
          card_billing_account_id: accountMap[card.billing_account] || null,
          card_close_day: card.close_day,
          card_payment_day: card.payment_day,
          credit_limit: card.credit_limit
        });
      }

      // 4. Create categories
      const categoryMap = {};
      const enabledCategories = categories.filter(c => c.enabled);
      for (const cat of [...enabledCategories, ...newCategories]) {
        const res = await api.post('/categories', {
          name: cat.name,
          icon: cat.icon,
          color: cat.color
        });
        categoryMap[cat.name] = res.category.id;
        if (cat.id) categoryMap[cat.id] = res.category.id;
      }
      setCreatedCategories(Object.values(categoryMap));

      // 5. Create tags
      for (const tag of tags) {
        await api.post('/tags', {
          name: tag.name,
          color: tag.color
        });
      }

      // 6. Create recurring incomes (as regular incomes for now, and recurrent rules later)
      for (const income of incomes) {
        const realAccountId = accountMap[income.account_id];
        if (!realAccountId) continue;

        // Create initial income entry
        await api.post('/incomes', {
          date: new Date().toISOString().split('T')[0],
          amount: parseFloat(income.amount),
          currency: currency,
          account_id: realAccountId,
          source: income.source,
          note: income.is_recurring ? `Ingreso recurrente - dia ${income.day_of_month}` : '',
          is_recurring: income.is_recurring ? 1 : 0
        });
      }

      // 7. Create recurring expenses
      for (const expense of recurringExpenses) {
        const realAccountId = accountMap[expense.account_id] || Object.values(accountMap)[0];
        const realCategoryId = categoryMap[expense.category_id] || Object.values(categoryMap)[0];

        if (!realAccountId || !realCategoryId) continue;

        // Calculate frequency data
        let frequencyData;
        if (expense.frequency === 'monthly') {
          frequencyData = JSON.stringify({ type: 'monthly', day: expense.day_of_month });
        } else if (expense.frequency === 'weekly') {
          frequencyData = JSON.stringify({ type: 'weekly', weekday: 1 });
        } else {
          frequencyData = JSON.stringify({ type: 'yearly', month: 1, day: expense.day_of_month });
        }

        await api.post('/recurring', {
          name: expense.name,
          amount: parseFloat(expense.amount),
          currency: currency,
          category_id: realCategoryId,
          account_id: realAccountId,
          pattern_type: 'simple',
          frequency_data: frequencyData,
          start_date: new Date().toISOString().split('T')[0]
        });
      }

      // 8. Mark setup as completed
      await api.put('/settings', { setup_completed: true });

      nextStep();
    } catch (err) {
      console.error('Error completing setup:', err);
      alert('Error al completar la configuracion: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToApp = () => {
    navigate('/');
  };

  const skipSetup = async () => {
    try {
      await api.put('/settings', { setup_completed: true });
      navigate('/');
    } catch (err) {
      console.error('Error skipping setup:', err);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="wizard-content">
            <div className="wizard-hero">
              <span style={{ fontSize: 80 }}>👋</span>
              <h2>Bienvenido a Gastos</h2>
              <p>Vamos a configurar tu cuenta en unos pocos pasos. Podras modificar todo esto despues en Ajustes.</p>
            </div>
            <div className="wizard-theme-toggle">
              <span>Tema</span>
              <button
                className={`toggle ${isDark ? 'active' : ''}`}
                onClick={toggleTheme}
              />
              <span>{isDark ? 'Oscuro' : 'Claro'}</span>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="wizard-content">
            <h2>Elige tu moneda</h2>
            <p>Esta sera tu moneda principal para registrar gastos e ingresos.</p>
            <div className="wizard-currency-grid">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  className={`wizard-currency-btn ${currency === c.code ? 'selected' : ''}`}
                  onClick={() => setCurrency(c.code)}
                >
                  <span className="currency-symbol">{c.symbol}</span>
                  <span className="currency-code">{c.code}</span>
                  <span className="currency-name">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="wizard-content">
            <h2>Tus cuentas</h2>
            <p>Agrega tus cuentas bancarias, efectivo o tarjetas de debito con su saldo actual.</p>

            {accounts.length > 0 && (
              <div className="wizard-list">
                {accounts.map(acc => (
                  <div key={acc.id} className="wizard-list-item">
                    <div className="wizard-list-icon">
                      {acc.type === 'bank' ? '🏦' : acc.type === 'cash' ? '💵' : '💳'}
                    </div>
                    <div className="wizard-list-content">
                      <div className="wizard-list-title">{acc.name}</div>
                      <div className="wizard-list-subtitle">
                        {acc.type === 'bank' ? 'Banco' : acc.type === 'cash' ? 'Efectivo' : 'Tarjeta debito'}
                      </div>
                    </div>
                    <div className="wizard-list-value">
                      {acc.initial_balance.toLocaleString('es-ES', { style: 'currency', currency })}
                    </div>
                    <button className="wizard-remove-btn" onClick={() => removeAccount(acc.id)}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="wizard-form">
              <div className="wizard-form-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre (ej: Banco Santander)"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount(a => ({ ...a, name: e.target.value }))}
                />
              </div>
              <div className="wizard-form-row two-col">
                <select
                  className="form-input"
                  value={newAccount.type}
                  onChange={(e) => setNewAccount(a => ({ ...a, type: e.target.value }))}
                >
                  <option value="bank">Banco</option>
                  <option value="cash">Efectivo</option>
                  <option value="debit_card">Tarjeta debito</option>
                </select>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Saldo actual"
                  value={newAccount.initial_balance}
                  onChange={(e) => setNewAccount(a => ({ ...a, initial_balance: e.target.value }))}
                />
              </div>
              <button className="btn btn-secondary btn-block" onClick={addAccount}>
                + Agregar cuenta
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="wizard-content">
            <h2>Tarjetas de credito</h2>
            <p>Configura tus tarjetas de credito con sus fechas de corte y pago.</p>

            {creditCards.length > 0 && (
              <div className="wizard-list">
                {creditCards.map(card => (
                  <div key={card.id} className="wizard-list-item">
                    <div className="wizard-list-icon">💳</div>
                    <div className="wizard-list-content">
                      <div className="wizard-list-title">{card.name}</div>
                      <div className="wizard-list-subtitle">
                        Corte: dia {card.close_day} · Pago: dia {card.payment_day}
                      </div>
                    </div>
                    {card.credit_limit > 0 && (
                      <div className="wizard-list-value">
                        Limite: {card.credit_limit.toLocaleString('es-ES', { style: 'currency', currency })}
                      </div>
                    )}
                    <button className="wizard-remove-btn" onClick={() => removeCreditCard(card.id)}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="wizard-form">
              <div className="wizard-form-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre de la tarjeta"
                  value={newCard.name}
                  onChange={(e) => setNewCard(c => ({ ...c, name: e.target.value }))}
                />
              </div>
              <div className="wizard-form-row two-col">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Dia de corte</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    max="31"
                    value={newCard.close_day}
                    onChange={(e) => setNewCard(c => ({ ...c, close_day: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Dia de pago</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    max="31"
                    value={newCard.payment_day}
                    onChange={(e) => setNewCard(c => ({ ...c, payment_day: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
              <div className="wizard-form-row two-col">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Cuenta de cargo</label>
                  <select
                    className="form-input"
                    value={newCard.billing_account}
                    onChange={(e) => setNewCard(c => ({ ...c, billing_account: e.target.value }))}
                  >
                    <option value="">Ninguna</option>
                    {accounts.filter(a => a.type === 'bank').map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Limite (opcional)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={newCard.credit_limit}
                    onChange={(e) => setNewCard(c => ({ ...c, credit_limit: e.target.value }))}
                  />
                </div>
              </div>
              <button className="btn btn-secondary btn-block" onClick={addCreditCard}>
                + Agregar tarjeta
              </button>
            </div>

            {accounts.length === 0 && (
              <div className="wizard-hint">
                <span>💡</span> Agrega al menos una cuenta bancaria primero para poder asociar la tarjeta.
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="wizard-content">
            <h2>Categorias</h2>
            <p>Selecciona las categorias que usaras para clasificar tus gastos.</p>

            <div className="wizard-categories-grid">
              {categories.map((cat, idx) => (
                <button
                  key={idx}
                  className={`wizard-category-btn ${cat.enabled ? 'selected' : ''}`}
                  onClick={() => toggleCategory(idx)}
                  style={{ '--cat-color': cat.color }}
                >
                  <span className="cat-icon">{cat.icon}</span>
                  <span className="cat-name">{cat.name}</span>
                  {cat.enabled && <span className="cat-check">✓</span>}
                </button>
              ))}
            </div>

            {newCategories.length > 0 && (
              <>
                <h3 style={{ marginTop: 24 }}>Categorias personalizadas</h3>
                <div className="wizard-categories-grid">
                  {newCategories.map(cat => (
                    <div key={cat.id} className="wizard-category-btn selected custom" style={{ '--cat-color': cat.color }}>
                      <span className="cat-icon">{cat.icon || '📦'}</span>
                      <span className="cat-name">{cat.name}</span>
                      <button className="cat-remove" onClick={() => removeCustomCategory(cat.id)}>×</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="wizard-form" style={{ marginTop: 24 }}>
              <div className="wizard-form-row three-col">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Icono"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory(c => ({ ...c, icon: e.target.value }))}
                  style={{ width: 60, textAlign: 'center' }}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(c => ({ ...c, name: e.target.value }))}
                />
                <input
                  type="color"
                  className="form-input"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory(c => ({ ...c, color: e.target.value }))}
                  style={{ width: 50, padding: 4 }}
                />
              </div>
              <button className="btn btn-secondary btn-block" onClick={addCustomCategory}>
                + Agregar categoria
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="wizard-content">
            <h2>Tags</h2>
            <p>Los tags te permiten filtrar gastos de forma transversal. Por ejemplo: "vacaciones", "trabajo", "regalo".</p>

            {tags.length > 0 && (
              <div className="wizard-tags-list">
                {tags.map(tag => (
                  <div key={tag.id} className="wizard-tag" style={{ '--tag-color': tag.color }}>
                    <span className="tag-dot" style={{ background: tag.color }}></span>
                    <span>{tag.name}</span>
                    <button className="tag-remove" onClick={() => removeTag(tag.id)}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="wizard-form" style={{ marginTop: 24 }}>
              <div className="wizard-form-row two-col">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre del tag"
                  value={newTag.name}
                  onChange={(e) => setNewTag(t => ({ ...t, name: e.target.value }))}
                />
                <input
                  type="color"
                  className="form-input"
                  value={newTag.color}
                  onChange={(e) => setNewTag(t => ({ ...t, color: e.target.value }))}
                  style={{ width: 60, padding: 4 }}
                />
              </div>
              <button className="btn btn-secondary btn-block" onClick={addTag}>
                + Agregar tag
              </button>
            </div>

            <div className="wizard-hint">
              <span>💡</span> Puedes saltar este paso y agregar tags despues.
            </div>
          </div>
        );

      case 6:
        return (
          <div className="wizard-content">
            <h2>Ingresos</h2>
            <p>Configura tus fuentes de ingreso. Puedes marcarlos como recurrentes si son mensuales.</p>

            {incomes.length > 0 && (
              <div className="wizard-list">
                {incomes.map(income => {
                  const source = INCOME_SOURCES.find(s => s.value === income.source);
                  const account = accounts.find(a => a.id === parseInt(income.account_id));
                  return (
                    <div key={income.id} className="wizard-list-item">
                      <div className="wizard-list-icon">{source?.icon || '💰'}</div>
                      <div className="wizard-list-content">
                        <div className="wizard-list-title">{source?.label || income.source}</div>
                        <div className="wizard-list-subtitle">
                          {account?.name || 'Cuenta'} {income.is_recurring && `· Dia ${income.day_of_month}`}
                        </div>
                      </div>
                      <div className="wizard-list-value">
                        {parseFloat(income.amount).toLocaleString('es-ES', { style: 'currency', currency })}
                        {income.is_recurring && <span className="recurring-badge">🔄</span>}
                      </div>
                      <button className="wizard-remove-btn" onClick={() => removeIncome(income.id)}>×</button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="wizard-form">
              <div className="wizard-form-row two-col">
                <select
                  className="form-input"
                  value={newIncome.source}
                  onChange={(e) => setNewIncome(i => ({ ...i, source: e.target.value }))}
                >
                  {INCOME_SOURCES.map(s => (
                    <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Monto mensual"
                  value={newIncome.amount}
                  onChange={(e) => setNewIncome(i => ({ ...i, amount: e.target.value }))}
                />
              </div>
              <div className="wizard-form-row two-col">
                <select
                  className="form-input"
                  value={newIncome.account_id}
                  onChange={(e) => setNewIncome(i => ({ ...i, account_id: e.target.value }))}
                >
                  <option value="">Seleccionar cuenta</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Dia del mes</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    max="31"
                    value={newIncome.day_of_month}
                    onChange={(e) => setNewIncome(i => ({ ...i, day_of_month: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
              <label className="wizard-checkbox">
                <input
                  type="checkbox"
                  checked={newIncome.is_recurring}
                  onChange={(e) => setNewIncome(i => ({ ...i, is_recurring: e.target.checked }))}
                />
                <span>Ingreso recurrente mensual</span>
              </label>
              <button className="btn btn-secondary btn-block" onClick={addIncome}>
                + Agregar ingreso
              </button>
            </div>

            {accounts.length === 0 && (
              <div className="wizard-hint warning">
                <span>⚠️</span> Necesitas agregar al menos una cuenta primero.
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div className="wizard-content">
            <h2>Gastos recurrentes</h2>
            <p>Configura tus gastos fijos mensuales: alquiler, suscripciones, servicios, etc.</p>

            {recurringExpenses.length > 0 && (
              <div className="wizard-list">
                {recurringExpenses.map(expense => {
                  const freq = EXPENSE_FREQUENCIES.find(f => f.value === expense.frequency);
                  return (
                    <div key={expense.id} className="wizard-list-item">
                      <div className="wizard-list-icon">🔄</div>
                      <div className="wizard-list-content">
                        <div className="wizard-list-title">{expense.name}</div>
                        <div className="wizard-list-subtitle">
                          {freq?.label} · Dia {expense.day_of_month}
                        </div>
                      </div>
                      <div className="wizard-list-value">
                        {parseFloat(expense.amount).toLocaleString('es-ES', { style: 'currency', currency })}
                      </div>
                      <button className="wizard-remove-btn" onClick={() => removeRecurringExpense(expense.id)}>×</button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="wizard-form">
              <div className="wizard-form-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre (ej: Netflix, Alquiler)"
                  value={newRecurring.name}
                  onChange={(e) => setNewRecurring(r => ({ ...r, name: e.target.value }))}
                />
              </div>
              <div className="wizard-form-row two-col">
                <input
                  type="number"
                  className="form-input"
                  placeholder="Monto"
                  value={newRecurring.amount}
                  onChange={(e) => setNewRecurring(r => ({ ...r, amount: e.target.value }))}
                />
                <select
                  className="form-input"
                  value={newRecurring.frequency}
                  onChange={(e) => setNewRecurring(r => ({ ...r, frequency: e.target.value }))}
                >
                  {EXPENSE_FREQUENCIES.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div className="wizard-form-row two-col">
                <select
                  className="form-input"
                  value={newRecurring.category_id}
                  onChange={(e) => setNewRecurring(r => ({ ...r, category_id: e.target.value }))}
                >
                  <option value="">Categoria</option>
                  {categories.filter(c => c.enabled).map((cat, idx) => (
                    <option key={idx} value={cat.name}>{cat.icon} {cat.name}</option>
                  ))}
                  {newCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Dia del mes</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    max="31"
                    value={newRecurring.day_of_month}
                    onChange={(e) => setNewRecurring(r => ({ ...r, day_of_month: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
              <select
                className="form-input"
                value={newRecurring.account_id}
                onChange={(e) => setNewRecurring(r => ({ ...r, account_id: e.target.value }))}
                style={{ marginBottom: 12 }}
              >
                <option value="">Cuenta de cargo</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
              <button className="btn btn-secondary btn-block" onClick={addRecurringExpense}>
                + Agregar gasto recurrente
              </button>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="wizard-content">
            <div className="wizard-hero">
              <span style={{ fontSize: 80 }}>🎉</span>
              <h2>Todo listo!</h2>
              <p>Tu cuenta ha sido configurada. Ya puedes empezar a registrar tus gastos.</p>
            </div>

            <div className="wizard-summary">
              <div className="summary-item">
                <span className="summary-icon">💱</span>
                <span className="summary-label">Moneda</span>
                <span className="summary-value">{currency}</span>
              </div>
              {accounts.length > 0 && (
                <div className="summary-item">
                  <span className="summary-icon">🏦</span>
                  <span className="summary-label">Cuentas</span>
                  <span className="summary-value">{accounts.length}</span>
                </div>
              )}
              {creditCards.length > 0 && (
                <div className="summary-item">
                  <span className="summary-icon">💳</span>
                  <span className="summary-label">Tarjetas</span>
                  <span className="summary-value">{creditCards.length}</span>
                </div>
              )}
              <div className="summary-item">
                <span className="summary-icon">📂</span>
                <span className="summary-label">Categorias</span>
                <span className="summary-value">{categories.filter(c => c.enabled).length + newCategories.length}</span>
              </div>
              {tags.length > 0 && (
                <div className="summary-item">
                  <span className="summary-icon">🏷️</span>
                  <span className="summary-label">Tags</span>
                  <span className="summary-value">{tags.length}</span>
                </div>
              )}
              {incomes.length > 0 && (
                <div className="summary-item">
                  <span className="summary-icon">💰</span>
                  <span className="summary-label">Ingresos</span>
                  <span className="summary-value">{incomes.length}</span>
                </div>
              )}
              {recurringExpenses.length > 0 && (
                <div className="summary-item">
                  <span className="summary-icon">🔄</span>
                  <span className="summary-label">Gastos fijos</span>
                  <span className="summary-value">{recurringExpenses.length}</span>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="wizard-container">
      <div className="wizard-header">
        <div className="wizard-progress">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className={`wizard-progress-step ${idx < step ? 'completed' : ''} ${idx === step ? 'active' : ''}`}
            >
              <div className="wizard-progress-dot">
                {idx < step ? '✓' : s.icon}
              </div>
              {idx < steps.length - 1 && <div className="wizard-progress-line" />}
            </div>
          ))}
        </div>
        <div className="wizard-step-title">
          <span className="step-number">Paso {step + 1} de {steps.length}</span>
          <h1>{steps[step].title}</h1>
        </div>
      </div>

      <div className="wizard-body">
        {renderStep()}
      </div>

      <div className="wizard-footer">
        {step === 0 ? (
          <>
            <button className="btn btn-secondary" onClick={skipSetup}>
              Saltar configuracion
            </button>
            <button className="btn btn-primary" onClick={nextStep}>
              Empezar
            </button>
          </>
        ) : step === steps.length - 1 ? (
          <button className="btn btn-primary btn-block" onClick={goToApp}>
            Ir a la aplicacion
          </button>
        ) : step === steps.length - 2 ? (
          <>
            <button className="btn btn-secondary" onClick={prevStep}>
              Atras
            </button>
            <button className="btn btn-primary" onClick={finishSetup} disabled={loading}>
              {loading ? 'Guardando...' : 'Finalizar configuracion'}
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={prevStep}>
              Atras
            </button>
            <button className="btn btn-primary" onClick={nextStep}>
              Continuar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

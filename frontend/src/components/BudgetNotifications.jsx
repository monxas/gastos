import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';
import { useNavigate } from 'react-router-dom';

export default function BudgetNotifications() {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    const saved = localStorage.getItem('dismissedBudgetAlerts');
    return saved ? JSON.parse(saved) : [];
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const { budgets } = await api.get('/budgets');
      const warnings = budgets.filter(b => {
        // Alert if 80%+ spent and not dismissed
        const alertKey = `${b.id}-${new Date().toISOString().slice(0, 7)}`;
        return b.percent >= 80 && !dismissed.includes(alertKey);
      });
      setAlerts(warnings);
    } catch (err) {
      console.error('Error loading budgets:', err);
    }
  };

  const dismiss = (budgetId) => {
    const alertKey = `${budgetId}-${new Date().toISOString().slice(0, 7)}`;
    const newDismissed = [...dismissed, alertKey];
    setDismissed(newDismissed);
    localStorage.setItem('dismissedBudgetAlerts', JSON.stringify(newDismissed));
    setAlerts(alerts.filter(a => a.id !== budgetId));
  };

  const dismissAll = () => {
    const newDismissed = [
      ...dismissed,
      ...alerts.map(a => `${a.id}-${new Date().toISOString().slice(0, 7)}`)
    ];
    setDismissed(newDismissed);
    localStorage.setItem('dismissedBudgetAlerts', JSON.stringify(newDismissed));
    setAlerts([]);
  };

  if (alerts.length === 0) return null;

  return (
    <div className="budget-notifications">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        paddingRight: '4px'
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          ALERTAS DE PRESUPUESTO
        </span>
        {alerts.length > 1 && (
          <button
            onClick={dismissAll}
            style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
          >
            Cerrar todas
          </button>
        )}
      </div>

      {alerts.map(budget => {
        const isExceeded = budget.percent >= 100;
        const categoryName = budget.category_name || 'Total';

        return (
          <div
            key={budget.id}
            className={`budget-alert ${isExceeded ? 'exceeded' : 'warning'}`}
            onClick={() => navigate('/presupuestos')}
          >
            <button
              className="budget-alert-close"
              onClick={(e) => { e.stopPropagation(); dismiss(budget.id); }}
            >
              ×
            </button>

            <div className="budget-alert-header">
              <span className="budget-alert-icon">
                {isExceeded ? '🚨' : '⚠️'}
              </span>
              <span className="budget-alert-title">
                {isExceeded ? 'Presupuesto excedido' : 'Presupuesto bajo'}
              </span>
            </div>

            <div className="budget-alert-category">
              {budget.category_icon && <span>{budget.category_icon}</span>}
              <span>{categoryName}</span>
            </div>

            <div className="budget-alert-progress">
              <div
                className="budget-alert-progress-bar"
                style={{
                  width: `${Math.min(budget.percent, 100)}%`,
                  background: isExceeded
                    ? 'linear-gradient(90deg, #e74c3c, #c0392b)'
                    : 'linear-gradient(90deg, #f39c12, #e67e22)'
                }}
              />
            </div>

            <div className="budget-alert-amounts">
              <span>{formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}</span>
              <span style={{ fontWeight: '600' }}>{budget.percent.toFixed(0)}%</span>
            </div>

            {budget.remaining < 0 && (
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: 'var(--danger)',
                fontWeight: '600'
              }}>
                Te has pasado {formatCurrency(Math.abs(budget.remaining))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

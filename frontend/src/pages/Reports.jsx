import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip } from 'recharts';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, trends

  const year = selectedDate.getFullYear().toString();
  const month = (selectedDate.getMonth() + 1).toString();

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, insightsRes, budgetsRes] = await Promise.all([
        api.get(`/expenses/summary/monthly?year=${year}&month=${month}`),
        api.get('/budgets/insights').catch(() => ({ insights: [], summary: {}, by_category: [] })),
        api.get('/budgets').catch(() => ({ budgets: [] }))
      ]);
      setSummary(summaryRes.summary);
      setInsights(insightsRes);
      setBudgets(budgetsRes.budgets);

      // Load historical data for trends (last 6 months)
      const historical = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const y = date.getFullYear().toString();
        const m = (date.getMonth() + 1).toString();
        try {
          const res = await api.get(`/expenses/summary/monthly?year=${y}&month=${m}`);
          historical.push({
            date: format(date, 'MMM', { locale: es }),
            total: res.summary?.total || 0,
            fullDate: date
          });
        } catch {
          historical.push({ date: format(date, 'MMM', { locale: es }), total: 0, fullDate: date });
        }
      }
      setHistoricalData(historical);
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
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const prevMonth = () => setSelectedDate(subMonths(selectedDate, 1));
  const nextMonth = () => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));

  const monthName = format(selectedDate, 'MMMM yyyy', { locale: es });

  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#85C1E9', '#BB8FCE', '#AEB6BF'];

  // Calculate average for trend line
  const avgTotal = historicalData.length > 0
    ? historicalData.reduce((sum, d) => sum + d.total, 0) / historicalData.length
    : 0;

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Informes</h1>
      </header>

      <main className="page">
        {/* View Toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setView('month')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--radius)',
              background: view === 'month' ? 'var(--primary)' : 'var(--surface)',
              color: view === 'month' ? '#fff' : 'var(--text)',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Mes
          </button>
          <button
            onClick={() => setView('trends')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--radius)',
              background: view === 'trends' ? 'var(--primary)' : 'var(--surface)',
              color: view === 'trends' ? '#fff' : 'var(--text)',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Tendencias
          </button>
        </div>

        {view === 'month' && (
          <>
            {/* Month Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button className="btn btn-secondary btn-sm" onClick={prevMonth}>&lt;</button>
              <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{monthName}</span>
              <button className="btn btn-secondary btn-sm" onClick={nextMonth}>&gt;</button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>Cargando...</div>
            ) : (
              <>
                {/* Summary Card */}
                <div className="summary-card">
                  <div className="summary-label">Total del mes</div>
                  <div className="summary-value">{formatCurrency(summary?.total || 0)}</div>
                  {insights?.summary?.previous_month > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '14px', opacity: 0.8 }}>
                      <span style={{
                        color: insights.summary.change_percent > 0 ? '#ff6b6b' : '#4ecdc4'
                      }}>
                        {insights.summary.change_percent > 0 ? '↑' : '↓'}
                        {Math.abs(insights.summary.change_percent).toFixed(0)}%
                      </span>
                      {' '}vs mes anterior
                    </div>
                  )}
                </div>

                {/* Budget Progress */}
                {budgets.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Presupuestos</span>
                    </div>
                    {budgets.map(budget => (
                      <div key={budget.id} style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{budget.category_icon || '💰'}</span>
                            {budget.category_name || 'Total'}
                          </span>
                          <span style={{ fontSize: '13px' }}>
                            <span style={{ fontWeight: '600' }}>{formatCurrency(budget.spent)}</span>
                            <span style={{ color: 'var(--text-secondary)' }}> / {formatCurrency(budget.amount)}</span>
                          </span>
                        </div>
                        <div style={{
                          height: '8px',
                          background: 'var(--border)',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, budget.percent)}%`,
                            background: budget.status === 'exceeded' ? 'var(--danger)' : budget.status === 'warning' ? 'var(--warning)' : 'var(--success)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {budget.remaining > 0
                            ? `${formatCurrency(budget.remaining)} restante`
                            : `${formatCurrency(Math.abs(budget.remaining))} excedido`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Category Breakdown */}
                {summary?.by_category?.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Por Categoria</span>
                    </div>

                    <div style={{ height: 220, marginBottom: '16px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={summary.by_category}
                            dataKey="total"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={2}
                          >
                            {summary.by_category.map((entry, index) => (
                              <Cell key={entry.id} fill={entry.color || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="list" style={{ background: 'transparent' }}>
                      {summary.by_category.map((cat, index) => {
                        const prevCat = insights?.by_category?.find(c => c.id === cat.id);
                        const changePercent = prevCat?.change_percent || 0;

                        return (
                          <div key={cat.id} className="list-item" style={{ background: 'transparent', padding: '8px 0' }}>
                            <div
                              className="list-item-icon"
                              style={{ background: cat.color || COLORS[index % COLORS.length], width: 32, height: 32 }}
                            >
                              {cat.icon || '📦'}
                            </div>
                            <div className="list-item-content">
                              <div className="list-item-title">{cat.name}</div>
                              <div className="list-item-subtitle">
                                {((cat.total / summary.total) * 100).toFixed(1)}%
                                {changePercent !== 0 && (
                                  <span style={{
                                    marginLeft: '8px',
                                    color: changePercent > 0 ? 'var(--danger)' : 'var(--success)',
                                    fontSize: '11px'
                                  }}>
                                    {changePercent > 0 ? '↑' : '↓'}{Math.abs(changePercent).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="list-item-value">{formatCurrency(cat.total)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Daily Spending */}
                {summary?.by_day?.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Gastos por Dia</span>
                    </div>

                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summary.by_day}>
                          <XAxis
                            dataKey="date"
                            tickFormatter={(date) => format(new Date(date), 'd')}
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis
                            tickFormatter={(value) => formatCurrency(value, true)}
                            tick={{ fontSize: 10 }}
                            width={50}
                          />
                          <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            labelFormatter={(date) => format(new Date(date), 'EEEE d', { locale: es })}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="total" fill="#000" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* By Account */}
                {summary?.by_account?.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Por Cuenta</span>
                    </div>

                    <div className="list" style={{ background: 'transparent' }}>
                      {summary.by_account.map(acc => {
                        const percent = summary.total > 0 ? (acc.total / summary.total) * 100 : 0;
                        return (
                          <div key={acc.id} style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px' }}>{acc.name}</span>
                              <span style={{ fontSize: '13px', fontWeight: '600' }}>{formatCurrency(acc.total)}</span>
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
                                background: acc.type === 'credit_card' ? '#ff6b6b' : '#4ecdc4',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(!summary?.by_category?.length && !summary?.by_day?.length) && (
                  <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <div className="empty-state-title">Sin datos</div>
                    <p>No hay gastos en este mes</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {view === 'trends' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>Cargando...</div>
            ) : (
              <>
                {/* 6-Month Trend */}
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Ultimos 6 Meses</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Prom: {formatCurrency(avgTotal)}
                    </span>
                  </div>

                  <div style={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData}>
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis
                          tickFormatter={(value) => formatCurrency(value, true)}
                          tick={{ fontSize: 10 }}
                          width={50}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#000"
                          strokeWidth={2}
                          dot={{ fill: '#000', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    {historicalData.map((month, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: idx < historicalData.length - 1 ? '1px solid var(--border)' : 'none'
                      }}>
                        <span style={{ textTransform: 'capitalize' }}>{month.date}</span>
                        <span style={{ fontWeight: '600' }}>{formatCurrency(month.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category Trends */}
                {insights?.by_category?.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Tendencias por Categoria</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Comparacion con mes anterior
                    </div>

                    {insights.by_category.filter(c => c.total > 0 || c.previous > 0).slice(0, 8).map(cat => {
                      const changePercent = cat.change_percent || 0;
                      const isIncrease = changePercent > 0;

                      return (
                        <div key={cat.id} style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{cat.icon || '📦'}</span>
                              {cat.name}
                            </span>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontWeight: '600' }}>{formatCurrency(cat.total)}</span>
                              {changePercent !== 0 && (
                                <span style={{
                                  marginLeft: '8px',
                                  fontSize: '12px',
                                  padding: '2px 6px',
                                  borderRadius: '10px',
                                  background: isIncrease ? 'rgba(255, 59, 48, 0.1)' : 'rgba(52, 199, 89, 0.1)',
                                  color: isIncrease ? 'var(--danger)' : 'var(--success)'
                                }}>
                                  {isIncrease ? '+' : ''}{changePercent.toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${Math.min(100, (cat.total / Math.max(cat.total, cat.previous || 1)) * 100)}%`,
                                background: cat.color || '#000'
                              }} />
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', minWidth: '60px', textAlign: 'right' }}>
                              Antes: {formatCurrency(cat.previous || 0, true)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Summary Stats */}
                {insights?.summary && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Estadisticas</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Promedio diario
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '700' }}>
                          {formatCurrency(insights.summary.daily_average || 0)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Proyeccion mes
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '700' }}>
                          {formatCurrency(insights.summary.projected_total || 0)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Mes actual
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '700' }}>
                          {formatCurrency(insights.summary.current_month || 0)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Mes anterior
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '700' }}>
                          {formatCurrency(insights.summary.previous_month || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}

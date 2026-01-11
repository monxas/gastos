import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const year = selectedDate.getFullYear().toString();
  const month = (selectedDate.getMonth() + 1).toString();

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/expenses/summary/monthly?year=${year}&month=${month}`);
      setSummary(res.summary);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
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

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Informes</h1>
      </header>

      <main className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button className="btn btn-secondary btn-sm" onClick={prevMonth}>&lt;</button>
          <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{monthName}</span>
          <button className="btn btn-secondary btn-sm" onClick={nextMonth}>&gt;</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>Cargando...</div>
        ) : (
          <>
            <div className="summary-card">
              <div className="summary-label">Total del mes</div>
              <div className="summary-value">{formatCurrency(summary?.total || 0)}</div>
            </div>

            {summary?.by_category?.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Por Categoria</span>
                </div>

                <div style={{ height: 200, marginBottom: '16px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.by_category}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {summary.by_category.map((entry, index) => (
                          <Cell key={entry.id} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="list" style={{ background: 'transparent' }}>
                  {summary.by_category.map((cat, index) => (
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
                        </div>
                      </div>
                      <div className="list-item-value">{formatCurrency(cat.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                        tickFormatter={(value) => `${value}`}
                        tick={{ fontSize: 10 }}
                        width={40}
                      />
                      <Bar dataKey="total" fill="#000" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {summary?.by_account?.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Por Cuenta</span>
                </div>

                <div className="list" style={{ background: 'transparent' }}>
                  {summary.by_account.map(acc => (
                    <div key={acc.id} className="list-item" style={{ background: 'transparent', padding: '8px 0' }}>
                      <div className="list-item-content">
                        <div className="list-item-title">{acc.name}</div>
                        <div className="list-item-subtitle" style={{ textTransform: 'capitalize' }}>{acc.type}</div>
                      </div>
                      <div className="list-item-value">{formatCurrency(acc.total)}</div>
                    </div>
                  ))}
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
      </main>
    </>
  );
}

import { getDB } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

export default async function budgetsRoutes(fastify, options) {
  // Get all budgets with current spending
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const db = getDB();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate(); // Correct last day of month
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

    const budgets = db.prepare(`
      SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND b.deleted_at IS NULL AND b.is_active = 1
      ORDER BY b.amount DESC
    `).all(request.user.userId);

    // Get current spending for each budget
    const budgetsWithSpending = budgets.map(budget => {
      let spent = 0;

      if (budget.category_id) {
        // Category-specific budget
        const result = db.prepare(`
          SELECT COALESCE(SUM(amount_base), 0) as total
          FROM expenses
          WHERE user_id = ? AND category_id = ? AND deleted_at IS NULL
            AND date >= ? AND date <= ?
        `).get(request.user.userId, budget.category_id, startDate, endDate);
        spent = result.total;
      } else {
        // Total budget (no category)
        const result = db.prepare(`
          SELECT COALESCE(SUM(amount_base), 0) as total
          FROM expenses
          WHERE user_id = ? AND deleted_at IS NULL
            AND date >= ? AND date <= ?
        `).get(request.user.userId, startDate, endDate);
        spent = result.total;
      }

      const remaining = budget.amount - spent;
      const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      return {
        ...budget,
        spent,
        remaining,
        percent,
        status: percent >= 100 ? 'exceeded' : percent >= 80 ? 'warning' : 'ok'
      };
    });

    return { budgets: budgetsWithSpending };
  });

  // Create budget
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { category_id, amount, period } = request.body;

    if (!amount || amount <= 0) {
      return reply.status(400).send({ error: 'El monto debe ser mayor a 0' });
    }

    const db = getDB();
    const id = uuidv4();

    // Check if budget already exists for this category
    let existing;
    if (category_id) {
      existing = db.prepare(`
        SELECT id FROM budgets
        WHERE user_id = ? AND category_id = ?
          AND deleted_at IS NULL AND is_active = 1
      `).get(request.user.userId, category_id);
    } else {
      existing = db.prepare(`
        SELECT id FROM budgets
        WHERE user_id = ? AND category_id IS NULL
          AND deleted_at IS NULL AND is_active = 1
      `).get(request.user.userId);
    }

    if (existing) {
      return reply.status(400).send({ error: 'Ya existe un presupuesto para esta categoria' });
    }

    db.prepare(`
      INSERT INTO budgets (id, user_id, category_id, amount, period)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, request.user.userId, category_id || null, amount, period || 'monthly');

    const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
    return { budget };
  });

  // Update budget
  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { amount, is_active } = request.body;

    const db = getDB();

    const existing = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(id, request.user.userId);
    if (!existing) {
      return reply.status(404).send({ error: 'Presupuesto no encontrado' });
    }

    db.prepare(`
      UPDATE budgets
      SET amount = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(
      amount !== undefined ? amount : existing.amount,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      id,
      request.user.userId
    );

    const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
    return { budget };
  });

  // Delete budget
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const db = getDB();

    const existing = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(id, request.user.userId);
    if (!existing) {
      return reply.status(404).send({ error: 'Presupuesto no encontrado' });
    }

    db.prepare(`
      UPDATE budgets SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(id, request.user.userId);

    return { success: true };
  });

  // Get insights/comparisons
  fastify.get('/insights', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const db = getDB();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    // Current month dates
    const lastDayCurrent = new Date(year, month, 0).getDate();
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDayCurrent.toString().padStart(2, '0')}`;

    // Previous month dates
    const lastDayPrev = new Date(prevYear, prevMonth, 0).getDate();
    const prevStartDate = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-01`;
    const prevEndDate = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-${lastDayPrev.toString().padStart(2, '0')}`;

    // Current month total
    const currentTotal = db.prepare(`
      SELECT COALESCE(SUM(amount_base), 0) as total
      FROM expenses WHERE user_id = ? AND deleted_at IS NULL
        AND date >= ? AND date <= ?
    `).get(request.user.userId, startDate, endDate).total;

    // Previous month total
    const prevTotal = db.prepare(`
      SELECT COALESCE(SUM(amount_base), 0) as total
      FROM expenses WHERE user_id = ? AND deleted_at IS NULL
        AND date >= ? AND date <= ?
    `).get(request.user.userId, prevStartDate, prevEndDate).total;

    // Daily average this month (prevent division by zero)
    const dayOfMonth = now.getDate();
    const dailyAvgCurrent = dayOfMonth > 0 ? currentTotal / dayOfMonth : 0;

    // Category comparison
    const currentByCategory = db.prepare(`
      SELECT c.id, c.name, c.icon, c.color, COALESCE(SUM(e.amount_base), 0) as total
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c.id
        AND e.deleted_at IS NULL AND e.date >= ? AND e.date <= ?
      WHERE c.user_id = ? AND c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY total DESC
    `).all(startDate, endDate, request.user.userId);

    const prevByCategory = db.prepare(`
      SELECT c.id, COALESCE(SUM(e.amount_base), 0) as total
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c.id
        AND e.deleted_at IS NULL AND e.date >= ? AND e.date <= ?
      WHERE c.user_id = ? AND c.deleted_at IS NULL
      GROUP BY c.id
    `).all(prevStartDate, prevEndDate, request.user.userId);

    const prevByCategoryMap = {};
    prevByCategory.forEach(c => { prevByCategoryMap[c.id] = c.total; });

    // Generate insights
    const insights = [];

    // Monthly comparison
    if (prevTotal > 0) {
      const change = ((currentTotal - prevTotal) / prevTotal) * 100;
      if (Math.abs(change) >= 10) {
        insights.push({
          type: change > 0 ? 'warning' : 'success',
          icon: change > 0 ? '📈' : '📉',
          title: change > 0 ? 'Gastas mas este mes' : 'Gastas menos este mes',
          description: `${Math.abs(change).toFixed(0)}% ${change > 0 ? 'mas' : 'menos'} que el mes pasado`
        });
      }
    }

    // Category insights
    for (const cat of currentByCategory) {
      const prevCatTotal = prevByCategoryMap[cat.id] || 0;
      if (prevCatTotal > 0 && cat.total > 0) {
        const change = ((cat.total - prevCatTotal) / prevCatTotal) * 100;
        if (change >= 30) {
          insights.push({
            type: 'warning',
            icon: cat.icon || '📦',
            title: `${cat.name} en aumento`,
            description: `${change.toFixed(0)}% mas que el mes pasado`
          });
        }
      }
    }

    // Projection
    const daysInMonth = new Date(year, month, 0).getDate();
    const projectedTotal = dailyAvgCurrent * daysInMonth;

    return {
      insights,
      summary: {
        current_month: currentTotal,
        previous_month: prevTotal,
        change_percent: prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0,
        daily_average: dailyAvgCurrent,
        projected_total: projectedTotal,
        days_remaining: daysInMonth - dayOfMonth
      },
      by_category: currentByCategory.map(c => ({
        ...c,
        previous: prevByCategoryMap[c.id] || 0,
        change_percent: prevByCategoryMap[c.id] > 0
          ? ((c.total - prevByCategoryMap[c.id]) / prevByCategoryMap[c.id]) * 100
          : 0
      }))
    };
  });
}

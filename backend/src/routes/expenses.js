import { getDB } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';
import { getMonthDateRange } from '../utils/date.js';

export default async function expensesRoutes(fastify, options) {
  // Get expenses with filters
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const {
      start_date, end_date, category_id, account_id, tag_id,
      min_amount, max_amount, currency, search, is_recurrent,
      limit = 100, offset = 0
    } = request.query;

    const db = getDB();
    let query = `
      SELECT e.*,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        a.name as account_name, a.type as account_type
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      JOIN accounts a ON e.account_id = a.id
      WHERE e.user_id = ? AND e.deleted_at IS NULL
    `;
    const params = [request.user.userId];

    if (start_date) {
      query += ' AND e.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND e.date <= ?';
      params.push(end_date);
    }
    if (category_id) {
      query += ' AND e.category_id = ?';
      params.push(category_id);
    }
    if (account_id) {
      query += ' AND e.account_id = ?';
      params.push(account_id);
    }
    if (min_amount) {
      query += ' AND e.amount_base >= ?';
      params.push(parseFloat(min_amount));
    }
    if (max_amount) {
      query += ' AND e.amount_base <= ?';
      params.push(parseFloat(max_amount));
    }
    if (currency) {
      query += ' AND e.currency_original = ?';
      params.push(currency);
    }
    if (search) {
      query += ' AND e.note LIKE ?';
      params.push(`%${search}%`);
    }
    if (is_recurrent !== undefined) {
      query += ' AND e.is_recurrent_instance = ?';
      params.push(is_recurrent === 'true' ? 1 : 0);
    }

    // Count total
    const countQuery = query.replace(/SELECT e\.\*.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = db.prepare(countQuery).get(...params);
    const total = countResult ? countResult.total : 0;

    query += ' ORDER BY e.date DESC, e.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const expenses = db.prepare(query).all(...params);

    // Get tags for each expense
    const expenseIds = expenses.map(e => e.id);
    let tagsMap = {};

    if (expenseIds.length > 0) {
      const placeholders = expenseIds.map(() => '?').join(',');
      const tags = db.prepare(`
        SELECT et.expense_id, t.id, t.name, t.color
        FROM expense_tags et
        JOIN tags t ON et.tag_id = t.id
        WHERE et.expense_id IN (${placeholders})
      `).all(...expenseIds);

      for (const tag of tags) {
        if (!tagsMap[tag.expense_id]) {
          tagsMap[tag.expense_id] = [];
        }
        tagsMap[tag.expense_id].push({ id: tag.id, name: tag.name, color: tag.color });
      }
    }

    // Filter by tag if needed
    let filteredExpenses = expenses;
    if (tag_id) {
      filteredExpenses = expenses.filter(e => tagsMap[e.id]?.some(t => t.id === tag_id));
    }

    const expensesWithTags = filteredExpenses.map(e => ({
      ...e,
      tags: tagsMap[e.id] || []
    }));

    return { expenses: expensesWithTags, total, limit: parseInt(limit), offset: parseInt(offset) };
  });

  // Get single expense
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const db = getDB();

    const expense = db.prepare(`
      SELECT e.*,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        a.name as account_name, a.type as account_type
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      JOIN accounts a ON e.account_id = a.id
      WHERE e.id = ? AND e.user_id = ?
    `).get(id, request.user.userId);

    if (!expense) {
      return reply.status(404).send({ error: 'Gasto no encontrado' });
    }

    const tags = db.prepare(`
      SELECT t.id, t.name, t.color
      FROM expense_tags et
      JOIN tags t ON et.tag_id = t.id
      WHERE et.expense_id = ?
    `).all(id);

    return { expense: { ...expense, tags } };
  });

  // Create expense
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const {
      date, amount_original, currency_original,
      exchange_rate, exchange_rate_date, amount_base,
      category_id, account_id, note, tag_ids
    } = request.body;

    if (!date || amount_original === undefined || !currency_original || !category_id || !account_id) {
      return reply.status(400).send({ error: 'Faltan campos requeridos' });
    }

    const db = getDB();

    // Verify category and account belong to user
    const category = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(category_id, request.user.userId);
    if (!category) {
      return reply.status(400).send({ error: 'Categoría no válida' });
    }

    const account = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(account_id, request.user.userId);
    if (!account) {
      return reply.status(400).send({ error: 'Cuenta no válida' });
    }

    const id = uuidv4();
    const finalAmountBase = amount_base || amount_original * (exchange_rate || 1);

    db.prepare(`
      INSERT INTO expenses (id, user_id, date, amount_original, currency_original,
        exchange_rate, exchange_rate_date, amount_base, category_id, account_id, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, request.user.userId, date, amount_original, currency_original,
      exchange_rate || 1, exchange_rate_date || date, finalAmountBase,
      category_id, account_id, note || null
    );

    // Add tags
    if (tag_ids && tag_ids.length > 0) {
      const insertTag = db.prepare('INSERT INTO expense_tags (expense_id, tag_id) VALUES (?, ?)');
      for (const tagId of tag_ids) {
        insertTag.run(id, tagId);
      }
    }

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    return { expense };
  });

  // Update expense
  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const {
      date, amount_original, currency_original,
      exchange_rate, exchange_rate_date, amount_base,
      category_id, account_id, note, tag_ids
    } = request.body;

    const db = getDB();

    const existing = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(id, request.user.userId);
    if (!existing) {
      return reply.status(404).send({ error: 'Gasto no encontrado' });
    }

    const finalAmountBase = amount_base || (amount_original || existing.amount_original) * (exchange_rate || existing.exchange_rate || 1);

    db.prepare(`
      UPDATE expenses
      SET date = ?, amount_original = ?, currency_original = ?,
          exchange_rate = ?, exchange_rate_date = ?, amount_base = ?,
          category_id = ?, account_id = ?, note = ?,
          updated_at = datetime('now'), version = version + 1
      WHERE id = ? AND user_id = ?
    `).run(
      date || existing.date,
      amount_original !== undefined ? amount_original : existing.amount_original,
      currency_original || existing.currency_original,
      exchange_rate || existing.exchange_rate,
      exchange_rate_date || existing.exchange_rate_date,
      finalAmountBase,
      category_id || existing.category_id,
      account_id || existing.account_id,
      note !== undefined ? note : existing.note,
      id,
      request.user.userId
    );

    // Update tags if provided
    if (tag_ids !== undefined) {
      db.prepare('DELETE FROM expense_tags WHERE expense_id = ?').run(id);
      if (tag_ids.length > 0) {
        const insertTag = db.prepare('INSERT INTO expense_tags (expense_id, tag_id) VALUES (?, ?)');
        for (const tagId of tag_ids) {
          insertTag.run(id, tagId);
        }
      }
    }

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    return { expense };
  });

  // Delete expense (soft delete)
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const db = getDB();

    const existing = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(id, request.user.userId);
    if (!existing) {
      return reply.status(404).send({ error: 'Gasto no encontrado' });
    }

    db.prepare(`
      UPDATE expenses
      SET deleted_at = datetime('now'), updated_at = datetime('now'), version = version + 1
      WHERE id = ? AND user_id = ?
    `).run(id, request.user.userId);

    return { success: true };
  });

  // Duplicate expense
  fastify.post('/:id/duplicate', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const db = getDB();

    const existing = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(id, request.user.userId);
    if (!existing) {
      return reply.status(404).send({ error: 'Gasto no encontrado' });
    }

    const newId = uuidv4();
    const today = new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO expenses (id, user_id, date, amount_original, currency_original,
        exchange_rate, exchange_rate_date, amount_base, category_id, account_id, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId, request.user.userId, today, existing.amount_original, existing.currency_original,
      existing.exchange_rate, today, existing.amount_base,
      existing.category_id, existing.account_id, existing.note
    );

    // Copy tags
    const tags = db.prepare('SELECT tag_id FROM expense_tags WHERE expense_id = ?').all(id);
    const insertTag = db.prepare('INSERT INTO expense_tags (expense_id, tag_id) VALUES (?, ?)');
    for (const tag of tags) {
      insertTag.run(newId, tag.tag_id);
    }

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(newId);
    return { expense };
  });

  // Export expenses to CSV
  fastify.get('/export/csv', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { start_date, end_date, category_id, account_id } = request.query;
    const db = getDB();

    let query = `
      SELECT e.date, e.amount_original, e.currency_original, e.amount_base, e.note,
        c.name as category_name, a.name as account_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      JOIN accounts a ON e.account_id = a.id
      WHERE e.user_id = ? AND e.deleted_at IS NULL
    `;
    const params = [request.user.userId];

    if (start_date) {
      query += ' AND e.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND e.date <= ?';
      params.push(end_date);
    }
    if (category_id) {
      query += ' AND e.category_id = ?';
      params.push(category_id);
    }
    if (account_id) {
      query += ' AND e.account_id = ?';
      params.push(account_id);
    }

    query += ' ORDER BY e.date DESC';
    const expenses = db.prepare(query).all(...params);

    // Generate CSV with proper escaping to prevent CSV injection
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Escape quotes and wrap in quotes if contains special chars
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      // Prevent CSV injection - prefix formula-like content with single quote
      if (/^[=+\-@\t\r]/.test(str)) {
        return `"'${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['Fecha', 'Monto', 'Moneda', 'Monto Base (EUR)', 'Categoria', 'Cuenta', 'Nota'];
    const rows = expenses.map(e => [
      e.date,
      e.amount_original,
      e.currency_original,
      e.amount_base,
      e.category_name,
      e.account_name,
      e.note || ''
    ]);

    let csv = headers.join(',') + '\n';
    for (const row of rows) {
      csv += row.map(escapeCSV).join(',') + '\n';
    }

    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="gastos-${start_date || 'all'}-${end_date || 'all'}.csv"`)
      .send(csv);
  });

  // Get monthly summary
  fastify.get('/summary/monthly', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { year, month } = request.query;

    if (!year || !month) {
      return reply.status(400).send({ error: 'Se requiere año y mes' });
    }

    const db = getDB();
    const { startDate, endDate } = getMonthDateRange(parseInt(year), parseInt(month));

    // Total by category
    const byCategory = db.prepare(`
      SELECT c.id, c.name, c.icon, c.color, SUM(e.amount_base) as total
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = ? AND e.deleted_at IS NULL
        AND e.date >= ? AND e.date <= ?
      GROUP BY c.id
      ORDER BY total DESC
    `).all(request.user.userId, startDate, endDate);

    // Total by account
    const byAccount = db.prepare(`
      SELECT a.id, a.name, a.type, SUM(e.amount_base) as total
      FROM expenses e
      JOIN accounts a ON e.account_id = a.id
      WHERE e.user_id = ? AND e.deleted_at IS NULL
        AND e.date >= ? AND e.date <= ?
      GROUP BY a.id
      ORDER BY total DESC
    `).all(request.user.userId, startDate, endDate);

    // Daily breakdown
    const byDay = db.prepare(`
      SELECT date, SUM(amount_base) as total
      FROM expenses
      WHERE user_id = ? AND deleted_at IS NULL
        AND date >= ? AND date <= ?
      GROUP BY date
      ORDER BY date ASC
    `).all(request.user.userId, startDate, endDate);

    const grandTotal = byCategory.reduce((sum, cat) => sum + cat.total, 0);

    return {
      summary: {
        total: grandTotal,
        by_category: byCategory,
        by_account: byAccount,
        by_day: byDay
      }
    };
  });
}

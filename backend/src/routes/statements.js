import { getDB } from '../db/init.js';

export default async function statementsRoutes(fastify, options) {
  // Get statements for an account
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { account_id, limit = 12 } = request.query;

    let query = `
      SELECT s.*, a.name as account_name
      FROM statements s
      JOIN accounts a ON s.account_id = a.id
      WHERE s.user_id = ?
    `;
    const params = [request.user.userId];

    if (account_id) {
      query += ` AND s.account_id = ?`;
      params.push(account_id);
    }

    query += ` ORDER BY s.period_end DESC LIMIT ?`;
    params.push(parseInt(limit));

    const statements = db.prepare(query).all(...params);

    return { statements };
  });

  // Get single statement with expenses
  fastify.get('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { id } = request.params;

    const statement = db.prepare(`
      SELECT s.*, a.name as account_name
      FROM statements s
      JOIN accounts a ON s.account_id = a.id
      WHERE s.id = ? AND s.user_id = ?
    `).get(id, request.user.userId);

    if (!statement) {
      return reply.status(404).send({ error: 'Estado de cuenta no encontrado' });
    }

    // Get expenses for this statement
    const expenses = db.prepare(`
      SELECT e.*,
        c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.statement_id = ? AND e.user_id = ?
      ORDER BY e.date DESC
    `).all(id, request.user.userId);

    // Get expenses by category
    const byCategory = db.prepare(`
      SELECT c.id, c.name, c.icon, c.color, SUM(e.amount_base) as total, COUNT(*) as count
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.statement_id = ? AND e.user_id = ?
      GROUP BY c.id
      ORDER BY total DESC
    `).all(id, request.user.userId);

    return {
      statement,
      expenses,
      summary: {
        by_category: byCategory,
        total: statement.total_amount,
        expense_count: expenses.length
      }
    };
  });

  // Get statement comparison (current vs previous)
  fastify.get('/compare/:accountId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { accountId } = request.params;

    const statements = db.prepare(`
      SELECT * FROM statements
      WHERE account_id = ? AND user_id = ?
      ORDER BY period_end DESC
      LIMIT 2
    `).all(accountId, request.user.userId);

    if (statements.length === 0) {
      return { current: null, previous: null, change_percent: 0 };
    }

    const current = statements[0];
    const previous = statements[1] || null;

    let changePercent = 0;
    if (previous && previous.total_amount > 0) {
      changePercent = ((current.total_amount - previous.total_amount) / previous.total_amount) * 100;
    }

    return {
      current,
      previous,
      change_percent: changePercent
    };
  });
}

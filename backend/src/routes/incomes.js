import { getDB } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

export default async function incomesRoutes(fastify, options) {
  // Get incomes
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { limit = 50, offset = 0, year, month, account_id } = request.query;

    let query = `
      SELECT i.*, a.name as account_name
      FROM incomes i
      LEFT JOIN accounts a ON i.account_id = a.id
      WHERE i.user_id = ? AND i.deleted_at IS NULL
    `;
    const params = [request.user.userId];

    if (year && month) {
      query += ` AND strftime('%Y', i.date) = ? AND strftime('%m', i.date) = ?`;
      params.push(year, month.padStart(2, '0'));
    }

    if (account_id) {
      query += ` AND i.account_id = ?`;
      params.push(account_id);
    }

    query += ` ORDER BY i.date DESC, i.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const incomes = db.prepare(query).all(...params);

    return { incomes };
  });

  // Get income summary
  fastify.get('/summary', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { year, month } = request.query;

    let query = `
      SELECT
        SUM(amount) as total,
        COUNT(*) as count,
        source,
        a.name as account_name
      FROM incomes i
      LEFT JOIN accounts a ON i.account_id = a.id
      WHERE i.user_id = ? AND i.deleted_at IS NULL
    `;
    const params = [request.user.userId];

    if (year && month) {
      query += ` AND strftime('%Y', i.date) = ? AND strftime('%m', i.date) = ?`;
      params.push(year, month.padStart(2, '0'));
    }

    query += ` GROUP BY source`;

    const bySource = db.prepare(query).all(...params);

    // Get total
    let totalQuery = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM incomes
      WHERE user_id = ? AND deleted_at IS NULL
    `;
    const totalParams = [request.user.userId];

    if (year && month) {
      totalQuery += ` AND strftime('%Y', date) = ? AND strftime('%m', date) = ?`;
      totalParams.push(year, month.padStart(2, '0'));
    }

    const total = db.prepare(totalQuery).get(...totalParams);

    return { total: total.total, by_source: bySource };
  });

  // Create income
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { date, amount, currency, account_id, source, note } = request.body;

    const id = uuidv4();
    db.prepare(`
      INSERT INTO incomes (id, user_id, date, amount, currency, account_id, source, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, request.user.userId, date, amount, currency || 'EUR', account_id, source, note);

    return { id, message: 'Ingreso creado' };
  });

  // Update income
  fastify.put('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { id } = request.params;
    const { date, amount, currency, account_id, source, note } = request.body;

    db.prepare(`
      UPDATE incomes
      SET date = ?, amount = ?, currency = ?, account_id = ?, source = ?, note = ?,
          updated_at = datetime('now'), version = version + 1
      WHERE id = ? AND user_id = ?
    `).run(date, amount, currency, account_id, source, note, id, request.user.userId);

    return { message: 'Ingreso actualizado' };
  });

  // Delete income
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { id } = request.params;

    db.prepare(`
      UPDATE incomes SET deleted_at = datetime('now'), version = version + 1
      WHERE id = ? AND user_id = ?
    `).run(id, request.user.userId);

    return { message: 'Ingreso eliminado' };
  });
}

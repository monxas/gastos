import { getDB } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

export default async function recurringRoutes(fastify, options) {
  // Get all recurring rules
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const rules = db.prepare(`
      SELECT r.*,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        a.name as account_name
      FROM recurrent_rules r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN accounts a ON r.account_id = a.id
      WHERE r.user_id = ? AND r.deleted_at IS NULL
      ORDER BY r.name
    `).all(request.user.userId);

    // Get tags for each rule
    for (const rule of rules) {
      const tags = db.prepare(`
        SELECT t.id, t.name, t.color
        FROM tags t
        JOIN recurrent_rule_tags rt ON t.id = rt.tag_id
        WHERE rt.rule_id = ?
      `).all(rule.id);
      rule.tags = tags;
      rule.frequency_data = JSON.parse(rule.frequency_data);
    }

    return { rules };
  });

  // Create recurring rule
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const {
      name, amount, currency, category_id, account_id, note,
      frequency, interval, day_of_month, day_of_week, start_date, end_date, tag_ids
    } = request.body;

    const id = uuidv4();
    const frequencyData = JSON.stringify({ frequency, interval: interval || 1, day_of_month, day_of_week });

    // Calculate next run date
    const nextRun = calculateNextRun(start_date, { frequency, interval: interval || 1, day_of_month, day_of_week });

    db.prepare(`
      INSERT INTO recurrent_rules (id, user_id, name, amount, currency, category_id, account_id, note, pattern_type, frequency_data, start_date, end_date, next_run_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'simple', ?, ?, ?, ?)
    `).run(id, request.user.userId, name, amount, currency || 'EUR', category_id, account_id, note, frequencyData, start_date, end_date, nextRun);

    // Add tags
    if (tag_ids?.length > 0) {
      const insertTag = db.prepare('INSERT INTO recurrent_rule_tags (rule_id, tag_id) VALUES (?, ?)');
      for (const tagId of tag_ids) {
        insertTag.run(id, tagId);
      }
    }

    return { id, message: 'Regla recurrente creada' };
  });

  // Update recurring rule
  fastify.put('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { id } = request.params;
    const {
      name, amount, currency, category_id, account_id, note,
      frequency, interval, day_of_month, day_of_week, start_date, end_date, is_active, tag_ids
    } = request.body;

    const frequencyData = JSON.stringify({ frequency, interval: interval || 1, day_of_month, day_of_week });
    const nextRun = is_active !== false ? calculateNextRun(start_date, { frequency, interval: interval || 1, day_of_month, day_of_week }) : null;

    db.prepare(`
      UPDATE recurrent_rules
      SET name = ?, amount = ?, currency = ?, category_id = ?, account_id = ?, note = ?,
          frequency_data = ?, start_date = ?, end_date = ?, next_run_at = ?, is_active = ?,
          updated_at = datetime('now'), version = version + 1
      WHERE id = ? AND user_id = ?
    `).run(name, amount, currency, category_id, account_id, note, frequencyData, start_date, end_date, nextRun, is_active ? 1 : 0, id, request.user.userId);

    // Update tags
    db.prepare('DELETE FROM recurrent_rule_tags WHERE rule_id = ?').run(id);
    if (tag_ids?.length > 0) {
      const insertTag = db.prepare('INSERT INTO recurrent_rule_tags (rule_id, tag_id) VALUES (?, ?)');
      for (const tagId of tag_ids) {
        insertTag.run(id, tagId);
      }
    }

    return { message: 'Regla actualizada' };
  });

  // Delete recurring rule
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { id } = request.params;

    db.prepare(`
      UPDATE recurrent_rules SET deleted_at = datetime('now'), is_active = 0, version = version + 1
      WHERE id = ? AND user_id = ?
    `).run(id, request.user.userId);

    return { message: 'Regla eliminada' };
  });

  // Process due recurring rules (create expenses)
  fastify.post('/process', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const today = new Date().toISOString().split('T')[0];

    // Get rules due today or earlier
    const dueRules = db.prepare(`
      SELECT * FROM recurrent_rules
      WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL
      AND next_run_at <= ? AND (end_date IS NULL OR end_date >= ?)
    `).all(request.user.userId, today, today);

    const created = [];
    for (const rule of dueRules) {
      const freqData = JSON.parse(rule.frequency_data);
      const expenseId = uuidv4();

      // Create expense
      db.prepare(`
        INSERT INTO expenses (id, user_id, date, amount_original, currency_original, amount_base, exchange_rate, category_id, account_id, note, is_recurrent_instance, recurrent_rule_id)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 1, ?)
      `).run(expenseId, request.user.userId, rule.next_run_at, rule.amount, rule.currency, rule.amount, rule.category_id, rule.account_id, rule.note, rule.id);

      // Copy tags
      const ruleTags = db.prepare('SELECT tag_id FROM recurrent_rule_tags WHERE rule_id = ?').all(rule.id);
      for (const tag of ruleTags) {
        db.prepare('INSERT INTO expense_tags (expense_id, tag_id) VALUES (?, ?)').run(expenseId, tag.tag_id);
      }

      // Calculate next run
      const nextRun = calculateNextRun(rule.next_run_at, freqData, true);
      db.prepare('UPDATE recurrent_rules SET next_run_at = ?, updated_at = datetime(\'now\') WHERE id = ?').run(nextRun, rule.id);

      created.push({ rule_id: rule.id, expense_id: expenseId, name: rule.name });
    }

    return { processed: created.length, created };
  });

  // Get upcoming recurring expenses
  fastify.get('/upcoming', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { days = 30 } = request.query;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const upcoming = db.prepare(`
      SELECT r.*,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        a.name as account_name
      FROM recurrent_rules r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN accounts a ON r.account_id = a.id
      WHERE r.user_id = ? AND r.is_active = 1 AND r.deleted_at IS NULL
      AND r.next_run_at <= ?
      ORDER BY r.next_run_at
    `).all(request.user.userId, futureDateStr);

    for (const rule of upcoming) {
      rule.frequency_data = JSON.parse(rule.frequency_data);
    }

    return { upcoming };
  });
}

function calculateNextRun(fromDate, freqData, skipCurrent = false) {
  const date = new Date(fromDate);
  if (skipCurrent) {
    date.setDate(date.getDate() + 1);
  }

  const { frequency, interval = 1, day_of_month, day_of_week } = freqData;

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + interval);
      break;
    case 'weekly':
      if (day_of_week !== undefined) {
        const currentDay = date.getDay();
        let daysUntil = day_of_week - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        date.setDate(date.getDate() + daysUntil + (interval - 1) * 7);
      } else {
        date.setDate(date.getDate() + 7 * interval);
      }
      break;
    case 'monthly':
      if (day_of_month) {
        date.setMonth(date.getMonth() + interval);
        date.setDate(Math.min(day_of_month, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
      } else {
        date.setMonth(date.getMonth() + interval);
      }
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + interval);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString().split('T')[0];
}

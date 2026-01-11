import { getDB } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

export default async function syncRoutes(fastify, options) {
  // Full sync - download all user data
  fastify.get('/pull', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { since } = request.query;
    const db = getDB();
    const userId = request.user.userId;

    let whereClause = 'WHERE user_id = ?';
    const params = [userId];

    if (since) {
      whereClause += ' AND updated_at > ?';
      params.push(since);
    }

    const categories = db.prepare(`SELECT * FROM categories ${whereClause}`).all(...params);
    const tags = db.prepare(`SELECT * FROM tags ${whereClause}`).all(...params);
    const accounts = db.prepare(`SELECT * FROM accounts ${whereClause}`).all(...params);
    const expenses = db.prepare(`SELECT * FROM expenses ${whereClause}`).all(...params);
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);

    // Get expense tags
    const expenseIds = expenses.map(e => e.id);
    let expenseTags = [];
    if (expenseIds.length > 0) {
      const placeholders = expenseIds.map(() => '?').join(',');
      expenseTags = db.prepare(`SELECT * FROM expense_tags WHERE expense_id IN (${placeholders})`).all(...expenseIds);
    }

    return {
      data: {
        categories,
        tags,
        accounts,
        expenses,
        expense_tags: expenseTags,
        settings
      },
      synced_at: new Date().toISOString()
    };
  });

  // Push changes from client
  fastify.post('/push', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { changes } = request.body;
    const db = getDB();
    const userId = request.user.userId;

    const results = {
      categories: { created: 0, updated: 0 },
      tags: { created: 0, updated: 0 },
      accounts: { created: 0, updated: 0 },
      expenses: { created: 0, updated: 0 }
    };

    // Process categories
    if (changes.categories) {
      for (const cat of changes.categories) {
        const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(cat.id, userId);

        if (existing) {
          if (cat.version > existing.version) {
            db.prepare(`
              UPDATE categories SET name = ?, icon = ?, color = ?, sort_order = ?,
                deleted_at = ?, updated_at = ?, version = ?
              WHERE id = ? AND user_id = ?
            `).run(cat.name, cat.icon, cat.color, cat.sort_order, cat.deleted_at, cat.updated_at, cat.version, cat.id, userId);
            results.categories.updated++;
          }
        } else {
          db.prepare(`
            INSERT INTO categories (id, user_id, name, icon, color, sort_order, created_at, updated_at, deleted_at, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(cat.id, userId, cat.name, cat.icon, cat.color, cat.sort_order, cat.created_at, cat.updated_at, cat.deleted_at, cat.version);
          results.categories.created++;
        }
      }
    }

    // Process tags
    if (changes.tags) {
      for (const tag of changes.tags) {
        const existing = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(tag.id, userId);

        if (existing) {
          if (tag.version > existing.version) {
            db.prepare(`
              UPDATE tags SET name = ?, color = ?, deleted_at = ?, updated_at = ?, version = ?
              WHERE id = ? AND user_id = ?
            `).run(tag.name, tag.color, tag.deleted_at, tag.updated_at, tag.version, tag.id, userId);
            results.tags.updated++;
          }
        } else {
          db.prepare(`
            INSERT INTO tags (id, user_id, name, color, created_at, updated_at, deleted_at, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(tag.id, userId, tag.name, tag.color, tag.created_at, tag.updated_at, tag.deleted_at, tag.version);
          results.tags.created++;
        }
      }
    }

    // Process accounts
    if (changes.accounts) {
      for (const acc of changes.accounts) {
        const existing = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(acc.id, userId);

        if (existing) {
          if (acc.version > existing.version) {
            db.prepare(`
              UPDATE accounts SET name = ?, type = ?, currency = ?, initial_balance = ?,
                card_billing_account_id = ?, card_close_day = ?, card_payment_day = ?, credit_limit = ?,
                deleted_at = ?, updated_at = ?, version = ?
              WHERE id = ? AND user_id = ?
            `).run(
              acc.name, acc.type, acc.currency, acc.initial_balance,
              acc.card_billing_account_id, acc.card_close_day, acc.card_payment_day, acc.credit_limit,
              acc.deleted_at, acc.updated_at, acc.version, acc.id, userId
            );
            results.accounts.updated++;
          }
        } else {
          db.prepare(`
            INSERT INTO accounts (id, user_id, name, type, currency, initial_balance,
              card_billing_account_id, card_close_day, card_payment_day, credit_limit,
              created_at, updated_at, deleted_at, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            acc.id, userId, acc.name, acc.type, acc.currency, acc.initial_balance,
            acc.card_billing_account_id, acc.card_close_day, acc.card_payment_day, acc.credit_limit,
            acc.created_at, acc.updated_at, acc.deleted_at, acc.version
          );
          results.accounts.created++;
        }
      }
    }

    // Process expenses
    if (changes.expenses) {
      for (const exp of changes.expenses) {
        const existing = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(exp.id, userId);

        if (existing) {
          if (exp.version > existing.version) {
            db.prepare(`
              UPDATE expenses SET date = ?, amount_original = ?, currency_original = ?,
                exchange_rate = ?, exchange_rate_date = ?, amount_base = ?,
                category_id = ?, account_id = ?, note = ?,
                is_recurrent_instance = ?, recurrent_rule_id = ?, settled_at = ?, statement_id = ?,
                deleted_at = ?, updated_at = ?, version = ?
              WHERE id = ? AND user_id = ?
            `).run(
              exp.date, exp.amount_original, exp.currency_original,
              exp.exchange_rate, exp.exchange_rate_date, exp.amount_base,
              exp.category_id, exp.account_id, exp.note,
              exp.is_recurrent_instance, exp.recurrent_rule_id, exp.settled_at, exp.statement_id,
              exp.deleted_at, exp.updated_at, exp.version, exp.id, userId
            );
            results.expenses.updated++;
          }
        } else {
          db.prepare(`
            INSERT INTO expenses (id, user_id, date, amount_original, currency_original,
              exchange_rate, exchange_rate_date, amount_base, category_id, account_id, note,
              is_recurrent_instance, recurrent_rule_id, settled_at, statement_id,
              created_at, updated_at, deleted_at, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            exp.id, userId, exp.date, exp.amount_original, exp.currency_original,
            exp.exchange_rate, exp.exchange_rate_date, exp.amount_base, exp.category_id, exp.account_id, exp.note,
            exp.is_recurrent_instance, exp.recurrent_rule_id, exp.settled_at, exp.statement_id,
            exp.created_at, exp.updated_at, exp.deleted_at, exp.version
          );
          results.expenses.created++;
        }

        // Handle expense tags
        if (exp.tag_ids) {
          db.prepare('DELETE FROM expense_tags WHERE expense_id = ?').run(exp.id);
          const insertTag = db.prepare('INSERT OR IGNORE INTO expense_tags (expense_id, tag_id) VALUES (?, ?)');
          for (const tagId of exp.tag_ids) {
            insertTag.run(exp.id, tagId);
          }
        }
      }
    }

    return { success: true, results, synced_at: new Date().toISOString() };
  });
}

import { getDB } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

export default async function accountsRoutes(fastify, options) {
  // Get all accounts with balances
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const db = getDB();
    const accounts = db.prepare(`
      SELECT a.*,
        COALESCE(
          (SELECT SUM(e.amount_base)
           FROM expenses e
           WHERE e.account_id = a.id
           AND e.deleted_at IS NULL
           AND (a.type NOT IN ('credit_card') OR e.settled_at IS NULL)),
          0
        ) as total_expenses
      FROM accounts a
      WHERE a.user_id = ? AND a.deleted_at IS NULL
      ORDER BY a.name ASC
    `).all(request.user.userId);

    // Calculate current balance for each account
    const accountsWithBalance = accounts.map(acc => {
      let current_balance;
      if (acc.type === 'credit_card') {
        // For credit cards, show unsettled debt (negative = owed)
        current_balance = -acc.total_expenses;
      } else if (acc.type === 'debit_card') {
        // For debit cards, show initial balance - expenses (like bank account)
        current_balance = acc.initial_balance - acc.total_expenses;
      } else {
        // For bank/cash, show initial - expenses
        current_balance = acc.initial_balance - acc.total_expenses;
      }
      return { ...acc, current_balance };
    });

    return { accounts: accountsWithBalance };
  });

  // Get single account
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const db = getDB();

    const account = db.prepare(`
      SELECT a.*,
        COALESCE(
          (SELECT SUM(e.amount_base)
           FROM expenses e
           WHERE e.account_id = a.id
           AND e.deleted_at IS NULL
           AND (a.type NOT IN ('credit_card') OR e.settled_at IS NULL)),
          0
        ) as total_expenses
      FROM accounts a
      WHERE a.id = ? AND a.user_id = ?
    `).get(id, request.user.userId);

    if (!account) {
      return reply.status(404).send({ error: 'Cuenta no encontrada' });
    }

    let current_balance;
    if (account.type === 'credit_card') {
      current_balance = -account.total_expenses;
    } else if (account.type === 'debit_card') {
      current_balance = account.initial_balance - account.total_expenses;
    } else {
      current_balance = account.initial_balance - account.total_expenses;
    }

    return { account: { ...account, current_balance } };
  });

  // Create account
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const {
      name, type, currency, initial_balance,
      card_billing_account_id, card_close_day, card_payment_day, credit_limit
    } = request.body;

    if (!name || !type) {
      return reply.status(400).send({ error: 'Nombre y tipo son requeridos' });
    }

    if (!['bank', 'cash', 'debit_card', 'credit_card'].includes(type)) {
      return reply.status(400).send({ error: 'Tipo debe ser bank, cash, debit_card o credit_card' });
    }

    const db = getDB();
    const id = uuidv4();

    // Credit cards need billing account and close day
    const isCard = type === 'debit_card' || type === 'credit_card';
    const isCreditCard = type === 'credit_card';

    db.prepare(`
      INSERT INTO accounts (id, user_id, name, type, currency, initial_balance,
        card_billing_account_id, card_close_day, card_payment_day, credit_limit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, request.user.userId, name, type,
      currency || 'EUR',
      initial_balance || 0,
      isCreditCard ? card_billing_account_id : null,
      isCreditCard ? card_close_day : null,
      isCreditCard ? card_payment_day : null,
      isCreditCard ? credit_limit : null
    );

    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    return { account };
  });

  // Update account
  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const {
      name, currency, initial_balance,
      card_billing_account_id, card_close_day, card_payment_day, credit_limit
    } = request.body;

    const db = getDB();

    const existing = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(id, request.user.userId);
    if (!existing) {
      return reply.status(404).send({ error: 'Cuenta no encontrada' });
    }

    const isCreditCard = existing.type === 'credit_card';

    db.prepare(`
      UPDATE accounts
      SET name = ?, currency = ?, initial_balance = ?,
          card_billing_account_id = ?, card_close_day = ?, card_payment_day = ?, credit_limit = ?,
          updated_at = datetime('now'), version = version + 1
      WHERE id = ? AND user_id = ?
    `).run(
      name || existing.name,
      currency || existing.currency,
      initial_balance !== undefined ? initial_balance : existing.initial_balance,
      isCreditCard ? (card_billing_account_id !== undefined ? card_billing_account_id : existing.card_billing_account_id) : null,
      isCreditCard ? (card_close_day !== undefined ? card_close_day : existing.card_close_day) : null,
      isCreditCard ? (card_payment_day !== undefined ? card_payment_day : existing.card_payment_day) : null,
      isCreditCard ? (credit_limit !== undefined ? credit_limit : existing.credit_limit) : null,
      id,
      request.user.userId
    );

    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    return { account };
  });

  // Delete account (soft delete)
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const db = getDB();

    const existing = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(id, request.user.userId);
    if (!existing) {
      return reply.status(404).send({ error: 'Cuenta no encontrada' });
    }

    // Check if account has expenses
    const expenseCount = db.prepare('SELECT COUNT(*) as count FROM expenses WHERE account_id = ? AND deleted_at IS NULL').get(id);
    if (expenseCount.count > 0) {
      return reply.status(400).send({ error: 'No se puede eliminar una cuenta con gastos asociados' });
    }

    db.prepare(`
      UPDATE accounts
      SET deleted_at = datetime('now'), updated_at = datetime('now'), version = version + 1
      WHERE id = ? AND user_id = ?
    `).run(id, request.user.userId);

    return { success: true };
  });

  // Close credit card statement
  fastify.post('/:id/close-statement', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const db = getDB();

    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(id, request.user.userId);
    if (!account) {
      return reply.status(404).send({ error: 'Cuenta no encontrada' });
    }

    if (account.type !== 'credit_card') {
      return reply.status(400).send({ error: 'Solo se pueden cerrar tarjetas de credito' });
    }

    if (!account.card_billing_account_id) {
      return reply.status(400).send({ error: 'No hay cuenta bancaria configurada para el cargo' });
    }

    // Get unsettled expenses for this card
    const unsettledExpenses = db.prepare(`
      SELECT * FROM expenses
      WHERE account_id = ? AND user_id = ? AND deleted_at IS NULL AND settled_at IS NULL
      ORDER BY date ASC
    `).all(id, request.user.userId);

    if (unsettledExpenses.length === 0) {
      return reply.status(400).send({ error: 'No hay gastos pendientes de liquidar' });
    }

    const totalAmount = unsettledExpenses.reduce((sum, exp) => sum + exp.amount_base, 0);
    const periodStart = unsettledExpenses[0].date;
    const periodEnd = unsettledExpenses[unsettledExpenses.length - 1].date;
    const closedAt = new Date().toISOString();

    // Get "Tarjeta" category
    const tarjetaCategory = db.prepare(`
      SELECT id FROM categories WHERE user_id = ? AND name = 'Tarjeta' AND deleted_at IS NULL
    `).get(request.user.userId);

    if (!tarjetaCategory) {
      return reply.status(400).send({ error: 'No se encontro la categoria "Tarjeta"' });
    }

    // Create the payment expense in the billing account
    const paymentExpenseId = uuidv4();
    db.prepare(`
      INSERT INTO expenses (id, user_id, date, amount_original, currency_original, amount_base, category_id, account_id, note)
      VALUES (?, ?, ?, ?, 'EUR', ?, ?, ?, ?)
    `).run(
      paymentExpenseId,
      request.user.userId,
      closedAt.split('T')[0],
      totalAmount,
      totalAmount,
      tarjetaCategory.id,
      account.card_billing_account_id,
      `Cierre tarjeta ${account.name}`
    );

    // Create statement record
    const statementId = uuidv4();
    db.prepare(`
      INSERT INTO statements (id, user_id, account_id, period_start, period_end, closed_at, total_amount, payment_expense_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(statementId, request.user.userId, id, periodStart, periodEnd, closedAt, totalAmount, paymentExpenseId);

    // Mark expenses as settled
    const expenseIds = unsettledExpenses.map(e => e.id);
    const placeholders = expenseIds.map(() => '?').join(',');
    db.prepare(`
      UPDATE expenses SET settled_at = ?, statement_id = ? WHERE id IN (${placeholders})
    `).run(closedAt, statementId, ...expenseIds);

    return {
      success: true,
      statement: {
        id: statementId,
        total_amount: totalAmount,
        expenses_count: unsettledExpenses.length,
        period_start: periodStart,
        period_end: periodEnd,
        payment_expense_id: paymentExpenseId
      }
    };
  });

  // Get card statements
  fastify.get('/:id/statements', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const db = getDB();

    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(id, request.user.userId);
    if (!account) {
      return reply.status(404).send({ error: 'Cuenta no encontrada' });
    }

    const statements = db.prepare(`
      SELECT * FROM statements
      WHERE account_id = ? AND user_id = ?
      ORDER BY closed_at DESC
    `).all(id, request.user.userId);

    return { statements };
  });
}

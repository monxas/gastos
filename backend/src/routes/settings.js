import { getDB } from '../db/init.js';

export default async function settingsRoutes(fastify, options) {
  // Get user settings
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const db = getDB();
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(request.user.userId);

    if (!settings) {
      return reply.status(404).send({ error: 'Configuración no encontrada' });
    }

    return { settings };
  });

  // Update user settings
  fastify.put('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { base_currency, language } = request.body;
    const db = getDB();

    const existing = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(request.user.userId);

    if (!existing) {
      return reply.status(404).send({ error: 'Configuración no encontrada' });
    }

    db.prepare(`
      UPDATE user_settings
      SET base_currency = ?, language = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(
      base_currency || existing.base_currency,
      language || existing.language,
      request.user.userId
    );

    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(request.user.userId);
    return { settings };
  });

  // Export user data
  fastify.get('/export', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const db = getDB();
    const userId = request.user.userId;

    const categories = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(userId);
    const tags = db.prepare('SELECT * FROM tags WHERE user_id = ?').all(userId);
    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId);
    const expenses = db.prepare('SELECT * FROM expenses WHERE user_id = ?').all(userId);
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);

    // Get expense tags
    const expenseIds = expenses.map(e => e.id);
    let expenseTags = [];
    if (expenseIds.length > 0) {
      const placeholders = expenseIds.map(() => '?').join(',');
      expenseTags = db.prepare(`SELECT * FROM expense_tags WHERE expense_id IN (${placeholders})`).all(...expenseIds);
    }

    const exportData = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      data: {
        settings,
        categories,
        tags,
        accounts,
        expenses,
        expense_tags: expenseTags
      }
    };

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename=gastos-backup-${new Date().toISOString().split('T')[0]}.json`);
    return exportData;
  });
}

import { getDB } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

export default async function categoriesRoutes(fastify, options) {
  // Get all categories
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const db = getDB();
    const categories = db.prepare(`
      SELECT * FROM categories
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY sort_order ASC
    `).all(request.user.userId);

    return { categories };
  });

  // Create category
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { name, icon, color, sort_order } = request.body;

    if (!name) {
      return reply.status(400).send({ error: 'El nombre es requerido' });
    }

    const db = getDB();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO categories (id, user_id, name, icon, color, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, request.user.userId, name, icon || null, color || null, sort_order || 0);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return { category };
  });

  // Update category
  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { name, icon, color, sort_order } = request.body;

    const db = getDB();

    const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, request.user.userId);
    if (!existing) {
      return reply.status(404).send({ error: 'Categoría no encontrada' });
    }

    db.prepare(`
      UPDATE categories
      SET name = ?, icon = ?, color = ?, sort_order = ?,
          updated_at = datetime('now'), version = version + 1
      WHERE id = ? AND user_id = ?
    `).run(
      name || existing.name,
      icon !== undefined ? icon : existing.icon,
      color !== undefined ? color : existing.color,
      sort_order !== undefined ? sort_order : existing.sort_order,
      id,
      request.user.userId
    );

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return { category };
  });

  // Delete category (soft delete)
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const db = getDB();

    const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, request.user.userId);
    if (!existing) {
      return reply.status(404).send({ error: 'Categoría no encontrada' });
    }

    // Check if category has expenses
    const expenseCount = db.prepare('SELECT COUNT(*) as count FROM expenses WHERE category_id = ? AND deleted_at IS NULL').get(id);
    if (expenseCount.count > 0) {
      return reply.status(400).send({ error: 'No se puede eliminar una categoría con gastos asociados' });
    }

    db.prepare(`
      UPDATE categories
      SET deleted_at = datetime('now'), updated_at = datetime('now'), version = version + 1
      WHERE id = ? AND user_id = ?
    `).run(id, request.user.userId);

    return { success: true };
  });

  // Reorder categories
  fastify.post('/reorder', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { orders } = request.body; // Array of { id, sort_order }

    if (!orders || !Array.isArray(orders)) {
      return reply.status(400).send({ error: 'Se requiere un array de órdenes' });
    }

    const db = getDB();
    const stmt = db.prepare(`
      UPDATE categories SET sort_order = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);

    for (const order of orders) {
      stmt.run(order.sort_order, order.id, request.user.userId);
    }

    return { success: true };
  });
}

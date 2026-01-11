import { getDB } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

export default async function tagsRoutes(fastify, options) {
  // Get all tags
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const db = getDB();
    const tags = db.prepare(`
      SELECT * FROM tags
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY name ASC
    `).all(request.user.userId);

    return { tags };
  });

  // Create tag
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { name, color } = request.body;

    if (!name) {
      return reply.status(400).send({ error: 'El nombre es requerido' });
    }

    const db = getDB();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO tags (id, user_id, name, color)
      VALUES (?, ?, ?, ?)
    `).run(id, request.user.userId, name, color || null);

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    return { tag };
  });

  // Update tag
  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { name, color } = request.body;

    const db = getDB();

    const existing = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(id, request.user.userId);
    if (!existing) {
      return reply.status(404).send({ error: 'Tag no encontrado' });
    }

    db.prepare(`
      UPDATE tags
      SET name = ?, color = ?, updated_at = datetime('now'), version = version + 1
      WHERE id = ? AND user_id = ?
    `).run(
      name || existing.name,
      color !== undefined ? color : existing.color,
      id,
      request.user.userId
    );

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    return { tag };
  });

  // Delete tag (soft delete)
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const db = getDB();

    const existing = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(id, request.user.userId);
    if (!existing) {
      return reply.status(404).send({ error: 'Tag no encontrado' });
    }

    // Remove tag associations from expenses
    db.prepare('DELETE FROM expense_tags WHERE tag_id = ?').run(id);

    db.prepare(`
      UPDATE tags
      SET deleted_at = datetime('now'), updated_at = datetime('now'), version = version + 1
      WHERE id = ? AND user_id = ?
    `).run(id, request.user.userId);

    return { success: true };
  });
}

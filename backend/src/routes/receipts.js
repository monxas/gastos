import { getDB } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir, unlink, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RECEIPTS_DIR = process.env.RECEIPTS_PATH || join(__dirname, '../../data/receipts');

export default async function receiptsRoutes(fastify, options) {
  // Ensure receipts directory exists
  await mkdir(RECEIPTS_DIR, { recursive: true });

  // Upload receipt for expense
  fastify.post('/:expenseId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { expenseId } = request.params;

    // Verify expense belongs to user
    const expense = db.prepare('SELECT id FROM expenses WHERE id = ? AND user_id = ?').get(expenseId, request.user.userId);
    if (!expense) {
      return reply.status(404).send({ error: 'Gasto no encontrado' });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No se envio archivo' });
    }

    const id = uuidv4();
    const ext = data.filename.split('.').pop();
    const filename = `${id}.${ext}`;
    const filepath = join(RECEIPTS_DIR, filename);

    // Save file
    const buffer = await data.toBuffer();
    await writeFile(filepath, buffer);

    // Save to database
    db.prepare(`
      INSERT INTO receipts (id, expense_id, filename, mimetype, size)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, expenseId, filename, data.mimetype, buffer.length);

    return { id, filename, message: 'Recibo guardado' };
  });

  // Get receipt image (requires authentication)
  fastify.get('/:id/image', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { id } = request.params;

    // Verify receipt belongs to user through expense ownership
    const receipt = db.prepare(`
      SELECT r.* FROM receipts r
      JOIN expenses e ON r.expense_id = e.id
      WHERE r.id = ? AND e.user_id = ?
    `).get(id, request.user.userId);
    if (!receipt) {
      return reply.status(404).send({ error: 'Recibo no encontrado' });
    }

    const filepath = join(RECEIPTS_DIR, receipt.filename);
    try {
      const buffer = await readFile(filepath);
      return reply.type(receipt.mimetype).send(buffer);
    } catch (err) {
      return reply.status(404).send({ error: 'Archivo no encontrado' });
    }
  });

  // Get receipts for expense
  fastify.get('/expense/:expenseId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { expenseId } = request.params;

    const receipts = db.prepare(`
      SELECT r.* FROM receipts r
      JOIN expenses e ON r.expense_id = e.id
      WHERE r.expense_id = ? AND e.user_id = ?
    `).all(expenseId, request.user.userId);

    return { receipts };
  });

  // Delete receipt
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();
    const { id } = request.params;

    const receipt = db.prepare(`
      SELECT r.* FROM receipts r
      JOIN expenses e ON r.expense_id = e.id
      WHERE r.id = ? AND e.user_id = ?
    `).get(id, request.user.userId);

    if (!receipt) {
      return reply.status(404).send({ error: 'Recibo no encontrado' });
    }

    // Delete file
    try {
      await unlink(join(RECEIPTS_DIR, receipt.filename));
    } catch (err) {
      // File might not exist
    }

    // Delete from database
    db.prepare('DELETE FROM receipts WHERE id = ?').run(id);

    return { message: 'Recibo eliminado' };
  });
}

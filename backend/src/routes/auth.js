import { getDB } from '../db/init.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { seedUserData } from '../utils/seed.js';

export default async function authRoutes(fastify, options) {
  // Register
  fastify.post('/register', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email y contraseña son requeridos' });
    }

    if (password.length < 6) {
      return reply.status(400).send({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const db = getDB();

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return reply.status(400).send({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    db.prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)').run(userId, email, hashedPassword);

    // Create default settings
    db.prepare('INSERT INTO user_settings (id, user_id, base_currency, language) VALUES (?, ?, ?, ?)').run(uuidv4(), userId, 'EUR', 'es');

    // Seed default categories, tags, and accounts
    seedUserData(userId);

    const token = fastify.jwt.sign({ userId, email });

    return { token, user: { id: userId, email } };
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email y contraseña son requeridos' });
    }

    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return reply.status(401).send({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Credenciales inválidas' });
    }

    const token = fastify.jwt.sign({ userId: user.id, email: user.email });

    return { token, user: { id: user.id, email: user.email } };
  });

  // Get current user
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const db = getDB();
    const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(request.user.userId);

    if (!user) {
      return reply.status(404).send({ error: 'Usuario no encontrado' });
    }

    return { user };
  });
}

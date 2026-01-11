import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDB } from './db/init.js';
import authRoutes from './routes/auth.js';
import categoriesRoutes from './routes/categories.js';
import tagsRoutes from './routes/tags.js';
import accountsRoutes from './routes/accounts.js';
import expensesRoutes from './routes/expenses.js';
import syncRoutes from './routes/sync.js';
import settingsRoutes from './routes/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: true
});

await fastify.register(cors, {
  origin: true,
  credentials: true
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'gastos-super-secret-key-change-in-production'
});

fastify.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'No autorizado' });
  }
});

initDB();

await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(categoriesRoutes, { prefix: '/api/categories' });
await fastify.register(tagsRoutes, { prefix: '/api/tags' });
await fastify.register(accountsRoutes, { prefix: '/api/accounts' });
await fastify.register(expensesRoutes, { prefix: '/api/expenses' });
await fastify.register(syncRoutes, { prefix: '/api/sync' });
await fastify.register(settingsRoutes, { prefix: '/api/settings' });

// Serve frontend static files
const frontendPath = process.env.FRONTEND_PATH || join(__dirname, '../../frontend/dist');
await fastify.register(fastifyStatic, {
  root: frontendPath,
  prefix: '/'
});

// SPA fallback
fastify.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api/')) {
    reply.status(404).send({ error: 'Ruta no encontrada' });
  } else {
    reply.sendFile('index.html');
  }
});

const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

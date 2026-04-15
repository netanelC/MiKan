import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({ logger: true });

  await app.register(cors, {
    origin: '*',
  });

  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(adminRoutes, { prefix: '/api/admin' });

  return app;
}

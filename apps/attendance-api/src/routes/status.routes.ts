import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StatusService } from '../services/status.service';
import { engine } from './auth.routes';

const statusService = new StatusService();

export default async function statusRoutes(fastify: FastifyInstance) {
  fastify.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dashboardData = await statusService.getDashboardStatus();
      const botStatus = engine.getStatus();
      return reply.status(200).send({
        botStatus,
        ...dashboardData,
      });
    } catch (error: unknown) {
      fastify.log.error(error);
      const err = error as Error;
      return reply.status(500).send({ error: err.message || 'Internal Server Error' });
    }
  });
}

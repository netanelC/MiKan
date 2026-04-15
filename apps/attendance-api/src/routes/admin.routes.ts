import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SnapshotService } from '../services/snapshot.service';
import { engine } from './auth.routes';

const snapshotService = new SnapshotService(engine);

interface TriggerBody {
  groupId: string;
  pollTitle?: string;
  options?: string[];
}

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/trigger-loop',
    async (request: FastifyRequest<{ Body: TriggerBody }>, reply: FastifyReply) => {
      const { groupId, pollTitle, options } = request.body;

      if (!groupId) {
        return reply.status(400).send({ error: 'groupId is required' });
      }

      try {
        const defaultTitle = pollTitle || 'Daily Attendance';
        const defaultOptions = options || ['Present', 'Absent'];

        const result = await snapshotService.takeSnapshotAndSendPoll(
          groupId,
          defaultTitle,
          defaultOptions,
        );
        return reply.status(200).send(result);
      } catch (error: unknown) {
        fastify.log.error(error);
        const err = error as Error;
        return reply.status(500).send({ error: err.message || 'Internal Server Error' });
      }
    },
  );
}

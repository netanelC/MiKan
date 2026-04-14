import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WhatsAppEngine } from 'whatsapp-engine';

// Instantiate the engine singleton
export const engine = new WhatsAppEngine();
engine.start();

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/qr', (request: FastifyRequest, reply: FastifyReply) => {
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    // Send initial ping to establish connection
    reply.raw.write('data: {"status":"connected"}\n\n');

    const onQr = (qr: string) => {
      reply.raw.write(`data: ${JSON.stringify({ qr })}\n\n`);
    };

    const onReady = () => {
      reply.raw.write(`data: ${JSON.stringify({ status: 'ready' })}\n\n`);
    };

    engine.on('qr', onQr);
    engine.on('ready', onReady);

    request.raw.on('close', () => {
      engine.off('qr', onQr);
      engine.off('ready', onReady);
    });
  });
}

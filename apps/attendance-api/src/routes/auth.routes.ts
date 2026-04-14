import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WhatsAppEngine } from 'whatsapp-engine';

// Instantiate the engine singleton
export const engine = new WhatsAppEngine();

// Catch global engine errors to prevent process crash
engine.on('error', (err) => {
  console.error('WhatsApp Engine Error:', err);
});

engine.start();

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/qr', (request: FastifyRequest, reply: FastifyReply) => {
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    // Send initial status
    const currentStatus = engine.getStatus();
    reply.raw.write(`data: ${JSON.stringify({ status: currentStatus })}\n\n`);

    const onQr = (qr: string) => {
      reply.raw.write(`data: ${JSON.stringify({ qr, status: 'qr_ready' })}\n\n`);
    };

    const onAuthenticated = () => {
      reply.raw.write(`data: ${JSON.stringify({ status: 'authenticated' })}\n\n`);
    };

    const onReady = () => {
      reply.raw.write(`data: ${JSON.stringify({ status: 'ready' })}\n\n`);
    };

    const onAuthFailure = (msg: string) => {
      reply.raw.write(`data: ${JSON.stringify({ status: 'auth_failure', message: msg })}\n\n`);
    };

    const onDisconnected = (reason: string) => {
      reply.raw.write(`data: ${JSON.stringify({ status: 'disconnected', reason })}\n\n`);
    };

    engine.on('qr', onQr);
    engine.on('authenticated', onAuthenticated);
    engine.on('ready', onReady);
    engine.on('auth_failure', onAuthFailure);
    engine.on('disconnected', onDisconnected);

    request.raw.on('close', () => {
      engine.off('qr', onQr);
      engine.off('authenticated', onAuthenticated);
      engine.off('ready', onReady);
      engine.off('auth_failure', onAuthFailure);
      engine.off('disconnected', onDisconnected);
    });
  });
}

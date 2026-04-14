import { describe, it, vi, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app';
import { FastifyInstance } from 'fastify';
import supertest from 'supertest';

vi.mock('whatsapp-engine', () => {
  return {
    WhatsAppEngine: class {
      start() {}
      on() {}
      off() {}
      getStatus() {
        return 'disconnected';
      }
    },
  };
});

describe('Auth Component', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/auth/qr_ValidRequest_Returns200AndStartsSSE', () => {
    // Arrange
    const url = '/api/auth/qr';

    // Act & Assert
    return new Promise<void>((resolve, reject) => {
      const req = supertest(app.server)
        .get(url)
        .expect('Content-Type', /text\/event-stream/)
        .expect(200);

      req
        .buffer(false)
        .parse((res, _callback) => {
          res.on('data', (chunk: Buffer) => {
            if (chunk.toString().includes('connected')) {
              (res as unknown as { destroy: () => void }).destroy();
              resolve();
            }
          });
        })
        .end((err: Error | null) => {
          if (err && err.message !== 'socket hang up' && err.message !== 'aborted') {
            reject(err);
          }
        });
    });
  });
});

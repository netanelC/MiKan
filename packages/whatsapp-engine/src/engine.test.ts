import { describe, it, expect, vi } from 'vitest';
import { WhatsAppEngine } from './engine';

// We mock whatsapp-web.js because we can't spawn a real browser and scan a QR in tests
vi.mock('whatsapp-web.js', () => {
  return {
    Client: class MockClient {
      qrCallback: ((qr: string) => void) | undefined;
      readyCallback: (() => void) | undefined;
      initialize() {}
      on(event: string, callback: (...args: never[]) => void) {
        if (event === 'qr') this.qrCallback = callback as (qr: string) => void;
        if (event === 'ready') this.readyCallback = callback as () => void;
      }
      emitQr(qr: string) {
        this.qrCallback?.(qr);
      }
      emitReady() {
        this.readyCallback?.();
      }
    },
    LocalAuth: class MockLocalAuth {},
  };
});

describe('WhatsAppEngine', () => {
  it('should emit qr code when client generates one', () => {
    const engine = new WhatsAppEngine();
    const qrSpy = vi.fn();
    engine.on('qr', qrSpy);

    engine.start();

    // Simulate the underlying client emitting a QR code
    const mockClient = (engine as unknown as { client: { emitQr: (qr: string) => void } }).client;
    mockClient.emitQr('mock-qr-code');

    expect(qrSpy).toHaveBeenCalledWith('mock-qr-code');
  });

  it('should emit ready when client connects', () => {
    const engine = new WhatsAppEngine();
    const readySpy = vi.fn();
    engine.on('ready', readySpy);

    engine.start();

    const mockClient = (engine as unknown as { client: { emitReady: () => void } }).client;
    mockClient.emitReady();

    expect(readySpy).toHaveBeenCalled();
  });
});

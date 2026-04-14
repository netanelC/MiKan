import { describe, it, expect, vi } from 'vitest';
import { WhatsAppEngine } from './engine';

// We mock whatsapp-web.js because we can't spawn a real browser and scan a QR in tests
vi.mock('whatsapp-web.js', () => {
  return {
    Client: class MockClient {
      qrCallback: ((qr: string) => void) | undefined;
      readyCallback: (() => void) | undefined;
      initialize() {
        return Promise.resolve();
      }
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
  it('StartClient_ClientGeneratesQR_EmitsQrEvent', () => {
    // Arrange
    const engine = new WhatsAppEngine();
    const qrSpy = vi.fn();
    engine.on('qr', qrSpy);

    // Act
    engine.start();

    // Simulate the underlying client emitting a QR code
    const mockClient = (engine as unknown as { client: { emitQr: (qr: string) => void } }).client;
    mockClient.emitQr('mock-qr-code');

    // Assert
    expect(qrSpy).toHaveBeenCalledWith('mock-qr-code');
  });

  it('StartClient_ClientConnects_EmitsReadyEvent', () => {
    // Arrange
    const engine = new WhatsAppEngine();
    const readySpy = vi.fn();
    engine.on('ready', readySpy);

    // Act
    engine.start();

    const mockClient = (engine as unknown as { client: { emitReady: () => void } }).client;
    mockClient.emitReady();

    // Assert
    expect(readySpy).toHaveBeenCalled();
  });
});

import { Client, LocalAuth } from 'whatsapp-web.js';
import { EventEmitter } from 'events';

export class WhatsAppEngine extends EventEmitter {
  private client: Client;
  private isConnected: boolean = false;

  constructor() {
    super();
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      },
    });

    this.client.on('qr', (qr) => {
      this.emit('qr', qr);
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.emit('ready');
    });

    this.client.on('authenticated', () => {
      this.emit('authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      this.emit('auth_failure', msg);
    });

    this.client.on('disconnected', (reason) => {
      this.isConnected = false;
      this.emit('disconnected', reason);
    });
  }

  public start() {
    this.client.initialize().catch((err) => {
      this.emit('error', err);
    });
  }

  public getStatus() {
    return this.isConnected ? 'ready' : 'disconnected';
  }
}

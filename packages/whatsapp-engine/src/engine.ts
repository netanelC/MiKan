import { Client, LocalAuth } from 'whatsapp-web.js';
import { EventEmitter } from 'events';

export class WhatsAppEngine extends EventEmitter {
  private client: Client;

  constructor() {
    super();
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.client.on('qr', (qr) => {
      this.emit('qr', qr);
    });

    this.client.on('ready', () => {
      this.emit('ready');
    });
  }

  public start() {
    this.client.initialize();
  }
}

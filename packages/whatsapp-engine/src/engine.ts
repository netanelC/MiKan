import { Client, LocalAuth, Poll } from 'whatsapp-web.js';
import { EventEmitter } from 'events';

export interface GroupParticipant {
  id: string;
  name?: string;
}

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

  /**
   * Fetches all participants from a specific WhatsApp group
   */
  public async getGroupParticipants(groupId: string): Promise<GroupParticipant[]> {
    if (!this.isConnected) throw new Error('WhatsApp Engine not connected');

    const chat = await this.client.getChatById(groupId);
    if (!chat.isGroup) throw new Error('Chat is not a group');

    const groupChat = chat as unknown as {
      participants: Array<{ id: { _serialized: string; user?: string }; name?: string }>;
    };
    const participants = groupChat.participants;

    return participants.map((p) => ({
      id: p.id._serialized,
      name: p.name || p.id.user,
    }));
  }

  /**
   * Sends a native WhatsApp poll to a specific group
   */
  public async sendPoll(groupId: string, pollName: string, options: string[]): Promise<string> {
    if (!this.isConnected) throw new Error('WhatsApp Engine not connected');

    const poll = new Poll(pollName, options, { allowMultipleAnswers: false } as never);
    const message = await this.client.sendMessage(groupId, poll);

    return message.id.id;
  }
}

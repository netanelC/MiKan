import { describe, it, vi, beforeEach, expect } from 'vitest';
import { buildApp } from '../app';
import { FastifyInstance } from 'fastify';
import { prisma } from 'database';

vi.mock('whatsapp-engine', () => {
  return {
    WhatsAppEngine: class {
      start() {}
      on() {}
      off() {}
      getStatus() {
        return 'ready';
      }
    },
  };
});

describe('Status Component', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
    await app.ready();

    // Clean DB before each test
    await prisma.attendanceRecord.deleteMany({});
    await prisma.groupMember.deleteMany({});
    await prisma.pollState.deleteMany({});

    vi.restoreAllMocks();
  });

  it('GET /api/status_NoActivePoll_ReturnsEmptyMembers', async () => {
    // Act
    const response = await app.inject({
      method: 'GET',
      url: '/api/status',
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.botStatus).toBe('ready');
    expect(data.activePoll).toBeNull();
    expect(data.members).toEqual([]);
  });

  it('GET /api/status_WithActivePollAndMembers_ReturnsPollAndPendingMembers', async () => {
    // Arrange
    const now = new Date();
    await prisma.pollState.create({
      data: {
        pollId: 'poll-123',
        date: now,
        options: ['Present', 'Absent'],
      },
    });

    const member1 = await prisma.groupMember.create({
      data: {
        whatsappId: '123@c.us',
        name: 'Alice',
        timestamp: now,
      },
    });

    await prisma.groupMember.create({
      data: {
        whatsappId: '456@c.us',
        name: 'Bob',
        timestamp: now,
      },
    });

    // Add an attendance record for Alice
    await prisma.attendanceRecord.create({
      data: {
        memberId: member1.id,
        date: now,
        status: 'PRESENT',
      },
    });

    // Act
    const response = await app.inject({
      method: 'GET',
      url: '/api/status',
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.botStatus).toBe('ready');
    expect(data.activePoll).toMatchObject({
      id: 'poll-123',
      options: ['Present', 'Absent'],
    });

    // Alice should be PRESENT, Bob should be PENDING
    expect(data.members).toHaveLength(2);
    const alice = data.members.find(
      (m: { whatsappId: string; status: string }) => m.whatsappId === '123@c.us',
    );
    const bob = data.members.find(
      (m: { whatsappId: string; status: string }) => m.whatsappId === '456@c.us',
    );

    expect(alice.status).toBe('PRESENT');
    expect(bob.status).toBe('PENDING');
  });
});

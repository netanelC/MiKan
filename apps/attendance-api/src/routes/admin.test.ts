import { describe, it, vi, beforeEach, expect } from 'vitest';
import { buildApp } from '../app';
import { FastifyInstance } from 'fastify';
import { prisma } from 'database';
import { engine } from './auth.routes';

vi.mock('whatsapp-engine', () => {
  return {
    WhatsAppEngine: class {
      start() {}
      on() {}
      off() {}
      getStatus() {
        return 'ready';
      }
      getGroupParticipants() {
        return Promise.resolve([
          { id: '123@c.us', name: 'Alice' },
          { id: '456@c.us', name: 'Bob' },
        ]);
      }
      sendPoll() {
        return Promise.resolve('mock-poll-id-123');
      }
    },
  };
});

describe('Admin Component', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
    await app.ready();

    // Clean DB before each test
    await prisma.groupMember.deleteMany({});
    await prisma.pollState.deleteMany({});

    vi.restoreAllMocks();
  });

  it('POST /api/admin/trigger-loop_ValidGroupId_TakesSnapshotAndSendsPoll', async () => {
    // Arrange
    const payload = { groupId: 'test-group-id' };
    const getParticipantsSpy = vi.spyOn(engine, 'getGroupParticipants');
    const sendPollSpy = vi.spyOn(engine, 'sendPoll');

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/trigger-loop',
      payload,
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const responseData = response.json();
    expect(responseData.memberCount).toBe(2);
    expect(responseData.pollId).toBe('mock-poll-id-123');

    // Verify Engine Spies
    expect(getParticipantsSpy).toHaveBeenCalledWith('test-group-id');
    expect(sendPollSpy).toHaveBeenCalledWith('test-group-id', 'Daily Attendance', [
      'Present',
      'Absent',
    ]);

    // Verify Database State
    const members = await prisma.groupMember.findMany();
    expect(members).toHaveLength(2);
    expect(members.map((m) => m.name)).toEqual(expect.arrayContaining(['Alice', 'Bob']));

    const pollStates = await prisma.pollState.findMany();
    expect(pollStates).toHaveLength(1);
    expect(pollStates[0].pollId).toBe('mock-poll-id-123');
  });

  it('POST /api/admin/trigger-loop_MissingGroupId_Returns400', async () => {
    // Arrange
    const payload = {}; // Missing groupId

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/trigger-loop',
      payload,
    });

    // Assert
    expect(response.statusCode).toBe(400);
    const members = await prisma.groupMember.count();
    expect(members).toBe(0);
  });
});

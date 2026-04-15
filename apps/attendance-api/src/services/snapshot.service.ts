import { WhatsAppEngine } from 'whatsapp-engine';
import { prisma } from 'database';

export class SnapshotService {
  constructor(private engine: WhatsAppEngine) {}

  /**
   * Captures a snapshot of all group members and sends a native WhatsApp poll.
   * This is intended to be called at 9:00 AM daily or via manual trigger.
   */
  public async takeSnapshotAndSendPoll(groupId: string, pollTitle: string, options: string[]) {
    // 1. Fetch participants from WhatsApp
    const participants = await this.engine.getGroupParticipants(groupId);

    // 2. Perform DB operations in a transaction
    return await prisma.$transaction(async (tx) => {
      // Create GroupMember records for this snapshot
      const memberPromises = participants.map((p) =>
        tx.groupMember.create({
          data: {
            whatsappId: p.id,
            name: p.name || 'Unknown',
            timestamp: new Date(),
          },
        }),
      );

      const savedMembers = await Promise.all(memberPromises);

      // Send the poll via WhatsApp
      const pollId = await this.engine.sendPoll(groupId, pollTitle, options);

      // Save the poll state linked to this day
      const pollState = await tx.pollState.create({
        data: {
          pollId,
          date: new Date(),
          options: options as unknown as import('database').Prisma.InputJsonArray,
        },
      });

      return {
        memberCount: savedMembers.length,
        pollId: pollState.pollId,
      };
    });
  }
}

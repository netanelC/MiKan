import { prisma } from 'database';

export class StatusService {
  public async getDashboardStatus() {
    // Get latest poll state
    const latestPoll = await prisma.pollState.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!latestPoll) {
      return { activePoll: null, members: [] };
    }

    // Get members created on the same day as the poll
    const startOfDay = new Date(latestPoll.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(latestPoll.date);
    endOfDay.setHours(23, 59, 59, 999);

    const members = await prisma.groupMember.findMany({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        attendanceRecords: {
          where: {
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
      },
    });

    // Handle duplicate members if multiple snapshots were taken in the same day (for testing)
    // We only want the most recent snapshot of members for that day.
    // Group members by whatsappId and pick the one with the latest timestamp.
    const memberMap = new Map<string, (typeof members)[0]>();
    for (const member of members) {
      const existing = memberMap.get(member.whatsappId);
      if (!existing || member.timestamp > existing.timestamp) {
        memberMap.set(member.whatsappId, member);
      }
    }

    const uniqueMembers = Array.from(memberMap.values());

    const mappedMembers = uniqueMembers.map((member) => {
      const record = member.attendanceRecords[0];
      return {
        id: member.id,
        whatsappId: member.whatsappId,
        name: member.name,
        status: record ? record.status : 'PENDING',
      };
    });

    return {
      activePoll: {
        id: latestPoll.pollId,
        date: latestPoll.date,
        options: latestPoll.options,
      },
      members: mappedMembers,
    };
  }
}

import { Worker } from "bullmq";
import { QUEUE_NAMES, getRedisConnection } from "@/lib/queue/config";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { PrismaClient } from "@prisma/client";
import { QueueService } from "@/lib/queue-service";

const prisma = new PrismaClient();
const connection = getRedisConnection();

// If Redis is not configured (or during build), do not initialize workers
if (connection) {
new Worker(
  QUEUE_NAMES.LEAD_EXPIRY,
  async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const expiredLeads = await prisma.lead.findMany({
      where: { status: "ACCEPTED", respondedAt: { lt: oneDayAgo }, expiresAt: null },
    });
    for (const lead of expiredLeads) {
      await prisma.lead.update({ where: { id: lead.id }, data: { status: "EXPIRED", expiresAt: now } });
      if (lead.realtorId) {
        await QueueService.updateScore(lead.realtorId, -10, "LEAD_EXPIRED", "Lead expirou sem conclusão");
        await QueueService.decrementActiveLeads(lead.realtorId);
        await prisma.realtorStats.update({ where: { realtorId: lead.realtorId }, data: { leadsExpired: { increment: 1 } } });
      }
    }
  },
  { connection, concurrency: 1 }
);

new Worker(
  QUEUE_NAMES.QUEUE_RECALCULATION,
  async () => {
    const queues = await prisma.realtorQueue.findMany({ where: { status: "ACTIVE" }, orderBy: [{ score: "desc" }, { createdAt: "asc" }] });
    for (let i = 0; i < queues.length; i++) {
      await prisma.realtorQueue.update({ where: { id: queues[i].id }, data: { position: i + 1 } });
    }
  },
  { connection, concurrency: 1 }
);

new Worker(
  QUEUE_NAMES.CLEANUP,
  async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await prisma.scoreHistory.deleteMany({ where: { createdAt: { lt: thirtyDaysAgo } } });
    await prisma.lead.deleteMany({ where: { status: "EXPIRED", expiresAt: { lt: thirtyDaysAgo } } });
  },
  { connection, concurrency: 1 }
);

new Worker(
  QUEUE_NAMES.ASSISTANT_RECALCULATION,
  async () => {
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const rows = await prisma.lead.findMany({
      where: {
        realtorId: { not: null },
        OR: [
          {
            status: {
              in: [
                "WAITING_REALTOR_ACCEPT",
                "WAITING_OWNER_APPROVAL",
                "CONFIRMED",
                "ACCEPTED",
                "RESERVED",
              ] as any,
            },
            updatedAt: { gte: since },
          },
          { nextActionDate: { lte: next24h } },
        ],
      },
      select: { realtorId: true },
      distinct: ["realtorId"],
    });

    for (const row of rows) {
      const realtorId = row.realtorId;
      if (!realtorId) continue;
      try {
        await RealtorAssistantService.recalculateForRealtor(realtorId);
      } catch {
        // ignore
      }
    }
  },
  { connection, concurrency: 1 }
);

}

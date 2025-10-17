import { Worker } from "bullmq";
import { QUEUE_NAMES, redisConnection } from "@/lib/queue/config";
import { LeadDistributionService } from "@/lib/lead-distribution-service";
import { PrismaClient } from "@prisma/client";
import { QueueService } from "@/lib/queue-service";

const prisma = new PrismaClient();

new Worker(
  QUEUE_NAMES.LEAD_DISTRIBUTION,
  async (job) => {
    const { leadId } = job.data as { leadId: string };
    await LeadDistributionService.distributeNewLead(leadId);
  },
  { connection: redisConnection, concurrency: 5 }
);

new Worker(
  QUEUE_NAMES.RESERVATION_EXPIRY,
  async () => {
    await LeadDistributionService.releaseExpiredReservations();
  },
  { connection: redisConnection, concurrency: 1 }
);

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
  { connection: redisConnection, concurrency: 1 }
);

new Worker(
  QUEUE_NAMES.QUEUE_RECALCULATION,
  async () => {
    const queues = await prisma.realtorQueue.findMany({ where: { status: "ACTIVE" }, orderBy: [{ score: "desc" }, { createdAt: "asc" }] });
    for (let i = 0; i < queues.length; i++) {
      await prisma.realtorQueue.update({ where: { id: queues[i].id }, data: { position: i + 1 } });
    }
  },
  { connection: redisConnection, concurrency: 1 }
);

new Worker(
  QUEUE_NAMES.CLEANUP,
  async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await prisma.scoreHistory.deleteMany({ where: { createdAt: { lt: thirtyDaysAgo } } });
    await prisma.lead.deleteMany({ where: { status: "EXPIRED", expiresAt: { lt: thirtyDaysAgo } } });
  },
  { connection: redisConnection, concurrency: 1 }
);

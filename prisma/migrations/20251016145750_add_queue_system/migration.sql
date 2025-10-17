-- CreateEnum
CREATE TYPE "RealtorQueueStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CandidatureStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadStatus" ADD VALUE 'RESERVED';
ALTER TYPE "LeadStatus" ADD VALUE 'AVAILABLE';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "reservedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "realtor_queue" (
    "id" TEXT NOT NULL,
    "realtorId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" "RealtorQueueStatus" NOT NULL DEFAULT 'ACTIVE',
    "activeLeads" INTEGER NOT NULL DEFAULT 0,
    "bonusLeads" INTEGER NOT NULL DEFAULT 0,
    "totalAccepted" INTEGER NOT NULL DEFAULT 0,
    "totalRejected" INTEGER NOT NULL DEFAULT 0,
    "totalExpired" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" INTEGER,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "realtor_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_candidatures" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "status" "CandidatureStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "lead_candidatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_history" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realtor_stats" (
    "id" TEXT NOT NULL,
    "realtorId" TEXT NOT NULL,
    "leadsAccepted" INTEGER NOT NULL DEFAULT 0,
    "leadsRejected" INTEGER NOT NULL DEFAULT 0,
    "leadsExpired" INTEGER NOT NULL DEFAULT 0,
    "leadsCompleted" INTEGER NOT NULL DEFAULT 0,
    "visitsScheduled" INTEGER NOT NULL DEFAULT 0,
    "visitsCompleted" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" INTEGER,
    "totalResponseTime" INTEGER NOT NULL DEFAULT 0,
    "lastLeadAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "realtor_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realtor_ratings" (
    "id" TEXT NOT NULL,
    "realtorId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "realtor_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "realtor_queue_realtorId_key" ON "realtor_queue"("realtorId");

-- CreateIndex
CREATE INDEX "realtor_queue_position_idx" ON "realtor_queue"("position");

-- CreateIndex
CREATE INDEX "realtor_queue_score_idx" ON "realtor_queue"("score");

-- CreateIndex
CREATE INDEX "realtor_queue_status_idx" ON "realtor_queue"("status");

-- CreateIndex
CREATE INDEX "lead_candidatures_leadId_idx" ON "lead_candidatures"("leadId");

-- CreateIndex
CREATE INDEX "lead_candidatures_queueId_idx" ON "lead_candidatures"("queueId");

-- CreateIndex
CREATE INDEX "lead_candidatures_status_idx" ON "lead_candidatures"("status");

-- CreateIndex
CREATE UNIQUE INDEX "lead_candidatures_leadId_queueId_key" ON "lead_candidatures"("leadId", "queueId");

-- CreateIndex
CREATE INDEX "score_history_queueId_idx" ON "score_history"("queueId");

-- CreateIndex
CREATE INDEX "score_history_createdAt_idx" ON "score_history"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "realtor_stats_realtorId_key" ON "realtor_stats"("realtorId");

-- CreateIndex
CREATE INDEX "realtor_stats_realtorId_idx" ON "realtor_stats"("realtorId");

-- CreateIndex
CREATE UNIQUE INDEX "realtor_ratings_leadId_key" ON "realtor_ratings"("leadId");

-- CreateIndex
CREATE INDEX "realtor_ratings_realtorId_idx" ON "realtor_ratings"("realtorId");

-- CreateIndex
CREATE INDEX "realtor_ratings_leadId_idx" ON "realtor_ratings"("leadId");

-- CreateIndex
CREATE INDEX "leads_reservedUntil_idx" ON "leads"("reservedUntil");

-- AddForeignKey
ALTER TABLE "realtor_queue" ADD CONSTRAINT "realtor_queue_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_candidatures" ADD CONSTRAINT "lead_candidatures_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_candidatures" ADD CONSTRAINT "lead_candidatures_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "realtor_queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_history" ADD CONSTRAINT "score_history_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "realtor_queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtor_stats" ADD CONSTRAINT "realtor_stats_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtor_ratings" ADD CONSTRAINT "realtor_ratings_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtor_ratings" ADD CONSTRAINT "realtor_ratings_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

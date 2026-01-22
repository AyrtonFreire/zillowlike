-- CreateEnum
CREATE TYPE "LeadAutoReplyJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "LeadAutoReplyDecision" AS ENUM ('SENT', 'SKIPPED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadEventType" ADD VALUE 'AUTO_REPLY_SENT';
ALTER TYPE "LeadEventType" ADD VALUE 'AUTO_REPLY_SKIPPED';
ALTER TYPE "LeadEventType" ADD VALUE 'AUTO_REPLY_FAILED';

-- AlterEnum
ALTER TYPE "PropertyType" ADD VALUE 'RURAL';

-- DropForeignKey
ALTER TABLE "public"."review_reports" DROP CONSTRAINT "review_reports_reportedByUserId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "agency_profiles" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "owner_ratings" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "owner_stats" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "properties" ALTER COLUMN "price" SET DATA TYPE BIGINT,
ALTER COLUMN "condoFee" SET DATA TYPE BIGINT,
ALTER COLUMN "privateBrokerFeeFixed" SET DATA TYPE BIGINT,
ALTER COLUMN "privateOwnerPrice" SET DATA TYPE BIGINT,
ALTER COLUMN "iptuYearly" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "realtor_ratings" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "review_reports" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "lead_auto_reply_jobs" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "clientMessageId" TEXT NOT NULL,
    "status" "LeadAutoReplyJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "skipReason" TEXT,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_auto_reply_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_auto_reply_logs" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "realtorId" TEXT NOT NULL,
    "clientMessageId" TEXT NOT NULL,
    "assistantMessageId" TEXT,
    "decision" "LeadAutoReplyDecision" NOT NULL,
    "reason" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_auto_reply_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_auto_reply_jobs_clientMessageId_key" ON "lead_auto_reply_jobs"("clientMessageId");

-- CreateIndex
CREATE INDEX "lead_auto_reply_jobs_leadId_createdAt_idx" ON "lead_auto_reply_jobs"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "lead_auto_reply_jobs_status_createdAt_idx" ON "lead_auto_reply_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "lead_auto_reply_logs_leadId_createdAt_idx" ON "lead_auto_reply_logs"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "lead_auto_reply_logs_realtorId_createdAt_idx" ON "lead_auto_reply_logs"("realtorId", "createdAt");

-- AddForeignKey
ALTER TABLE "lead_auto_reply_jobs" ADD CONSTRAINT "lead_auto_reply_jobs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_auto_reply_logs" ADD CONSTRAINT "lead_auto_reply_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_auto_reply_logs" ADD CONSTRAINT "lead_auto_reply_logs_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


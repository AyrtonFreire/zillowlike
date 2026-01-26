-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LeadAutoReplyJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'SKIPPED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LeadAutoReplyDecision" AS ENUM ('SENT', 'SKIPPED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "lead_auto_reply_jobs" (
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

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "lead_auto_reply_jobs_clientMessageId_key" ON "lead_auto_reply_jobs"("clientMessageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lead_auto_reply_jobs_leadId_createdAt_idx" ON "lead_auto_reply_jobs"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lead_auto_reply_jobs_status_createdAt_idx" ON "lead_auto_reply_jobs"("status", "createdAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_auto_reply_jobs_leadId_fkey'
  ) THEN
    ALTER TABLE "lead_auto_reply_jobs"
      ADD CONSTRAINT "lead_auto_reply_jobs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "lead_auto_reply_logs" (
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
CREATE INDEX IF NOT EXISTS "lead_auto_reply_logs_leadId_createdAt_idx" ON "lead_auto_reply_logs"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lead_auto_reply_logs_realtorId_createdAt_idx" ON "lead_auto_reply_logs"("realtorId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_auto_reply_logs_leadId_fkey'
  ) THEN
    ALTER TABLE "lead_auto_reply_logs"
      ADD CONSTRAINT "lead_auto_reply_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_auto_reply_logs_realtorId_fkey'
  ) THEN
    ALTER TABLE "lead_auto_reply_logs"
      ADD CONSTRAINT "lead_auto_reply_logs_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

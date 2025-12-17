-- CreateEnum
CREATE TYPE "RealtorAssistantItemType" AS ENUM ('NEW_LEAD', 'UNANSWERED_CLIENT_MESSAGE', 'LEAD_NO_FIRST_CONTACT', 'LEAD_STUCK_STAGE', 'REMINDER_TODAY', 'REMINDER_OVERDUE', 'VISIT_TODAY', 'VISIT_TOMORROW', 'OWNER_APPROVAL_PENDING', 'SIMILAR_LIST_SHARED_FOLLOWUP', 'STALE_LEAD', 'PIPELINE_HYGIENE');

-- CreateEnum
CREATE TYPE "RealtorAssistantItemPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RealtorAssistantItemStatus" AS ENUM ('ACTIVE', 'SNOOZED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RealtorAssistantItemSource" AS ENUM ('RULE', 'EVENT', 'AI');

-- CreateTable
CREATE TABLE "realtor_assistant_items" (
    "id" TEXT NOT NULL,
    "realtorId" TEXT NOT NULL,
    "leadId" TEXT,
    "type" "RealtorAssistantItemType" NOT NULL,
    "priority" "RealtorAssistantItemPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "RealtorAssistantItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "RealtorAssistantItemSource" NOT NULL DEFAULT 'RULE',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "primaryAction" JSONB,
    "secondaryAction" JSONB,
    "metadata" JSONB,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "realtor_assistant_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "realtor_assistant_items_realtorId_status_priority_idx" ON "realtor_assistant_items"("realtorId", "status", "priority");

-- CreateIndex
CREATE INDEX "realtor_assistant_items_leadId_status_idx" ON "realtor_assistant_items"("leadId", "status");

-- CreateIndex
CREATE INDEX "realtor_assistant_items_dueAt_idx" ON "realtor_assistant_items"("dueAt");

-- CreateIndex
CREATE INDEX "realtor_assistant_items_snoozedUntil_idx" ON "realtor_assistant_items"("snoozedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "realtor_assistant_items_realtorId_dedupeKey_key" ON "realtor_assistant_items"("realtorId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "realtor_assistant_items" ADD CONSTRAINT "realtor_assistant_items_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtor_assistant_items" ADD CONSTRAINT "realtor_assistant_items_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

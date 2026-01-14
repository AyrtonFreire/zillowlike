-- CreateEnum
CREATE TYPE "AssistantContext" AS ENUM ('REALTOR', 'AGENCY');

-- CreateEnum
CREATE TYPE "AssistantItemPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AssistantItemStatus" AS ENUM ('ACTIVE', 'SNOOZED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AssistantItemSource" AS ENUM ('RULE', 'EVENT', 'AI');

-- CreateTable
CREATE TABLE "assistant_items" (
    "id" TEXT NOT NULL,
    "context" "AssistantContext" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "teamId" TEXT,
    "leadId" TEXT,
    "clientId" TEXT,
    "propertyId" TEXT,
    "type" TEXT NOT NULL,
    "priority" "AssistantItemPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "AssistantItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "AssistantItemSource" NOT NULL DEFAULT 'RULE',
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

    CONSTRAINT "assistant_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assistant_items_context_ownerId_dedupeKey_key" ON "assistant_items"("context", "ownerId", "dedupeKey");

-- CreateIndex
CREATE INDEX "assistant_items_context_ownerId_status_priority_idx" ON "assistant_items"("context", "ownerId", "status", "priority");

-- CreateIndex
CREATE INDEX "assistant_items_teamId_status_idx" ON "assistant_items"("teamId", "status");

-- CreateIndex
CREATE INDEX "assistant_items_leadId_status_idx" ON "assistant_items"("leadId", "status");

-- CreateIndex
CREATE INDEX "assistant_items_clientId_status_idx" ON "assistant_items"("clientId", "status");

-- CreateIndex
CREATE INDEX "assistant_items_propertyId_status_idx" ON "assistant_items"("propertyId", "status");

-- CreateIndex
CREATE INDEX "assistant_items_dueAt_idx" ON "assistant_items"("dueAt");

-- CreateIndex
CREATE INDEX "assistant_items_snoozedUntil_idx" ON "assistant_items"("snoozedUntil");

-- AddForeignKey
ALTER TABLE "assistant_items" ADD CONSTRAINT "assistant_items_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_items" ADD CONSTRAINT "assistant_items_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_items" ADD CONSTRAINT "assistant_items_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_items" ADD CONSTRAINT "assistant_items_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_items" ADD CONSTRAINT "assistant_items_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing Realtor Assistant items
INSERT INTO "assistant_items" (
  "id",
  "context",
  "ownerId",
  "teamId",
  "leadId",
  "clientId",
  "propertyId",
  "type",
  "priority",
  "status",
  "source",
  "title",
  "message",
  "dueAt",
  "snoozedUntil",
  "resolvedAt",
  "dismissedAt",
  "primaryAction",
  "secondaryAction",
  "metadata",
  "dedupeKey",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  'REALTOR'::"AssistantContext" AS "context",
  "realtorId" AS "ownerId",
  NULL::TEXT AS "teamId",
  "leadId",
  NULL::TEXT AS "clientId",
  NULL::TEXT AS "propertyId",
  ("type"::TEXT) AS "type",
  ("priority"::TEXT)::"AssistantItemPriority" AS "priority",
  ("status"::TEXT)::"AssistantItemStatus" AS "status",
  ("source"::TEXT)::"AssistantItemSource" AS "source",
  "title",
  "message",
  "dueAt",
  "snoozedUntil",
  "resolvedAt",
  "dismissedAt",
  "primaryAction",
  "secondaryAction",
  "metadata",
  "dedupeKey",
  "createdAt",
  "updatedAt"
FROM "realtor_assistant_items";

-- Drop old table
DROP TABLE "realtor_assistant_items";

-- Drop old enums
DROP TYPE "RealtorAssistantItemType";
DROP TYPE "RealtorAssistantItemPriority";
DROP TYPE "RealtorAssistantItemStatus";
DROP TYPE "RealtorAssistantItemSource";

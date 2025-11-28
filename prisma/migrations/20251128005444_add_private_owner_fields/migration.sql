-- CreateEnum
CREATE TYPE "LeadEventType" AS ENUM ('LEAD_CREATED', 'LEAD_ACCEPTED', 'LEAD_REJECTED', 'LEAD_COMPLETED', 'LEAD_LOST', 'STAGE_CHANGED', 'NOTE_ADDED', 'INTERNAL_MESSAGE', 'CLIENT_MESSAGE', 'REMINDER_SET', 'REMINDER_CLEARED', 'VISIT_REQUESTED', 'VISIT_CONFIRMED', 'VISIT_REJECTED', 'OWNER_APPROVAL_REQUESTED', 'SIMILAR_LIST_SHARED', 'SIMILAR_PROPERTY_INTEREST');

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "privateBrokerFeeFixed" INTEGER,
ADD COLUMN     "privateBrokerFeePercent" DOUBLE PRECISION,
ADD COLUMN     "privateExclusive" BOOLEAN DEFAULT false,
ADD COLUMN     "privateExclusiveUntil" TIMESTAMP(3),
ADD COLUMN     "privateKeyLocation" TEXT,
ADD COLUMN     "privateNotes" TEXT,
ADD COLUMN     "privateOccupantInfo" TEXT,
ADD COLUMN     "privateOccupied" BOOLEAN DEFAULT false,
ADD COLUMN     "privateOwnerAddress" TEXT,
ADD COLUMN     "privateOwnerEmail" TEXT,
ADD COLUMN     "privateOwnerName" TEXT,
ADD COLUMN     "privateOwnerPhone" TEXT,
ADD COLUMN     "privateOwnerPrice" INTEGER;

-- CreateTable
CREATE TABLE "lead_events" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "LeadEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "actorRole" "Role",
    "title" TEXT,
    "description" TEXT,
    "fromStage" "LeadPipelineStage",
    "toStage" "LeadPipelineStage",
    "fromStatus" "LeadStatus",
    "toStatus" "LeadStatus",
    "metadata" JSONB,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadRecommendationList" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "realtorId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT,
    "propertyIds" TEXT[],
    "filters" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadRecommendationList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_events_leadId_createdAt_idx" ON "lead_events"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeadRecommendationList_token_key" ON "LeadRecommendationList"("token");

-- CreateIndex
CREATE INDEX "LeadRecommendationList_leadId_idx" ON "LeadRecommendationList"("leadId");

-- CreateIndex
CREATE INDEX "LeadRecommendationList_realtorId_idx" ON "LeadRecommendationList"("realtorId");

-- CreateIndex
CREATE INDEX "LeadRecommendationList_expiresAt_idx" ON "LeadRecommendationList"("expiresAt");

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadRecommendationList" ADD CONSTRAINT "LeadRecommendationList_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadRecommendationList" ADD CONSTRAINT "LeadRecommendationList_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

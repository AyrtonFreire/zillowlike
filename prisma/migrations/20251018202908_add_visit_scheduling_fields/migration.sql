/*
  Warnings:

  - Added the required column `queuePosition` to the `lead_candidatures` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `leads` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadStatus" ADD VALUE 'MATCHING';
ALTER TYPE "LeadStatus" ADD VALUE 'WAITING_REALTOR_ACCEPT';
ALTER TYPE "LeadStatus" ADD VALUE 'WAITING_OWNER_APPROVAL';
ALTER TYPE "LeadStatus" ADD VALUE 'CONFIRMED';
ALTER TYPE "LeadStatus" ADD VALUE 'OWNER_REJECTED';
ALTER TYPE "LeadStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "LeadStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "lead_candidatures" ADD COLUMN     "queuePosition" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "candidatesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "clientNotes" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "ownerApproved" BOOLEAN,
ADD COLUMN     "ownerApprovedAt" TIMESTAMP(3),
ADD COLUMN     "ownerRejectedAt" TIMESTAMP(3),
ADD COLUMN     "ownerRejectionReason" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "visitDate" TIMESTAMP(3),
ADD COLUMN     "visitTime" TEXT;

-- CreateIndex
CREATE INDEX "lead_candidatures_leadId_queuePosition_idx" ON "lead_candidatures"("leadId", "queuePosition");

-- CreateIndex
CREATE INDEX "leads_visitDate_visitTime_idx" ON "leads"("visitDate", "visitTime");

-- CreateIndex
CREATE INDEX "leads_propertyId_visitDate_idx" ON "leads"("propertyId", "visitDate");

-- CreateIndex
CREATE INDEX "leads_status_visitDate_idx" ON "leads"("status", "visitDate");

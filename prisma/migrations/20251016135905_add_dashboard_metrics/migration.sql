/*
  Warnings:

  - You are about to drop the column `email` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `leads` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DRAFT', 'SOLD', 'RENTED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'REALTOR';

-- AlterTable
ALTER TABLE "leads" DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "phone",
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "realtorId" TEXT,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "status" "LeadStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "message" DROP NOT NULL;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "status" "PropertyStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_views" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "property_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "property_views_propertyId_idx" ON "property_views"("propertyId");

-- CreateIndex
CREATE INDEX "property_views_viewedAt_idx" ON "property_views"("viewedAt");

-- CreateIndex
CREATE INDEX "leads_realtorId_idx" ON "leads"("realtorId");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_views" ADD CONSTRAINT "property_views_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

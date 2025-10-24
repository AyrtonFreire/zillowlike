-- CreateEnum
CREATE TYPE "Purpose" AS ENUM ('SALE', 'RENT');

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "purpose" "Purpose";

-- CreateIndex
CREATE INDEX "properties_purpose_idx" ON "properties"("purpose");

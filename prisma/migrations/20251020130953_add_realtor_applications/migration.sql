-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "realtor_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creci" TEXT NOT NULL,
    "creciState" TEXT NOT NULL,
    "creciExpiry" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "creciDocumentUrl" TEXT,
    "identityDocumentUrl" TEXT,
    "experience" INTEGER NOT NULL,
    "specialties" TEXT[],
    "bio" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "realtor_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "realtor_applications_userId_key" ON "realtor_applications"("userId");

-- CreateIndex
CREATE INDEX "realtor_applications_userId_idx" ON "realtor_applications"("userId");

-- CreateIndex
CREATE INDEX "realtor_applications_status_idx" ON "realtor_applications"("status");

-- CreateIndex
CREATE INDEX "realtor_applications_createdAt_idx" ON "realtor_applications"("createdAt");

-- AddForeignKey
ALTER TABLE "realtor_applications" ADD CONSTRAINT "realtor_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtor_applications" ADD CONSTRAINT "realtor_applications_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

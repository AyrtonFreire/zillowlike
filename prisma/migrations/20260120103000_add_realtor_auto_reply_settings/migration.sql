-- CreateTable
CREATE TABLE "realtor_auto_reply_settings" (
    "id" TEXT NOT NULL,
    "realtorId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "weekSchedule" JSONB,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 3,
    "maxRepliesPerLeadPer24h" INTEGER NOT NULL DEFAULT 6,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "realtor_auto_reply_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "realtor_auto_reply_settings_realtorId_key" ON "realtor_auto_reply_settings"("realtorId");

-- AddForeignKey
ALTER TABLE "realtor_auto_reply_settings" ADD CONSTRAINT "realtor_auto_reply_settings_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add delivery receipts for team chat

ALTER TABLE "team_chat_read_receipts" ADD COLUMN IF NOT EXISTS "lastDeliveredAt" TIMESTAMP(3);

ALTER TABLE "team_chat_read_receipts" ALTER COLUMN "lastReadAt" DROP NOT NULL;

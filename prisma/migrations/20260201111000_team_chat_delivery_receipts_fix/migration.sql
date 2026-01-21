-- Ensure delivery receipts fields exist after base team chat tables

ALTER TABLE IF EXISTS "team_chat_read_receipts" ADD COLUMN IF NOT EXISTS "lastDeliveredAt" TIMESTAMP(3);

ALTER TABLE IF EXISTS "team_chat_read_receipts" ALTER COLUMN "lastReadAt" DROP NOT NULL;

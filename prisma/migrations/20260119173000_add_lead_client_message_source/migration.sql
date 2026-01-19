-- Add LeadClientMessageSource enum + source column for lead_client_messages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadClientMessageSource') THEN
    CREATE TYPE "LeadClientMessageSource" AS ENUM ('HUMAN', 'AUTO_REPLY_AI');
  END IF;
END $$;

ALTER TABLE "lead_client_messages"
  ADD COLUMN IF NOT EXISTS "source" "LeadClientMessageSource" NOT NULL DEFAULT 'HUMAN';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'LeadConversationState'
  ) THEN
    CREATE TYPE "LeadConversationState" AS ENUM ('ACTIVE', 'ARCHIVED', 'CLOSED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'conversationState'
  ) THEN
    ALTER TABLE "leads" ADD COLUMN "conversationState" "LeadConversationState";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'conversationLastActivityAt'
  ) THEN
    ALTER TABLE "leads" ADD COLUMN "conversationLastActivityAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'conversationArchivedAt'
  ) THEN
    ALTER TABLE "leads" ADD COLUMN "conversationArchivedAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'conversationClosedAt'
  ) THEN
    ALTER TABLE "leads" ADD COLUMN "conversationClosedAt" TIMESTAMP(3);
  END IF;
END $$;

UPDATE "leads" l
SET
  "conversationState" = COALESCE(l."conversationState", 'ACTIVE'::"LeadConversationState"),
  "conversationLastActivityAt" = COALESCE(
    l."conversationLastActivityAt",
    (
      SELECT MAX(m."createdAt")
      FROM "lead_client_messages" m
      WHERE m."leadId" = l."id"
    ),
    l."updatedAt",
    l."createdAt",
    NOW()
  )
WHERE l."conversationState" IS NULL
   OR l."conversationLastActivityAt" IS NULL;

ALTER TABLE "leads" ALTER COLUMN "conversationState" SET DEFAULT 'ACTIVE';
ALTER TABLE "leads" ALTER COLUMN "conversationState" SET NOT NULL;
ALTER TABLE "leads" ALTER COLUMN "conversationLastActivityAt" SET DEFAULT NOW();
ALTER TABLE "leads" ALTER COLUMN "conversationLastActivityAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "leads_conversationState_idx" ON "leads"("conversationState");
CREATE INDEX IF NOT EXISTS "leads_conversationState_conversationLastActivityAt_idx" ON "leads"("conversationState", "conversationLastActivityAt");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'LeadEventType' AND e.enumlabel = 'CHAT_ARCHIVED'
  ) THEN
    ALTER TYPE "LeadEventType" ADD VALUE 'CHAT_ARCHIVED';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'LeadEventType' AND e.enumlabel = 'CHAT_REOPENED'
  ) THEN
    ALTER TYPE "LeadEventType" ADD VALUE 'CHAT_REOPENED';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'LeadEventType' AND e.enumlabel = 'CHAT_CLOSED'
  ) THEN
    ALTER TYPE "LeadEventType" ADD VALUE 'CHAT_CLOSED';
  END IF;
END $$;

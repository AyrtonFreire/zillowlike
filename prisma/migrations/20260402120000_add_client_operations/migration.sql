DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ClientIntent'
  ) THEN
    CREATE TYPE "ClientIntent" AS ENUM ('BUY', 'RENT', 'LIST');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ClientPipelineStage'
  ) THEN
    CREATE TYPE "ClientPipelineStage" AS ENUM ('NEW', 'CONTACT', 'QUALIFYING', 'MATCHING', 'VISIT', 'NURTURE', 'WON', 'LOST');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ClientSource'
  ) THEN
    CREATE TYPE "ClientSource" AS ENUM ('MANUAL', 'AGENCY_PUBLIC_PROFILE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'assignedUserId'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "assignedUserId" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'source'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "source" "ClientSource";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'intent'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "intent" "ClientIntent";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'pipelineStage'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "pipelineStage" "ClientPipelineStage";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'assignedAt'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "assignedAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'firstContactAt'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "firstContactAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'lastContactAt'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "lastContactAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'lastInboundAt'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "lastInboundAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'lastInboundChannel'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "lastInboundChannel" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'nextActionAt'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "nextActionAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'nextActionNote'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "nextActionNote" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'consentAcceptedAt'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "consentAcceptedAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'consentText'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "consentText" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'sourceSlug'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "sourceSlug" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'playbookSnapshot'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "playbookSnapshot" TEXT;
  END IF;
END $$;

UPDATE "clients"
SET
  "source" = COALESCE("source", 'MANUAL'::"ClientSource"),
  "pipelineStage" = COALESCE("pipelineStage", 'NEW'::"ClientPipelineStage"),
  "assignedUserId" = COALESCE("assignedUserId", "createdByUserId"),
  "assignedAt" = CASE
    WHEN "assignedAt" IS NOT NULL THEN "assignedAt"
    WHEN COALESCE("assignedUserId", "createdByUserId") IS NOT NULL THEN COALESCE("createdAt", NOW())
    ELSE NULL
  END
WHERE
  "source" IS NULL
  OR "pipelineStage" IS NULL
  OR ("assignedUserId" IS NULL AND "createdByUserId" IS NOT NULL)
  OR ("assignedAt" IS NULL AND COALESCE("assignedUserId", "createdByUserId") IS NOT NULL);

ALTER TABLE "clients" ALTER COLUMN "source" SET DEFAULT 'MANUAL';
ALTER TABLE "clients" ALTER COLUMN "source" SET NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "pipelineStage" SET DEFAULT 'NEW';
ALTER TABLE "clients" ALTER COLUMN "pipelineStage" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "clients_teamId_pipelineStage_idx" ON "clients"("teamId", "pipelineStage");
CREATE INDEX IF NOT EXISTS "clients_teamId_assignedUserId_status_idx" ON "clients"("teamId", "assignedUserId", "status");
CREATE INDEX IF NOT EXISTS "clients_assignedUserId_status_idx" ON "clients"("assignedUserId", "status");
CREATE INDEX IF NOT EXISTS "clients_nextActionAt_idx" ON "clients"("nextActionAt");
CREATE INDEX IF NOT EXISTS "clients_lastInboundAt_idx" ON "clients"("lastInboundAt");
CREATE INDEX IF NOT EXISTS "clients_source_intent_idx" ON "clients"("source", "intent");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clients_assignedUserId_fkey'
  ) THEN
    ALTER TABLE "clients"
    ADD CONSTRAINT "clients_assignedUserId_fkey"
    FOREIGN KEY ("assignedUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

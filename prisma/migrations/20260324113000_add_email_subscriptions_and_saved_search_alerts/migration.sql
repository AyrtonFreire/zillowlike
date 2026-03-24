DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'EmailSubscriptionStatus'
  ) THEN
    CREATE TYPE "EmailSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'UNSUBSCRIBED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'EmailDigestFrequency'
  ) THEN
    CREATE TYPE "EmailDigestFrequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'PropertyType' AND e.enumlabel = 'RURAL'
  ) THEN
    ALTER TYPE "PropertyType" ADD VALUE 'RURAL';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'saved_searches' AND column_name = 'frequency'
  ) THEN
    ALTER TABLE "saved_searches" ADD COLUMN "frequency" "EmailDigestFrequency";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'saved_searches' AND column_name = 'alertsEnabled'
  ) THEN
    ALTER TABLE "saved_searches" ADD COLUMN "alertsEnabled" BOOLEAN;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'saved_searches' AND column_name = 'lastAlertSentAt'
  ) THEN
    ALTER TABLE "saved_searches" ADD COLUMN "lastAlertSentAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'saved_searches' AND column_name = 'lastAlertCursorAt'
  ) THEN
    ALTER TABLE "saved_searches" ADD COLUMN "lastAlertCursorAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'saved_searches' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "saved_searches" ADD COLUMN "updatedAt" TIMESTAMP(3);
  END IF;
END $$;

UPDATE "saved_searches"
SET
  "frequency" = COALESCE("frequency", 'DAILY'::"EmailDigestFrequency"),
  "alertsEnabled" = COALESCE("alertsEnabled", true),
  "updatedAt" = COALESCE("updatedAt", "createdAt", NOW())
WHERE "frequency" IS NULL
   OR "alertsEnabled" IS NULL
   OR "updatedAt" IS NULL;

ALTER TABLE "saved_searches" ALTER COLUMN "frequency" SET DEFAULT 'DAILY';
ALTER TABLE "saved_searches" ALTER COLUMN "frequency" SET NOT NULL;
ALTER TABLE "saved_searches" ALTER COLUMN "alertsEnabled" SET DEFAULT true;
ALTER TABLE "saved_searches" ALTER COLUMN "alertsEnabled" SET NOT NULL;
ALTER TABLE "saved_searches" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "saved_searches" ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "saved_searches_userId_alertsEnabled_idx" ON "saved_searches"("userId", "alertsEnabled");

CREATE TABLE IF NOT EXISTS "email_subscriptions" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "normalizedEmail" TEXT NOT NULL,
  "userId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'FOOTER',
  "status" "EmailSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "frequency" "EmailDigestFrequency" NOT NULL DEFAULT 'WEEKLY',
  "city" TEXT,
  "state" TEXT,
  "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "subscribedToAlerts" BOOLEAN NOT NULL DEFAULT true,
  "subscribedToDigest" BOOLEAN NOT NULL DEFAULT true,
  "subscribedToGuides" BOOLEAN NOT NULL DEFAULT true,
  "subscribedToPriceDrops" BOOLEAN NOT NULL DEFAULT false,
  "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "lastEmailSentAt" TIMESTAMP(3),
  "unsubscribedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "email_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_subscriptions_normalizedEmail_key" ON "email_subscriptions"("normalizedEmail");
CREATE INDEX IF NOT EXISTS "email_subscriptions_userId_idx" ON "email_subscriptions"("userId");
CREATE INDEX IF NOT EXISTS "email_subscriptions_status_idx" ON "email_subscriptions"("status");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_subscriptions_userId_fkey'
  ) THEN
    ALTER TABLE "email_subscriptions"
    ADD CONSTRAINT "email_subscriptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'LeadEventType' AND e.enumlabel = 'AUTO_REPLY_SENT'
  ) THEN
    ALTER TYPE "LeadEventType" ADD VALUE 'AUTO_REPLY_SENT';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'LeadEventType' AND e.enumlabel = 'AUTO_REPLY_SKIPPED'
  ) THEN
    ALTER TYPE "LeadEventType" ADD VALUE 'AUTO_REPLY_SKIPPED';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'LeadEventType' AND e.enumlabel = 'AUTO_REPLY_FAILED'
  ) THEN
    ALTER TYPE "LeadEventType" ADD VALUE 'AUTO_REPLY_FAILED';
  END IF;
END $$;

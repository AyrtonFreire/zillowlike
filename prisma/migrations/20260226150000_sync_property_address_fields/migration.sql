-- Sync migration: ensure address fields and enum values exist (idempotent)

-- 1) Ensure PropertyType enum includes RURAL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE lower(typname) = lower('PropertyType')) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE lower(t.typname) = lower('PropertyType')
        AND e.enumlabel = 'RURAL'
    ) THEN
      BEGIN
        ALTER TYPE "PropertyType" ADD VALUE 'RURAL';
      EXCEPTION
        WHEN duplicate_object THEN
          NULL;
      END;
    END IF;
  END IF;
END $$;

-- 2) Ensure address columns exist
ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "streetNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "addressComplement" TEXT;

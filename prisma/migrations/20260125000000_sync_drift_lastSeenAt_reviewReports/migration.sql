-- Sync drift: align DB with schema + migration history without resetting data

-- Ensure User.lastSeenAt exists and is non-null with default
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "User" ALTER COLUMN "lastSeenAt" SET DEFAULT CURRENT_TIMESTAMP;
UPDATE "User" SET "lastSeenAt" = COALESCE("lastSeenAt", CURRENT_TIMESTAMP);
ALTER TABLE "User" ALTER COLUMN "lastSeenAt" SET NOT NULL;

-- Ensure review_reports FK matches expected definition
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_reports_reportedByUserId_fkey') THEN
    EXECUTE 'ALTER TABLE "review_reports" DROP CONSTRAINT "review_reports_reportedByUserId_fkey"';
  END IF;

  EXECUTE 'ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE';
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

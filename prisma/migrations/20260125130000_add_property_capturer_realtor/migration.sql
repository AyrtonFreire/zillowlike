-- Add capturer realtor to properties (idempotent)

-- Column
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "capturerRealtorId" TEXT;

-- Index
CREATE INDEX IF NOT EXISTS "properties_capturerRealtorId_idx" ON "properties"("capturerRealtorId");

-- FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'properties_capturerRealtorId_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE "properties" ADD CONSTRAINT "properties_capturerRealtorId_fkey" FOREIGN KEY ("capturerRealtorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE';
  END IF;
END $$;

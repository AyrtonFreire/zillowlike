-- Add new view fields
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "viewRiver" BOOLEAN;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "viewLake" BOOLEAN;

-- Backfill from legacy fields
UPDATE "properties"
SET
  "viewRiver" = COALESCE("viewRiver", "positionFront"),
  "viewLake"  = COALESCE("viewLake",  "positionBack")
WHERE
  "viewRiver" IS NULL
  OR "viewLake" IS NULL;

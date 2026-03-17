-- Add inCondominium flag (replaces legacy CONDO type in filters/UI)
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "inCondominium" BOOLEAN;

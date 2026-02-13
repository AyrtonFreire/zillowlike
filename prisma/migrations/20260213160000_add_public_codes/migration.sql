ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "publicCode" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "publicCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "properties_publicCode_key" ON "properties"("publicCode");
CREATE UNIQUE INDEX IF NOT EXISTS "leads_publicCode_key" ON "leads"("publicCode");

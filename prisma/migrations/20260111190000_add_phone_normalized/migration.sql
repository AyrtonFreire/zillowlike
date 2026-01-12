ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneNormalized_key" ON "User"("phoneNormalized");

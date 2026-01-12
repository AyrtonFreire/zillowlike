ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "recoveryEmail" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "recoveryEmailVerifiedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_recoveryEmail_key" ON "User"("recoveryEmail");

CREATE TABLE IF NOT EXISTS "BackupRecoveryCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMP(3),
  "usedByIp" TEXT,
  "usedByUserAgent" TEXT,

  CONSTRAINT "BackupRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BackupRecoveryCode_codeHash_key" ON "BackupRecoveryCode"("codeHash");
CREATE INDEX IF NOT EXISTS "BackupRecoveryCode_userId_idx" ON "BackupRecoveryCode"("userId");

DO $$
BEGIN
  ALTER TABLE "BackupRecoveryCode" ADD CONSTRAINT "BackupRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

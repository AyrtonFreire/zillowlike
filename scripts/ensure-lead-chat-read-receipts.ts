import { Client } from "pg";

const SQL = `
CREATE TABLE IF NOT EXISTS "lead_chat_read_receipts" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lead_chat_read_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lead_chat_read_receipts_leadId_userId_key" ON "lead_chat_read_receipts"("leadId", "userId");
CREATE INDEX IF NOT EXISTS "lead_chat_read_receipts_userId_idx" ON "lead_chat_read_receipts"("userId");
CREATE INDEX IF NOT EXISTS "lead_chat_read_receipts_leadId_idx" ON "lead_chat_read_receipts"("leadId");

DO $$
BEGIN
  ALTER TABLE "lead_chat_read_receipts"
    ADD CONSTRAINT "lead_chat_read_receipts_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lead_chat_read_receipts"
    ADD CONSTRAINT "lead_chat_read_receipts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[ensure-lead-chat-read-receipts] DATABASE_URL not set; skipping.");
    return;
  }

  const useSsl = !/sslmode=disable/i.test(url);
  const client = new Client({
    connectionString: url,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  try {
    await client.connect();
    await client.query(SQL);
    console.log("[ensure-lead-chat-read-receipts] OK");
  } catch (err) {
    // Deploy-first: do not fail the build if DB is unreachable in preview.
    console.warn("[ensure-lead-chat-read-receipts] Skipped due to error:", err);
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  console.warn("[ensure-lead-chat-read-receipts] Unexpected error:", err);
});

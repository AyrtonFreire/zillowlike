import { Client } from "pg";

const SQL = `
DO $$
BEGIN
  CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'PENDING', 'HIDDEN', 'REMOVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ReviewReportReason" AS ENUM ('SPAM', 'OFFENSIVE', 'FAKE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ReviewReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- realtor_ratings hardening
ALTER TABLE "realtor_ratings"
  ADD COLUMN IF NOT EXISTS "authorId" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS "replyText" TEXT,
  ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "realtor_ratings_authorId_idx" ON "realtor_ratings"("authorId");
CREATE INDEX IF NOT EXISTS "realtor_ratings_status_idx" ON "realtor_ratings"("status");

DO $$
BEGIN
  ALTER TABLE "realtor_ratings"
    ADD CONSTRAINT "realtor_ratings_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- owner_stats
CREATE TABLE IF NOT EXISTS "owner_stats" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "avgRating" DOUBLE PRECISION,
  "totalRatings" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "owner_stats_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  CREATE UNIQUE INDEX "owner_stats_ownerId_key" ON "owner_stats"("ownerId");
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "owner_stats_ownerId_idx" ON "owner_stats"("ownerId");

DO $$
BEGIN
  ALTER TABLE "owner_stats"
    ADD CONSTRAINT "owner_stats_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- owner_ratings
CREATE TABLE IF NOT EXISTS "owner_ratings" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "authorId" TEXT,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
  "replyText" TEXT,
  "repliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "owner_ratings_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  CREATE UNIQUE INDEX "owner_ratings_leadId_key" ON "owner_ratings"("leadId");
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "owner_ratings_ownerId_idx" ON "owner_ratings"("ownerId");
CREATE INDEX IF NOT EXISTS "owner_ratings_leadId_idx" ON "owner_ratings"("leadId");
CREATE INDEX IF NOT EXISTS "owner_ratings_authorId_idx" ON "owner_ratings"("authorId");
CREATE INDEX IF NOT EXISTS "owner_ratings_status_idx" ON "owner_ratings"("status");

DO $$
BEGIN
  ALTER TABLE "owner_ratings"
    ADD CONSTRAINT "owner_ratings_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "owner_ratings"
    ADD CONSTRAINT "owner_ratings_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "owner_ratings"
    ADD CONSTRAINT "owner_ratings_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- review_reports
CREATE TABLE IF NOT EXISTS "review_reports" (
  "id" TEXT NOT NULL,
  "realtorRatingId" TEXT,
  "ownerRatingId" TEXT,
  "reportedByUserId" TEXT NOT NULL,
  "handledByAdminId" TEXT,
  "reason" "ReviewReportReason" NOT NULL,
  "description" TEXT,
  "status" "ReviewReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "review_reports_realtorRatingId_idx" ON "review_reports"("realtorRatingId");
CREATE INDEX IF NOT EXISTS "review_reports_ownerRatingId_idx" ON "review_reports"("ownerRatingId");
CREATE INDEX IF NOT EXISTS "review_reports_reportedByUserId_idx" ON "review_reports"("reportedByUserId");
CREATE INDEX IF NOT EXISTS "review_reports_status_idx" ON "review_reports"("status");

DO $$
BEGIN
  ALTER TABLE "review_reports"
    ADD CONSTRAINT "review_reports_realtorRatingId_fkey"
    FOREIGN KEY ("realtorRatingId") REFERENCES "realtor_ratings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "review_reports"
    ADD CONSTRAINT "review_reports_ownerRatingId_fkey"
    FOREIGN KEY ("ownerRatingId") REFERENCES "owner_ratings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "review_reports"
    ADD CONSTRAINT "review_reports_reportedByUserId_fkey"
    FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "review_reports"
    ADD CONSTRAINT "review_reports_handledByAdminId_fkey"
    FOREIGN KEY ("handledByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "review_reports"
    ADD CONSTRAINT "review_reports_reportedByUserId_realtorRatingId_key"
    UNIQUE ("reportedByUserId", "realtorRatingId");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "review_reports"
    ADD CONSTRAINT "review_reports_reportedByUserId_ownerRatingId_key"
    UNIQUE ("reportedByUserId", "ownerRatingId");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`;

async function main() {
  const direct = process.env.DIRECT_URL;
  const pooled = process.env.DATABASE_URL;
  const url = direct || pooled;

  if (!url) {
    console.warn("[ensure-reviews-schema] DIRECT_URL/DATABASE_URL not set; skipping.");
    return;
  }

  const isProd = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
  if (!direct && isProd) {
    console.warn("[ensure-reviews-schema] DIRECT_URL not set in production; DDL may fail via pooler.");
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(SQL);
    console.log("[ensure-reviews-schema] OK");
  } catch (err) {
    if (isProd) {
      console.error("[ensure-reviews-schema] FAILED:", err);
      process.exit(1);
    }
    console.warn("[ensure-reviews-schema] Skipped due to error:", err);
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  console.warn("[ensure-reviews-schema] Unexpected error:", err);
});

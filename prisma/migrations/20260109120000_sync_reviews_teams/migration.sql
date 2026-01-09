DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewStatus') THEN
    CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'PENDING', 'HIDDEN', 'REMOVED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewReportReason') THEN
    CREATE TYPE "ReviewReportReason" AS ENUM ('SPAM', 'OFFENSIVE', 'FAKE', 'OTHER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewReportStatus') THEN
    CREATE TYPE "ReviewReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamInviteStatus') THEN
    CREATE TYPE "TeamInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "owner_stats" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "avgRating" DOUBLE PRECISION,
  "totalRatings" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "owner_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "owner_stats_ownerId_key" ON "owner_stats"("ownerId");
CREATE INDEX IF NOT EXISTS "owner_stats_ownerId_idx" ON "owner_stats"("ownerId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'owner_stats_ownerId_fkey') THEN
    ALTER TABLE "owner_stats"
      ADD CONSTRAINT "owner_stats_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

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

CREATE UNIQUE INDEX IF NOT EXISTS "owner_ratings_leadId_key" ON "owner_ratings"("leadId");
CREATE INDEX IF NOT EXISTS "owner_ratings_ownerId_idx" ON "owner_ratings"("ownerId");
CREATE INDEX IF NOT EXISTS "owner_ratings_leadId_idx" ON "owner_ratings"("leadId");
CREATE INDEX IF NOT EXISTS "owner_ratings_authorId_idx" ON "owner_ratings"("authorId");
CREATE INDEX IF NOT EXISTS "owner_ratings_status_idx" ON "owner_ratings"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'owner_ratings_ownerId_fkey') THEN
    ALTER TABLE "owner_ratings"
      ADD CONSTRAINT "owner_ratings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'owner_ratings_leadId_fkey') THEN
    ALTER TABLE "owner_ratings"
      ADD CONSTRAINT "owner_ratings_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'owner_ratings_authorId_fkey') THEN
    ALTER TABLE "owner_ratings"
      ADD CONSTRAINT "owner_ratings_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "realtor_ratings" ADD COLUMN IF NOT EXISTS "authorId" TEXT;
ALTER TABLE "realtor_ratings" ADD COLUMN IF NOT EXISTS "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "realtor_ratings" ADD COLUMN IF NOT EXISTS "replyText" TEXT;
ALTER TABLE "realtor_ratings" ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3);
ALTER TABLE "realtor_ratings" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "realtor_ratings_authorId_idx" ON "realtor_ratings"("authorId");
CREATE INDEX IF NOT EXISTS "realtor_ratings_status_idx" ON "realtor_ratings"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'realtor_ratings_authorId_fkey') THEN
    ALTER TABLE "realtor_ratings"
      ADD CONSTRAINT "realtor_ratings_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

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

CREATE UNIQUE INDEX IF NOT EXISTS "review_reports_reportedByUserId_realtorRatingId_key" ON "review_reports"("reportedByUserId", "realtorRatingId");
CREATE UNIQUE INDEX IF NOT EXISTS "review_reports_reportedByUserId_ownerRatingId_key" ON "review_reports"("reportedByUserId", "ownerRatingId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_reports_realtorRatingId_fkey') THEN
    ALTER TABLE "review_reports"
      ADD CONSTRAINT "review_reports_realtorRatingId_fkey" FOREIGN KEY ("realtorRatingId") REFERENCES "realtor_ratings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_reports_ownerRatingId_fkey') THEN
    ALTER TABLE "review_reports"
      ADD CONSTRAINT "review_reports_ownerRatingId_fkey" FOREIGN KEY ("ownerRatingId") REFERENCES "owner_ratings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_reports_reportedByUserId_fkey') THEN
    ALTER TABLE "review_reports"
      ADD CONSTRAINT "review_reports_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_reports_handledByAdminId_fkey') THEN
    ALTER TABLE "review_reports"
      ADD CONSTRAINT "review_reports_handledByAdminId_fkey" FOREIGN KEY ("handledByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "team_invites" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "TeamMemberRole" NOT NULL DEFAULT 'AGENT',
  "status" "TeamInviteStatus" NOT NULL DEFAULT 'PENDING',
  "token" TEXT NOT NULL,
  "invitedByUserId" TEXT NOT NULL,
  "acceptedByUserId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "team_invites_token_key" ON "team_invites"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "team_invites_teamId_email_key" ON "team_invites"("teamId", "email");
CREATE INDEX IF NOT EXISTS "team_invites_email_idx" ON "team_invites"("email");
CREATE INDEX IF NOT EXISTS "team_invites_teamId_status_idx" ON "team_invites"("teamId", "status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_invites_teamId_fkey') THEN
    ALTER TABLE "team_invites"
      ADD CONSTRAINT "team_invites_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_invites_invitedByUserId_fkey') THEN
    ALTER TABLE "team_invites"
      ADD CONSTRAINT "team_invites_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_invites_acceptedByUserId_fkey') THEN
    ALTER TABLE "team_invites"
      ADD CONSTRAINT "team_invites_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "agency_profiles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cnpj" TEXT NOT NULL,
  "phone" TEXT,
  "userId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agency_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agency_profiles_cnpj_key" ON "agency_profiles"("cnpj");
CREATE UNIQUE INDEX IF NOT EXISTS "agency_profiles_userId_key" ON "agency_profiles"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "agency_profiles_teamId_key" ON "agency_profiles"("teamId");
CREATE INDEX IF NOT EXISTS "agency_profiles_userId_idx" ON "agency_profiles"("userId");
CREATE INDEX IF NOT EXISTS "agency_profiles_teamId_idx" ON "agency_profiles"("teamId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agency_profiles_userId_fkey') THEN
    ALTER TABLE "agency_profiles"
      ADD CONSTRAINT "agency_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agency_profiles_teamId_fkey') THEN
    ALTER TABLE "agency_profiles"
      ADD CONSTRAINT "agency_profiles_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

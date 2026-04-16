DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'DevelopmentProjectStatus'
  ) THEN
    CREATE TYPE "DevelopmentProjectStatus" AS ENUM ('DRAFT', 'PRE_LAUNCH', 'LAUNCH', 'ACTIVE', 'SOLD_OUT', 'ARCHIVED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'DevelopmentUnitStatus'
  ) THEN
    CREATE TYPE "DevelopmentUnitStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "development_projects" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT,
  "status" "DevelopmentProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "description" TEXT,
  "city" TEXT,
  "state" TEXT,
  "neighborhood" TEXT,
  "coverImageUrl" TEXT,
  "expectedLaunchAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "development_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "development_units" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "title" TEXT,
  "status" "DevelopmentUnitStatus" NOT NULL DEFAULT 'AVAILABLE',
  "typology" TEXT,
  "bedrooms" INTEGER,
  "bathrooms" DOUBLE PRECISION,
  "parkingSpots" INTEGER,
  "privateAreaM2" INTEGER,
  "price" BIGINT,
  "floor" INTEGER,
  "block" TEXT,
  "tower" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "development_units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "development_projects_teamId_name_key" ON "development_projects"("teamId", "name");
CREATE INDEX IF NOT EXISTS "development_projects_teamId_status_idx" ON "development_projects"("teamId", "status");
CREATE INDEX IF NOT EXISTS "development_projects_teamId_createdAt_idx" ON "development_projects"("teamId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "development_units_projectId_reference_key" ON "development_units"("projectId", "reference");
CREATE INDEX IF NOT EXISTS "development_units_projectId_status_idx" ON "development_units"("projectId", "status");
CREATE INDEX IF NOT EXISTS "development_units_projectId_price_idx" ON "development_units"("projectId", "price");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'development_projects_teamId_fkey'
  ) THEN
    ALTER TABLE "development_projects"
    ADD CONSTRAINT "development_projects_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "teams"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'development_units_projectId_fkey'
  ) THEN
    ALTER TABLE "development_units"
    ADD CONSTRAINT "development_units_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "development_projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

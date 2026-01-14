-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "ClientMatchScope" AS ENUM ('PORTFOLIO', 'MARKET');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "phoneNormalized" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_preferences" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "neighborhoods" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "purpose" "Purpose",
    "types" "PropertyType"[] NOT NULL DEFAULT ARRAY[]::"PropertyType"[],
    "minPrice" INTEGER,
    "maxPrice" INTEGER,
    "bedroomsMin" INTEGER,
    "bathroomsMin" DOUBLE PRECISION,
    "areaMin" INTEGER,
    "flags" JSONB,
    "scope" "ClientMatchScope" NOT NULL DEFAULT 'PORTFOLIO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_property_matches" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "scope" "ClientMatchScope" NOT NULL,
    "score" INTEGER NOT NULL,
    "reasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preferenceUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_property_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_recommendation_lists" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "token" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT,
    "propertyIds" TEXT[] NOT NULL,
    "filters" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_recommendation_lists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_teamId_status_idx" ON "clients"("teamId", "status");

-- CreateIndex
CREATE INDEX "clients_teamId_createdAt_idx" ON "clients"("teamId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "clients_teamId_email_key" ON "clients"("teamId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_teamId_phoneNormalized_key" ON "clients"("teamId", "phoneNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "client_preferences_clientId_key" ON "client_preferences"("clientId");

-- CreateIndex
CREATE INDEX "client_preferences_city_state_idx" ON "client_preferences"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "client_property_matches_clientId_propertyId_scope_key" ON "client_property_matches"("clientId", "propertyId", "scope");

-- CreateIndex
CREATE INDEX "client_property_matches_clientId_scope_score_idx" ON "client_property_matches"("clientId", "scope", "score");

-- CreateIndex
CREATE INDEX "client_property_matches_propertyId_idx" ON "client_property_matches"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "client_recommendation_lists_token_key" ON "client_recommendation_lists"("token");

-- CreateIndex
CREATE INDEX "client_recommendation_lists_teamId_createdAt_idx" ON "client_recommendation_lists"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "client_recommendation_lists_clientId_createdAt_idx" ON "client_recommendation_lists"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_preferences" ADD CONSTRAINT "client_preferences_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_property_matches" ADD CONSTRAINT "client_property_matches_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_property_matches" ADD CONSTRAINT "client_property_matches_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_recommendation_lists" ADD CONSTRAINT "client_recommendation_lists_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_recommendation_lists" ADD CONSTRAINT "client_recommendation_lists_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_recommendation_lists" ADD CONSTRAINT "client_recommendation_lists_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

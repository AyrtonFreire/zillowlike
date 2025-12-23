-- CreateTable
CREATE TABLE "platform_conversion_benchmarks" (
    "id" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "bucketMinDays" INTEGER NOT NULL,
    "bucketMaxDays" INTEGER,
    "propertiesCount" INTEGER NOT NULL,
    "viewsTotal" INTEGER NOT NULL,
    "leadsTotal" INTEGER NOT NULL,
    "conversionRate" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_conversion_benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_conversion_benchmarks_bucketId_key" ON "platform_conversion_benchmarks"("bucketId");

-- CreateIndex
CREATE INDEX "platform_conversion_benchmarks_bucketId_idx" ON "platform_conversion_benchmarks"("bucketId");

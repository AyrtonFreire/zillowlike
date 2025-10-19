-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "conditionTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

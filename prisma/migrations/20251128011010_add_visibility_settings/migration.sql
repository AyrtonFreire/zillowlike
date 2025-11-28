-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "hideCondoFee" BOOLEAN DEFAULT false,
ADD COLUMN     "hideExactAddress" BOOLEAN DEFAULT false,
ADD COLUMN     "hideIPTU" BOOLEAN DEFAULT false,
ADD COLUMN     "hideOwnerContact" BOOLEAN DEFAULT false,
ADD COLUMN     "hidePrice" BOOLEAN DEFAULT false,
ADD COLUMN     "iptuYearly" INTEGER;

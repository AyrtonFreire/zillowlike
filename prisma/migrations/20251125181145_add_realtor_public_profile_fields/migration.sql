-- AlterTable
ALTER TABLE "User" ADD COLUMN     "publicFacebook" TEXT,
ADD COLUMN     "publicInstagram" TEXT,
ADD COLUMN     "publicLinkedIn" TEXT,
ADD COLUMN     "publicServiceAreas" TEXT[],
ADD COLUMN     "publicVideoUrl" TEXT,
ADD COLUMN     "publicWhatsApp" TEXT;

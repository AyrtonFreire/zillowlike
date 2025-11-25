-- CreateEnum
CREATE TYPE "LeadPipelineStage" AS ENUM ('NEW', 'CONTACT', 'VISIT', 'PROPOSAL', 'DOCUMENTS', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LeadLostReason" AS ENUM ('CLIENT_DESISTIU', 'FECHOU_OUTRO_IMOVEL', 'CONDICAO_FINANCEIRA', 'NAO_RESPONDEU', 'OUTRO');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "lostReason" "LeadLostReason",
ADD COLUMN     "nextActionDate" TIMESTAMP(3),
ADD COLUMN     "nextActionNote" TEXT,
ADD COLUMN     "pipelineStage" "LeadPipelineStage" NOT NULL DEFAULT 'NEW';

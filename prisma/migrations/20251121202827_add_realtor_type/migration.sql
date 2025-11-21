/*
  Warnings:

  - Added the required column `realtorType` to the `realtor_applications` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RealtorType" AS ENUM ('AUTONOMO', 'IMOBILIARIA');

-- AlterTable
ALTER TABLE "realtor_applications" ADD COLUMN     "realtorType" "RealtorType" NOT NULL;

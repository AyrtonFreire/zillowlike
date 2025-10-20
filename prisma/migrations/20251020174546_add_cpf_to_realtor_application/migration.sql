/*
  Warnings:

  - Added the required column `cpf` to the `realtor_applications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "realtor_applications" ADD COLUMN     "cpf" TEXT NOT NULL;

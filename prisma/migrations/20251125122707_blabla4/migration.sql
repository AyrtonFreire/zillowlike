/*
  Warnings:

  - A unique constraint covering the columns `[clientChatToken]` on the table `leads` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "clientChatToken" TEXT;

-- CreateTable
CREATE TABLE "lead_client_messages" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromClient" BOOLEAN NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_client_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_client_messages_leadId_idx" ON "lead_client_messages"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_clientChatToken_key" ON "leads"("clientChatToken");

-- AddForeignKey
ALTER TABLE "lead_client_messages" ADD CONSTRAINT "lead_client_messages_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

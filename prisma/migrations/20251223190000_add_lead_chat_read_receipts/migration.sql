-- CreateTable
CREATE TABLE "lead_chat_read_receipts" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_chat_read_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_chat_read_receipts_userId_idx" ON "lead_chat_read_receipts"("userId");

-- CreateIndex
CREATE INDEX "lead_chat_read_receipts_leadId_idx" ON "lead_chat_read_receipts"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_chat_read_receipts_leadId_userId_key" ON "lead_chat_read_receipts"("leadId", "userId");

-- AddForeignKey
ALTER TABLE "lead_chat_read_receipts" ADD CONSTRAINT "lead_chat_read_receipts_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_chat_read_receipts" ADD CONSTRAINT "lead_chat_read_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

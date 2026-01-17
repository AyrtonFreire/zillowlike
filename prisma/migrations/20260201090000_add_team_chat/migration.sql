-- CreateTable
CREATE TABLE "team_chat_threads" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "realtorId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_chat_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_chat_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" "Role" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_chat_read_receipts" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_chat_read_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_chat_threads_teamId_idx" ON "team_chat_threads"("teamId");

-- CreateIndex
CREATE INDEX "team_chat_threads_ownerId_idx" ON "team_chat_threads"("ownerId");

-- CreateIndex
CREATE INDEX "team_chat_threads_realtorId_idx" ON "team_chat_threads"("realtorId");

-- CreateIndex
CREATE UNIQUE INDEX "team_chat_threads_teamId_realtorId_key" ON "team_chat_threads"("teamId", "realtorId");

-- CreateIndex
CREATE INDEX "team_chat_messages_threadId_idx" ON "team_chat_messages"("threadId");

-- CreateIndex
CREATE INDEX "team_chat_messages_senderId_idx" ON "team_chat_messages"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "team_chat_read_receipts_threadId_userId_key" ON "team_chat_read_receipts"("threadId", "userId");

-- CreateIndex
CREATE INDEX "team_chat_read_receipts_userId_idx" ON "team_chat_read_receipts"("userId");

-- CreateIndex
CREATE INDEX "team_chat_read_receipts_threadId_idx" ON "team_chat_read_receipts"("threadId");

-- AddForeignKey
ALTER TABLE "team_chat_threads" ADD CONSTRAINT "team_chat_threads_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_chat_threads" ADD CONSTRAINT "team_chat_threads_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_chat_threads" ADD CONSTRAINT "team_chat_threads_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_chat_messages" ADD CONSTRAINT "team_chat_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "team_chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_chat_messages" ADD CONSTRAINT "team_chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_chat_read_receipts" ADD CONSTRAINT "team_chat_read_receipts_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "team_chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_chat_read_receipts" ADD CONSTRAINT "team_chat_read_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

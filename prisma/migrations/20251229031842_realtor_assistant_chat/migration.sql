-- CreateEnum
CREATE TYPE "RealtorAssistantChatMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateTable
CREATE TABLE "realtor_assistant_chat_threads" (
    "id" TEXT NOT NULL,
    "realtorId" TEXT NOT NULL,
    "leadId" TEXT,
    "scopeKey" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "realtor_assistant_chat_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realtor_assistant_chat_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" "RealtorAssistantChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "realtor_assistant_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "realtor_assistant_chat_threads_realtorId_idx" ON "realtor_assistant_chat_threads"("realtorId");

-- CreateIndex
CREATE INDEX "realtor_assistant_chat_threads_leadId_idx" ON "realtor_assistant_chat_threads"("leadId");

-- CreateIndex
CREATE INDEX "realtor_assistant_chat_threads_scopeKey_idx" ON "realtor_assistant_chat_threads"("scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "realtor_assistant_chat_threads_realtorId_scopeKey_key" ON "realtor_assistant_chat_threads"("realtorId", "scopeKey");

-- CreateIndex
CREATE INDEX "realtor_assistant_chat_messages_threadId_createdAt_idx" ON "realtor_assistant_chat_messages"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "realtor_assistant_chat_threads" ADD CONSTRAINT "realtor_assistant_chat_threads_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtor_assistant_chat_threads" ADD CONSTRAINT "realtor_assistant_chat_threads_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtor_assistant_chat_messages" ADD CONSTRAINT "realtor_assistant_chat_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "realtor_assistant_chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "olx_accounts" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "teamId" TEXT,
  "accessTokenEnc" TEXT NOT NULL,
  "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "webhookToken" TEXT NOT NULL,
  "leadConfigId" TEXT,
  "leadConfigToken" TEXT,
  "chatWebhookEnabled" BOOLEAN NOT NULL DEFAULT false,
  "notificationConfigId" TEXT,
  "notificationConfigToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "olx_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "olx_accounts_userId_key" ON "olx_accounts"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "olx_accounts_teamId_key" ON "olx_accounts"("teamId");
CREATE UNIQUE INDEX IF NOT EXISTS "olx_accounts_webhookToken_key" ON "olx_accounts"("webhookToken");

CREATE INDEX IF NOT EXISTS "olx_accounts_userId_idx" ON "olx_accounts"("userId");
CREATE INDEX IF NOT EXISTS "olx_accounts_teamId_idx" ON "olx_accounts"("teamId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'olx_accounts_userId_fkey') THEN
    ALTER TABLE "olx_accounts" ADD CONSTRAINT "olx_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'olx_accounts_teamId_fkey') THEN
    ALTER TABLE "olx_accounts" ADD CONSTRAINT "olx_accounts_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "olx_oauth_states" (
  "id" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "userId" TEXT,
  "accountId" TEXT,
  "teamId" TEXT,
  "returnTo" TEXT,
  "scopes" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "olx_oauth_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "olx_oauth_states_state_key" ON "olx_oauth_states"("state");

CREATE INDEX IF NOT EXISTS "olx_oauth_states_userId_idx" ON "olx_oauth_states"("userId");
CREATE INDEX IF NOT EXISTS "olx_oauth_states_teamId_idx" ON "olx_oauth_states"("teamId");
CREATE INDEX IF NOT EXISTS "olx_oauth_states_accountId_idx" ON "olx_oauth_states"("accountId");
CREATE INDEX IF NOT EXISTS "olx_oauth_states_expiresAt_idx" ON "olx_oauth_states"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'olx_oauth_states_userId_fkey') THEN
    ALTER TABLE "olx_oauth_states" ADD CONSTRAINT "olx_oauth_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'olx_oauth_states_accountId_fkey') THEN
    ALTER TABLE "olx_oauth_states" ADD CONSTRAINT "olx_oauth_states_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "olx_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'olx_oauth_states_teamId_fkey') THEN
    ALTER TABLE "olx_oauth_states" ADD CONSTRAINT "olx_oauth_states_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "olx_listings" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "olxAdId" TEXT NOT NULL,
  "listId" TEXT,
  "category" INTEGER,
  "status" TEXT,
  "operation" TEXT,
  "olxUrl" TEXT,
  "lastImportToken" TEXT,
  "lastImportStatus" TEXT,
  "lastImportCheckedAt" TIMESTAMP(3),
  "lastUpdateAt" TIMESTAMP(3),
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "olx_listings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "olx_listings_accountId_propertyId_key" ON "olx_listings"("accountId", "propertyId");
CREATE UNIQUE INDEX IF NOT EXISTS "olx_listings_accountId_olxAdId_key" ON "olx_listings"("accountId", "olxAdId");

CREATE INDEX IF NOT EXISTS "olx_listings_listId_idx" ON "olx_listings"("listId");
CREATE INDEX IF NOT EXISTS "olx_listings_accountId_idx" ON "olx_listings"("accountId");
CREATE INDEX IF NOT EXISTS "olx_listings_propertyId_idx" ON "olx_listings"("propertyId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'olx_listings_accountId_fkey') THEN
    ALTER TABLE "olx_listings" ADD CONSTRAINT "olx_listings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "olx_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'olx_listings_propertyId_fkey') THEN
    ALTER TABLE "olx_listings" ADD CONSTRAINT "olx_listings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "olx_lead_events" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "externalId" TEXT,
  "adId" TEXT,
  "listId" TEXT,
  "linkAd" TEXT,
  "source" TEXT,
  "name" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "message" TEXT,
  "createdAtRemote" TIMESTAMP(3),
  "internalLeadId" TEXT,
  "raw" JSONB,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "olx_lead_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "olx_lead_events_accountId_externalId_key" ON "olx_lead_events"("accountId", "externalId");

CREATE INDEX IF NOT EXISTS "olx_lead_events_accountId_idx" ON "olx_lead_events"("accountId");
CREATE INDEX IF NOT EXISTS "olx_lead_events_listId_idx" ON "olx_lead_events"("listId");
CREATE INDEX IF NOT EXISTS "olx_lead_events_email_idx" ON "olx_lead_events"("email");
CREATE INDEX IF NOT EXISTS "olx_lead_events_internalLeadId_idx" ON "olx_lead_events"("internalLeadId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'olx_lead_events_accountId_fkey') THEN
    ALTER TABLE "olx_lead_events" ADD CONSTRAINT "olx_lead_events_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "olx_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'olx_lead_events_internalLeadId_fkey') THEN
    ALTER TABLE "olx_lead_events" ADD CONSTRAINT "olx_lead_events_internalLeadId_fkey" FOREIGN KEY ("internalLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "olx_chat_threads" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "listId" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "lastMessagePreview" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "olx_chat_threads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "olx_chat_threads_accountId_chatId_key" ON "olx_chat_threads"("accountId", "chatId");

CREATE INDEX IF NOT EXISTS "olx_chat_threads_accountId_idx" ON "olx_chat_threads"("accountId");
CREATE INDEX IF NOT EXISTS "olx_chat_threads_listId_idx" ON "olx_chat_threads"("listId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'olx_chat_threads_accountId_fkey') THEN
    ALTER TABLE "olx_chat_threads" ADD CONSTRAINT "olx_chat_threads_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "olx_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "olx_chat_messages" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "senderType" TEXT,
  "origin" TEXT,
  "email" TEXT,
  "name" TEXT,
  "phone" TEXT,
  "message" TEXT,
  "messageTimestamp" TIMESTAMP(3),
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "olx_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "olx_chat_messages_threadId_messageId_key" ON "olx_chat_messages"("threadId", "messageId");

CREATE INDEX IF NOT EXISTS "olx_chat_messages_threadId_createdAt_idx" ON "olx_chat_messages"("threadId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'olx_chat_messages_threadId_fkey') THEN
    ALTER TABLE "olx_chat_messages" ADD CONSTRAINT "olx_chat_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "olx_chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "olx_notification_events" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "topic" TEXT,
  "createdAtRemote" TIMESTAMP(3),
  "adId" TEXT,
  "listId" TEXT,
  "category" INTEGER,
  "status" TEXT,
  "operation" TEXT,
  "reasonTag" TEXT,
  "message" TEXT,
  "viewUrl" TEXT,
  "raw" JSONB,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "olx_notification_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "olx_notification_events_accountId_notificationId_key" ON "olx_notification_events"("accountId", "notificationId");

CREATE INDEX IF NOT EXISTS "olx_notification_events_accountId_idx" ON "olx_notification_events"("accountId");
CREATE INDEX IF NOT EXISTS "olx_notification_events_listId_idx" ON "olx_notification_events"("listId");
CREATE INDEX IF NOT EXISTS "olx_notification_events_status_idx" ON "olx_notification_events"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'olx_notification_events_accountId_fkey') THEN
    ALTER TABLE "olx_notification_events" ADD CONSTRAINT "olx_notification_events_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "olx_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

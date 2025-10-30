-- CreateEnum
CREATE TYPE "ChatbotTriggerType" AS ENUM ('KEYWORD', 'DEFAULT', 'MANUAL');

-- CreateEnum
CREATE TYPE "ChatbotSender" AS ENUM ('BOT', 'CONTACT');

-- CreateTable
CREATE TABLE "chatbot_flows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "triggerType" "ChatbotTriggerType" NOT NULL DEFAULT 'KEYWORD',
    "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "entryNodeId" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "schedule" JSONB,
    "offlineMessage" TEXT,
    "transferQueueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbot_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_sessions" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "currentNodeId" TEXT,
    "state" JSONB,
    "completedAt" TIMESTAMP(3),
    "transferredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbot_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_interactions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sender" "ChatbotSender" NOT NULL,
    "nodeId" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatbot_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chatbot_flows_isActive_idx" ON "chatbot_flows"("isActive");

-- CreateIndex
CREATE INDEX "chatbot_flows_keywords_idx" ON "chatbot_flows" USING GIN ("keywords");

-- CreateIndex
CREATE INDEX "chatbot_sessions_flowId_idx" ON "chatbot_sessions"("flowId");

-- CreateIndex
CREATE INDEX "chatbot_sessions_ticketId_idx" ON "chatbot_sessions"("ticketId");

-- CreateIndex
CREATE INDEX "chatbot_sessions_contactId_idx" ON "chatbot_sessions"("contactId");

-- CreateIndex
CREATE INDEX "chatbot_interactions_sessionId_idx" ON "chatbot_interactions"("sessionId");

-- AddForeignKey
ALTER TABLE "chatbot_flows" ADD CONSTRAINT "chatbot_flows_transferQueueId_fkey" FOREIGN KEY ("transferQueueId") REFERENCES "queues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "chatbot_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_interactions" ADD CONSTRAINT "chatbot_interactions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chatbot_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

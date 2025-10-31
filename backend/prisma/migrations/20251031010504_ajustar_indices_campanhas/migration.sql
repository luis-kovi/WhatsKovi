-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS', 'INTERNAL');

-- CreateEnum
CREATE TYPE "MessageCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageCampaignRecipientStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageCampaignLogType" AS ENUM ('CREATED', 'UPDATED', 'SCHEDULED', 'STARTED', 'MESSAGE_SENT', 'MESSAGE_FAILED', 'PAUSED', 'RESUMED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "SentimentLabel" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('ZAPIER', 'N8N');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "SmsProvider" AS ENUM ('TWILIO');

-- AlterEnum
ALTER TYPE "MessageStatus" ADD VALUE 'FAILED';

-- DropIndex
DROP INDEX IF EXISTS "scheduled_message_logs_messageId_idx";

-- DropIndex
DROP INDEX IF EXISTS "scheduled_messages_ticketId_idx";

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "channel" "MessageChannel" NOT NULL DEFAULT 'WHATSAPP',
ADD COLUMN     "deliveryMetadata" JSONB;

-- CreateTable
CREATE TABLE "message_insights" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "sentiment" "SentimentLabel" NOT NULL,
    "sentimentScore" DOUBLE PRECISION,
    "summary" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_suggestions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'AI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "message_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_classifications" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "rationale" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_forecasts" (
    "id" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "expectedTickets" INTEGER NOT NULL,
    "lowerBound" INTEGER,
    "upperBound" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "demand_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "body" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "status" "MessageCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 30,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "cancelledCount" INTEGER NOT NULL DEFAULT 0,
    "whatsappId" TEXT NOT NULL,
    "queueId" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "filters" JSONB,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_campaign_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "ticketId" TEXT,
    "messageId" TEXT,
    "status" "MessageCampaignRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_campaign_logs" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" "MessageCampaignLogType" NOT NULL,
    "message" TEXT,
    "context" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_campaign_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_config" (
    "id" TEXT NOT NULL,
    "gaMeasurementId" TEXT,
    "zapierEnabled" BOOLEAN NOT NULL DEFAULT false,
    "zapierWebhookUrl" TEXT,
    "zapierAuthToken" TEXT,
    "n8nEnabled" BOOLEAN NOT NULL DEFAULT false,
    "n8nWebhookUrl" TEXT,
    "n8nAuthToken" TEXT,
    "emailChannelEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsChannelEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsProvider" "SmsProvider",
    "smsFromNumber" TEXT,
    "smsAccountSid" TEXT,
    "smsAuthToken" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_logs" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'SUCCESS',
    "statusCode" INTEGER,
    "requestUrl" TEXT NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_insights_messageId_key" ON "message_insights"("messageId");

-- CreateIndex
CREATE INDEX "message_suggestions_ticketId_idx" ON "message_suggestions"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_classifications_ticketId_key" ON "ticket_classifications"("ticketId");

-- CreateIndex
CREATE INDEX "demand_forecasts_periodStart_periodEnd_idx" ON "demand_forecasts"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "message_campaigns_status_idx" ON "message_campaigns"("status");

-- CreateIndex
CREATE INDEX "message_campaigns_scheduledFor_idx" ON "message_campaigns"("scheduledFor");

-- CreateIndex
CREATE INDEX "message_campaign_recipients_campaignId_status_idx" ON "message_campaign_recipients"("campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "message_campaign_recipients_campaignId_contactId_key" ON "message_campaign_recipients"("campaignId", "contactId");

-- CreateIndex
CREATE INDEX "message_campaign_logs_campaignId_createdAt_idx" ON "message_campaign_logs"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "integration_logs_provider_createdAt_idx" ON "integration_logs"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "integration_logs_eventType_createdAt_idx" ON "integration_logs"("eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "message_insights" ADD CONSTRAINT "message_insights_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_suggestions" ADD CONSTRAINT "message_suggestions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_suggestions" ADD CONSTRAINT "message_suggestions_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_classifications" ADD CONSTRAINT "ticket_classifications_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_campaigns" ADD CONSTRAINT "message_campaigns_whatsappId_fkey" FOREIGN KEY ("whatsappId") REFERENCES "whatsapp_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_campaigns" ADD CONSTRAINT "message_campaigns_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "queues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_campaigns" ADD CONSTRAINT "message_campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_campaigns" ADD CONSTRAINT "message_campaigns_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_campaign_recipients" ADD CONSTRAINT "message_campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "message_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_campaign_recipients" ADD CONSTRAINT "message_campaign_recipients_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_campaign_recipients" ADD CONSTRAINT "message_campaign_recipients_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_campaign_recipients" ADD CONSTRAINT "message_campaign_recipients_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_campaign_logs" ADD CONSTRAINT "message_campaign_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "message_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_campaign_logs" ADD CONSTRAINT "message_campaign_logs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_config" ADD CONSTRAINT "integration_config_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

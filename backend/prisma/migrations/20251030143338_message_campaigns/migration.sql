-- CreateEnum
CREATE TYPE "MessageCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageCampaignRecipientStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageCampaignLogType" AS ENUM ('CREATED', 'UPDATED', 'SCHEDULED', 'STARTED', 'MESSAGE_SENT', 'MESSAGE_FAILED', 'PAUSED', 'RESUMED', 'COMPLETED', 'CANCELLED', 'FAILED');

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

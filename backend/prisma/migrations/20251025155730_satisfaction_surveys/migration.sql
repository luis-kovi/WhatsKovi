-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('PENDING', 'SENT', 'RESPONDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SurveyChannel" AS ENUM ('WHATSAPP', 'LINK', 'MANUAL');

-- DropIndex
DROP INDEX "chatbot_flows_keywords_idx";

-- CreateTable
CREATE TABLE "satisfaction_surveys" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "queueId" TEXT,
    "agentId" TEXT,
    "whatsappId" TEXT,
    "token" TEXT NOT NULL,
    "channel" "SurveyChannel" NOT NULL DEFAULT 'WHATSAPP',
    "status" "SurveyStatus" NOT NULL DEFAULT 'PENDING',
    "rating" INTEGER,
    "comment" TEXT,
    "autoSent" BOOLEAN NOT NULL DEFAULT true,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "satisfaction_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "satisfaction_surveys_ticketId_key" ON "satisfaction_surveys"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "satisfaction_surveys_token_key" ON "satisfaction_surveys"("token");

-- CreateIndex
CREATE INDEX "satisfaction_surveys_status_sentAt_idx" ON "satisfaction_surveys"("status", "sentAt");

-- CreateIndex
CREATE INDEX "satisfaction_surveys_respondedAt_idx" ON "satisfaction_surveys"("respondedAt");

-- CreateIndex
CREATE INDEX "satisfaction_surveys_queueId_idx" ON "satisfaction_surveys"("queueId");

-- CreateIndex
CREATE INDEX "satisfaction_surveys_agentId_idx" ON "satisfaction_surveys"("agentId");

-- AddForeignKey
ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "queues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_whatsappId_fkey" FOREIGN KEY ("whatsappId") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "report_schedules_active_next_idx" RENAME TO "report_schedules_isActive_nextRunAt_idx";

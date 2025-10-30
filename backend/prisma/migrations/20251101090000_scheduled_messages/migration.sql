-- CreateEnum
CREATE TYPE "ScheduledMessageRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ScheduledMessageStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ScheduledMessageLogStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "scheduled_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "mediaUrl" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" "ScheduledMessageRecurrence" NOT NULL DEFAULT 'NONE',
    "weekdays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "dayOfMonth" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" "ScheduledMessageStatus" NOT NULL DEFAULT 'ACTIVE',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "jobId" TEXT,
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_message_logs" (
    "id" TEXT NOT NULL,
    "scheduledMessageId" TEXT NOT NULL,
    "messageId" TEXT,
    "status" "ScheduledMessageLogStatus" NOT NULL DEFAULT 'SUCCESS',
    "error" TEXT,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_messages_status_idx" ON "scheduled_messages"("status");

-- CreateIndex
CREATE INDEX "scheduled_messages_nextRunAt_idx" ON "scheduled_messages"("nextRunAt");

-- CreateIndex
CREATE INDEX "scheduled_messages_ticketId_idx" ON "scheduled_messages"("ticketId");

-- CreateIndex
CREATE INDEX "scheduled_message_logs_scheduledMessageId_runAt_idx" ON "scheduled_message_logs"("scheduledMessageId", "runAt");

-- CreateIndex
CREATE INDEX "scheduled_message_logs_messageId_idx" ON "scheduled_message_logs"("messageId");

-- AddForeignKey
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_message_logs" ADD CONSTRAINT "scheduled_message_logs_scheduledMessageId_fkey" FOREIGN KEY ("scheduledMessageId") REFERENCES "scheduled_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_message_logs" ADD CONSTRAINT "scheduled_message_logs_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

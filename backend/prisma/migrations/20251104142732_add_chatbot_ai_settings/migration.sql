-- DropIndex
DROP INDEX "scheduled_message_logs_messageId_idx";

-- DropIndex
DROP INDEX "scheduled_messages_ticketId_idx";

-- AlterTable
ALTER TABLE "advanced_settings" ADD COLUMN     "aiConfidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiFallbackQueueId" TEXT,
ADD COLUMN     "aiGeminiApiKey" TEXT,
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiOpenAiApiKey" TEXT,
ADD COLUMN     "aiProvider" TEXT NOT NULL DEFAULT 'OPENAI',
ADD COLUMN     "aiRoutingEnabled" BOOLEAN NOT NULL DEFAULT false;

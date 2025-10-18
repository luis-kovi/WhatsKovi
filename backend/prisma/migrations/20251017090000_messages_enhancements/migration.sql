-- AlterTable
ALTER TABLE "messages"
ADD COLUMN "editedAt" TIMESTAMP(3),
ADD COLUMN "editedBy" TEXT;

-- Ensure quoted message constraint
ALTER TABLE "messages"
ADD CONSTRAINT "messages_quotedMsgId_fkey"
FOREIGN KEY ("quotedMsgId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "message_reactions" (
  "id" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "message_reactions"
ADD CONSTRAINT "message_reactions_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "message_reactions"
ADD CONSTRAINT "message_reactions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddIndex
CREATE UNIQUE INDEX "message_reactions_messageId_userId_emoji_key"
ON "message_reactions" ("messageId", "userId", "emoji");

-- Quick reply advanced features

-- CreateTable
CREATE TABLE "quick_reply_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#2563EB',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_reply_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quick_reply_categories_name_key" ON "quick_reply_categories"("name");

-- AlterTable
ALTER TABLE "quick_replies"
    ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "lastUsedAt" TIMESTAMP(3),
    ADD COLUMN "ownerId" TEXT,
    ADD COLUMN "queueId" TEXT,
    ADD COLUMN "categoryId" TEXT;

-- CreateTable
CREATE TABLE "quick_reply_usage" (
    "id" TEXT NOT NULL,
    "quickReplyId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT,
    "queueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quick_reply_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quick_reply_usage_quickReplyId_idx" ON "quick_reply_usage"("quickReplyId");
CREATE INDEX "quick_reply_usage_ticketId_idx" ON "quick_reply_usage"("ticketId");
CREATE INDEX "quick_reply_usage_userId_idx" ON "quick_reply_usage"("userId");

-- AddForeignKey
ALTER TABLE "quick_replies"
    ADD CONSTRAINT "quick_replies_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quick_replies"
    ADD CONSTRAINT "quick_replies_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "queues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quick_replies"
    ADD CONSTRAINT "quick_replies_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "quick_reply_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quick_reply_usage"
    ADD CONSTRAINT "quick_reply_usage_quickReplyId_fkey" FOREIGN KEY ("quickReplyId") REFERENCES "quick_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quick_reply_usage"
    ADD CONSTRAINT "quick_reply_usage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quick_reply_usage"
    ADD CONSTRAINT "quick_reply_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quick_reply_usage"
    ADD CONSTRAINT "quick_reply_usage_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "queues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

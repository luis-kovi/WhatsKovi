-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('TICKET_CREATED', 'MESSAGE_RECEIVED', 'TICKET_STATUS_CHANGED');

-- CreateEnum
CREATE TYPE "AutomationLogStatus" AS ENUM ('SUCCESS', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" "AutomationTrigger" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "stopOnMatch" BOOLEAN NOT NULL DEFAULT false,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL,
    "metadata" JSONB,
    "testPayload" JSONB,
    "lastExecutedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_logs" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT,
    "trigger" "AutomationTrigger" NOT NULL,
    "status" "AutomationLogStatus" NOT NULL,
    "message" TEXT,
    "context" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_rules_trigger_isActive_idx" ON "automation_rules"("trigger", "isActive");

-- CreateIndex
CREATE INDEX "automation_rules_priority_updatedAt_idx" ON "automation_rules"("priority", "updatedAt");

-- CreateIndex
CREATE INDEX "automation_logs_trigger_createdAt_idx" ON "automation_logs"("trigger", "createdAt");

-- CreateIndex
CREATE INDEX "automation_logs_createdAt_idx" ON "automation_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "automation_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ReportFileFormat" AS ENUM ('CSV', 'XLSX', 'PDF');

-- CreateEnum
CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REPORT_READY';

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "format" "ReportFileFormat" NOT NULL DEFAULT 'PDF',
    "frequency" "ReportFrequency" NOT NULL DEFAULT 'DAILY',
    "timeOfDay" TEXT NOT NULL DEFAULT '08:00',
    "weekdays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "dayOfMonth" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "recipients" TEXT[] NOT NULL,
    "filters" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "jobId" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_snapshots" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT,
    "userId" TEXT NOT NULL,
    "format" "ReportFileFormat" NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "filters" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_schedules_userId_idx" ON "report_schedules"("userId");

-- CreateIndex
CREATE INDEX "report_schedules_active_next_idx" ON "report_schedules"("isActive", "nextRunAt");

-- CreateIndex
CREATE INDEX "report_snapshots_scheduleId_idx" ON "report_snapshots"("scheduleId");

-- CreateIndex
CREATE INDEX "report_snapshots_userId_generatedAt_idx" ON "report_snapshots"("userId", "generatedAt");

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "report_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL');

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "type" "TicketType" NOT NULL DEFAULT 'WHATSAPP';

-- Introduce BOT status for tickets
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'BOT';

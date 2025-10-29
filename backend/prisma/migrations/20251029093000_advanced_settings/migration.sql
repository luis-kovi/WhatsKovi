-- CreateTable
CREATE TABLE "advanced_settings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'WhatsKovi Atendimento',
    "brandColor" TEXT NOT NULL DEFAULT '#FF355A',
    "accentColor" TEXT NOT NULL DEFAULT '#7C3AED',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "supportedLanguages" TEXT[] NOT NULL DEFAULT ARRAY['pt-BR','en-US','es-ES'],
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "dateFormat" TEXT NOT NULL DEFAULT 'dd/MM/yyyy HH:mm',
    "logoUrl" TEXT,
    "logoStorageKey" TEXT,
    "inactivityMinutes" INTEGER NOT NULL DEFAULT 15,
    "autoCloseHours" INTEGER NOT NULL DEFAULT 12,
    "autoCloseMessage" TEXT NOT NULL DEFAULT 'Encerramos este atendimento apos um periodo sem respostas. Caso precise de ajuda novamente, estamos por aqui!',
    "globalTicketLimit" INTEGER NOT NULL DEFAULT 400,
    "perAgentTicketLimit" INTEGER NOT NULL DEFAULT 25,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "satisfactionSurveyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewTicket" BOOLEAN NOT NULL DEFAULT true,
    "notifyTicketMessage" BOOLEAN NOT NULL DEFAULT true,
    "notifyTransfer" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "soundTheme" TEXT NOT NULL DEFAULT 'classic',
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpFrom" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advanced_settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "advanced_settings" ADD CONSTRAINT "advanced_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

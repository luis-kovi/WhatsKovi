import nodemailer, { Transporter } from 'nodemailer';
import { NotificationPreference } from '@prisma/client';

export type EmailTemplateKey = 'new-ticket' | 'ticket-message' | 'ticket-transfer';

type RenderedTemplate = {
  subject: string;
  html: string;
  text: string;
};

export type TemplateContext = {
  ticketId: string;
  contactName?: string;
  queueName?: string | null;
  messagePreview?: string;
  actorName?: string | null;
  actionAt?: Date;
  dashboardUrl?: string;
};

const renderTemplate = (template: EmailTemplateKey, context: TemplateContext): RenderedTemplate => {
  const baseUrl = context.dashboardUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
  const ticketUrl = `${baseUrl.replace(/\/$/, '')}/dashboard?ticket=${context.ticketId}`;

  switch (template) {
    case 'new-ticket': {
      const subject = `[WhatsKovi] Novo ticket aberto (${context.contactName ?? 'Contato'})`;
      const text = [
        `Um novo ticket foi aberto por ${context.contactName ?? 'um contato'}.`,
        context.queueName ? `Fila: ${context.queueName}` : null,
        `Acesse o ticket em: ${ticketUrl}`
      ]
        .filter(Boolean)
        .join('\n');

      const html = `
        <h2 style="font-family: Arial, sans-serif; color: #111827;">Novo ticket disponível</h2>
        <p style="font-family: Arial, sans-serif; color: #374151;">Um novo ticket foi aberto por <strong>${context.contactName ?? 'um contato'}</strong>.</p>
        ${
          context.queueName
            ? `<p style="font-family: Arial, sans-serif; color: #374151;">Fila: <strong>${context.queueName}</strong></p>`
            : ''
        }
        <p style="font-family: Arial, sans-serif; color: #374151;">Clique no botão abaixo para acessar o ticket.</p>
        <p><a href="${ticketUrl}" style="display:inline-block;padding:12px 20px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-family: Arial, sans-serif;">Abrir ticket</a></p>
      `;

      return { subject, html, text };
    }
    case 'ticket-message': {
      const subject = `[WhatsKovi] Nova mensagem recebida (${context.contactName ?? 'Contato'})`;
      const text = [
        `Uma nova mensagem foi recebida de ${context.contactName ?? 'um contato'}.`,
        context.messagePreview ? `Mensagem: ${context.messagePreview}` : null,
        `Acesse o ticket em: ${ticketUrl}`
      ]
        .filter(Boolean)
        .join('\n');

      const html = `
        <h2 style="font-family: Arial, sans-serif; color: #111827;">Nova mensagem no ticket</h2>
        <p style="font-family: Arial, sans-serif; color: #374151;">${context.contactName ?? 'Um contato'} enviou uma nova mensagem.</p>
        ${
          context.messagePreview
            ? `<blockquote style="font-family: Arial, sans-serif; color: #111827; border-left: 4px solid #2563EB; margin: 12px 0; padding-left: 12px;">${context.messagePreview}</blockquote>`
            : ''
        }
        <p style="font-family: Arial, sans-serif; color: #374151;">Acesse o ticket para responder rapidamente.</p>
        <p><a href="${ticketUrl}" style="display:inline-block;padding:12px 20px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-family: Arial, sans-serif;">Responder mensagem</a></p>
      `;

      return { subject, html, text };
    }
    case 'ticket-transfer': {
      const subject = `[WhatsKovi] Ticket transferido para você`;
      const text = [
        `Um ticket foi transferido para você.`,
        context.actorName ? `Responsável anterior: ${context.actorName}` : null,
        context.queueName ? `Fila atual: ${context.queueName}` : null,
        `Acesse o ticket em: ${ticketUrl}`
      ]
        .filter(Boolean)
        .join('\n');

      const html = `
        <h2 style="font-family: Arial, sans-serif; color: #111827;">Ticket atribuído</h2>
        <p style="font-family: Arial, sans-serif; color: #374151;">Você recebeu um ticket que precisa de atenção.</p>
        ${
          context.actorName
            ? `<p style="font-family: Arial, sans-serif; color: #374151;">Responsável anterior: <strong>${context.actorName}</strong></p>`
            : ''
        }
        ${
          context.queueName
            ? `<p style="font-family: Arial, sans-serif; color: #374151;">Fila atual: <strong>${context.queueName}</strong></p>`
            : ''
        }
        <p style="font-family: Arial, sans-serif; color: #374151;">Revise o ticket e retome o atendimento.</p>
        <p><a href="${ticketUrl}" style="display:inline-block;padding:12px 20px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-family: Arial, sans-serif;">Abrir ticket</a></p>
      `;

      return { subject, html, text };
    }
    default:
      return {
        subject: 'Notificação WhatsKovi',
        html: '<p>Você possui uma nova notificação.</p>',
        text: 'Você possui uma nova notificação.'
      };
  }
};

type TransportConfig = {
  host?: string | null;
  port?: number | null;
  secure?: boolean | null;
  authUser?: string | null;
  authPass?: string | null;
  from?: string | null;
};

const resolveTransportConfig = (preference?: NotificationPreference | null): TransportConfig => {
  const host = preference?.smtpHost ?? process.env.SMTP_HOST ?? null;
  const port =
    preference?.smtpPort ??
    (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null);
  const secure =
    typeof preference?.smtpSecure === 'boolean'
      ? preference.smtpSecure
      : process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : true;
  const authUser = preference?.smtpUser ?? process.env.SMTP_USER ?? null;
  const authPass = preference?.smtpPassword ?? process.env.SMTP_PASSWORD ?? null;
  const from = preference?.smtpFrom ?? process.env.SMTP_FROM ?? authUser ?? null;

  return { host, port, secure, authUser, authPass, from };
};

const buildTransporter = (config: TransportConfig): Transporter | null => {
  if (!config.host || !config.authUser || !config.authPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port ?? 587,
    secure: config.secure ?? false,
    auth: {
      user: config.authUser,
      pass: config.authPass
    }
  });
};

export const sendNotificationEmail = async (
  to: string,
  template: EmailTemplateKey,
  context: TemplateContext,
  preference?: NotificationPreference | null
) => {
  const config = resolveTransportConfig(preference);
  const transporter = buildTransporter(config);

  if (!transporter || !config.from) {
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' as const };
  }

  const payload = renderTemplate(template, context);

  await transporter.sendMail({
    from: config.from,
    to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html
  });

  return { sent: true as const };
};

export const testSmtpConnection = async (preference?: NotificationPreference | null) => {
  const config = resolveTransportConfig(preference);
  const transporter = buildTransporter(config);

  if (!transporter) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  await transporter.verify();
  return true;
};

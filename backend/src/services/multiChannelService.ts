import nodemailer, { Transporter } from 'nodemailer';
import twilio from 'twilio';
import prisma from '../config/database';
import { getSmsProviderConfig, isEmailChannelEnabled, isSmsChannelEnabled } from './integrationService';

type EmailChannelOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

type EmailChannelResult = {
  messageId: string;
};

type SmsChannelResult = {
  sid: string;
  status?: string | null;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

let cachedTransporter: Transporter | null = null;
let cachedTransportKey: string | null = null;

const resolveSmtpConfig = async (): Promise<SmtpConfig | null> => {
  const settings = await prisma.advancedSettings.findFirst();

  const host = settings?.smtpHost ?? process.env.SMTP_HOST ?? null;
  const port =
    settings?.smtpPort ??
    (process.env.SMTP_PORT ? Number.parseInt(process.env.SMTP_PORT, 10) : null);
  const user = settings?.smtpUser ?? process.env.SMTP_USER ?? null;
  const pass = settings?.smtpPassword ?? process.env.SMTP_PASSWORD ?? null;
  const from = settings?.smtpFrom ?? process.env.SMTP_FROM ?? user ?? null;
  const secure =
    typeof settings?.smtpSecure === 'boolean'
      ? settings.smtpSecure
      : process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === 'true'
        : true;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port: Number.isFinite(port) && port ? port : 587,
    secure,
    user,
    pass,
    from
  };
};

const getEmailTransporter = async () => {
  const config = await resolveSmtpConfig();
  if (!config) {
    return null;
  }

  const key = `${config.host}:${config.port}:${config.user}:${config.from}:${config.secure}`;

  if (cachedTransporter && cachedTransportKey === key) {
    return { transporter: cachedTransporter, from: config.from };
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
  cachedTransportKey = key;

  return { transporter: cachedTransporter, from: config.from };
};

export const canSendEmailChannel = async () => {
  if (!(await isEmailChannelEnabled())) {
    return false;
  }
  const config = await resolveSmtpConfig();
  return Boolean(config);
};

export const sendEmailChannelMessage = async (options: EmailChannelOptions): Promise<EmailChannelResult> => {
  const emailConfig = await getEmailTransporter();

  if (!emailConfig) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  const info = await emailConfig.transporter.sendMail({
    from: emailConfig.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    replyTo: options.replyTo
  });

  return {
    messageId: info.messageId ?? 'unknown'
  };
};

export const getEmailChannelDiagnostics = async () => {
  const enabled = await isEmailChannelEnabled();
  const config = await resolveSmtpConfig();

  return {
    enabled,
    configured: Boolean(config),
    from: config?.from ?? null
  };
};

let cachedTwilioKey: string | null = null;
let cachedTwilioClient: ReturnType<typeof twilio> | null = null;

export const canSendSmsChannel = async () => {
  if (!(await isSmsChannelEnabled())) {
    return false;
  }
  const config = await getSmsProviderConfig();
  return Boolean(config);
};

export const getSmsChannelDiagnostics = async () => {
  const enabled = await isSmsChannelEnabled();
  const config = await getSmsProviderConfig();

  return {
    enabled,
    configured: Boolean(config),
    provider: config?.provider ?? null,
    from: config?.fromNumber ?? null
  };
};

export const sendSmsChannelMessage = async (to: string, body: string): Promise<SmsChannelResult> => {
  const config = await getSmsProviderConfig();

  if (!config) {
    throw new Error('SMS_NOT_CONFIGURED');
  }

  const key = `${config.accountSid}:${config.fromNumber}`;
  if (!cachedTwilioClient || cachedTwilioKey !== key) {
    cachedTwilioClient = twilio(config.accountSid, config.authToken);
    cachedTwilioKey = key;
  }

  if (!cachedTwilioClient) {
    throw new Error('SMS_CLIENT_NOT_INITIALIZED');
  }

  const result = await cachedTwilioClient.messages.create({
    to,
    from: config.fromNumber,
    body
  });

  return {
    sid: result.sid,
    status: result.status ?? null
  };
};

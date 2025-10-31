import axios from 'axios';
import type { Prisma } from '@prisma/client';
import prisma from '../config/database';

type Direction = 'INBOUND' | 'OUTBOUND';
type IntegrationProviderValue = 'ZAPIER' | 'N8N';
type IntegrationStatusValue = 'SUCCESS' | 'FAILED';
type SmsProviderValue = 'TWILIO';

const sanitizeUrl = (value?: string | null) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch {
    return null;
  }
};

const sanitizeString = (value?: string | null) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const maskToken = (value?: string | null) => {
  if (!value) return null;
  if (value.length <= 8) return '*'.repeat(value.length);
  return `${value.slice(0, 4)}${'*'.repeat(value.length - 8)}${value.slice(-4)}`;
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
};

export const ensureIntegrationConfig = async () => {
  const existing = await prisma.integrationConfig.findFirst();
  if (existing) {
    return existing;
  }

  return prisma.integrationConfig.create({ data: {} });
};

const mapTicketPayload = (ticket: any) => ({
  id: ticket.id,
  status: ticket.status,
  priority: ticket.priority,
  queue: ticket.queue
    ? {
        id: ticket.queue.id,
        name: ticket.queue.name
      }
    : null,
  assignedUser: ticket.user
    ? {
        id: ticket.user.id,
        name: ticket.user.name
      }
    : null,
  contact: {
    id: ticket.contact.id,
    name: ticket.contact.name,
    phoneNumber: ticket.contact.phoneNumber,
    email: ticket.contact.email
  },
  lastMessageAt: ticket.lastMessageAt?.toISOString?.() ?? null,
  createdAt: ticket.createdAt?.toISOString?.() ?? null,
  updatedAt: ticket.updatedAt?.toISOString?.() ?? null
});

const mapMessagePayload = (message: any, direction: Direction) => ({
  id: message.id,
  ticketId: message.ticketId,
  channel: message.channel,
  direction,
  body: message.body,
  type: message.type,
  status: message.status,
  isPrivate: message.isPrivate,
  createdAt: message.createdAt?.toISOString?.() ?? null,
  user: message.user
    ? {
        id: message.user.id,
        name: message.user.name
      }
    : null,
  delivery: message.deliveryMetadata ?? null
});

type TicketCreatedEvent = {
  type: 'ticket.created';
  ticket: ReturnType<typeof mapTicketPayload>;
};

type MessageEvent = {
  type: 'message.sent' | 'message.received';
  ticket: ReturnType<typeof mapTicketPayload>;
  message: ReturnType<typeof mapMessagePayload>;
};

type IntegrationEvent = TicketCreatedEvent | MessageEvent;

const buildEnvelope = (event: IntegrationEvent) => ({
  event: event.type,
  timestamp: new Date().toISOString(),
  data: event
});

const createLog = async (
  provider: IntegrationProviderValue,
  eventType: IntegrationEvent['type'],
  url: string,
  status: IntegrationStatusValue,
  payload: Prisma.InputJsonValue | undefined,
  statusCode?: number,
  response?: Prisma.InputJsonValue | undefined,
  error?: string
) => {
  try {
    await prisma.integrationLog.create({
      data: {
        provider,
        eventType,
        status,
        statusCode: statusCode ?? null,
        requestUrl: url,
        requestPayload: payload ?? undefined,
        responsePayload: response ?? undefined,
        error: error ?? null
      }
    });
  } catch (logError) {
    console.warn('[Integration] Unable to persist integration log', logError);
  }
};

const sendToProvider = async (
  provider: IntegrationProviderValue,
  url: string,
  token: string | null,
  envelope: ReturnType<typeof buildEnvelope>,
  eventType: IntegrationEvent['type']
) => {
  try {
    const response = await axios.post(url, envelope, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      timeout: 10_000
    });

    await createLog(
      provider,
      eventType,
      url,
      'SUCCESS',
      envelope as Prisma.InputJsonValue,
      response.status,
      toJsonValue(response.data)
    );
  } catch (error) {
    const axiosError = error as { response?: { status?: number; data?: unknown } };
    await createLog(
      provider,
      eventType,
      url,
      'FAILED',
      envelope as Prisma.InputJsonValue,
      axiosError.response?.status,
      toJsonValue(axiosError.response?.data),
      error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    );
  }
};

const dispatchIntegrationEvent = async (event: IntegrationEvent) => {
  const config = await ensureIntegrationConfig();
  const envelope = buildEnvelope(event);

  const tasks: Promise<void>[] = [];

  if (config.zapierEnabled && config.zapierWebhookUrl) {
    tasks.push(
      sendToProvider(
        'ZAPIER',
        config.zapierWebhookUrl,
        config.zapierAuthToken ?? null,
        envelope,
        event.type
      )
    );
  }

  if (config.n8nEnabled && config.n8nWebhookUrl) {
    tasks.push(
      sendToProvider(
        'N8N',
        config.n8nWebhookUrl,
        config.n8nAuthToken ?? null,
        envelope,
        event.type
      )
    );
  }

  if (tasks.length === 0) {
    return;
  }

  await Promise.all(tasks);
};

export const emitTicketCreatedEvent = async (ticketId: string) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        contact: true,
        queue: true,
        user: { select: { id: true, name: true } }
      }
    });

    if (!ticket) return;

    await dispatchIntegrationEvent({
      type: 'ticket.created',
      ticket: mapTicketPayload(ticket)
    });
  } catch (error) {
    console.warn('[Integration] Failed to emit ticket created', error);
  }
};

export const emitMessageEvent = async (messageId: string, direction: Direction) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        ticket: {
          include: {
            contact: true,
            queue: true,
            user: { select: { id: true, name: true } }
          }
        },
        user: { select: { id: true, name: true } }
      }
    });

    if (!message) return;

    await dispatchIntegrationEvent({
      type: direction === 'INBOUND' ? 'message.received' : 'message.sent',
      ticket: mapTicketPayload(message.ticket),
      message: mapMessagePayload(message, direction)
    });
  } catch (error) {
    console.warn('[Integration] Failed to emit message event', error);
  }
};

export const getIntegrationSettings = async () => {
  const config = await ensureIntegrationConfig();
  const logs = await prisma.integrationLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 25
  });

  const measurementId = config.gaMeasurementId ?? process.env.GA_MEASUREMENT_ID ?? null;

  return {
    analytics: {
      measurementId
    },
    zapier: {
      enabled: Boolean(config.zapierEnabled && config.zapierWebhookUrl),
      webhookUrl: config.zapierWebhookUrl,
      hasAuthToken: Boolean(config.zapierAuthToken),
      authTokenPreview: maskToken(config.zapierAuthToken)
    },
    n8n: {
      enabled: Boolean(config.n8nEnabled && config.n8nWebhookUrl),
      webhookUrl: config.n8nWebhookUrl,
      hasAuthToken: Boolean(config.n8nAuthToken),
      authTokenPreview: maskToken(config.n8nAuthToken)
    },
    multichannel: {
      emailEnabled: Boolean(config.emailChannelEnabled),
      smsEnabled: Boolean(
        config.smsChannelEnabled &&
          config.smsProvider &&
          (config.smsFromNumber || process.env.TWILIO_FROM) &&
          (config.smsAccountSid || process.env.TWILIO_ACCOUNT_SID) &&
          (config.smsAuthToken || process.env.TWILIO_AUTH_TOKEN)
      ),
      smsProvider: config.smsProvider ?? null,
      smsFromNumber: config.smsFromNumber ?? process.env.TWILIO_FROM ?? null
    },
    logs: logs.map((log) => ({
      id: log.id,
      provider: log.provider,
      eventType: log.eventType,
      status: log.status,
      statusCode: log.statusCode,
      createdAt: log.createdAt.toISOString(),
      error: log.error ?? null
    }))
  };
};

export type UpdateIntegrationSettingsPayload = {
  measurementId?: string | null;
  zapierEnabled?: boolean;
  zapierWebhookUrl?: string | null;
  zapierAuthToken?: string | null;
  n8nEnabled?: boolean;
  n8nWebhookUrl?: string | null;
  n8nAuthToken?: string | null;
  emailChannelEnabled?: boolean;
  smsChannelEnabled?: boolean;
  smsProvider?: SmsProviderValue | null;
  smsFromNumber?: string | null;
  smsAccountSid?: string | null;
  smsAuthToken?: string | null;
};

export const updateIntegrationSettings = async (
  payload: UpdateIntegrationSettingsPayload,
  userId?: string
) => {
  const current = await ensureIntegrationConfig();

  const data: Prisma.IntegrationConfigUpdateInput = {};

  if (userId) {
    data.updatedBy = { connect: { id: userId } };
  }

  if (payload.measurementId !== undefined) {
    data.gaMeasurementId = sanitizeString(payload.measurementId);
  }

  if (payload.zapierEnabled !== undefined) {
    data.zapierEnabled = Boolean(payload.zapierEnabled);
  }

  if (payload.zapierWebhookUrl !== undefined) {
    data.zapierWebhookUrl = sanitizeUrl(payload.zapierWebhookUrl);
  }

  if (payload.zapierAuthToken !== undefined) {
    data.zapierAuthToken = sanitizeString(payload.zapierAuthToken);
  }

  if (payload.n8nEnabled !== undefined) {
    data.n8nEnabled = Boolean(payload.n8nEnabled);
  }

  if (payload.n8nWebhookUrl !== undefined) {
    data.n8nWebhookUrl = sanitizeUrl(payload.n8nWebhookUrl);
  }

  if (payload.n8nAuthToken !== undefined) {
    data.n8nAuthToken = sanitizeString(payload.n8nAuthToken);
  }

  if (payload.emailChannelEnabled !== undefined) {
    data.emailChannelEnabled = Boolean(payload.emailChannelEnabled);
  }

  if (payload.smsChannelEnabled !== undefined) {
    data.smsChannelEnabled = Boolean(payload.smsChannelEnabled);
  }

  if (payload.smsProvider !== undefined) {
    data.smsProvider =
      payload.smsProvider === undefined
        ? undefined
        : payload.smsProvider
          ? { set: payload.smsProvider }
          : { set: null };
  }

  if (payload.smsFromNumber !== undefined) {
    data.smsFromNumber = sanitizeString(payload.smsFromNumber);
  }

  if (payload.smsAccountSid !== undefined) {
    data.smsAccountSid = sanitizeString(payload.smsAccountSid);
  }

  if (payload.smsAuthToken !== undefined) {
    data.smsAuthToken = sanitizeString(payload.smsAuthToken);
  }

  await prisma.integrationConfig.update({
    where: { id: current.id },
    data
  });

  return getIntegrationSettings();
};

export const listIntegrationLogs = async (limit = 100) => {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const logs = await prisma.integrationLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: safeLimit
  });

  return logs.map((log) => ({
    id: log.id,
    provider: log.provider,
    eventType: log.eventType,
    status: log.status,
    statusCode: log.statusCode,
    requestUrl: log.requestUrl,
    createdAt: log.createdAt.toISOString(),
    error: log.error ?? null
  }));
};

export const isEmailChannelEnabled = async () => {
  const config = await ensureIntegrationConfig();
  return Boolean(config.emailChannelEnabled);
};

export const isSmsChannelEnabled = async () => {
  const config = await ensureIntegrationConfig();
  return Boolean(config.smsChannelEnabled);
};

export const getSmsProviderConfig = async () => {
  const config = await ensureIntegrationConfig();

  if (!config.smsChannelEnabled || config.smsProvider !== 'TWILIO') {
    return null;
  }

  const accountSid = config.smsAccountSid ?? process.env.TWILIO_ACCOUNT_SID ?? null;
  const authToken = config.smsAuthToken ?? process.env.TWILIO_AUTH_TOKEN ?? null;
  const fromNumber = config.smsFromNumber ?? process.env.TWILIO_FROM ?? null;

  if (!accountSid || !authToken || !fromNumber) {
    return null;
  }

  return {
    provider: 'TWILIO' as SmsProviderValue,
    accountSid,
    authToken,
    fromNumber
  };
};

export const resolveAnalyticsMeasurementId = async () => {
  const config = await ensureIntegrationConfig();
  return config.gaMeasurementId ?? process.env.GA_MEASUREMENT_ID ?? null;
};

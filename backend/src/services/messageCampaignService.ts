import Queue from 'bull';
import {
  MessageCampaignStatus,
  MessageCampaignRecipientStatus,
  MessageCampaignLogType,
  MessageStatus,
  MessageType,
  Prisma,
  TicketStatus,
  Priority
} from '@prisma/client';
import type { MessageCampaign } from '@prisma/client';
import prisma from '../config/database';
import { SegmentFilters, buildContactWhere, parseSegmentFilters } from '../utils/contactFilters';
import { sendWhatsAppMessage } from './whatsappService';
import { applyAutomaticTagsToTicket } from './tagAutomation';
import { io } from '../server';

const connection = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const queueName = 'message:campaign';

export const messageCampaignQueue = new Queue(queueName, connection);

const DEFAULT_RATE_LIMIT = 30;
const MIN_RATE_LIMIT = 1;
const MAX_RATE_LIMIT = 500;
const DEFAULT_PAGE_SIZE = 25;

const messageInclude = {
  user: { select: { id: true, name: true, avatar: true } },
  quotedMessage: {
    select: {
      id: true,
      body: true,
      type: true,
      mediaUrl: true,
      createdAt: true,
      user: { select: { id: true, name: true, avatar: true } }
    }
  },
  reactions: {
    include: {
      user: { select: { id: true, name: true, avatar: true } }
    }
  }
} as const;

type CreateMessageCampaignPayload = {
  name: string;
  description?: string;
  body: string;
  mediaUrl?: string | null;
  whatsappId: string;
  queueId?: string | null;
  contactIds?: string[];
  segmentIds?: string[];
  filters?: SegmentFilters;
  scheduledFor?: string | Date | null;
  rateLimitPerMinute?: number | null;
};

type UpdateMessageCampaignPayload = {
  name?: string;
  description?: string | null;
  body?: string;
  mediaUrl?: string | null;
  scheduledFor?: string | Date | null;
  rateLimitPerMinute?: number | null;
  status?: MessageCampaignStatus;
};

type ListCampaignOptions = {
  status?: MessageCampaignStatus[];
  search?: string;
  page?: number;
  pageSize?: number;
};

type ListRecipientOptions = {
  status?: MessageCampaignRecipientStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

const sanitizeRateLimit = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return DEFAULT_RATE_LIMIT;
  }
  const normalized = Math.floor(value);
  if (!Number.isFinite(normalized)) {
    return DEFAULT_RATE_LIMIT;
  }
  return Math.min(Math.max(normalized, MIN_RATE_LIMIT), MAX_RATE_LIMIT);
};

const computeDelayFromRate = (rateLimit: number) => {
  const safeRate = Math.max(rateLimit, MIN_RATE_LIMIT);
  return Math.max(Math.floor(60000 / safeRate), 0);
};

const normalizeScheduledDate = (input?: string | Date | null) => {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Data de agendamento invalida.');
  }
  return date;
};

const normalizePage = (value?: number) => {
  if (!value) return 1;
  const parsed = Math.max(1, Math.floor(value));
  return Number.isFinite(parsed) ? parsed : 1;
};

const normalizePageSize = (value?: number) => {
  if (!value) return DEFAULT_PAGE_SIZE;
  const parsed = Math.max(1, Math.min(100, Math.floor(value)));
  return Number.isFinite(parsed) ? parsed : DEFAULT_PAGE_SIZE;
};

const unique = <T>(items: Iterable<T>) => Array.from(new Set(items));

const recordCampaignLog = async (
  campaignId: string,
  type: MessageCampaignLogType,
  message?: string,
  context?: Prisma.JsonValue,
  createdById?: string | null
) => {
  await prisma.messageCampaignLog.create({
    data: {
      campaignId,
      type,
      message: message ?? null,
      context: context ?? undefined,
      createdById: createdById ?? undefined
    }
  });
};

const removeCampaignJob = async (jobId?: string | null) => {
  if (!jobId) return;
  try {
    await messageCampaignQueue.removeJobs(jobId);
  } catch (error) {
    console.error('Nao foi possivel remover job da campanha:', error);
  }
};

const scheduleCampaignJob = async (campaignId: string, delay: number) => {
  const jobId = `campaign:${campaignId}:${Date.now()}`;
  const job = await messageCampaignQueue.add(
    'dispatch',
    { campaignId },
    {
      jobId,
      delay: Math.max(delay, 0),
      removeOnComplete: true,
      attempts: 1
    }
  );

  await prisma.messageCampaign.update({
    where: { id: campaignId },
    data: { jobId: job.id ? job.id.toString() : null }
  });
};

const resolveRecipientsFromSegments = async (segmentIds: string[]) => {
  if (!segmentIds.length) {
    return new Set<string>();
  }

  const contactIds = new Set<string>();

  for (const segmentId of segmentIds) {
    const segment = await prisma.contactSegment.findUnique({ where: { id: segmentId } });
    if (!segment) {
      continue;
    }
    const filters = parseSegmentFilters(segment.filters);
    const where = buildContactWhere(filters, { isBlocked: false });
    const contacts = await prisma.contact.findMany({
      where,
      select: { id: true }
    });
    contacts.forEach((contact) => contactIds.add(contact.id));
  }

  return contactIds;
};

const resolveRecipientsFromFilters = async (filters?: SegmentFilters) => {
  if (!filters) {
    return new Set<string>();
  }

  const where = buildContactWhere(filters, { isBlocked: false });
  const contacts = await prisma.contact.findMany({
    where,
    select: { id: true }
  });
  return new Set(contacts.map((contact) => contact.id));
};

const resolveRecipientsFromContactIds = async (contactIds?: string[]) => {
  if (!contactIds?.length) {
    return new Set<string>();
  }

  const contacts = await prisma.contact.findMany({
    where: {
      id: { in: unique(contactIds) },
      isBlocked: false
    },
    select: { id: true }
  });

  return new Set(contacts.map((contact) => contact.id));
};

const buildRecipientSet = async (payload: {
  contactIds?: string[];
  segmentIds?: string[];
  filters?: SegmentFilters;
}) => {
  const recipients = new Set<string>();
  const [manual, segments, filtered] = await Promise.all([
    resolveRecipientsFromContactIds(payload.contactIds),
    resolveRecipientsFromSegments(payload.segmentIds ?? []),
    resolveRecipientsFromFilters(payload.filters)
  ]);

  manual.forEach((id) => recipients.add(id));
  segments.forEach((id) => recipients.add(id));
  filtered.forEach((id) => recipients.add(id));

  return recipients;
};

const findOrCreateTicketForContact = async (options: {
  contactId: string;
  whatsappId: string;
  queueId?: string | null;
}) => {
  const { contactId, whatsappId, queueId } = options;

  const existing = await prisma.ticket.findFirst({
    where: {
      contactId,
      whatsappId,
      status: { in: [TicketStatus.OPEN, TicketStatus.PENDING] }
    },
    orderBy: { updatedAt: 'desc' }
  });

  if (existing) {
    return existing;
  }

  return prisma.ticket.create({
    data: {
      contactId,
      whatsappId,
      queueId: queueId ?? undefined,
      status: TicketStatus.OPEN,
      priority: Priority.MEDIUM,
      lastMessageAt: new Date(),
      unreadMessages: 0
    }
  });
};

const buildFiltersSnapshot = (payload: {
  contactIds?: string[];
  segmentIds?: string[];
  filters?: SegmentFilters;
}): Prisma.JsonValue | null => {
  const snapshot: Record<string, unknown> = {};
  if (payload.contactIds?.length) snapshot.contactIds = unique(payload.contactIds);
  if (payload.segmentIds?.length) snapshot.segmentIds = unique(payload.segmentIds);
  if (payload.filters && Object.keys(payload.filters).length > 0) snapshot.filters = payload.filters;
  return Object.keys(snapshot).length ? (snapshot as Prisma.JsonValue) : null;
};

const fetchCampaignWithRelations = async (campaignId: string) => {
  return prisma.messageCampaign.findUnique({
    where: { id: campaignId },
    include: {
      whatsapp: true,
      queue: true,
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } }
    }
  });
};

const buildCampaignProgress = (campaign: {
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  cancelledCount: number;
}) => {
  const total = campaign.totalRecipients;
  const processed = campaign.sentCount + campaign.failedCount + campaign.skippedCount + campaign.cancelledCount;
  const pending = Math.max(total - processed, 0);
  const completion = total > 0 ? Math.min(Math.round((processed / total) * 100), 100) : 0;

  return {
    total,
    sent: campaign.sentCount,
    failed: campaign.failedCount,
    skipped: campaign.skippedCount,
    cancelled: campaign.cancelledCount,
    pending,
    completion
  };
};

export const listMessageCampaigns = async (options: ListCampaignOptions) => {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(options.pageSize);
  const where: Prisma.MessageCampaignWhereInput = {};

  if (options.status?.length) {
    where.status = { in: options.status };
  }

  if (options.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } }
    ];
  }

  const [total, campaigns] = await prisma.$transaction([
    prisma.messageCampaign.count({ where }),
    prisma.messageCampaign.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        whatsapp: { select: { id: true, name: true, phoneNumber: true } },
        queue: { select: { id: true, name: true, color: true } },
        createdBy: { select: { id: true, name: true } }
      }
    })
  ]);

  const items = campaigns.map((campaign) => ({
    ...campaign,
    progress: buildCampaignProgress(campaign)
  }));

  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    items
  };
};

export const getMessageCampaign = async (campaignId: string) => {
  const campaign = await fetchCampaignWithRelations(campaignId);
  if (!campaign) {
    throw new Error('Campanha nao encontrada.');
  }

  const stats = buildCampaignProgress(campaign);
  const totalsByStatus = await prisma.messageCampaignRecipient.groupBy({
    by: ['status'],
    where: { campaignId },
    _count: { _all: true }
  });

  return {
    ...campaign,
    progress: stats,
    recipientsByStatus: totalsByStatus.reduce<Record<MessageCampaignRecipientStatus, number>>((acc, entry) => {
      acc[entry.status as MessageCampaignRecipientStatus] = entry._count._all;
      return acc;
    }, {} as Record<MessageCampaignRecipientStatus, number>)
  };
};

export const getMessageCampaignStats = async (campaignId: string) => {
  const campaign = await prisma.messageCampaign.findUnique({
    where: { id: campaignId },
    select: {
      totalRecipients: true,
      sentCount: true,
      failedCount: true,
      skippedCount: true,
      cancelledCount: true
    }
  });
  if (!campaign) {
    throw new Error('Campanha nao encontrada.');
  }
  return buildCampaignProgress(campaign);
};

export const listMessageCampaignRecipients = async (
  campaignId: string,
  options: ListRecipientOptions
) => {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(options.pageSize);

  const where: Prisma.MessageCampaignRecipientWhereInput = {
    campaignId
  };

  if (options.status) {
    where.status = options.status;
  }

  if (options.search) {
    where.contact = {
      OR: [
        { name: { contains: options.search, mode: 'insensitive' } },
        { phoneNumber: { contains: options.search, mode: 'insensitive' } }
      ]
    };
  }

  const [total, recipients] = await prisma.$transaction([
    prisma.messageCampaignRecipient.count({ where }),
    prisma.messageCampaignRecipient.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
            isBlocked: true
          }
        }
      }
    })
  ]);

  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    items: recipients
  };
};

export const createMessageCampaign = async (userId: string, payload: CreateMessageCampaignPayload) => {
  const trimmedName = payload.name?.trim();
  const trimmedBody = payload.body?.trim();

  if (!trimmedName) {
    throw new Error('Nome da campanha e obrigatorio.');
  }
  if (!trimmedBody) {
    throw new Error('Mensagem da campanha nao pode ser vazia.');
  }

  const connection = await prisma.whatsAppConnection.findUnique({
    where: { id: payload.whatsappId },
    select: { id: true, status: true }
  });
  if (!connection) {
    throw new Error('Conexao WhatsApp nao encontrada.');
  }
  if (connection.status !== 'CONNECTED') {
    throw new Error('A conexao WhatsApp selecionada nao esta conectada.');
  }

  if (payload.queueId) {
    const queueExists = await prisma.queue.findUnique({ where: { id: payload.queueId } });
    if (!queueExists) {
      throw new Error('Fila informada nao foi encontrada.');
    }
  }

  const recipientSet = await buildRecipientSet({
    contactIds: payload.contactIds,
    segmentIds: payload.segmentIds,
    filters: payload.filters
  });

  if (recipientSet.size === 0) {
    throw new Error('Nenhum destinatario elegivel foi encontrado para a campanha.');
  }

  const scheduledFor = normalizeScheduledDate(payload.scheduledFor);
  const rateLimit = sanitizeRateLimit(payload.rateLimitPerMinute);
  const delay = scheduledFor ? Math.max(scheduledFor.getTime() - Date.now(), 0) : 0;
  const filtersSnapshot = buildFiltersSnapshot({
    contactIds: payload.contactIds,
    segmentIds: payload.segmentIds,
    filters: payload.filters
  });

  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.messageCampaign.create({
      data: {
        name: trimmedName,
        description: payload.description?.trim() || null,
        body: trimmedBody,
        mediaUrl: payload.mediaUrl ?? null,
        whatsappId: payload.whatsappId,
        queueId: payload.queueId ?? null,
        status: MessageCampaignStatus.SCHEDULED,
        scheduledFor,
        rateLimitPerMinute: rateLimit,
        totalRecipients: recipientSet.size,
        filters: filtersSnapshot ?? undefined,
        createdById: userId
      }
    });

    if (recipientSet.size) {
      const rows = Array.from(recipientSet).map((id) => ({
        campaignId: created.id,
        contactId: id
      }));
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        await tx.messageCampaignRecipient.createMany({
          data: rows.slice(i, i + chunkSize),
          skipDuplicates: true
        });
      }
    }

    await recordCampaignLog(created.id, MessageCampaignLogType.CREATED, 'Campanha criada.', undefined, userId);

    return created;
  });

  if (delay === 0) {
    await scheduleCampaignJob(campaign.id, 0);
  } else {
    await scheduleCampaignJob(campaign.id, delay);
    await recordCampaignLog(
      campaign.id,
      MessageCampaignLogType.SCHEDULED,
      `Envio agendado para ${scheduledFor!.toISOString()}.`,
      undefined,
      userId
    );
  }

  return fetchCampaignWithRelations(campaign.id);
};

export const updateMessageCampaign = async (
  campaignId: string,
  userId: string,
  payload: UpdateMessageCampaignPayload
) => {
  const campaign = await prisma.messageCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    throw new Error('Campanha nao encontrada.');
  }

  const editableStatuses: MessageCampaignStatus[] = [
    MessageCampaignStatus.DRAFT,
    MessageCampaignStatus.SCHEDULED,
    MessageCampaignStatus.PAUSED
  ];

  if (!editableStatuses.includes(campaign.status)) {
    throw new Error('Apenas campanhas pendentes ou pausadas podem ser editadas.');
  }

  const data: Prisma.MessageCampaignUpdateInput = {
    updatedBy: { connect: { id: userId } }
  };

  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      throw new Error('Nome da campanha nao pode ficar vazio.');
    }
    data.name = trimmed;
  }

  if (payload.description !== undefined) {
    data.description = payload.description ? payload.description.trim() : null;
  }

  if (payload.body !== undefined) {
    const trimmed = payload.body.trim();
    if (!trimmed) {
      throw new Error('Mensagem da campanha nao pode ficar vazia.');
    }
    data.body = trimmed;
  }

  if (payload.mediaUrl !== undefined) {
    data.mediaUrl = payload.mediaUrl ?? null;
  }

  if (payload.rateLimitPerMinute !== undefined) {
    data.rateLimitPerMinute = sanitizeRateLimit(payload.rateLimitPerMinute);
  }

  let newScheduledFor: Date | null = null;
  if (payload.scheduledFor !== undefined) {
    newScheduledFor = normalizeScheduledDate(payload.scheduledFor);
    data.scheduledFor = newScheduledFor;
  }

  const updated = await prisma.messageCampaign.update({
    where: { id: campaignId },
    data
  });

  if (payload.rateLimitPerMinute !== undefined || payload.scheduledFor !== undefined) {
    await removeCampaignJob(updated.jobId);
    const delay =
      newScheduledFor !== null
        ? Math.max(newScheduledFor.getTime() - Date.now(), 0)
        : 0;
    await scheduleCampaignJob(updated.id, delay);
  }

  await recordCampaignLog(updated.id, MessageCampaignLogType.UPDATED, 'Campanha atualizada.', undefined, userId);
  return fetchCampaignWithRelations(updated.id);
};

export const pauseMessageCampaign = async (campaignId: string, userId: string) => {
  const campaign = await prisma.messageCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error('Campanha nao encontrada.');

  const pausableStatuses: MessageCampaignStatus[] = [
    MessageCampaignStatus.SCHEDULED,
    MessageCampaignStatus.RUNNING
  ];

  if (!pausableStatuses.includes(campaign.status)) {
    throw new Error('Apenas campanhas em andamento podem ser pausadas.');
  }

  await removeCampaignJob(campaign.jobId);

  const updated = await prisma.messageCampaign.update({
    where: { id: campaignId },
    data: {
      status: MessageCampaignStatus.PAUSED,
      jobId: null,
      updatedBy: { connect: { id: userId } }
    }
  });

  await recordCampaignLog(campaignId, MessageCampaignLogType.PAUSED, 'Campanha pausada.', undefined, userId);
  return fetchCampaignWithRelations(updated.id);
};

export const resumeMessageCampaign = async (campaignId: string, userId: string) => {
  const campaign = await prisma.messageCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error('Campanha nao encontrada.');

  if (campaign.status !== MessageCampaignStatus.PAUSED) {
    throw new Error('Campanha precisa estar pausada para ser retomada.');
  }

  const updated = await prisma.messageCampaign.update({
    where: { id: campaignId },
    data: {
      status: MessageCampaignStatus.SCHEDULED,
      updatedBy: { connect: { id: userId } }
    }
  });

  await scheduleCampaignJob(updated.id, computeDelayFromRate(updated.rateLimitPerMinute));
  await recordCampaignLog(
    campaignId,
    MessageCampaignLogType.RESUMED,
    'Campanha retomada.',
    undefined,
    userId
  );

  return fetchCampaignWithRelations(updated.id);
};

export const cancelMessageCampaign = async (campaignId: string, userId: string, reason?: string) => {
  const campaign = await prisma.messageCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error('Campanha nao encontrada.');

  const terminalStatuses: MessageCampaignStatus[] = [
    MessageCampaignStatus.COMPLETED,
    MessageCampaignStatus.CANCELLED
  ];

  if (terminalStatuses.includes(campaign.status)) {
    throw new Error('Campanha ja foi finalizada.');
  }

  await removeCampaignJob(campaign.jobId);

  const updated = await prisma.messageCampaign.update({
    where: { id: campaignId },
    data: {
      status: MessageCampaignStatus.CANCELLED,
      cancelledAt: new Date(),
      jobId: null,
      updatedBy: { connect: { id: userId } }
    }
  });

  await recordCampaignLog(
    campaignId,
    MessageCampaignLogType.CANCELLED,
    reason ? `Campanha cancelada: ${reason}` : 'Campanha cancelada.',
    reason ? { reason } : undefined,
    userId
  );

  return fetchCampaignWithRelations(updated.id);
};

const finalizeCampaignIfNeeded = async (campaignId: string) => {
  const pending = await prisma.messageCampaignRecipient.count({
    where: {
      campaignId,
      status: MessageCampaignRecipientStatus.PENDING
    }
  });

  if (pending > 0) {
    return;
  }

  await prisma.messageCampaign.update({
    where: { id: campaignId },
    data: {
      status: MessageCampaignStatus.COMPLETED,
      completedAt: new Date(),
      jobId: null
    }
  });

  await recordCampaignLog(
    campaignId,
    MessageCampaignLogType.COMPLETED,
    'Campanha concluida.',
    undefined,
    null
  );
};

const handleCampaignSendFailure = async (
  campaignId: string,
  recipientId: string,
  error: Error | string | unknown,
  context?: { messageId?: string | null; ticketId?: string | null }
) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : 'Falha desconhecida ao enviar mensagem.';

  if (context?.messageId) {
    await prisma.message.delete({ where: { id: context.messageId } }).catch(() => undefined);
  }

  await prisma.messageCampaignRecipient.update({
    where: { id: recipientId },
    data: {
      status: MessageCampaignRecipientStatus.FAILED,
      error: message,
      updatedAt: new Date()
    }
  });

  await prisma.messageCampaign.update({
    where: { id: campaignId },
    data: {
      failedCount: { increment: 1 }
    }
  });

  await recordCampaignLog(
    campaignId,
    MessageCampaignLogType.MESSAGE_FAILED,
    message,
    {
      recipientId,
      ...(context?.messageId ? { messageId: context.messageId } : {}),
      ...(context?.ticketId ? { ticketId: context.ticketId } : {})
    },
    null
  );
};

const sendCampaignMessage = async (input: {
  campaign: Pick<MessageCampaign, 'id' | 'whatsappId' | 'queueId' | 'body' | 'mediaUrl' | 'createdById'>;
  recipient: {
    id: string;
    contact: { id: string; name: string | null; phoneNumber: string; isBlocked: boolean };
  };
}) => {
  const { campaign, recipient } = input;

  if (recipient.contact.isBlocked) {
    await prisma.messageCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: MessageCampaignRecipientStatus.SKIPPED,
        error: 'Contato bloqueado.',
        updatedAt: new Date()
      }
    });
    await prisma.messageCampaign.update({
      where: { id: campaign.id },
      data: {
        skippedCount: { increment: 1 }
      }
    });
    await recordCampaignLog(
      campaign.id,
      MessageCampaignLogType.MESSAGE_FAILED,
      'Contato bloqueado.',
      { recipientId: recipient.id },
      null
    );
    return;
  }

  let ticketId: string | null = null;
  let messageId: string | null = null;

  try {
    const ticket = await findOrCreateTicketForContact({
      contactId: recipient.contact.id,
      whatsappId: campaign.whatsappId,
      queueId: campaign.queueId ?? undefined
    });
    ticketId = ticket.id;

    const createdMessage = await prisma.message.create({
      data: {
        body: campaign.body,
        type: MessageType.TEXT,
        status: MessageStatus.PENDING,
        mediaUrl: campaign.mediaUrl,
        isPrivate: false,
        ticketId: ticket.id,
        userId: campaign.createdById
      }
    });
    messageId = createdMessage.id;

    await prisma.messageCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: MessageCampaignRecipientStatus.SENDING,
        ticketId: ticket.id,
        messageId: createdMessage.id,
        scheduledAt: new Date()
      }
    });

    await sendWhatsAppMessage(
      campaign.whatsappId,
      recipient.contact.phoneNumber,
      campaign.body,
      campaign.mediaUrl ?? undefined
    );

    const finalMessage = await prisma.message.update({
      where: { id: createdMessage.id },
      data: {
        status: MessageStatus.SENT
      },
      include: messageInclude
    });

    await prisma.messageCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: MessageCampaignRecipientStatus.SENT,
        sentAt: new Date(),
        updatedAt: new Date()
      }
    });

    await prisma.messageCampaign.update({
      where: { id: campaign.id },
      data: {
        sentCount: { increment: 1 }
      }
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        lastMessageAt: new Date(),
        unreadMessages: 0,
        status: TicketStatus.OPEN
      }
    });

    await prisma.contact.update({
      where: { id: recipient.contact.id },
      data: { lastInteractionAt: new Date() }
    });

    await applyAutomaticTagsToTicket(ticket.id, campaign.body);

    io.emit('message:new', { ...finalMessage, ticketId: ticket.id });

    await recordCampaignLog(
      campaign.id,
      MessageCampaignLogType.MESSAGE_SENT,
      `Mensagem enviada para ${recipient.contact.phoneNumber}.`,
      { recipientId: recipient.id, ticketId: ticket.id, messageId: createdMessage.id },
      null
    );

    return { messageId, ticketId };
  } catch (error) {
    const wrapped =
      error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Falha ao enviar mensagem.');
    (wrapped as Error & { campaignContext?: { messageId: string | null; ticketId: string | null } }).campaignContext = {
      messageId,
      ticketId
    };
    throw wrapped;
  }
};

messageCampaignQueue.process('dispatch', async (job) => {
  const { campaignId } = job.data as { campaignId?: string };
  if (!campaignId) {
    return;
  }

  const campaign = await prisma.messageCampaign.findUnique({
    where: { id: campaignId }
  });

  if (!campaign) {
    return;
  }

  await removeCampaignJob(campaign.jobId);

  const finishedStatuses: MessageCampaignStatus[] = [
    MessageCampaignStatus.CANCELLED,
    MessageCampaignStatus.COMPLETED
  ];

  if (finishedStatuses.includes(campaign.status)) {
    return;
  }

  if (campaign.status === MessageCampaignStatus.PAUSED) {
    return;
  }

  if (campaign.status === MessageCampaignStatus.SCHEDULED) {
    await prisma.messageCampaign.update({
      where: { id: campaignId },
      data: {
        status: MessageCampaignStatus.RUNNING,
        startedAt: campaign.startedAt ?? new Date()
      }
    });
  }

  const recipient = await prisma.messageCampaignRecipient.findFirst({
    where: {
      campaignId,
      status: MessageCampaignRecipientStatus.PENDING
    },
    orderBy: { createdAt: 'asc' },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          isBlocked: true
        }
      }
    }
  });

  if (!recipient) {
    await finalizeCampaignIfNeeded(campaignId);
    return;
  }

  const campaignContext = {
    id: campaign.id,
    whatsappId: campaign.whatsappId,
    queueId: campaign.queueId,
    body: campaign.body,
    mediaUrl: campaign.mediaUrl,
    createdById: campaign.createdById
  };

  try {
    await sendCampaignMessage({
      campaign: campaignContext,
      recipient
    });
  } catch (error) {
    const extra =
      (error as Error & {
        campaignContext?: { messageId?: string | null; ticketId?: string | null };
      }).campaignContext ?? undefined;
    await handleCampaignSendFailure(campaignId, recipient.id, error, extra);
  }

  const delay = computeDelayFromRate(campaign.rateLimitPerMinute);
  await finalizeCampaignIfNeeded(campaignId);
  const pendingLeft = await prisma.messageCampaignRecipient.count({
    where: { campaignId, status: MessageCampaignRecipientStatus.PENDING }
  });

  if (pendingLeft > 0) {
    await scheduleCampaignJob(campaignId, delay);
  }
});

export const bootstrapMessageCampaigns = async () => {
  await prisma.messageCampaignRecipient.updateMany({
    where: { status: MessageCampaignRecipientStatus.SENDING },
    data: { status: MessageCampaignRecipientStatus.PENDING }
  });

  const campaigns = await prisma.messageCampaign.findMany({
    where: {
      status: { in: [MessageCampaignStatus.SCHEDULED, MessageCampaignStatus.RUNNING] }
    },
    select: {
      id: true,
      status: true,
      rateLimitPerMinute: true,
      scheduledFor: true
    }
  });

  for (const campaign of campaigns) {
    const pending = await prisma.messageCampaignRecipient.count({
      where: { campaignId: campaign.id, status: MessageCampaignRecipientStatus.PENDING }
    });

    if (pending === 0) {
      await finalizeCampaignIfNeeded(campaign.id);
      continue;
    }

    const delay =
      campaign.scheduledFor && campaign.scheduledFor.getTime() > Date.now()
        ? Math.max(campaign.scheduledFor.getTime() - Date.now(), 0)
        : computeDelayFromRate(campaign.rateLimitPerMinute);

    await scheduleCampaignJob(campaign.id, delay);
  }
};





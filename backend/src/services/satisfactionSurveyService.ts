import crypto from 'crypto';
import { Prisma, SurveyChannel, SurveyStatus } from '@prisma/client';
import prisma from '../config/database';
import { sendWhatsAppMessage } from './whatsappService';
import { io } from '../server';

const SURVEY_ENABLED = process.env.SATISFACTION_SURVEY_ENABLED !== 'false';
const SURVEY_BASE_URL = (
  process.env.SATISFACTION_SURVEY_URL ||
  process.env.FRONTEND_URL ||
  'http://localhost:3000'
).replace(/\/$/, '');

const POSITIVE_KEYWORDS = [
  'obrigado',
  'obrigada',
  'excelente',
  'perfeito',
  'rapido',
  'rápido',
  'feliz',
  'satisfeito',
  'satisfeita',
  'incrivel',
  'incrível',
  'bom',
  'boa',
  'maravilhoso',
  'maravilhosa',
  'show',
  'top'
];

const NEGATIVE_KEYWORDS = [
  'reclamacao',
  'reclamação',
  'ruim',
  'pessimo',
  'péssimo',
  'horrivel',
  'horrível',
  'demora',
  'demorando',
  'insatisfeito',
  'insatisfeita',
  'nao resolveu',
  'não resolveu',
  'problema',
  'erro',
  'cancelar',
  'cancelamento',
  'demorado'
];

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const clampRating = (value: number) => Math.min(Math.max(Number(value.toFixed(1)), 0), 10);

const classifyRating = (rating: number) =>
  rating >= 9 ? 'promoter' : rating >= 7 ? 'passive' : 'detractor';

const deriveSentiment = (
  text: string,
  ratingHint?: number
): 'positive' | 'neutral' | 'negative' => {
  if (typeof ratingHint === 'number') {
    if (ratingHint >= 9) {
      return 'positive';
    }
    if (ratingHint <= 6) {
      return 'negative';
    }
  }

  const normalized = normalizeText(text);
  const hasPositive = POSITIVE_KEYWORDS.some((keyword) => normalized.includes(keyword));
  const hasNegative = NEGATIVE_KEYWORDS.some((keyword) => normalized.includes(keyword));

  if (hasPositive && !hasNegative) {
    return 'positive';
  }

  if (hasNegative && !hasPositive) {
    return 'negative';
  }

  return 'neutral';
};

const generateToken = () => crypto.randomBytes(24).toString('hex');
const sanitizeComment = (comment?: string | null) => {
  if (!comment) {
    return null;
  }
  const trimmed = comment.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.slice(0, 1000);
};

const firstName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) {
    return 'cliente';
  }
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
};

const normalizePhone = (value: string) => value.replace(/\D/g, '');

const buildSurveyLink = (token: string) => `${SURVEY_BASE_URL}/survey/${token}`;

export type SatisfactionFilters = {
  start?: Date;
  end?: Date;
  queueId?: string;
  agentId?: string;
};

export type SatisfactionOverview = {
  totals: {
    sent: number;
    responded: number;
    responseRate: number;
    averageRating: number | null;
    nps: number | null;
  };
  distribution: {
    promoters: number;
    passives: number;
    detractors: number;
  };
  trend: Array<{
    date: string;
    responses: number;
    averageRating: number | null;
  }>;
  byQueue: Array<{
    id: string;
    name: string;
    color: string | null;
    sent: number;
    responded: number;
    responseRate: number;
    averageRating: number | null;
    nps: number | null;
  }>;
  byAgent: Array<{
    id: string;
    name: string;
    sent: number;
    responded: number;
    responseRate: number;
    averageRating: number | null;
    nps: number | null;
  }>;
  recentComments: Array<{
    id: string;
    ticketId: string;
    contact: string;
    queue: string | null;
    agent: string | null;
    rating: number;
    comment: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    respondedAt: Date;
  }>;
};

export type SatisfactionResponseItem = {
  id: string;
  ticketId: string;
  rating: number;
  classification: 'promoter' | 'passive' | 'detractor';
  sentiment: 'positive' | 'neutral' | 'negative';
  comment: string | null;
  respondedAt: Date;
  contact: {
    id: string;
    name: string;
  };
  queue: {
    id: string | null;
    name: string | null;
    color: string | null;
  };
  agent: {
    id: string | null;
    name: string | null;
  };
};

export type SatisfactionResponseList = {
  items: SatisfactionResponseItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type TriggerSurveyOptions = {
  autoSend?: boolean;
  forceResend?: boolean;
};

export type TriggerSurveyResult = {
  survey: Prisma.SatisfactionSurveyGetPayload<{
    include: {
      contact: { select: { id: true; name: true } };
      queue: { select: { id: true; name: true; color: true } };
      agent: { select: { id: true; name: true } };
    };
  }>;
  messageSent: boolean;
  reason?: string;
};

const buildSentWhere = (filters: SatisfactionFilters): Prisma.SatisfactionSurveyWhereInput => {
  const where: Prisma.SatisfactionSurveyWhereInput = {
    status: { in: [SurveyStatus.SENT, SurveyStatus.RESPONDED] }
  };

  if (filters.start || filters.end) {
    where.sentAt = {};
    if (filters.start) {
      where.sentAt.gte = filters.start;
    }
    if (filters.end) {
      where.sentAt.lte = filters.end;
    }
  }

  if (filters.queueId) {
    where.queueId = filters.queueId;
  }

  if (filters.agentId) {
    where.agentId = filters.agentId;
  }

  return where;
};

const buildRespondedWhere = (filters: SatisfactionFilters): Prisma.SatisfactionSurveyWhereInput => {
  const where: Prisma.SatisfactionSurveyWhereInput = {
    respondedAt: { not: null }
  };

  if (filters.start || filters.end) {
    where.respondedAt = {};
    if (filters.start) {
      where.respondedAt.gte = filters.start;
    }
    if (filters.end) {
      where.respondedAt.lte = filters.end;
    }
  }

  if (filters.queueId) {
    where.queueId = filters.queueId;
  }

  if (filters.agentId) {
    where.agentId = filters.agentId;
  }

  return where;
};

export const triggerSurveyForTicket = async (
  ticketId: string,
  options: TriggerSurveyOptions = {}
): Promise<TriggerSurveyResult> => {
  const autoSend = options.autoSend ?? true;
  const forceResend = options.forceResend ?? false;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      contact: { select: { id: true, name: true, phoneNumber: true } },
      queue: { select: { id: true, name: true, color: true } },
      user: { select: { id: true, name: true } }
    }
  });

  if (!ticket) {
    throw new Error('Ticket nao encontrado');
  }

  let survey = await prisma.satisfactionSurvey.findUnique({
    where: { ticketId },
    include: {
      contact: { select: { id: true, name: true } },
      queue: { select: { id: true, name: true, color: true } },
      agent: { select: { id: true, name: true } }
    }
  });

  if (!survey) {
    survey = await prisma.satisfactionSurvey.create({
      data: {
        ticketId,
        contactId: ticket.contactId,
        queueId: ticket.queueId ?? null,
        agentId: ticket.userId ?? null,
        whatsappId: ticket.whatsappId,
        token: generateToken(),
        channel: SurveyChannel.WHATSAPP,
        status: SurveyStatus.PENDING,
        autoSent: autoSend
      },
      include: {
        contact: { select: { id: true, name: true } },
        queue: { select: { id: true, name: true, color: true } },
        agent: { select: { id: true, name: true } }
      }
    });
  } else {
    survey = await prisma.satisfactionSurvey.update({
      where: { id: survey.id },
      data: {
        queueId: ticket.queueId ?? null,
        agentId: ticket.userId ?? null,
        whatsappId: ticket.whatsappId,
        autoSent: autoSend
      },
      include: {
        contact: { select: { id: true, name: true } },
        queue: { select: { id: true, name: true, color: true } },
        agent: { select: { id: true, name: true } }
      }
    });
  }

  let messageSent = false;
  let reason: string | undefined;

  if (!SURVEY_ENABLED) {
    reason = 'disabled';
  } else if (!autoSend) {
    reason = 'auto_send_disabled';
  } else if (survey.status === SurveyStatus.RESPONDED && !forceResend) {
    reason = 'already_responded';
  } else {
    const phone = ticket.contact.phoneNumber ? normalizePhone(ticket.contact.phoneNumber) : '';

    if (!phone) {
      reason = 'missing_phone';
    } else if (!ticket.whatsappId) {
      reason = 'missing_whatsapp_connection';
    } else {
      const link = buildSurveyLink(survey.token);
      const greeting = firstName(ticket.contact.name);
      const message = [
        `Ola ${greeting}! Aqui é a equipe WhatsKovi.`,
        'Poderia avaliar o atendimento que acabou de receber? Leva menos de 1 minuto.',
        `Responda com uma nota de 0 a 10: ${link}`,
        'Sua opiniao nos ajuda a melhorar. Obrigado!'
      ].join(' ');

      try {
        await sendWhatsAppMessage(ticket.whatsappId, phone, message);
        survey = await prisma.satisfactionSurvey.update({
          where: { id: survey.id },
          data: {
            status: SurveyStatus.SENT,
            sentAt: new Date()
          },
          include: {
            contact: { select: { id: true, name: true } },
            queue: { select: { id: true, name: true, color: true } },
            agent: { select: { id: true, name: true } }
          }
        });
        messageSent = true;
        io.emit('survey:sent', {
          ticketId,
          surveyId: survey.id,
          sentAt: survey.sentAt
        });
      } catch (error) {
        console.error('Erro ao enviar pesquisa de satisfação:', error);
        reason = 'send_failed';
      }
    }
  }

  return {
    survey,
    messageSent,
    reason
  };
};

export const getSurveyForTicket = async (ticketId: string) => {
  return prisma.satisfactionSurvey.findUnique({
    where: { ticketId },
    include: {
      contact: { select: { id: true, name: true } },
      queue: { select: { id: true, name: true, color: true } },
      agent: { select: { id: true, name: true } }
    }
  });
};

export const buildSatisfactionOverview = async (
  filters: SatisfactionFilters
): Promise<SatisfactionOverview> => {
  const [totalSent, respondedSurveys, queueSentGroup, agentSentGroup] = await Promise.all([
    prisma.satisfactionSurvey.count({ where: buildSentWhere(filters) }),
    prisma.satisfactionSurvey.findMany({
      where: buildRespondedWhere(filters),
      orderBy: { respondedAt: 'desc' },
      include: {
        contact: { select: { id: true, name: true } },
        queue: { select: { id: true, name: true, color: true } },
        agent: { select: { id: true, name: true } }
      }
    }),
    prisma.satisfactionSurvey.groupBy({
      by: ['queueId'],
      where: buildSentWhere(filters),
      _count: { _all: true }
    }),
    prisma.satisfactionSurvey.groupBy({
      by: ['agentId'],
      where: buildSentWhere(filters),
      _count: { _all: true }
    })
  ]);

  const responded = respondedSurveys.length;
  const ratingSum = respondedSurveys.reduce(
    (total, survey) => total + (survey.rating ?? 0),
    0
  );

  const promoters = respondedSurveys.filter((survey) => (survey.rating ?? 0) >= 9).length;
  const detractors = respondedSurveys.filter((survey) => (survey.rating ?? 0) <= 6).length;
  const passives = responded - promoters - detractors;

  const overview: SatisfactionOverview = {
    totals: {
      sent: totalSent,
      responded,
      responseRate: totalSent > 0 ? Math.round((responded / totalSent) * 100) : 0,
      averageRating: responded > 0 ? clampRating(ratingSum / responded) : null,
      nps:
        responded > 0 ? Math.round(((promoters - detractors) / responded) * 100) : null
    },
    distribution: {
      promoters,
      passives,
      detractors
    },
    trend: [],
    byQueue: [],
    byAgent: [],
    recentComments: []
  };

  const queueSentMap = new Map<string, number>();
  queueSentGroup.forEach((entry) => {
    queueSentMap.set(entry.queueId ?? 'unassigned', entry._count._all);
  });

  const agentSentMap = new Map<string, number>();
  agentSentGroup.forEach((entry) => {
    agentSentMap.set(entry.agentId ?? 'unassigned', entry._count._all);
  });

  const trendMap = new Map<string, { count: number; total: number }>();
  const queueStats = new Map<
    string,
    {
      id: string;
      name: string;
      color: string | null;
      sent: number;
      responded: number;
      ratingSum: number;
      promoters: number;
      detractors: number;
    }
  >();

  const agentStats = new Map<
    string,
    {
      id: string;
      name: string;
      sent: number;
      responded: number;
      ratingSum: number;
      promoters: number;
      detractors: number;
    }
  >();

  respondedSurveys.forEach((survey) => {
    if (!survey.respondedAt) {
      return;
    }

    const dateKey = survey.respondedAt.toISOString().slice(0, 10);
    const trendEntry = trendMap.get(dateKey) ?? { count: 0, total: 0 };
    trendEntry.count += 1;
    trendEntry.total += survey.rating ?? 0;
    trendMap.set(dateKey, trendEntry);

    const queueKey = survey.queueId ?? 'unassigned';
    const queueEntry =
      queueStats.get(queueKey) ??
      (() => {
        const entry = {
          id: survey.queue?.id ?? 'unassigned',
          name: survey.queue?.name ?? 'Sem fila',
          color: survey.queue?.color ?? '#CBD5F5',
          sent: queueSentMap.get(queueKey) ?? 0,
          responded: 0,
          ratingSum: 0,
          promoters: 0,
          detractors: 0
        };
        queueStats.set(queueKey, entry);
        return entry;
      })();

    queueEntry.responded += 1;
    queueEntry.ratingSum += survey.rating ?? 0;
    if ((survey.rating ?? 0) >= 9) {
      queueEntry.promoters += 1;
    } else if ((survey.rating ?? 0) <= 6) {
      queueEntry.detractors += 1;
    }

    const agentKey = survey.agentId ?? 'unassigned';
    const agentEntry =
      agentStats.get(agentKey) ??
      (() => {
        const entry = {
          id: survey.agent?.id ?? 'unassigned',
          name: survey.agent?.name ?? 'Sem atendente',
          sent: agentSentMap.get(agentKey) ?? 0,
          responded: 0,
          ratingSum: 0,
          promoters: 0,
          detractors: 0
        };
        agentStats.set(agentKey, entry);
        return entry;
      })();

    agentEntry.responded += 1;
    agentEntry.ratingSum += survey.rating ?? 0;
    if ((survey.rating ?? 0) >= 9) {
      agentEntry.promoters += 1;
    } else if ((survey.rating ?? 0) <= 6) {
      agentEntry.detractors += 1;
    }
  });

  overview.trend = Array.from(trendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({
      date,
      responses: data.count,
      averageRating: data.count > 0 ? clampRating(data.total / data.count) : null
    }));

  overview.byQueue = Array.from(queueStats.values())
    .map((stat) => ({
      id: stat.id,
      name: stat.name,
      color: stat.color,
      sent: stat.sent,
      responded: stat.responded,
      responseRate: stat.sent > 0 ? Math.round((stat.responded / stat.sent) * 100) : 0,
      averageRating: stat.responded > 0 ? clampRating(stat.ratingSum / stat.responded) : null,
      nps:
        stat.responded > 0
          ? Math.round(((stat.promoters - stat.detractors) / stat.responded) * 100)
          : null
    }))
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));

  overview.byAgent = Array.from(agentStats.values())
    .map((stat) => ({
      id: stat.id,
      name: stat.name,
      sent: stat.sent,
      responded: stat.responded,
      responseRate: stat.sent > 0 ? Math.round((stat.responded / stat.sent) * 100) : 0,
      averageRating: stat.responded > 0 ? clampRating(stat.ratingSum / stat.responded) : null,
      nps:
        stat.responded > 0
          ? Math.round(((stat.promoters - stat.detractors) / stat.responded) * 100)
          : null
    }))
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));

  overview.recentComments = respondedSurveys
    .filter((survey) => survey.comment && survey.comment.trim().length > 0)
    .slice(0, 10)
    .map((survey) => ({
      id: survey.id,
      ticketId: survey.ticketId,
      contact: survey.contact.name,
      queue: survey.queue?.name ?? null,
      agent: survey.agent?.name ?? null,
      rating: survey.rating ?? 0,
      comment: survey.comment!.trim().length > 200
        ? `${survey.comment!.trim().slice(0, 197)}...`
        : survey.comment!.trim(),
      sentiment: deriveSentiment(survey.comment!, survey.rating ?? undefined),
      respondedAt: survey.respondedAt!
    }));

  return overview;
};

export const listSatisfactionResponses = async (
  filters: SatisfactionFilters,
  page: number,
  pageSize: number
): Promise<SatisfactionResponseList> => {
  const where = buildRespondedWhere(filters);

  const [totalItems, surveys] = await Promise.all([
    prisma.satisfactionSurvey.count({ where }),
    prisma.satisfactionSurvey.findMany({
      where,
      orderBy: { respondedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        contact: { select: { id: true, name: true } },
        queue: { select: { id: true, name: true, color: true } },
        agent: { select: { id: true, name: true } }
      }
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    items: surveys.map((survey) => ({
      id: survey.id,
      ticketId: survey.ticketId,
      rating: survey.rating ?? 0,
      classification: classifyRating(survey.rating ?? 0),
      sentiment: survey.comment
        ? deriveSentiment(survey.comment, survey.rating ?? undefined)
        : 'neutral',
      comment: survey.comment,
      respondedAt: survey.respondedAt!,
      contact: {
        id: survey.contact.id,
        name: survey.contact.name
      },
      queue: {
        id: survey.queue?.id ?? null,
        name: survey.queue?.name ?? null,
        color: survey.queue?.color ?? null
      },
      agent: {
        id: survey.agent?.id ?? null,
        name: survey.agent?.name ?? null
      }
    })),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages
    }
  };
};

export const getSurveyByToken = async (token: string) => {
  return prisma.satisfactionSurvey.findUnique({
    where: { token },
    include: {
      contact: { select: { id: true, name: true } },
      queue: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } }
    }
  });
};

export const submitSurveyResponse = async (
  token: string,
  data: { rating: number; comment?: string | null }
) => {
  const survey = await prisma.satisfactionSurvey.findUnique({ where: { token } });

  if (!survey) {
    throw new Error('Pesquisa nao encontrada');
  }

  if (survey.status === SurveyStatus.RESPONDED) {
    throw new Error('Pesquisa ja respondida');
  }

  const sanitizedRating = clampRating(data.rating);
  const sanitizedComment = sanitizeComment(data.comment);
  const updated = await prisma.satisfactionSurvey.update({
    where: { id: survey.id },
    data: {
      rating: sanitizedRating,
      comment: sanitizedComment,
      status: SurveyStatus.RESPONDED,
      respondedAt: new Date()
    },
    include: {
      contact: { select: { id: true, name: true } },
      queue: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } }
    }
  });

  io.emit('survey:responded', {
    ticketId: updated.ticketId,
    surveyId: updated.id,
    rating: updated.rating,
    classification: classifyRating(updated.rating ?? 0)
  });

  return updated;
};

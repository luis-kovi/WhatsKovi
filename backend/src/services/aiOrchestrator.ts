import { Prisma, SentimentLabel } from '@prisma/client';
import prisma from '../config/database';
import {
  analyzeSentiment,
  buildSuggestions,
  classifyConversation,
  deriveDemandForecast,
  generateChatbotReply
} from './aiProvider';
import { io } from '../server';
import {
  AiChatbotReply,
  ClassificationResult,
  DemandForecastPayload,
  ResponseSuggestion
} from '../types/ai';

const HISTORY_LIMIT = Number(process.env.AI_HISTORY_LIMIT || 12);
const AI_SENTIMENT_ENABLED = process.env.AI_SENTIMENT_ENABLED !== 'false';
const AI_SUGGESTIONS_ENABLED = process.env.AI_SUGGESTIONS_ENABLED !== 'false';
const AI_CLASSIFICATION_ENABLED = process.env.AI_CLASSIFICATION_ENABLED !== 'false';
const AI_CHATBOT_MODE = (process.env.AI_CHATBOT_MODE || 'assist').toLowerCase();
const AI_FORECAST_HORIZON = Number(process.env.AI_FORECAST_HORIZON || 7);
const AI_DEBUG_LOGS = process.env.AI_DEBUG_LOGS === 'true';

const debugLog = (...args: unknown[]) => {
  if (AI_DEBUG_LOGS) {
    console.info('[AI]', ...args);
  }
};

type ProcessMessageParams = {
  ticketId: string;
  messageId: string;
  actor: 'contact' | 'agent' | 'system';
  skipPrivate?: boolean;
};

const shouldSkipMessageBody = (body: string | null | undefined) =>
  !body || body.trim().length === 0 || body.trim().toLowerCase() === 'arquivo recebido';

const buildConversationHistory = async (
  ticketId: string,
  includeMessageId?: string
) => {
  const messages = await prisma.message.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      body: true,
      createdAt: true,
      userId: true,
      isPrivate: true
    }
  });

  const filtered = messages
    .filter((entry) => !entry.isPrivate)
    .filter((entry) => entry.body && entry.body.trim().length > 0)
    .map((entry) => ({
      id: entry.id,
      author: entry.userId ? ('agent' as const) : ('contact' as const),
      body: entry.body!.trim(),
      createdAt: entry.createdAt
    }));

  if (includeMessageId && !filtered.some((entry) => entry.id === includeMessageId)) {
    const extra = await prisma.message.findUnique({
      where: { id: includeMessageId },
      select: { id: true, body: true, createdAt: true, userId: true }
    });
    if (extra?.body) {
      filtered.push({
        id: extra.id,
        author: extra.userId ? ('agent' as const) : ('contact' as const),
        body: extra.body.trim(),
        createdAt: extra.createdAt
      });
    }
  }

  return filtered.slice(-HISTORY_LIMIT);
};

export const processMessageWithAi = async (
  params: ProcessMessageParams
): Promise<{ autoReply?: AiChatbotReply | null }> => {
  const { ticketId, messageId, actor, skipPrivate } = params;

  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        ticket: {
          include: {
            contact: true,
            queue: true,
            whatsapp: true
          }
        },
        user: {
          select: { id: true, name: true }
        }
      }
    });

    if (!message) {
      return {};
    }

    if (skipPrivate && message.isPrivate) {
      return {};
    }

    const body = message.body ?? '';
    const trimmedBody = body.trim();

    const conversationHistory = await buildConversationHistory(ticketId, messageId);

    const context = {
      contactName: message.ticket.contact.name,
      queue: message.ticket.queue?.name ?? null,
      history: conversationHistory.map((entry) => ({
        author: entry.author,
        body: entry.body,
        createdAt: entry.createdAt
      }))
    };

    let sentimentRecord: SentimentLabel | null = null;
    if (AI_SENTIMENT_ENABLED && !shouldSkipMessageBody(trimmedBody)) {
      const sentiment = await analyzeSentiment(trimmedBody);
      sentimentRecord = sentiment.label;
      await prisma.messageInsight.upsert({
        where: { messageId: message.id },
        create: {
          messageId: message.id,
          sentiment: sentiment.label,
          sentimentScore: sentiment.score,
          summary: sentiment.summary ?? null,
          keywords: sentiment.keywords,
          metadata: sentiment.metadata
            ? (sentiment.metadata as Prisma.InputJsonValue)
            : Prisma.DbNull
        },
        update: {
          sentiment: sentiment.label,
          sentimentScore: sentiment.score,
          summary: sentiment.summary ?? null,
          keywords: sentiment.keywords,
          metadata: sentiment.metadata
            ? (sentiment.metadata as Prisma.InputJsonValue)
            : Prisma.DbNull
        }
      });
    }

    let classificationRecord: ClassificationResult | null = null;
    if (AI_CLASSIFICATION_ENABLED && conversationHistory.length > 0) {
      const combined = conversationHistory.map((entry) => entry.body).join('\n');
      const classification = await classifyConversation(combined, context);
      classificationRecord = classification;

      await prisma.ticketClassification.upsert({
        where: { ticketId },
        create: {
          ticketId,
          category: classification.category,
          confidence: classification.confidence,
          rationale: classification.rationale ?? null,
          keywords: classification.keywords
        },
        update: {
          category: classification.category,
          confidence: classification.confidence,
          rationale: classification.rationale ?? null,
          keywords: classification.keywords
        }
      });
    }

    let autoReply: AiChatbotReply | null = null;
    let suggestions: ResponseSuggestion[] = [];
    if (
      actor === 'contact' &&
      AI_CHATBOT_MODE !== 'off' &&
      !shouldSkipMessageBody(trimmedBody) &&
      conversationHistory.length > 0
    ) {
      autoReply = await generateChatbotReply(trimmedBody, context);
    }

    if (
      AI_SUGGESTIONS_ENABLED &&
      actor === 'contact' &&
      !shouldSkipMessageBody(trimmedBody) &&
      conversationHistory.length > 0
    ) {
      suggestions = await buildSuggestions(trimmedBody, {
        nome: message.ticket.contact.name,
        context
      });

      await prisma.messageSuggestion.deleteMany({
        where: { messageId: message.id }
      });

      if (suggestions.length > 0) {
        const saved = await prisma.messageSuggestion.createMany({
          data: suggestions.map((suggestion) => ({
            messageId: message.id,
            ticketId,
            suggestion: suggestion.text,
            confidence: suggestion.confidence,
            source: suggestion.source ?? suggestion.tone
          }))
        });

        if (saved.count > 0) {
          const realtimePayload = {
            ticketId,
            messageId,
            suggestions: suggestions.map((suggestion) => ({
              text: suggestion.text,
              confidence: suggestion.confidence,
              tone: suggestion.tone,
              reason: suggestion.reason,
              source: suggestion.source ?? 'ai'
            }))
          };
          io.emit('ai:suggestions', realtimePayload);
        }
      }
    }

    if (sentimentRecord || classificationRecord) {
      io.emit('ai:insights', {
        ticketId,
        sentiment: sentimentRecord,
        classification: classificationRecord
      });
    }

    debugLog('Processed message', {
      ticketId,
      messageId,
      actor,
      sentiment: sentimentRecord,
      classification: classificationRecord?.category ?? null,
      suggestions: suggestions.length,
      autoReply: autoReply?.shouldReply ?? false,
      mode: AI_CHATBOT_MODE
    });

    return { autoReply };
  } catch (error) {
    console.error('[AI] Falha ao processar mensagem', error);
    return {};
  }
};

export const getTicketInsights = async (ticketId: string) => {
  const [classification, insights, suggestions] = await Promise.all([
    prisma.ticketClassification.findUnique({ where: { ticketId } }),
    prisma.messageInsight.findMany({
      where: { message: { ticketId } },
      include: {
        message: { select: { createdAt: true, body: true, userId: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 25
    }),
    prisma.messageSuggestion.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ]);

  const sentimentCounters = insights.reduce(
    (acc, insight) => {
      acc[insight.sentiment] = (acc[insight.sentiment] ?? 0) + 1;
      return acc;
    },
    {} as Record<SentimentLabel, number>
  );

  return {
    ticketId,
    classification,
    sentiment: {
      totals: sentimentCounters,
      last: insights[0] ?? null
    },
    suggestions
  };
};

export const rebuildDemandForecast = async (
  horizonDays = AI_FORECAST_HORIZON
): Promise<DemandForecastPayload> => {
  const since = new Date();
  since.setDate(since.getDate() - 60);
  since.setHours(0, 0, 0, 0);

  const tickets = await prisma.ticket.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true }
  });

  const countsByDay = tickets.reduce<Record<string, number>>((acc, ticket) => {
    const key = ticket.createdAt.toISOString().slice(0, 10);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const history = Object.entries(countsByDay).map(([day, count]) => ({
    date: new Date(`${day}T00:00:00.000Z`),
    count
  }));

  const forecast = deriveDemandForecast(history, horizonDays);

  const periodStart =
    forecast.slices.length > 0
      ? new Date(forecast.slices[0].date)
      : new Date(forecast.generatedAt);
  const periodEnd =
    forecast.slices.length > 0
      ? new Date(forecast.slices[forecast.slices.length - 1].date)
      : new Date(forecast.generatedAt);
  const lowerBound =
    forecast.slices.length > 0
      ? Math.min(...forecast.slices.map((slice) => slice.lowerBound ?? slice.expected))
      : 0;
  const upperBound =
    forecast.slices.length > 0
      ? Math.max(...forecast.slices.map((slice) => slice.upperBound ?? slice.expected))
      : 0;

  await prisma.demandForecast.deleteMany({
    where: {
      periodStart,
      horizonDays
    }
  });

  await prisma.demandForecast.create({
    data: {
      periodStart,
      periodEnd,
      horizonDays: forecast.horizonDays,
      expectedTickets: forecast.totalExpected,
      lowerBound,
      upperBound,
      metadata: forecast as Prisma.InputJsonValue
    }
  });

  io.emit('ai:forecast', forecast);

  return forecast;
};

export const getLatestForecast = async (horizonDays = AI_FORECAST_HORIZON) => {
  const record = await prisma.demandForecast.findFirst({
    where: { horizonDays },
    orderBy: { generatedAt: 'desc' }
  });

  if (!record?.metadata) {
    return rebuildDemandForecast(horizonDays);
  }

  return record.metadata as DemandForecastPayload;
};

export const previewChatbotReply = async (ticketId: string, message: string) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      contact: true,
      queue: true
    }
  });

  if (!ticket) {
    throw new Error('Ticket nao encontrado');
  }

  const history = await buildConversationHistory(ticketId);

  const context = {
    contactName: ticket.contact.name,
    queue: ticket.queue?.name ?? null,
    history: history.map((entry) => ({
      author: entry.author,
      body: entry.body,
      createdAt: entry.createdAt
    }))
  };

  return generateChatbotReply(message, context);
};

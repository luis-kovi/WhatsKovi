import { Response } from 'express';
import { ChatbotTriggerType, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { parseFlowDefinition, simulateFlow } from '../services/chatbotEngine';

const toStringOrNull = (value: unknown) => (typeof value === 'string' ? value.trim() : null);

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'sim'].includes(normalized)) return true;
    if (['false', '0', 'no', 'nao', 'não'].includes(normalized)) return false;
  }
  return fallback;
};

const sanitizeKeywords = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((keyword) => (typeof keyword === 'string' ? keyword.trim() : null))
        .filter((keyword): keyword is string => Boolean(keyword))
    : [];

const normalizeTriggerType = (value: unknown): ChatbotTriggerType => {
  if (typeof value === 'string' && ['KEYWORD', 'DEFAULT', 'MANUAL'].includes(value)) {
    return value as ChatbotTriggerType;
  }
  return 'KEYWORD';
};

const ensureDefinition = (payload: any, entryNodeId: string) => {
  const definition =
    payload && typeof payload === 'object'
      ? { ...payload, entryNodeId }
      : { entryNodeId, nodes: [] };
  try {
    parseFlowDefinition(definition as Prisma.JsonValue);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Definicao de fluxo invalida';
    throw new Error(`INVALID_FLOW_DEFINITION:${message}`);
  }
  return definition;
};

const ensureSchedule = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value;
};

export const listChatbotFlows = async (req: AuthRequest, res: Response) => {
  try {
    const flows = await prisma.chatbotFlow.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      include: {
        queue: true,
        _count: { select: { sessions: true } }
      }
    });

    const [completed, transfers, active] = await Promise.all([
      prisma.chatbotSession.groupBy({
        by: ['flowId'],
        _count: { _all: true },
        where: { completedAt: { not: null } }
      }),
      prisma.chatbotSession.groupBy({
        by: ['flowId'],
        _count: { _all: true },
        where: { transferredAt: { not: null } }
      }),
      prisma.chatbotSession.groupBy({
        by: ['flowId'],
        _count: { _all: true },
        where: { completedAt: null }
      })
    ]);

    const completedMap = new Map(completed.map((entry) => [entry.flowId, entry._count._all]));
    const transferMap = new Map(transfers.map((entry) => [entry.flowId, entry._count._all]));
    const activeMap = new Map(active.map((entry) => [entry.flowId, entry._count._all]));

    return res.json(
      flows.map((flow) => {
        const { definition, ...rest } = flow;
        return {
          ...rest,
          stats: {
            totalSessions: flow._count.sessions,
            activeSessions: activeMap.get(flow.id) ?? 0,
            completedSessions: completedMap.get(flow.id) ?? 0,
            transferCount: transferMap.get(flow.id) ?? 0
          }
        };
      })
    );
  } catch (error) {
    console.error('[chatbot] listChatbotFlows', error);
    return res.status(500).json({ error: 'Erro ao listar fluxos' });
  }
};

export const getChatbotFlow = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const flow = await prisma.chatbotFlow.findUnique({
      where: { id },
      include: { queue: true }
    });

    if (!flow) {
      return res.status(404).json({ error: 'Fluxo nao encontrado' });
    }

    return res.json(flow);
  } catch (error) {
    console.error('[chatbot] getChatbotFlow', error);
    return res.status(500).json({ error: 'Erro ao carregar fluxo' });
  }
};

export const createChatbotFlow = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      isActive,
      isPrimary,
      triggerType,
      keywords,
      entryNodeId,
      definition,
      schedule,
      offlineMessage,
      transferQueueId
    } = req.body ?? {};

    const normalizedName = toStringOrNull(name);
    const normalizedEntryNodeId = toStringOrNull(entryNodeId);

    if (!normalizedName) {
      return res.status(400).json({ error: 'Nome do fluxo e obrigatorio' });
    }

    if (!normalizedEntryNodeId) {
      return res.status(400).json({ error: 'Defina um node inicial para o fluxo' });
    }

    const isPrimaryFlag = toBoolean(isPrimary, false);
    const trigger = isPrimaryFlag ? 'DEFAULT' : normalizeTriggerType(triggerType);

    const sanitizedDefinition = ensureDefinition(definition, normalizedEntryNodeId);
    const keywordsArray = sanitizeKeywords(keywords);
    const scheduleData = ensureSchedule(schedule);

    const created = await prisma.chatbotFlow.create({
      data: {
        name: normalizedName,
        description: toStringOrNull(description),
        isActive: toBoolean(isActive, true),
        isPrimary: isPrimaryFlag,
        triggerType: trigger,
        keywords: keywordsArray,
        entryNodeId: normalizedEntryNodeId,
        definition: sanitizedDefinition as Prisma.InputJsonValue,
        schedule: scheduleData === null ? Prisma.JsonNull : (scheduleData as Prisma.InputJsonValue),
        offlineMessage: toStringOrNull(offlineMessage),
        transferQueueId: toStringOrNull(transferQueueId)
      }
    });

    if (created.isPrimary) {
      await prisma.chatbotFlow.updateMany({
        where: { id: { not: created.id } },
        data: { isPrimary: false, triggerType: ChatbotTriggerType.KEYWORD }
      });
    }

    return res.status(201).json(created);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('INVALID_FLOW_DEFINITION:')) {
      return res
        .status(400)
        .json({ error: error.message.replace('INVALID_FLOW_DEFINITION:', '').trim() });
    }
    console.error('[chatbot] createChatbotFlow', error);
    return res.status(500).json({ error: 'Erro ao criar fluxo' });
  }
};

export const updateChatbotFlow = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.chatbotFlow.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Fluxo nao encontrado' });
    }

    const {
      name,
      description,
      isActive,
      isPrimary,
      triggerType,
      keywords,
      entryNodeId,
      definition,
      schedule,
      offlineMessage,
      transferQueueId
    } = req.body ?? {};

    const normalizedName = toStringOrNull(name) ?? existing.name;
    const normalizedEntryNodeId = toStringOrNull(entryNodeId) ?? existing.entryNodeId;

    const isPrimaryFlag =
      isPrimary !== undefined ? toBoolean(isPrimary) : existing.isPrimary;
    const trigger =
      triggerType !== undefined
        ? isPrimaryFlag
          ? 'DEFAULT'
          : normalizeTriggerType(triggerType)
        : existing.isPrimary
        ? 'DEFAULT'
        : existing.triggerType;

    const sanitizedDefinition = ensureDefinition(
      definition ?? existing.definition,
      normalizedEntryNodeId
    );
    const keywordsArray =
      keywords !== undefined ? sanitizeKeywords(keywords) : existing.keywords ?? [];
    const scheduleOverride =
      schedule !== undefined ? ensureSchedule(schedule) : undefined;

    const updated = await prisma.chatbotFlow.update({
      where: { id },
      data: {
        name: normalizedName,
        description:
          description !== undefined ? toStringOrNull(description) : existing.description,
        isActive: isActive !== undefined ? toBoolean(isActive) : existing.isActive,
        isPrimary: isPrimaryFlag,
        triggerType: trigger,
        keywords: keywordsArray,
        entryNodeId: normalizedEntryNodeId,
        definition: sanitizedDefinition as Prisma.InputJsonValue,
        schedule:
          scheduleOverride === undefined
            ? undefined
            : scheduleOverride === null
            ? Prisma.JsonNull
            : (scheduleOverride as Prisma.InputJsonValue),
        offlineMessage:
          offlineMessage !== undefined ? toStringOrNull(offlineMessage) : existing.offlineMessage,
        transferQueueId:
          transferQueueId !== undefined
            ? toStringOrNull(transferQueueId)
            : existing.transferQueueId
      }
    });

    if (updated.isPrimary) {
      await prisma.chatbotFlow.updateMany({
        where: { id: { not: updated.id } },
        data: { isPrimary: false, triggerType: ChatbotTriggerType.KEYWORD }
      });
    }

    return res.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('INVALID_FLOW_DEFINITION:')) {
      return res
        .status(400)
        .json({ error: error.message.replace('INVALID_FLOW_DEFINITION:', '').trim() });
    }
    console.error('[chatbot] updateChatbotFlow', error);
    return res.status(500).json({ error: 'Erro ao atualizar fluxo' });
  }
};

export const deleteChatbotFlow = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.chatbotFlow.delete({
      where: { id }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('[chatbot] deleteChatbotFlow', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Fluxo nao encontrado' });
    }
    return res.status(500).json({ error: 'Erro ao remover fluxo' });
  }
};

export const getChatbotFlowStats = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const flow = await prisma.chatbotFlow.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!flow) {
      return res.status(404).json({ error: 'Fluxo nao encontrado' });
    }

    const [totals, sessionsLast14Days, transfers, durations] = await Promise.all([
      prisma.chatbotSession.aggregate({
        _count: { _all: true },
        where: { flowId: id }
      }),
      prisma.chatbotSession.findMany({
        where: {
          flowId: id,
          createdAt: {
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          createdAt: true,
          completedAt: true,
          transferredAt: true
        }
      }),
      prisma.chatbotSession.aggregate({
        _count: { _all: true },
        where: { flowId: id, transferredAt: { not: null } }
      }),
      prisma.chatbotSession.findMany({
        where: { flowId: id, completedAt: { not: null } },
        select: { createdAt: true, completedAt: true }
      })
    ]);

    const completedCount = durations.length;
    const averageDurationSeconds =
      durations.length > 0
        ? Math.round(
            durations.reduce((acc, session) => {
              const diff =
                (session.completedAt!.getTime() - session.createdAt.getTime()) / 1000;
              return acc + (Number.isFinite(diff) ? diff : 0);
            }, 0) / durations.length
          )
        : 0;

    const timeline = sessionsLast14Days.reduce<Record<string, { started: number; completed: number }>>(
      (acc, session) => {
        const key = session.createdAt.toISOString().slice(0, 10);
        if (!acc[key]) {
          acc[key] = { started: 0, completed: 0 };
        }
        acc[key].started += 1;
        if (session.completedAt) {
          acc[key].completed += 1;
        }
        return acc;
      },
      {}
    );

    return res.json({
      id: flow.id,
      name: flow.name,
      totalSessions: totals._count._all,
      completedSessions: completedCount,
      transferCount: transfers._count._all,
      averageDurationSeconds,
      completionRate:
        totals._count._all > 0 ? Math.round((completedCount / totals._count._all) * 100) : 0,
      timeline: Object.entries(timeline).map(([date, value]) => ({
        date,
        ...value
      }))
    });
  } catch (error) {
    console.error('[chatbot] getChatbotFlowStats', error);
    return res.status(500).json({ error: 'Erro ao obter estatisticas do fluxo' });
  }
};

export const testChatbotFlow = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { messages } = req.body ?? {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Informe uma lista de mensagens' });
    }

    const sanitizedMessages = messages
      .map((message) => (typeof message === 'string' ? message.trim() : ''))
      .filter((message) => message.length > 0);

    const result = await simulateFlow(id, sanitizedMessages);

    return res.json(result);
  } catch (error) {
    console.error('[chatbot] testChatbotFlow', error);
    return res.status(500).json({ error: 'Erro ao testar fluxo' });
  }
};





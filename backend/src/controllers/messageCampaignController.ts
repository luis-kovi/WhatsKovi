import { Request, Response } from 'express';
import {
  MessageCampaignStatus,
  MessageCampaignRecipientStatus
} from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import {
  listMessageCampaigns,
  getMessageCampaign,
  createMessageCampaign,
  updateMessageCampaign,
  pauseMessageCampaign,
  resumeMessageCampaign,
  cancelMessageCampaign,
  getMessageCampaignStats,
  listMessageCampaignRecipients
} from '../services/messageCampaignService';
import { parseSegmentFilters } from '../utils/contactFilters';

const parseStatusList = (value: unknown) => {
  if (!value) return undefined;

  const raw = Array.isArray(value)
    ? value.flatMap((item) => String(item).split(','))
    : String(value).split(',');

  const statuses = raw
    .map((item) => item.trim().toUpperCase())
    .filter((item): item is MessageCampaignStatus =>
      (Object.values(MessageCampaignStatus) as string[]).includes(item)
    );

  return statuses.length ? statuses : undefined;
};

const parseRecipientStatus = (value: unknown) => {
  if (!value) return undefined;
  const normalized = String(value).trim().toUpperCase();
  return (Object.values(MessageCampaignRecipientStatus) as string[]).includes(normalized)
    ? (normalized as MessageCampaignRecipientStatus)
    : undefined;
};

export const listCampaignController = async (req: Request, res: Response) => {
  try {
    const result = await listMessageCampaigns({
      status: parseStatusList(req.query.status),
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined
    });
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar campanhas.';
    return res.status(500).json({ error: message });
  }
};

export const getCampaignController = async (req: Request, res: Response) => {
  try {
    const campaign = await getMessageCampaign(req.params.id);
    return res.json(campaign);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar campanha.';
    return res.status(404).json({ error: message });
  }
};

export const createCampaignController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      name,
      description,
      body,
      mediaUrl,
      whatsappId,
      queueId,
      contactIds,
      segmentIds,
      filters,
      scheduledFor,
      rateLimitPerMinute
    } = req.body as {
      name?: string;
      description?: string;
      body?: string;
      mediaUrl?: string | null;
      whatsappId?: string;
      queueId?: string | null;
      contactIds?: string[] | string;
      segmentIds?: string[] | string;
      filters?: unknown;
      scheduledFor?: string | Date | null;
      rateLimitPerMinute?: number;
    };

    const parsedContactIds = Array.isArray(contactIds)
      ? contactIds.filter((id): id is string => typeof id === 'string')
      : typeof contactIds === 'string'
      ? contactIds.split(',').map((item) => item.trim()).filter(Boolean)
      : undefined;

    const parsedSegmentIds = Array.isArray(segmentIds)
      ? segmentIds.filter((id): id is string => typeof id === 'string')
      : typeof segmentIds === 'string'
      ? segmentIds.split(',').map((item) => item.trim()).filter(Boolean)
      : undefined;

    const parsedFilters = filters ? parseSegmentFilters(filters) : undefined;

    const campaign = await createMessageCampaign(userId, {
      name: name ?? '',
      description,
      body: body ?? '',
      mediaUrl: mediaUrl ?? null,
      whatsappId: whatsappId ?? '',
      queueId: queueId ?? null,
      contactIds: parsedContactIds,
      segmentIds: parsedSegmentIds,
      filters: parsedFilters,
      scheduledFor,
      rateLimitPerMinute
    });

    return res.status(201).json(campaign);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar campanha.';
    return res.status(400).json({ error: message });
  }
};

export const updateCampaignController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const campaign = await updateMessageCampaign(req.params.id, userId, req.body ?? {});
    return res.json(campaign);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar campanha.';
    return res.status(400).json({ error: message });
  }
};

export const pauseCampaignController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const campaign = await pauseMessageCampaign(req.params.id, userId);
    return res.json(campaign);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao pausar campanha.';
    return res.status(400).json({ error: message });
  }
};

export const resumeCampaignController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const campaign = await resumeMessageCampaign(req.params.id, userId);
    return res.json(campaign);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao retomar campanha.';
    return res.status(400).json({ error: message });
  }
};

export const cancelCampaignController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const campaign = await cancelMessageCampaign(req.params.id, userId, req.body?.reason);
    return res.json(campaign);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao cancelar campanha.';
    return res.status(400).json({ error: message });
  }
};

export const campaignStatsController = async (req: Request, res: Response) => {
  try {
    const stats = await getMessageCampaignStats(req.params.id);
    return res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter estatisticas.';
    return res.status(404).json({ error: message });
  }
};

export const campaignRecipientsController = async (req: Request, res: Response) => {
  try {
    const recipients = await listMessageCampaignRecipients(req.params.id, {
      status: parseRecipientStatus(req.query.status),
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined
    });
    return res.json(recipients);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar destinatarios.';
    return res.status(400).json({ error: message });
  }
};

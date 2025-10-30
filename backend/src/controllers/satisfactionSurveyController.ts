import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  SatisfactionFilters,
  SatisfactionResponseList,
  buildSatisfactionOverview,
  getSurveyByToken,
  getSurveyForTicket,
  listSatisfactionResponses,
  submitSurveyResponse,
  triggerSurveyForTicket
} from '../services/satisfactionSurveyService';

const parseDate = (value: unknown): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error('Data invalida');
  }

  return date;
};

const startOfDay = (value: Date) => {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (value: Date) => {
  const result = new Date(value);
  result.setHours(23, 59, 59, 999);
  return result;
};

const buildFilters = (query: Request['query']): SatisfactionFilters => {
  const end = parseDate(query.endDate) ?? new Date();
  const start =
    parseDate(query.startDate) ??
    new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);

  if (start > end) {
    throw new Error('Periodo invalido: data inicial maior que final');
  }

  return {
    start: startOfDay(start),
    end: endOfDay(end),
    queueId: query.queueId ? String(query.queueId) : undefined,
    agentId: query.agentId ? String(query.agentId) : undefined
  };
};

export const getSatisfactionOverview = async (req: AuthRequest, res: Response) => {
  try {
    const filters = buildFilters(req.query);
    const overview = await buildSatisfactionOverview(filters);
    return res.json(overview);
  } catch (error) {
    console.error('Erro ao carregar overview de satisfacao:', error);
    return res.status(500).json({ error: 'Erro ao carregar overview de satisfacao' });
  }
};

export const listSatisfactionResponsesHandler = async (req: AuthRequest, res: Response) => {
  try {
    const filters = buildFilters(req.query);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const pageSizeInput = Number(req.query.pageSize) || 10;
    const pageSize = Math.min(Math.max(pageSizeInput, 5), 50);

    const responses: SatisfactionResponseList = await listSatisfactionResponses(
      filters,
      page,
      pageSize
    );

    return res.json(responses);
  } catch (error) {
    console.error('Erro ao listar respostas de satisfacao:', error);
    return res.status(500).json({ error: 'Erro ao listar respostas de satisfacao' });
  }
};

export const getTicketSurveyStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const survey = await getSurveyForTicket(id);

    if (!survey) {
      return res.status(404).json({ error: 'Pesquisa nao encontrada para o ticket' });
    }

    return res.json({
      id: survey.id,
      status: survey.status,
      rating: survey.rating,
      comment: survey.comment,
      sentAt: survey.sentAt,
      respondedAt: survey.respondedAt,
      link: `${process.env.FRONTEND_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'}/survey/${survey.token}`,
      contact: survey.contact,
      queue: survey.queue,
      agent: survey.agent
    });
  } catch (error) {
    console.error('Erro ao buscar pesquisa do ticket:', error);
    return res.status(500).json({ error: 'Erro ao buscar pesquisa de satisfacao' });
  }
};

export const sendTicketSurvey = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const forceResend = Boolean(req.body?.force);

    const result = await triggerSurveyForTicket(id, {
      autoSend: true,
      forceResend
    });

    return res.json(result);
  } catch (error) {
    console.error('Erro ao enviar pesquisa de satisfacao:', error);
    if (error instanceof Error && error.message === 'Ticket nao encontrado') {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro ao enviar pesquisa de satisfacao' });
  }
};

export const getPublicSurvey = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const survey = await getSurveyByToken(token);

    if (!survey) {
      return res.status(404).json({ error: 'Pesquisa nao encontrada' });
    }

    if (survey.expiresAt && survey.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Pesquisa expirada' });
    }

    return res.json({
      status: survey.status,
      rating: survey.rating,
      comment: survey.comment,
      respondedAt: survey.respondedAt,
      contactName: survey.contact.name,
      agentName: survey.agent?.name ?? null,
      queueName: survey.queue?.name ?? null,
      brand: process.env.SATISFACTION_SURVEY_BRAND || 'WhatsKovi'
    });
  } catch (error) {
    console.error('Erro ao carregar pesquisa publica:', error);
    return res.status(500).json({ error: 'Erro ao carregar pesquisa de satisfacao' });
  }
};

export const submitPublicSurvey = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { rating, comment } = req.body as { rating?: number; comment?: string };

    if (rating === undefined || Number.isNaN(Number(rating))) {
      return res.status(400).json({ error: 'Informe uma nota de 0 a 10' });
    }

    if (rating < 0 || rating > 10) {
      return res.status(400).json({ error: 'A nota deve estar entre 0 e 10' });
    }

    const updated = await submitSurveyResponse(token, {
      rating: Number(rating),
      comment
    });

    return res.json({
      status: updated.status,
      rating: updated.rating,
      comment: updated.comment,
      respondedAt: updated.respondedAt
    });
  } catch (error) {
    console.error('Erro ao registrar resposta de satisfacao:', error);
    if (error instanceof Error) {
      if (error.message === 'Pesquisa nao encontrada') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Pesquisa ja respondida') {
        return res.status(409).json({ error: error.message });
      }
    }

    return res.status(500).json({ error: 'Erro ao registrar resposta de satisfacao' });
  }
};

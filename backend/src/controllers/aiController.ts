import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import {
  getTicketInsights,
  getLatestForecast,
  previewChatbotReply,
  processMessageWithAi,
  rebuildDemandForecast
} from '../services/aiOrchestrator';

export const getTicketInsightsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;

    const exists = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!exists) {
      return res.status(404).json({ error: 'Ticket nao encontrado' });
    }

    const insights = await getTicketInsights(ticketId);
    return res.json(insights);
  } catch (error) {
    console.error('[AI] Falha ao carregar insights', error);
    return res.status(500).json({ error: 'Erro ao carregar insights do ticket' });
  }
};

export const getDemandForecastHandler = async (req: AuthRequest, res: Response) => {
  try {
    const horizonParam = req.query.horizon;
    const refreshParam = (req.query.refresh as string | undefined)?.toLowerCase();

    const horizon = horizonParam ? Number.parseInt(String(horizonParam), 10) : undefined;
    const shouldRefresh = refreshParam === 'true' || refreshParam === '1';

    if (horizon !== undefined && (Number.isNaN(horizon) || horizon < 1 || horizon > 30)) {
      return res.status(400).json({ error: 'Parametro horizon deve estar entre 1 e 30 dias' });
    }

    const payload = shouldRefresh
      ? await rebuildDemandForecast(horizon ?? undefined)
      : await getLatestForecast(horizon ?? undefined);

    return res.json(payload);
  } catch (error) {
    console.error('[AI] Falha ao gerar previsao de demanda', error);
    return res.status(500).json({ error: 'Erro ao gerar previsao de demanda' });
  }
};

export const previewChatbotReplyHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId, message } = req.body as { ticketId?: string; message?: string };

    if (!ticketId || typeof ticketId !== 'string') {
      return res.status(400).json({ error: 'ticketId obrigatorio' });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Informe a mensagem para gerar a resposta' });
    }

    const reply = await previewChatbotReply(ticketId, message);
    return res.json(reply);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Ticket nao encontrado')) {
      return res.status(404).json({ error: 'Ticket nao encontrado' });
    }
    console.error('[AI] Falha ao gerar sugestao de chatbot', error);
    return res.status(500).json({ error: 'Erro ao gerar sugestao de resposta' });
  }
};

export const regenerateSuggestionsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        ticketId: true,
        userId: true,
        isPrivate: true
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Mensagem nao encontrada' });
    }

    const actor = message.userId ? ('agent' as const) : ('contact' as const);

    const result = await processMessageWithAi({
      ticketId: message.ticketId,
      messageId,
      actor,
      skipPrivate: true
    });

    const suggestions = await prisma.messageSuggestion.findMany({
      where: { messageId },
      orderBy: { confidence: 'desc' }
    });

    return res.json({
      suggestions,
      autoReply: result.autoReply ?? null
    });
  } catch (error) {
    console.error('[AI] Falha ao regenerar sugestoes', error);
    return res.status(500).json({ error: 'Erro ao regenerar sugestoes para a mensagem' });
  }
};

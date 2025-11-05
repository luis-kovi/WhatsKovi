import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  evaluateChatbotAiRouting,
  getChatbotAiConfig,
  updateChatbotAiConfig
} from '../services/chatbotAiService';
import { ChatbotAiRoutingRequest } from '../types/chatbot';

export const getChatbotAiConfigHandler = async (_req: AuthRequest, res: Response) => {
  try {
    const config = await getChatbotAiConfig();
    return res.json(config);
  } catch (error) {
    console.error('[ChatbotAI] Falha ao carregar configuracao de IA', error);
    return res.status(500).json({ error: 'Nao foi possivel carregar a configuracao de IA do chatbot.' });
  }
};

export const updateChatbotAiConfigHandler = async (req: AuthRequest, res: Response) => {
  try {
    const updated = await updateChatbotAiConfig(req.body, req.user?.id);
    return res.json(updated);
  } catch (error) {
    console.error('[ChatbotAI] Falha ao atualizar configuracao de IA', error);
    return res.status(500).json({ error: 'Nao foi possivel atualizar a configuracao de IA do chatbot.' });
  }
};

export const evaluateChatbotAiRoutingHandler = async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body as ChatbotAiRoutingRequest;

    if (!payload || !Array.isArray(payload.transcript) || payload.transcript.length === 0) {
      return res.status(400).json({ error: 'Transcript obrigatorio para simulacao de IA.' });
    }

    const result = await evaluateChatbotAiRouting(payload);
    return res.json(result);
  } catch (error) {
    console.error('[ChatbotAI] Falha ao avaliar roteamento', error);
    return res.status(500).json({ error: 'Nao foi possivel processar a conversa com a IA.' });
  }
};

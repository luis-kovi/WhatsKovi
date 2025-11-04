import api from './api';
import { isAxiosError } from 'axios';
import {
  ChatbotAiConfig,
  ChatbotAiRoutingRequest,
  ChatbotAiRoutingResult,
  ChatbotFlow,
  ChatbotFlowDefinition,
  ChatbotFlowStats,
  ChatbotFlowSummary,
  ChatbotSchedule,
  ChatbotTestResult,
  ChatbotTriggerType
} from '@/types/chatbot';

export interface ChatbotFlowPayload {
  name: string;
  description?: string | null;
  isActive?: boolean;
  isPrimary?: boolean;
  triggerType?: ChatbotTriggerType;
  keywords?: string[];
  entryNodeId: string;
  definition: ChatbotFlowDefinition;
  schedule?: ChatbotSchedule | null;
  offlineMessage?: string | null;
  transferQueueId?: string | null;
}

export const fetchChatbotFlows = async (): Promise<ChatbotFlowSummary[]> => {
  const response = await api.get('/chatbot/flows');
  return Array.isArray(response.data) ? response.data : [];
};

export const fetchChatbotFlow = async (id: string): Promise<ChatbotFlow> => {
  const response = await api.get(`/chatbot/flows/${id}`);
  return response.data;
};

export const createChatbotFlow = async (payload: ChatbotFlowPayload): Promise<ChatbotFlow> => {
  const response = await api.post('/chatbot/flows', payload);
  return response.data;
};

export const updateChatbotFlow = async (
  id: string,
  payload: Partial<ChatbotFlowPayload>
): Promise<ChatbotFlow> => {
  const response = await api.put(`/chatbot/flows/${id}`, payload);
  return response.data;
};

export const deleteChatbotFlow = async (id: string) => {
  await api.delete(`/chatbot/flows/${id}`);
};

export const fetchChatbotFlowStats = async (id: string): Promise<ChatbotFlowStats> => {
  const response = await api.get(`/chatbot/flows/${id}/stats`);
  return response.data;
};

export const fetchChatbotAiConfig = async (): Promise<ChatbotAiConfig> => {
  try {
    const response = await api.get('/chatbot/ai/config');
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return {
        provider: 'HYBRID',
        temperature: 0.5,
        topP: 0.9,
        defaultModel: 'local-fallback',
        availableModels: [
          { name: 'local-fallback', provider: 'HYBRID', description: 'Fallback local para simulacoes' }
        ],
        fallbackQueueId: null,
        fallbackChannel: null,
        lastTrainedAt: null,
        enabled: false,
        confidenceThreshold: 0.6
      };
    }
    throw error;
  }
};

export const updateChatbotAiConfig = async (payload: Partial<ChatbotAiConfig>): Promise<ChatbotAiConfig> => {
  const response = await api.put('/chatbot/ai/config', payload);
  return response.data;
};

export const evaluateChatbotAiRouting = async (
  payload: ChatbotAiRoutingRequest
): Promise<ChatbotAiRoutingResult> => {
  try {
    const response = await api.post('/chatbot/ai/route', payload);
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      const lastMessage = payload.transcript.at(-1)?.content ?? '';
      const normalized = lastMessage.trim();
      const summary =
        normalized.length > 0
          ? normalized.length > 160
            ? `${normalized.slice(0, 157)}...`
            : normalized
          : undefined;
      return {
        queue: null,
        channel: payload.channel ?? null,
        confidence: 0.4,
        reasons: ['Servico de IA nao disponivel no backend. Exibindo simulacao local.'],
        tags: [],
        summary,
        sentiment: undefined,
        model: 'local-fallback',
        createdAt: new Date().toISOString(),
        followUp: 'Configure o backend para habilitar o roteamento inteligente.',
        escalationRecommended: false
      };
    }
    throw error;
  }
};

export const testChatbotFlow = async (
  id: string,
  messages: string[]
): Promise<ChatbotTestResult> => {
  const response = await api.post(`/chatbot/flows/${id}/test`, { messages });
  return response.data;
};

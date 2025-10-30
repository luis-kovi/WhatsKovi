import api from './api';
import {
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

export const testChatbotFlow = async (
  id: string,
  messages: string[]
): Promise<ChatbotTestResult> => {
  const response = await api.post(`/chatbot/flows/${id}/test`, { messages });
  return response.data;
};

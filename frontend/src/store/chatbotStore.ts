import { create } from 'zustand';
import { ChatbotFlow, ChatbotFlowStats, ChatbotFlowSummary, ChatbotTestResult } from '@/types/chatbot';
import {
  createChatbotFlow,
  deleteChatbotFlow,
  fetchChatbotFlow,
  fetchChatbotFlows,
  fetchChatbotFlowStats,
  ChatbotFlowPayload,
  testChatbotFlow,
  updateChatbotFlow
} from '@/services/chatbot';

interface ChatbotState {
  flows: ChatbotFlowSummary[];
  selectedFlowId?: string;
  currentFlow?: ChatbotFlow | null;
  stats?: ChatbotFlowStats | null;
  testResult?: ChatbotTestResult | null;
  loading: boolean;
  saving: boolean;
  testing: boolean;
  error?: string | null;
  fetchFlows: () => Promise<void>;
  selectFlow: (id?: string | null) => Promise<void>;
  saveFlow: (payload: ChatbotFlowPayload, id?: string) => Promise<ChatbotFlow>;
  removeFlow: (id: string) => Promise<void>;
  runFlowTest: (id: string, messages: string[]) => Promise<void>;
  resetTest: () => void;
}

export const useChatbotStore = create<ChatbotState>((set, get) => ({
  flows: [],
  selectedFlowId: undefined,
  currentFlow: undefined,
  stats: undefined,
  testResult: undefined,
  loading: false,
  saving: false,
  testing: false,
  error: null,

  fetchFlows: async () => {
    set({ loading: true, error: null });
    try {
      const flows = await fetchChatbotFlows();
      set({ flows });
      const { selectedFlowId } = get();
      if (selectedFlowId) {
        const exists = flows.find((flow) => flow.id === selectedFlowId);
        if (!exists) {
          set({ selectedFlowId: undefined, currentFlow: undefined, stats: undefined });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar fluxos de chatbot:', error);
      set({ error: 'Nao foi possivel carregar os fluxos' });
    } finally {
      set({ loading: false });
    }
  },

  selectFlow: async (id) => {
    if (!id) {
      set({ selectedFlowId: undefined, currentFlow: undefined, stats: undefined, testResult: undefined });
      return;
    }

    set({ loading: true, error: null, selectedFlowId: id });
    try {
      const [flow, stats] = await Promise.all([
        fetchChatbotFlow(id),
        fetchChatbotFlowStats(id)
      ]);
      set({ currentFlow: flow, stats, testResult: undefined });
    } catch (error) {
      console.error('Erro ao selecionar fluxo:', error);
      set({
        error: 'Nao foi possivel carregar o fluxo selecionado',
        currentFlow: undefined,
        stats: undefined
      });
    } finally {
      set({ loading: false });
    }
  },

  saveFlow: async (payload, id) => {
    set({ saving: true, error: null });
    try {
      const flow = id ? await updateChatbotFlow(id, payload) : await createChatbotFlow(payload);
      await get().fetchFlows();
      await get().selectFlow(flow.id);
      return flow;
    } catch (error) {
      console.error('Erro ao salvar fluxo de chatbot:', error);
      set({ error: 'Nao foi possivel salvar o fluxo' });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  removeFlow: async (id) => {
    set({ saving: true, error: null });
    try {
      await deleteChatbotFlow(id);
      const { selectedFlowId } = get();
      if (selectedFlowId === id) {
        set({ selectedFlowId: undefined, currentFlow: undefined, stats: undefined, testResult: undefined });
      }
      await get().fetchFlows();
    } catch (error) {
      console.error('Erro ao remover fluxo de chatbot:', error);
      set({ error: 'Nao foi possivel remover o fluxo' });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  runFlowTest: async (id, messages) => {
    set({ testing: true, error: null });
    try {
      const result = await testChatbotFlow(id, messages);
      set({ testResult: result });
    } catch (error) {
      console.error('Erro ao testar fluxo de chatbot:', error);
      set({ error: 'Nao foi possivel executar o teste do fluxo' });
      throw error;
    } finally {
      set({ testing: false });
    }
  },

  resetTest: () => {
    set({ testResult: undefined });
  }
}));

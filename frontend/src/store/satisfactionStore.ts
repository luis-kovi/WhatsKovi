import { create } from 'zustand';
import {
  fetchSatisfactionOverview,
  fetchSatisfactionResponses
} from '@/services/satisfaction';
import type {
  SatisfactionOverview,
  SatisfactionResponseList
} from '@/types/satisfaction';

type SatisfactionFilters = {
  startDate: string;
  endDate: string;
  queueId?: string;
  agentId?: string;
};

type SatisfactionState = {
  overview: SatisfactionOverview | null;
  overviewLoading: boolean;
  overviewError: string | null;
  responses: SatisfactionResponseList | null;
  responsesLoading: boolean;
  responsesError: string | null;
  lastFilters: SatisfactionFilters | null;
  fetchOverview: (filters: SatisfactionFilters) => Promise<void>;
  fetchResponses: (
    params: SatisfactionFilters & { page?: number; pageSize?: number }
  ) => Promise<void>;
};

export const useSatisfactionStore = create<SatisfactionState>((set) => ({
  overview: null,
  overviewLoading: false,
  overviewError: null,
  responses: null,
  responsesLoading: false,
  responsesError: null,
  lastFilters: null,

  fetchOverview: async (filters) => {
    set({ overviewLoading: true, overviewError: null });
    try {
      const data = await fetchSatisfactionOverview(filters);
      set({
        overview: data,
        overviewLoading: false,
        overviewError: null,
        lastFilters: filters
      });
    } catch (error) {
      console.error('Erro ao carregar overview de satisfacao:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel carregar a visao de satisfacao.';
      set({ overviewError: message, overviewLoading: false });
      throw error;
    }
  },

  fetchResponses: async ({ page = 1, pageSize = 10, ...filters }) => {
    set({ responsesLoading: true, responsesError: null });
    try {
      const data = await fetchSatisfactionResponses({
        ...filters,
        page,
        pageSize
      });
      set({
        responses: data,
        responsesLoading: false,
        responsesError: null
      });
    } catch (error) {
      console.error('Erro ao carregar respostas de satisfacao:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel carregar as respostas.';
      set({ responsesError: message, responsesLoading: false });
      throw error;
    }
  }
}));

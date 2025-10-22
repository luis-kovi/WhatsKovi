import { create } from 'zustand';
import api from '@/services/api';

export type SearchType = 'messages' | 'contacts' | 'tickets';

export type SearchFilters = {
  types: SearchType[];
  queueIds: string[];
  userIds: string[];
  tagIds: string[];
  dateFrom?: string;
  dateTo?: string;
};

export type MessageSearchResult = {
  id: string;
  ticketId: string;
  contactId: string;
  contactName: string;
  contactPhone?: string | null;
  queueId?: string | null;
  queueName?: string | null;
  userId?: string | null;
  userName?: string | null;
  body: string;
  snippet: string;
  createdAt: string;
  rank: number;
};

export type ContactSearchResult = {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string | null;
  tagIds: string[];
  lastInteractionAt?: string | null;
  updatedAt: string;
  snippet: string;
  rank: number;
};

export type TicketSearchResult = {
  id: string;
  status: string;
  priority: string;
  contactId: string;
  contactName: string;
  contactPhone?: string | null;
  queueId?: string | null;
  queueName?: string | null;
  userId?: string | null;
  userName?: string | null;
  carPlate?: string | null;
  createdAt: string;
  lastMessageAt: string;
  snippet: string;
  rank: number;
};

export type SearchHistoryItem = {
  id: string;
  term: string;
  filters: Record<string, unknown>;
  results: Record<string, unknown>;
  createdAt: string;
};

type SearchResults = {
  took: number;
  messages: { count: number; items: MessageSearchResult[] };
  contacts: { count: number; items: ContactSearchResult[] };
  tickets: { count: number; items: TicketSearchResult[] };
};

type SearchState = {
  term: string;
  filters: SearchFilters;
  results: SearchResults;
  loading: boolean;
  error: string | null;
  history: SearchHistoryItem[];
  setTerm: (term: string) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  toggleType: (type: SearchType) => void;
  resetFilters: () => void;
  search: (term?: string, overrides?: Partial<SearchFilters>) => Promise<void>;
  fetchHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
};

const DEFAULT_FILTERS: SearchFilters = {
  types: ['messages', 'tickets', 'contacts'],
  queueIds: [],
  userIds: [],
  tagIds: [],
  dateFrom: undefined,
  dateTo: undefined
};

const initialResults: SearchResults = {
  took: 0,
  messages: { count: 0, items: [] },
  contacts: { count: 0, items: [] },
  tickets: { count: 0, items: [] }
};

const buildParams = (term: string, filters: SearchFilters) => {
  const params: Record<string, string> = {
    q: term
  };

  if (filters.types.length > 0 && filters.types.length < 3) {
    params.types = filters.types.join(',');
  }
  if (filters.queueIds.length > 0) {
    params.queueIds = filters.queueIds.join(',');
  }
  if (filters.userIds.length > 0) {
    params.userIds = filters.userIds.join(',');
  }
  if (filters.tagIds.length > 0) {
    params.tagIds = filters.tagIds.join(',');
  }
  if (filters.dateFrom) {
    params.dateFrom = filters.dateFrom;
  }
  if (filters.dateTo) {
    params.dateTo = filters.dateTo;
  }

  return params;
};

export const useSearchStore = create<SearchState>((set, get) => ({
  term: '',
  filters: { ...DEFAULT_FILTERS, types: [...DEFAULT_FILTERS.types] },
  results: initialResults,
  loading: false,
  error: null,
  history: [],

  setTerm: (term) => set({ term }),

  setFilters: (filters) =>
    set((state) => {
      const next = { ...state.filters };

      if (filters.types) {
        next.types = [...filters.types];
      }
      if (filters.queueIds) {
        next.queueIds = [...filters.queueIds];
      }
      if (filters.userIds) {
        next.userIds = [...filters.userIds];
      }
      if (filters.tagIds) {
        next.tagIds = [...filters.tagIds];
      }
      if ('dateFrom' in filters) {
        next.dateFrom = filters.dateFrom;
      }
      if ('dateTo' in filters) {
        next.dateTo = filters.dateTo;
      }

      return { filters: next };
    }),

  toggleType: (type) =>
    set((state) => {
      const isActive = state.filters.types.includes(type);
      if (isActive && state.filters.types.length === 1) {
        return state;
      }
      const nextTypes = isActive
        ? state.filters.types.filter((item) => item !== type)
        : [...state.filters.types, type];
      return {
        filters: {
          ...state.filters,
          types: nextTypes
        }
      };
    }),

  resetFilters: () =>
    set({
      filters: { ...DEFAULT_FILTERS, types: [...DEFAULT_FILTERS.types] }
    }),

  search: async (termInput, overrides) => {
    const currentState = get();
    const term = (termInput ?? currentState.term).trim();
    const mergedFilters: SearchFilters = {
      ...currentState.filters,
      ...overrides,
      types:
        overrides?.types !== undefined
          ? overrides.types.length > 0
            ? overrides.types
            : currentState.filters.types
          : currentState.filters.types
    };

    if (term.length === 0) {
      set({
        term,
        results: initialResults,
        error: null,
        filters: mergedFilters
      });
      return;
    }

    if (term.length < 2) {
      set({
        term,
        error: null,
        filters: mergedFilters
      });
      return;
    }

    set({ loading: true, error: null, term, filters: mergedFilters });

    try {
      const response = await api.get<{
        term: string;
        filters: Partial<SearchFilters>;
        took: number;
        results: {
          messages: { count: number; items: MessageSearchResult[] };
          contacts: { count: number; items: ContactSearchResult[] };
          tickets: { count: number; items: TicketSearchResult[] };
        };
      }>('/search', {
        params: buildParams(term, mergedFilters)
      });

      const data = response.data;
      const nextFilters: SearchFilters = {
        ...mergedFilters,
        ...data.filters,
        types:
          data.filters?.types && data.filters.types.length
            ? (data.filters.types as SearchType[])
            : mergedFilters.types
      };

      set({
        term: data.term,
        filters: nextFilters,
        results: {
          took: data.took,
          messages: data.results.messages,
          contacts: data.results.contacts,
          tickets: data.results.tickets
        },
        loading: false,
        error: null
      });

      void get().fetchHistory();
    } catch (error) {
      console.error('Erro ao executar busca avançada:', error);
      set({
        loading: false,
        error: 'Não foi possível executar a busca. Tente novamente mais tarde.'
      });
    }
  },

  fetchHistory: async () => {
    try {
      const response = await api.get<{ items: SearchHistoryItem[] }>('/search/history');
      set({ history: response.data.items });
    } catch (error) {
      console.error('Erro ao carregar histórico de busca:', error);
    }
  },

  clearHistory: async () => {
    try {
      await api.delete('/search/history');
      set({ history: [] });
    } catch (error) {
      console.error('Erro ao limpar histórico de busca:', error);
    }
  }
}));

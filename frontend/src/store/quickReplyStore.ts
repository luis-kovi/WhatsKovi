import { create } from 'zustand';
import api from '../services/api';

export interface QuickReplyCategory {
  id: string;
  name: string;
  color: string | null;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
  quickReplyCount?: number;
}

export interface QuickReplyVariable {
  key: string;
  label: string;
  description: string;
  example?: string;
  scope: 'contact' | 'agent' | 'queue' | 'ticket' | 'system';
}

export interface QuickReplyStats {
  totals: {
    quickReplies: number;
    usage: number;
    categories: number;
  };
  categories: Array<{
    id: string;
    name: string;
    color: string | null;
    displayOrder: number;
    quickReplies: number;
    usageCount: number;
  }>;
  uncategorized: {
    quickReplies: number;
    usageCount: number;
  };
  topQuickReplies: Array<{
    id: string;
    shortcut: string;
    message: string;
    usageCount: number;
    category: { id: string; name: string; color: string | null } | null;
  }>;
}

export interface QuickReplyOwner {
  id: string;
  name: string;
  email: string;
}

export interface QuickReplyQueue {
  id: string;
  name: string;
  color: string;
}

export interface QuickReplyItem {
  id: string;
  shortcut: string;
  message: string;
  mediaUrl?: string | null;
  isGlobal: boolean;
  usageCount: number;
  lastUsedAt?: string | null;
  ownerId?: string | null;
  queueId?: string | null;
  categoryId?: string | null;
  owner?: QuickReplyOwner | null;
  queue?: QuickReplyQueue | null;
  category?: QuickReplyCategory | null;
}

export interface RenderQuickReplyPayload {
  ticketId?: string;
  sample?: {
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    contactNotes?: string;
    agentName?: string;
    queueName?: string;
    queueGreeting?: string;
    queueId?: string;
  };
}

export interface RenderQuickReplyResult {
  quickReplyId: string;
  shortcut: string;
  renderedMessage: string;
  variables: {
    used: string[];
    missing: string[];
    available?: QuickReplyVariable[];
  };
}

export interface UseQuickReplyResult {
  quickReplyId: string;
  shortcut: string;
  renderedMessage: string;
  variables: {
    used: string[];
    missing: string[];
  };
}

interface FetchQuickRepliesParams {
  search?: string;
  categoryId?: string;
  queueId?: string;
  scope?: 'all' | 'available';
}

interface QuickReplyState {
  quickReplies: QuickReplyItem[];
  categories: QuickReplyCategory[];
  uncategorizedCount: number;
  variables: QuickReplyVariable[];
  stats: QuickReplyStats | null;
  loading: boolean;
  error: string | null;
  fetchQuickReplies: (params?: FetchQuickRepliesParams) => Promise<QuickReplyItem[]>;
  fetchCategories: () => Promise<void>;
  fetchVariables: () => Promise<void>;
  fetchStats: () => Promise<void>;
  createQuickReply: (
    payload: Partial<QuickReplyItem> & { shortcut: string; message: string }
  ) => Promise<QuickReplyItem>;
  updateQuickReply: (
    id: string,
    payload: Partial<QuickReplyItem> & { shortcut?: string; message?: string }
  ) => Promise<QuickReplyItem>;
  deleteQuickReply: (id: string) => Promise<void>;
  createCategory: (payload: { name: string; color?: string; displayOrder?: number }) => Promise<void>;
  updateCategory: (
    id: string,
    payload: { name?: string; color?: string; displayOrder?: number }
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  renderQuickReply: (id: string, payload: RenderQuickReplyPayload) => Promise<RenderQuickReplyResult>;
  registerQuickReplyUsage: (id: string, payload: { ticketId: string }) => Promise<UseQuickReplyResult>;
}

const sortQuickReplies = (items: QuickReplyItem[]) =>
  [...items].sort((a, b) => a.shortcut.localeCompare(b.shortcut));

export const useQuickReplyStore = create<QuickReplyState>((set, get) => ({
  quickReplies: [],
  categories: [],
  uncategorizedCount: 0,
  variables: [],
  stats: null,
  loading: false,
  error: null,

  fetchQuickReplies: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get<QuickReplyItem[]>('/quick-replies', {
        params: {
          search: params?.search,
          categoryId: params?.categoryId,
          queueId: params?.queueId,
          scope: params?.scope
        }
      });
      const data = sortQuickReplies(response.data);
      set({ quickReplies: data, loading: false });
      return data;
    } catch (error) {
      console.error('Erro ao carregar respostas rapidas:', error);
      set({
        loading: false,
        error: 'Nao foi possivel carregar as respostas rapidas.'
      });
      return [];
    }
  },

  fetchCategories: async () => {
    try {
      const response = await api.get<{
        categories: QuickReplyCategory[];
        uncategorized: number;
      }>('/quick-reply-categories');

      set({
        categories: response.data.categories,
        uncategorizedCount: response.data.uncategorized
      });
    } catch (error) {
      console.error('Erro ao carregar categorias de respostas rapidas:', error);
    }
  },

  fetchVariables: async () => {
    try {
      const response = await api.get<QuickReplyVariable[]>('/quick-replies/variables');
      set({ variables: response.data });
    } catch (error) {
      console.error('Erro ao carregar variaveis dinamicas:', error);
    }
  },

  fetchStats: async () => {
    try {
      const response = await api.get<QuickReplyStats>('/quick-replies/stats');
      set({ stats: response.data });
    } catch (error) {
      console.error('Erro ao carregar estatisticas de respostas rapidas:', error);
    }
  },

  createQuickReply: async (payload) => {
    const response = await api.post<QuickReplyItem>('/quick-replies', payload);
    const created = response.data;
    set((state) => ({
      quickReplies: sortQuickReplies([...state.quickReplies, created])
    }));
    get()
      .fetchStats()
      .catch(() => undefined);
    get()
      .fetchCategories()
      .catch(() => undefined);
    return created;
  },

  updateQuickReply: async (id, payload) => {
    const response = await api.put<QuickReplyItem>(`/quick-replies/${id}`, payload);
    const updated = response.data;
    set((state) => ({
      quickReplies: sortQuickReplies(
        state.quickReplies.map((quickReply) =>
          quickReply.id === id ? { ...quickReply, ...updated } : quickReply
        )
      )
    }));
    get()
      .fetchStats()
      .catch(() => undefined);
    get()
      .fetchCategories()
      .catch(() => undefined);
    return updated;
  },

  deleteQuickReply: async (id) => {
    await api.delete(`/quick-replies/${id}`);
    set((state) => ({
      quickReplies: state.quickReplies.filter((item) => item.id !== id)
    }));
    get()
      .fetchStats()
      .catch(() => undefined);
    get()
      .fetchCategories()
      .catch(() => undefined);
  },

  createCategory: async ({ name, color, displayOrder }) => {
    await api.post('/quick-reply-categories', { name, color, displayOrder });
    await get().fetchCategories();
    get()
      .fetchStats()
      .catch(() => undefined);
  },

  updateCategory: async (id, payload) => {
    await api.put(`/quick-reply-categories/${id}`, payload);
    await get().fetchCategories();
    get()
      .fetchStats()
      .catch(() => undefined);
  },

  deleteCategory: async (id) => {
    await api.delete(`/quick-reply-categories/${id}`);
    await get().fetchCategories();
    get()
      .fetchStats()
      .catch(() => undefined);
    set((state) => ({
      quickReplies: state.quickReplies.map((item) =>
        item.categoryId === id ? { ...item, categoryId: null, category: null } : item
      )
    }));
  },

  renderQuickReply: async (id, payload) => {
    const response = await api.post<RenderQuickReplyResult>(`/quick-replies/${id}/render`, payload);
    return response.data;
  },

  registerQuickReplyUsage: async (id, payload) => {
    const response = await api.post<UseQuickReplyResult>(`/quick-replies/${id}/use`, payload);
    const now = new Date().toISOString();
    set((state) => ({
      quickReplies: state.quickReplies.map((item) =>
        item.id === id
          ? {
              ...item,
              usageCount: (item.usageCount ?? 0) + 1,
              lastUsedAt: now
            }
          : item
      )
    }));
    get()
      .fetchStats()
      .catch(() => undefined);
    return response.data;
  }
}));

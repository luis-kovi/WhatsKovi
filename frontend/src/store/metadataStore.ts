import { create } from 'zustand';
import api from '../services/api';
import { getSocket } from '../services/socket';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Queue {
  id: string;
  name: string;
  color: string;
  priority: number;
  description?: string | null;
  greetingMessage?: string | null;
  outOfHoursMessage?: string | null;
}

export interface QuickReply {
  id: string;
  shortcut: string;
  message: string;
  mediaUrl?: string | null;
  isGlobal: boolean;
}

export interface WhatsAppConnection {
  id: string;
  name: string;
  status: string;
  phoneNumber?: string | null;
  qrCode?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  tickets: {
    total: number;
    pending: number;
    open: number;
    closed: number;
  };
  agents: {
    total: number;
    online: number;
    offline: number;
  };
  whatsappConnections: Record<string, number>;
  queues: number;
  messagesToday: number;
}

interface MetadataState {
  tags: Tag[];
  queues: Queue[];
  quickReplies: QuickReply[];
  connections: WhatsAppConnection[];
  dashboard: DashboardSummary | null;
  loading: boolean;
  fetchTags: () => Promise<void>;
  fetchQueues: () => Promise<void>;
  fetchQuickReplies: () => Promise<void>;
  fetchConnections: () => Promise<void>;
  fetchDashboard: () => Promise<void>;
  createQueue: (payload: {
    name: string;
    color?: string;
    description?: string;
    greetingMessage?: string;
    outOfHoursMessage?: string;
    priority?: number;
    userIds?: string[];
  }) => Promise<void>;
  createTag: (payload: { name: string; color?: string }) => Promise<void>;
  updateQueue: (id: string, payload: {
    name?: string;
    color?: string;
    description?: string;
    greetingMessage?: string;
    outOfHoursMessage?: string;
    priority?: number;
    userIds?: string[];
  }) => Promise<void>;
  updateTag: (id: string, payload: { name?: string; color?: string }) => Promise<void>;
  deleteQueue: (id: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  createConnection: (payload: { name: string; isDefault?: boolean }) => Promise<void>;
  startConnection: (id: string) => Promise<void>;
  stopConnection: (id: string) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  setupRealtimeListeners: () => void;
}

let realtimeBound = false;

export const useMetadataStore = create<MetadataState>((set, get) => ({
  tags: [],
  queues: [],
  quickReplies: [],
  connections: [],
  dashboard: null,
  loading: false,

  fetchTags: async () => {
    try {
      const response = await api.get('/tags');
      set({ tags: response.data });
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    }
  },

  fetchQueues: async () => {
    try {
      const response = await api.get('/queues');
      set({ queues: response.data });
    } catch (error) {
      console.error('Erro ao carregar filas:', error);
    }
  },

  fetchQuickReplies: async () => {
    try {
      const response = await api.get('/quick-replies');
      set({ quickReplies: response.data });
    } catch (error) {
      console.error('Erro ao carregar respostas rapidas:', error);
    }
  },

  fetchConnections: async () => {
    try {
      const response = await api.get('/whatsapp');
      set({ connections: response.data });
    } catch (error) {
      console.error('Erro ao carregar conexoes WhatsApp:', error);
    }
  },

  fetchDashboard: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/dashboard/summary');
      set({ dashboard: response.data, loading: false });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      set({ loading: false });
    }
  },

  createQueue: async (payload) => {
    try {
      await api.post('/queues', payload);
      await get().fetchQueues();
    } catch (error) {
      console.error('Erro ao criar fila:', error);
      throw error;
    }
  },

  createTag: async ({ name, color }) => {
    try {
      await api.post('/tags', { name, color });
      await get().fetchTags();
    } catch (error) {
      console.error('Erro ao criar tag:', error);
      throw error;
    }
  },

  createConnection: async ({ name, isDefault }) => {
    try {
      await api.post('/whatsapp', { name, isDefault });
      await get().fetchConnections();
    } catch (error) {
      console.error('Erro ao criar conexao WhatsApp:', error);
      throw error;
    }
  },

  startConnection: async (id: string) => {
    try {
      await api.post(`/whatsapp/${id}/start`);
      await get().fetchConnections();
    } catch (error) {
      console.error('Erro ao iniciar conexao WhatsApp:', error);
      throw error;
    }
  },

  stopConnection: async (id: string) => {
    try {
      await api.post(`/whatsapp/${id}/stop`);
      await get().fetchConnections();
    } catch (error) {
      console.error('Erro ao parar conexao WhatsApp:', error);
      throw error;
    }
  },

  deleteConnection: async (id: string) => {
    try {
      await api.delete(`/whatsapp/${id}`);
      await get().fetchConnections();
    } catch (error) {
      console.error('Erro ao remover conexao WhatsApp:', error);
      throw error;
    }
  },

  updateQueue: async (id, payload) => {
    try {
      await api.put(`/queues/${id}`, payload);
      await get().fetchQueues();
    } catch (error) {
      console.error('Erro ao atualizar fila:', error);
      throw error;
    }
  },

  updateTag: async (id, payload) => {
    try {
      await api.put(`/tags/${id}`, payload);
      await get().fetchTags();
    } catch (error) {
      console.error('Erro ao atualizar tag:', error);
      throw error;
    }
  },

  deleteQueue: async (id) => {
    try {
      await api.delete(`/queues/${id}`);
      await get().fetchQueues();
    } catch (error) {
      console.error('Erro ao remover fila:', error);
      throw error;
    }
  },

  deleteTag: async (id) => {
    try {
      await api.delete(`/tags/${id}`);
      await get().fetchTags();
    } catch (error) {
      console.error('Erro ao remover tag:', error);
      throw error;
    }
  },

  setupRealtimeListeners: () => {
    if (realtimeBound) return;

    const socket = getSocket();
    if (!socket) return;

    realtimeBound = true;

    socket.on('whatsapp:qr', ({ connectionId, qrCode }) => {
      set((state) => ({
        connections: state.connections.map((connection) =>
          connection.id === connectionId
            ? { ...connection, qrCode, status: 'CONNECTING' }
            : connection
        )
      }));
    });

    socket.on('whatsapp:ready', ({ connectionId, phoneNumber }) => {
      set((state) => ({
        connections: state.connections.map((connection) =>
          connection.id === connectionId
            ? { ...connection, status: 'CONNECTED', phoneNumber, qrCode: null }
            : connection
        )
      }));
    });

    socket.on('whatsapp:disconnected', ({ connectionId }) => {
      set((state) => ({
        connections: state.connections.map((connection) =>
          connection.id === connectionId
            ? { ...connection, status: 'DISCONNECTED', qrCode: null }
            : connection
        )
      }));
    });
  }
}));

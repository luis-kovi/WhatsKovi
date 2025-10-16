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
  createTag: (payload: { name: string; color?: string }) => Promise<void>;
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

  createTag: async ({ name, color }) => {
    try {
      await api.post('/tags', { name, color });
      await get().fetchTags();
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    }
  },

  createConnection: async ({ name, isDefault }) => {
    try {
      await api.post('/whatsapp', { name, isDefault });
      await get().fetchConnections();
    } catch (error) {
      console.error('Erro ao criar conexao WhatsApp:', error);
    }
  },

  startConnection: async (id: string) => {
    try {
      await api.post(`/whatsapp/${id}/start`);
      await get().fetchConnections();
    } catch (error) {
      console.error('Erro ao iniciar conexao WhatsApp:', error);
    }
  },

  stopConnection: async (id: string) => {
    try {
      await api.post(`/whatsapp/${id}/stop`);
      await get().fetchConnections();
    } catch (error) {
      console.error('Erro ao parar conexao WhatsApp:', error);
    }
  },

  deleteConnection: async (id: string) => {
    try {
      await api.delete(`/whatsapp/${id}`);
      await get().fetchConnections();
    } catch (error) {
      console.error('Erro ao remover conexao WhatsApp:', error);
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

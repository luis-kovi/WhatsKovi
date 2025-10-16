import { create } from 'zustand';
import api from '../services/api';
import { getSocket } from '../services/socket';

interface Ticket {
  id: string;
  status: string;
  priority: string;
  unreadMessages: number;
  lastMessageAt: string;
  contact: any;
  user?: any;
  queue?: any;
  tags: any[];
  messages?: any[];
}

interface TicketState {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  loading: boolean;
  fetchTickets: (filters?: any) => Promise<void>;
  selectTicket: (ticketId: string) => Promise<void>;
  acceptTicket: (ticketId: string) => Promise<void>;
  closeTicket: (ticketId: string) => Promise<void>;
  transferTicket: (ticketId: string, data: any) => Promise<void>;
  setupSocketListeners: () => void;
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  selectedTicket: null,
  loading: false,

  fetchTickets: async (filters = {}) => {
    set({ loading: true });
    try {
      const response = await api.get('/tickets', { params: filters });
      set({ tickets: response.data, loading: false });
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
      set({ loading: false });
    }
  },

  selectTicket: async (ticketId: string) => {
    try {
      const response = await api.get(`/tickets/${ticketId}`);
      set({ selectedTicket: response.data });
    } catch (error) {
      console.error('Erro ao buscar ticket:', error);
    }
  },

  acceptTicket: async (ticketId: string) => {
    try {
      await api.put(`/tickets/${ticketId}/accept`);
      await get().fetchTickets();
    } catch (error) {
      console.error('Erro ao aceitar ticket:', error);
    }
  },

  closeTicket: async (ticketId: string) => {
    try {
      await api.put(`/tickets/${ticketId}/close`);
      await get().fetchTickets();
      set({ selectedTicket: null });
    } catch (error) {
      console.error('Erro ao fechar ticket:', error);
    }
  },

  transferTicket: async (ticketId: string, data: any) => {
    try {
      await api.put(`/tickets/${ticketId}/transfer`, data);
      await get().fetchTickets();
    } catch (error) {
      console.error('Erro ao transferir ticket:', error);
    }
  },

  setupSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('ticket:new', (ticket: Ticket) => {
      set((state) => ({
        tickets: [ticket, ...state.tickets]
      }));
    });

    socket.on('ticket:update', (ticket: Ticket) => {
      set((state) => ({
        tickets: state.tickets.map((t) => (t.id === ticket.id ? ticket : t))
      }));
    });

    socket.on('message:new', ({ ticketId }: any) => {
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === ticketId
            ? { ...t, unreadMessages: t.unreadMessages + 1, lastMessageAt: new Date().toISOString() }
            : t
        )
      }));
    });
  },
}));

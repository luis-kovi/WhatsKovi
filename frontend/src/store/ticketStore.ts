import { create } from 'zustand';
import api from '../services/api';
import { getSocket } from '../services/socket';

export interface TicketTag {
  id: string;
  tag: {
    id: string;
    name: string;
    color: string;
  };
}

export interface Ticket {
  id: string;
  status: string;
  priority: string;
  carPlate?: string | null;
  unreadMessages: number;
  lastMessageAt: string;
  contact: {
    id: string;
    name: string;
    phoneNumber: string;
    avatar?: string | null;
  };
  user?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  queue?: {
    id: string;
    name: string;
    color: string;
  } | null;
  tags: TicketTag[];
  messages?: any[];
}

type TicketSort = 'recent' | 'unread' | 'priority';

export interface TicketFilters {
  status?: string;
  queueId?: string;
  tagIds?: string[];
  search?: string;
  sort?: TicketSort;
}

interface TicketState {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  loading: boolean;
  filters: TicketFilters;
  fetchTickets: (overrides?: Partial<TicketFilters>) => Promise<void>;
  setFilter: (key: keyof TicketFilters, value?: string | string[]) => Promise<void>;
  clearFilters: () => Promise<void>;
  selectTicket: (ticketId: string) => Promise<void>;
  acceptTicket: (ticketId: string) => Promise<void>;
  closeTicket: (ticketId: string) => Promise<void>;
  reopenTicket: (ticketId: string) => Promise<void>;
  transferTicket: (ticketId: string, data: any) => Promise<void>;
  updateTicketDetails: (ticketId: string, data: { priority?: string; queueId?: string | null; tagIds?: string[] }) => Promise<void>;
  createManualTicket: (payload: {
    phoneNumber: string;
    name?: string;
    queueId?: string | null;
    priority?: string;
    tagIds?: string[];
    carPlate: string;
  }) => Promise<string | null>;
  setupSocketListeners: () => void;
}

const serializeFilters = (filters: TicketFilters) => ({
  ...filters,
  tags: filters.tagIds && filters.tagIds.length > 0 ? filters.tagIds.join(',') : undefined
});

const updateTicketCollection = (tickets: Ticket[], updated: Ticket) =>
  tickets.map((ticket) => (ticket.id === updated.id ? updated : ticket));

let socketListenersBound = false;

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  selectedTicket: null,
  loading: false,
  filters: { sort: 'recent' },

  fetchTickets: async (overrides = {}) => {
    const currentFilters = Object.keys(overrides).length > 0 ? { ...get().filters, ...overrides } : get().filters;
    set({ loading: true, filters: currentFilters });

    try {
      const response = await api.get('/tickets', {
        params: serializeFilters(currentFilters)
      });

      set({ tickets: response.data, loading: false });
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
      set({ loading: false });
    }
  },

  setFilter: async (key, value) => {
    const nextFilters = {
      ...get().filters,
      [key]: value
    };

    // Remove empty values
    if (value === undefined || (Array.isArray(value) && value.length === 0) || value === '') {
      delete nextFilters[key];
    }

    set({ filters: nextFilters });
    await get().fetchTickets();
  },

  clearFilters: async () => {
    set({ filters: { sort: 'recent' } });
    await get().fetchTickets();
  },

  selectTicket: async (ticketId: string) => {
    try {
      const response = await api.get(`/tickets/${ticketId}`);
      const ticket = response.data;

      set((state) => ({
        selectedTicket: ticket,
        tickets: state.tickets.map((item) =>
          item.id === ticketId ? { ...item, unreadMessages: 0 } : item
        )
      }));
    } catch (error) {
      console.error('Erro ao buscar ticket:', error);
    }
  },

  acceptTicket: async (ticketId: string) => {
    try {
      const response = await api.put(`/tickets/${ticketId}/accept`);
      const updatedTicket: Ticket = response.data;

      set((state) => ({
        tickets: updateTicketCollection(state.tickets, updatedTicket),
        selectedTicket:
          state.selectedTicket && state.selectedTicket.id === ticketId
            ? { ...state.selectedTicket, status: updatedTicket.status, user: updatedTicket.user }
            : state.selectedTicket
      }));
    } catch (error) {
      console.error('Erro ao aceitar ticket:', error);
    }
  },

  closeTicket: async (ticketId: string) => {
    try {
      const response = await api.put(`/tickets/${ticketId}/close`);
      const updatedTicket: Ticket = response.data;

      set((state) => ({
        tickets: updateTicketCollection(state.tickets, updatedTicket),
        selectedTicket:
          state.selectedTicket && state.selectedTicket.id === ticketId ? updatedTicket : state.selectedTicket
      }));
    } catch (error) {
      console.error('Erro ao fechar ticket:', error);
    }
  },

  reopenTicket: async (ticketId: string) => {
    try {
      const response = await api.put(`/tickets/${ticketId}/reopen`);
      const updatedTicket: Ticket = response.data;

      set((state) => ({
        tickets: updateTicketCollection(state.tickets, updatedTicket),
        selectedTicket:
          state.selectedTicket && state.selectedTicket.id === ticketId ? updatedTicket : state.selectedTicket
      }));
    } catch (error) {
      console.error('Erro ao reabrir ticket:', error);
    }
  },

  transferTicket: async (ticketId: string, data: any) => {
    try {
      const response = await api.put(`/tickets/${ticketId}/transfer`, data);
      const updatedTicket: Ticket = response.data;

      set((state) => ({
        tickets: updateTicketCollection(state.tickets, updatedTicket),
        selectedTicket:
          state.selectedTicket && state.selectedTicket.id === ticketId ? updatedTicket : state.selectedTicket
      }));
    } catch (error) {
      console.error('Erro ao transferir ticket:', error);
    }
  },

  updateTicketDetails: async (ticketId, data) => {
    try {
      const response = await api.put(`/tickets/${ticketId}/details`, data);
      const updatedTicket: Ticket = response.data;

      set((state) => ({
        tickets: updateTicketCollection(state.tickets, updatedTicket),
        selectedTicket:
          state.selectedTicket && state.selectedTicket.id === ticketId ? updatedTicket : state.selectedTicket
      }));
    } catch (error) {
      console.error('Erro ao atualizar ticket:', error);
    }
  },

  createManualTicket: async (payload) => {
    try {
      const response = await api.post('/tickets', payload);
      const created: Ticket = response.data;

      set((state) => ({
        tickets: [created, ...state.tickets.filter((ticket) => ticket.id !== created.id)],
        selectedTicket: created
      }));

      return created.id;
    } catch (error) {
      console.error('Erro ao criar ticket manual:', error);
      throw error;
    }
  },

  setupSocketListeners: () => {
    const socket = getSocket();
    if (!socket || socketListenersBound) return;

    socketListenersBound = true;

    socket.on('ticket:new', (ticket: Ticket) => {
      set((state) => ({
        tickets: [ticket, ...state.tickets.filter((item) => item.id !== ticket.id)]
      }));
    });

    socket.on('ticket:update', (ticket: Ticket) => {
      set((state) => ({
        tickets: updateTicketCollection(state.tickets, ticket),
        selectedTicket:
          state.selectedTicket && state.selectedTicket.id === ticket.id ? ticket : state.selectedTicket
      }));
    });

    socket.on('message:new', (payload: any) => {
      set((state) => {
        const isFromAgent = Boolean(payload.userId);
        const now = new Date().toISOString();

        const updatedTickets = state.tickets.map((ticket) => {
          if (ticket.id !== payload.ticketId) {
            return ticket;
          }

          const shouldIncreaseUnread =
            !isFromAgent && (!state.selectedTicket || state.selectedTicket.id !== ticket.id);

          return {
            ...ticket,
            unreadMessages: shouldIncreaseUnread ? ticket.unreadMessages + 1 : ticket.unreadMessages,
            lastMessageAt: now
          };
        });

        const selectedTicket =
          state.selectedTicket && state.selectedTicket.id === payload.ticketId
            ? { ...state.selectedTicket, unreadMessages: 0 }
            : state.selectedTicket;

        return { tickets: updatedTickets, selectedTicket };
      });
    });
  }
}));

import { create } from 'zustand';
import api from '@/services/api';
import type {
  ScheduledMessage,
  CreateScheduledMessageRequest,
  UpdateScheduledMessageRequest
} from '@/types/scheduledMessages';

type ScheduledMessageState = {
  itemsByTicket: Record<string, ScheduledMessage[]>;
  loadingByTicket: Record<string, boolean>;
  creating: boolean;
  errorByTicket: Record<string, string | null>;
  fetchScheduledMessages: (ticketId: string, options?: { force?: boolean }) => Promise<ScheduledMessage[]>;
  createScheduledMessage: (
    ticketId: string,
    payload: CreateScheduledMessageRequest
  ) => Promise<ScheduledMessage | null>;
  updateScheduledMessage: (
    ticketId: string,
    scheduleId: string,
    payload: UpdateScheduledMessageRequest
  ) => Promise<ScheduledMessage | null>;
  cancelScheduledMessage: (
    ticketId: string,
    scheduleId: string,
    reason?: string
  ) => Promise<ScheduledMessage | null>;
  clearTicket: (ticketId: string) => void;
};

const STATUS_ORDER: Record<ScheduledMessage['status'], number> = {
  ACTIVE: 0,
  PAUSED: 1,
  COMPLETED: 2,
  CANCELLED: 3
};

const sortSchedules = (entries: ScheduledMessage[]) => {
  return [...entries].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;

    const aNext = a.nextRunAt ? new Date(a.nextRunAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bNext = b.nextRunAt ? new Date(b.nextRunAt).getTime() : Number.MAX_SAFE_INTEGER;
    return aNext - bNext;
  });
};

export const useScheduledMessageStore = create<ScheduledMessageState>((set, get) => ({
  itemsByTicket: {},
  loadingByTicket: {},
  creating: false,
  errorByTicket: {},

  fetchScheduledMessages: async (ticketId, options) => {
    const { itemsByTicket, loadingByTicket } = get();
    if (!options?.force && itemsByTicket[ticketId] && !loadingByTicket[ticketId]) {
      return itemsByTicket[ticketId];
    }

    set((state) => ({
      loadingByTicket: { ...state.loadingByTicket, [ticketId]: true },
      errorByTicket: { ...state.errorByTicket, [ticketId]: null }
    }));

    try {
      const response = await api.get<ScheduledMessage[]>(`/tickets/${ticketId}/scheduled-messages`);
      const data = sortSchedules(response.data);
      set((state) => ({
        itemsByTicket: { ...state.itemsByTicket, [ticketId]: data },
        loadingByTicket: { ...state.loadingByTicket, [ticketId]: false }
      }));
      return data;
    } catch (error) {
      console.error('Erro ao carregar mensagens agendadas:', error);
      const message =
        error instanceof Error ? error.message : 'Nao foi possivel carregar os agendamentos.';
      set((state) => ({
        loadingByTicket: { ...state.loadingByTicket, [ticketId]: false },
        errorByTicket: { ...state.errorByTicket, [ticketId]: message }
      }));
      throw error;
    }
  },

  createScheduledMessage: async (ticketId, payload) => {
    set({ creating: true });
    try {
      const response = await api.post<ScheduledMessage>(
        `/tickets/${ticketId}/scheduled-messages`,
        payload
      );
      const schedule = response.data;
      set((state) => {
        const current = state.itemsByTicket[ticketId] ?? [];
        return {
          creating: false,
          itemsByTicket: {
            ...state.itemsByTicket,
            [ticketId]: sortSchedules([schedule, ...current.filter((item) => item.id !== schedule.id)])
          }
        };
      });
      return schedule;
    } catch (error) {
      console.error('Erro ao criar mensagem agendada:', error);
      set({ creating: false });
      throw error;
    }
  },

  updateScheduledMessage: async (ticketId, scheduleId, payload) => {
    try {
      const response = await api.put<ScheduledMessage>(`/scheduled-messages/${scheduleId}`, payload);
      const updated = response.data;
      set((state) => {
        const current = state.itemsByTicket[ticketId] ?? [];
        const next = current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item));
        return {
          itemsByTicket: {
            ...state.itemsByTicket,
            [ticketId]: sortSchedules(next)
          }
        };
      });
      return updated;
    } catch (error) {
      console.error('Erro ao atualizar mensagem agendada:', error);
      throw error;
    }
  },

  cancelScheduledMessage: async (ticketId, scheduleId, reason) => {
    try {
      const response = await api.delete<ScheduledMessage>(`/scheduled-messages/${scheduleId}`, {
        data: reason ? { reason } : undefined
      });
      const cancelled = response.data;
      set((state) => {
        const current = state.itemsByTicket[ticketId] ?? [];
        const next = current.map((item) =>
          item.id === cancelled.id
            ? { ...item, ...cancelled }
            : item
        );
        return {
          itemsByTicket: {
            ...state.itemsByTicket,
            [ticketId]: sortSchedules(next)
          }
        };
      });
      return cancelled;
    } catch (error) {
      console.error('Erro ao cancelar mensagem agendada:', error);
      throw error;
    }
  },

  clearTicket: (ticketId) => {
    set((state) => {
      const nextItems = { ...state.itemsByTicket };
      delete nextItems[ticketId];
      const nextLoading = { ...state.loadingByTicket };
      delete nextLoading[ticketId];
      const nextErrors = { ...state.errorByTicket };
      delete nextErrors[ticketId];
      return {
        itemsByTicket: nextItems,
        loadingByTicket: nextLoading,
        errorByTicket: nextErrors
      };
    });
  }
}));

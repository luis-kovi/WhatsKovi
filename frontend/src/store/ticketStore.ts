import { create } from 'zustand';
import api from '@/services/api';
import type { AxiosProgressEvent } from 'axios';
import { getSocket } from '@/services/socket';
import { resolveAssetUrl } from '@/utils/media';
import { AiChatbotReply, AiSuggestion, DemandForecastPayload, TicketAiInsights } from '@/types/ai';

export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'NOTE';
export type MessageStatus = 'PENDING' | 'SENT' | 'RECEIVED' | 'READ';
export type MessageChannel = 'WHATSAPP' | 'EMAIL' | 'SMS' | 'INTERNAL';

export interface ReactionUser {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  createdAt: string;
  user: ReactionUser | null;
}

export interface QuotedMessage {
  id: string;
  body: string | null;
  type: MessageType;
  mediaUrl?: string | null;
  createdAt: string;
  user: ReactionUser | null;
  deliveryMetadata?: Record<string, unknown> | null;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  body: string | null;
  type: MessageType;
  channel: MessageChannel;
  status: MessageStatus;
  mediaUrl?: string | null;
  isPrivate?: boolean;
  createdAt: string;
  editedAt?: string | null;
  editedBy?: string | null;
  userId?: string | null;
  user: ReactionUser | null;
  quotedMessage: QuotedMessage | null;
  reactions: MessageReaction[];
  deliveryMetadata?: Record<string, unknown> | null;
}

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
    email?: string | null;
    avatar?: string | null;
  };
  user?: ReactionUser | null;
  queue?: {
    id: string;
    name: string;
    color: string;
  } | null;
  tags: TicketTag[];
  messages?: TicketMessage[];
}

type TicketSort = 'recent' | 'unread' | 'priority';

export interface TicketFilters {
  status?: string;
  queueId?: string;
  tagIds?: string[];
  search?: string;
  sort?: TicketSort;
}

type TransferPayload = {
  userId?: string | null;
  queueId?: string | null;
};

export type SendMessagePayload = {
  ticketId: string;
  body?: string;
  isPrivate?: boolean;
  quotedMsgId?: string | null;
  mediaFile?: File;
  type?: MessageType;
  channel?: MessageChannel;
  onUploadProgress?: (progress: number) => void;
};

export type EditMessagePayload = {
  ticketId: string;
  messageId: string;
  body?: string;
  isPrivate?: boolean;
};

interface TicketState {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  loading: boolean;
  filters: TicketFilters;
  messagesByTicket: Record<string, TicketMessage[]>;
  messagesLoaded: Record<string, boolean>;
  quotedMessage: TicketMessage | null;
  fetchTickets: (overrides?: Partial<TicketFilters>) => Promise<void>;
  setFilter: (key: keyof TicketFilters, value?: string | string[]) => Promise<void>;
  clearFilters: () => Promise<void>;
  selectTicket: (ticketId: string) => Promise<void>;
  acceptTicket: (ticketId: string) => Promise<void>;
  closeTicket: (ticketId: string) => Promise<void>;
  reopenTicket: (ticketId: string) => Promise<void>;
  transferTicket: (ticketId: string, data: TransferPayload) => Promise<void>;
  updateTicketDetails: (
    ticketId: string,
    data: { priority?: string; queueId?: string | null; tagIds?: string[] }
  ) => Promise<void>;
  addTicketTags: (ticketId: string, tagIds: string[]) => Promise<void>;
  removeTicketTag: (ticketId: string, tagId: string) => Promise<void>;
  createManualTicket: (payload: {
    phoneNumber: string;
    name?: string;
    queueId?: string | null;
    priority?: string;
    tagIds?: string[];
    carPlate?: string | null;
  }) => Promise<string | null>;
  loadMessages: (ticketId: string, options?: { force?: boolean }) => Promise<void>;
  sendMessage: (payload: SendMessagePayload) => Promise<TicketMessage | null>;
  editMessage: (payload: EditMessagePayload) => Promise<TicketMessage | null>;
  deleteMessage: (ticketId: string, messageId: string) => Promise<void>;
  addReaction: (ticketId: string, messageId: string, emoji: string) => Promise<void>;
  removeReaction: (ticketId: string, messageId: string, reactionId: string) => Promise<void>;
  setQuotedMessage: (message: TicketMessage | null) => void;
  aiSuggestionsByMessage: Record<string, AiSuggestion[]>;
  aiChatbotDrafts: Record<string, AiChatbotReply>;
  aiInsightsByTicket: Record<string, TicketAiInsights>;
  demandForecast: DemandForecastPayload | null;
  fetchTicketInsights: (ticketId: string) => Promise<void>;
  previewChatbotReply: (ticketId: string, message: string) => Promise<AiChatbotReply | null>;
  regenerateSuggestions: (messageId: string, ticketId: string) => Promise<void>;
  loadDemandForecast: (options?: { horizon?: number; refresh?: boolean }) => Promise<void>;
  setupSocketListeners: () => void;
}

type RawReaction = {
  id: string;
  emoji: string;
  userId: string;
  createdAt: string;
  user?: ReactionUser | null;
};

type RawQuotedMessage = {
  id: string;
  body?: string | null;
  type?: MessageType;
  mediaUrl?: string | null;
  createdAt: string;
  user?: ReactionUser | null;
  deliveryMetadata?: Record<string, unknown> | null;
};

type RawMessage = {
  id: string;
  body?: string | null;
  type?: MessageType;
  status?: MessageStatus;
  channel?: MessageChannel;
  mediaUrl?: string | null;
  isPrivate?: boolean;
  createdAt: string;
  editedAt?: string | null;
  editedBy?: string | null;
  userId?: string | null;
  user?: ReactionUser | null;
  quotedMessage?: RawQuotedMessage | null;
  reactions?: RawReaction[];
  deliveryMetadata?: Record<string, unknown> | null;
};

type MessageSocketPayload = RawMessage & { ticketId: string };

type RawTicket = {
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
  user?: ReactionUser | null;
  queue?: {
    id: string;
    name: string;
    color: string;
  } | null;
  tags: TicketTag[];
  messages?: RawMessage[];
};

const DEFAULT_FILTERS: TicketFilters = { sort: 'recent' };

const serializeFilters = (filters: TicketFilters) => ({
  ...filters,
  tags: filters.tagIds && filters.tagIds.length > 0 ? filters.tagIds.join(',') : undefined
});

const normalizeUser = (user?: ReactionUser | null): ReactionUser | null => {
  if (!user) return null;
  return {
    ...user,
    avatar: resolveAssetUrl(user.avatar ?? null)
  };
};

const sortByCreatedAtAsc = (messages: TicketMessage[]) =>
  [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

const upsertMessage = (messages: TicketMessage[], message: TicketMessage) => {
  const index = messages.findIndex((item) => item.id === message.id);
  if (index >= 0) {
    const next = [...messages];
    next[index] = message;
    return next;
  }
  return [...messages, message];
};

const removeMessageById = (messages: TicketMessage[], messageId: string) =>
  messages.filter((message) => message.id !== messageId);

const getLastMessage = (messages: TicketMessage[]) =>
  messages.length > 0 ? messages[messages.length - 1] : null;

const getLastPublicMessage = (messages: TicketMessage[]) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (!messages[i].isPrivate) return messages[i];
  }
  return null;
};

const syncTicketsAfterMessages = (tickets: Ticket[], ticketId: string, messages: TicketMessage[]) =>
  tickets.map((ticket) => {
    if (ticket.id !== ticketId) return ticket;
    const lastMessage = getLastPublicMessage(messages);
    return {
      ...ticket,
      lastMessageAt: lastMessage ? lastMessage.createdAt : ticket.lastMessageAt,
      messages: lastMessage ? [lastMessage] : []
    };
  });

const syncSelectedTicketAfterMessages = (
  selectedTicket: Ticket | null,
  ticketId: string,
  messages: TicketMessage[]
) => {
  if (!selectedTicket || selectedTicket.id !== ticketId) return selectedTicket;
  const lastMessage = getLastMessage(messages);
  return {
    ...selectedTicket,
    lastMessageAt: lastMessage ? lastMessage.createdAt : selectedTicket.lastMessageAt,
    messages
  };
};

const reorderTicketsByLastMessage = (tickets: Ticket[]) =>
  [...tickets].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

const normalizeMessage = (message: RawMessage, ticketId: string): TicketMessage => {
  const quoted = message.quotedMessage
    ? {
        id: message.quotedMessage.id,
        body: message.quotedMessage.body ?? null,
        type: (message.quotedMessage.type ?? 'TEXT') as MessageType,
        mediaUrl: resolveAssetUrl(message.quotedMessage.mediaUrl ?? null),
        createdAt: message.quotedMessage.createdAt,
        user: normalizeUser(message.quotedMessage.user ?? null),
        deliveryMetadata: message.quotedMessage.deliveryMetadata ?? null
      }
    : null;

  const reactions = Array.isArray(message.reactions)
    ? message.reactions.map((reaction) => ({
        id: reaction.id,
        emoji: reaction.emoji,
        userId: reaction.userId,
        createdAt: reaction.createdAt,
        user: normalizeUser(reaction.user ?? null)
      }))
    : [];

  return {
    id: message.id,
    ticketId,
    body: message.body ?? null,
    type: (message.type ?? 'TEXT') as MessageType,
    channel: (message.channel ?? 'WHATSAPP') as MessageChannel,
    status: (message.status ?? 'PENDING') as MessageStatus,
    mediaUrl: resolveAssetUrl(message.mediaUrl ?? null),
    isPrivate: Boolean(message.isPrivate),
    createdAt: message.createdAt,
    editedAt: message.editedAt ?? null,
    editedBy: message.editedBy ?? null,
    userId: message.userId ?? null,
    user: normalizeUser(message.user ?? null),
    quotedMessage: quoted,
    reactions,
    deliveryMetadata: message.deliveryMetadata ?? null
  };
};

const normalizeTicket = (ticket: RawTicket): Ticket => {
  const normalizedMessages = Array.isArray(ticket.messages)
    ? sortByCreatedAtAsc(ticket.messages.map((message) => normalizeMessage(message, ticket.id)))
    : undefined;

  return {
    id: ticket.id,
    status: ticket.status,
    priority: ticket.priority,
    carPlate: ticket.carPlate ?? null,
    unreadMessages: ticket.unreadMessages,
    lastMessageAt: ticket.lastMessageAt,
    contact: {
      ...ticket.contact,
      avatar: resolveAssetUrl(ticket.contact?.avatar ?? null)
    },
    user: normalizeUser(ticket.user ?? null),
    queue: ticket.queue ?? null,
    tags: ticket.tags ?? [],
    messages: normalizedMessages
  };
};

let socketListenersBound = false;

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  selectedTicket: null,
  loading: false,
  filters: DEFAULT_FILTERS,
  messagesByTicket: {},
  messagesLoaded: {},
  quotedMessage: null,
  aiSuggestionsByMessage: {},
  aiChatbotDrafts: {},
  aiInsightsByTicket: {},
  demandForecast: null,

  fetchTickets: async (overrides = {}) => {
    const currentFilters =
      Object.keys(overrides).length > 0 ? { ...get().filters, ...overrides } : get().filters;
    set({ loading: true, filters: currentFilters });

    try {
      const response = await api.get<RawTicket[]>('/tickets', {
        params: serializeFilters(currentFilters)
      });

      const normalizedTickets = response.data.map((ticket) => normalizeTicket(ticket));

      set((state) => {
        const nextMessagesByTicket = { ...state.messagesByTicket };
        normalizedTickets.forEach((ticket) => {
          if (
            ticket.messages &&
            ticket.messages.length > 0 &&
            !nextMessagesByTicket[ticket.id]
          ) {
            nextMessagesByTicket[ticket.id] = ticket.messages;
          }
        });

        return {
          tickets: reorderTicketsByLastMessage(normalizedTickets),
          loading: false,
          filters: currentFilters,
          messagesByTicket: nextMessagesByTicket
        };
      });
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

    if (value === undefined || (Array.isArray(value) && value.length === 0) || value === '') {
      delete nextFilters[key];
    }

    set({ filters: nextFilters });
    await get().fetchTickets();
  },

  clearFilters: async () => {
    set({ filters: DEFAULT_FILTERS });
    await get().fetchTickets();
  },

  selectTicket: async (ticketId: string) => {
    try {
      const response = await api.get<RawTicket>(`/tickets/${ticketId}`);
      const ticket = normalizeTicket(response.data);

      set((state) => {
        const messages = ticket.messages ?? [];
        const updatedTickets = state.tickets.map((item) =>
          item.id === ticketId
            ? {
                ...item,
                unreadMessages: 0,
                lastMessageAt:
                  messages.length > 0 ? messages[messages.length - 1].createdAt : item.lastMessageAt,
                messages: messages.length > 0 ? [messages[messages.length - 1]] : item.messages
              }
            : item
        );

        return {
          tickets: updatedTickets,
          selectedTicket: ticket,
          messagesByTicket: {
            ...state.messagesByTicket,
            [ticketId]: messages
          },
          messagesLoaded: { ...state.messagesLoaded, [ticketId]: true },
          quotedMessage: null
        };
      });

      await get().fetchTicketInsights(ticketId);

      if (!get().demandForecast) {
        get()
          .loadDemandForecast()
          .catch((error) => console.warn('Erro ao carregar previsao de demanda', error));
      }
    } catch (error) {
      console.error('Erro ao buscar ticket:', error);
    }
  },

  acceptTicket: async (ticketId: string) => {
    try {
      const response = await api.put<RawTicket>(`/tickets/${ticketId}/accept`);
      const updatedTicket = normalizeTicket(response.data);

      set((state) => ({
        tickets: state.tickets.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket)),
        selectedTicket:
          state.selectedTicket && state.selectedTicket.id === ticketId
            ? {
                ...state.selectedTicket,
                status: updatedTicket.status,
                user: updatedTicket.user
              }
            : state.selectedTicket
      }));
    } catch (error) {
      console.error('Erro ao aceitar ticket:', error);
    }
  },

  closeTicket: async (ticketId: string) => {
    try {
      const response = await api.put<RawTicket>(`/tickets/${ticketId}/close`);
      const updatedTicket = normalizeTicket(response.data);

      set((state) => ({
        tickets: state.tickets.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket)),
        selectedTicket:
          state.selectedTicket && state.selectedTicket.id === ticketId ? updatedTicket : state.selectedTicket
      }));
    } catch (error) {
      console.error('Erro ao fechar ticket:', error);
    }
  },

  reopenTicket: async (ticketId: string) => {
    try {
      const response = await api.put<RawTicket>(`/tickets/${ticketId}/reopen`);
      const updatedTicket = normalizeTicket(response.data);

      set((state) => ({
        tickets: state.tickets.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket)),
        selectedTicket:
          state.selectedTicket && state.selectedTicket.id === ticketId ? updatedTicket : state.selectedTicket
      }));
    } catch (error) {
      console.error('Erro ao reabrir ticket:', error);
    }
  },

  transferTicket: async (ticketId: string, data: TransferPayload) => {
    try {
      const response = await api.put<RawTicket>(`/tickets/${ticketId}/transfer`, data);
      const updatedTicket = normalizeTicket(response.data);

      set((state) => ({
        tickets: state.tickets.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket)),
        selectedTicket:
          state.selectedTicket && state.selectedTicket.id === ticketId ? updatedTicket : state.selectedTicket
      }));
    } catch (error) {
      console.error('Erro ao transferir ticket:', error);
    }
  },

  updateTicketDetails: async (ticketId, data) => {
    try {
      const response = await api.put<RawTicket>(`/tickets/${ticketId}/details`, data);
      const updatedTicket = normalizeTicket(response.data);

      set((state) => ({
        tickets: state.tickets.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket)),
        selectedTicket:
          state.selectedTicket && state.selectedTicket.id === ticketId ? updatedTicket : state.selectedTicket
      }));
    } catch (error) {
      console.error('Erro ao atualizar ticket:', error);
    }
  },

  addTicketTags: async (ticketId, tagIds) => {
    try {
      const response = await api.post<RawTicket>(`/tickets/${ticketId}/tags`, { tagIds });
      const updatedTicket = normalizeTicket(response.data);

      set((state) => ({
        tickets: state.tickets.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket)),
        selectedTicket:
          state.selectedTicket && state.selectedTicket.id === ticketId ? updatedTicket : state.selectedTicket
      }));
    } catch (error) {
      console.error('Erro ao aplicar tags no ticket:', error);
      throw error;
    }
  },

  removeTicketTag: async (ticketId, tagId) => {
    try {
      const response = await api.delete<RawTicket>(`/tickets/${ticketId}/tags/${tagId}`);
      const updatedTicket = normalizeTicket(response.data);

      set((state) => ({
        tickets: state.tickets.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket)),
        selectedTicket:
          state.selectedTicket && state.selectedTicket.id === ticketId ? updatedTicket : state.selectedTicket
      }));
    } catch (error) {
      console.error('Erro ao remover tag do ticket:', error);
      throw error;
    }
  },

  createManualTicket: async (payload) => {
    try {
      const phoneDigits = payload.phoneNumber.replace(/\D/g, '');
      const existingActive = get().tickets.find((ticket) => {
        const ticketPhone = ticket.contact.phoneNumber?.replace(/\D/g, '');
        return (
          ticketPhone === phoneDigits &&
          (ticket.status === 'BOT' || ticket.status === 'PENDING' || ticket.status === 'OPEN')
        );
      });

      if (existingActive) {
        throw new Error('Ja existe um ticket pendente ou em atendimento para este contato.');
      }

      const requestBody = {
        ...payload,
        phoneNumber: phoneDigits,
        carPlate: payload.carPlate ?? undefined
      };

      const response = await api.post<Ticket>('/tickets', requestBody);
      const created = normalizeTicket(response.data);

      set((state) => ({
        tickets: reorderTicketsByLastMessage([
          created,
          ...state.tickets.filter((ticket) => ticket.id !== created.id)
        ]),
        selectedTicket: created
      }));

      return created.id;
    } catch (error) {
      console.error('Erro ao criar ticket manual:', error);
      throw error;
    }
  },

  loadMessages: async (ticketId, options = {}) => {
    if (!options.force && get().messagesLoaded[ticketId]) {
      return;
    }

    try {
      const response = await api.get<RawMessage[]>(`/messages/${ticketId}`);
      const normalizedMessages = sortByCreatedAtAsc(
        response.data.map((message) => normalizeMessage(message, ticketId))
      );

      set((state) => ({
        tickets: syncTicketsAfterMessages(state.tickets, ticketId, normalizedMessages),
        selectedTicket: syncSelectedTicketAfterMessages(state.selectedTicket, ticketId, normalizedMessages),
        messagesByTicket: {
          ...state.messagesByTicket,
          [ticketId]: normalizedMessages
        },
        messagesLoaded: { ...state.messagesLoaded, [ticketId]: true }
      }));
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  },

  sendMessage: async ({
    ticketId,
    body,
    isPrivate,
    quotedMsgId,
    mediaFile,
    type,
    channel,
    onUploadProgress
  }) => {
    try {
      const state = get();
      const ticketBeforeSend =
        state.tickets.find((ticket) => ticket.id === ticketId) ??
        (state.selectedTicket && state.selectedTicket.id === ticketId ? state.selectedTicket : null);

      if (ticketBeforeSend && (ticketBeforeSend.status === 'PENDING' || ticketBeforeSend.status === 'BOT')) {
        await state.acceptTicket(ticketId);
      }

      let response;

        if (mediaFile) {
          const formData = new FormData();
          formData.append('ticketId', ticketId);
          if (body) formData.append('body', body);
          formData.append('media', mediaFile);
          if (isPrivate) formData.append('isPrivate', 'true');
          if (quotedMsgId) formData.append('quotedMsgId', quotedMsgId);
          if (type) formData.append('type', type);
          if (!isPrivate && channel) formData.append('channel', channel);

        response = await api.post<RawMessage>('/messages', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          ...(onUploadProgress
            ? {
                onUploadProgress: (event: AxiosProgressEvent) => {
                  if (!event.total) return;
                  const progress = Math.round((event.loaded / event.total) * 100);
                  onUploadProgress(progress);
                }
              }
            : {})
        });
        } else {
          response = await api.post<RawMessage>('/messages', {
            ticketId,
            body,
            isPrivate,
            quotedMsgId,
            type,
            channel: !isPrivate ? channel : undefined
          });
        }

      if (onUploadProgress) {
        onUploadProgress(100);
      }

      const message = normalizeMessage(response.data, ticketId);

      set((state) => {
        const currentMessages = state.messagesByTicket[ticketId] ?? [];
        const nextMessages = sortByCreatedAtAsc(upsertMessage(currentMessages, message));

        const tickets = reorderTicketsByLastMessage(
          syncTicketsAfterMessages(state.tickets, ticketId, nextMessages).map((ticket) =>
            ticket.id === ticketId
              ? {
                  ...ticket,
                  unreadMessages: 0
                }
              : ticket
          )
        );

        const updatedSelected = syncSelectedTicketAfterMessages(
          state.selectedTicket,
          ticketId,
          nextMessages
        );

        const selectedTicket =
          updatedSelected && updatedSelected.id === ticketId
            ? { ...updatedSelected, unreadMessages: 0 }
            : updatedSelected;

        return {
          tickets,
          selectedTicket,
          messagesByTicket: {
            ...state.messagesByTicket,
            [ticketId]: nextMessages
          },
          messagesLoaded: { ...state.messagesLoaded, [ticketId]: true },
          quotedMessage: null
        };
      });

      return message;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  },

  editMessage: async ({ ticketId, messageId, body, isPrivate }) => {
    try {
      const response = await api.put<RawMessage>(`/messages/${messageId}`, {
        body,
        isPrivate
      });

      const updatedMessage = normalizeMessage(response.data, ticketId);

      set((state) => {
        const currentMessages = state.messagesByTicket[ticketId] ?? [];
        const nextMessages = sortByCreatedAtAsc(upsertMessage(currentMessages, updatedMessage));

        return {
          tickets: syncTicketsAfterMessages(state.tickets, ticketId, nextMessages),
          selectedTicket: syncSelectedTicketAfterMessages(state.selectedTicket, ticketId, nextMessages),
          messagesByTicket: {
            ...state.messagesByTicket,
            [ticketId]: nextMessages
          }
        };
      });

      return updatedMessage;
    } catch (error) {
      console.error('Erro ao editar mensagem:', error);
      throw error;
    }
  },

  deleteMessage: async (ticketId, messageId) => {
    try {
      await api.delete(`/messages/${messageId}`);

      set((state) => {
        const currentMessages = state.messagesByTicket[ticketId] ?? [];
        const nextMessages = sortByCreatedAtAsc(removeMessageById(currentMessages, messageId));

        return {
          tickets: syncTicketsAfterMessages(state.tickets, ticketId, nextMessages),
          selectedTicket: syncSelectedTicketAfterMessages(state.selectedTicket, ticketId, nextMessages),
          messagesByTicket: {
            ...state.messagesByTicket,
            [ticketId]: nextMessages
          },
          quotedMessage:
            state.quotedMessage && state.quotedMessage.id === messageId ? null : state.quotedMessage
        };
      });
    } catch (error) {
      console.error('Erro ao remover mensagem:', error);
      throw error;
    }
  },

  addReaction: async (ticketId, messageId, emoji) => {
    try {
      const response = await api.post<RawMessage | { success: boolean }>(
        `/messages/${messageId}/reactions`,
        { emoji }
      );

      if ('id' in response.data) {
        const updatedMessage = normalizeMessage(response.data, ticketId);

        set((state) => {
          const currentMessages = state.messagesByTicket[ticketId] ?? [];
          const nextMessages = sortByCreatedAtAsc(upsertMessage(currentMessages, updatedMessage));

          return {
            tickets: syncTicketsAfterMessages(state.tickets, ticketId, nextMessages),
            selectedTicket: syncSelectedTicketAfterMessages(
              state.selectedTicket,
              ticketId,
              nextMessages
            ),
            messagesByTicket: {
              ...state.messagesByTicket,
              [ticketId]: nextMessages
            }
          };
        });
      }
    } catch (error) {
      console.error('Erro ao adicionar reacao:', error);
      throw error;
    }
  },

  removeReaction: async (ticketId, messageId, reactionId) => {
    try {
      const response = await api.delete<RawMessage | { success: boolean }>(
        `/messages/${messageId}/reactions/${reactionId}`
      );

      if ('id' in response.data) {
        const updatedMessage = normalizeMessage(response.data, ticketId);

        set((state) => {
          const currentMessages = state.messagesByTicket[ticketId] ?? [];
          const nextMessages = sortByCreatedAtAsc(upsertMessage(currentMessages, updatedMessage));

          return {
            tickets: syncTicketsAfterMessages(state.tickets, ticketId, nextMessages),
            selectedTicket: syncSelectedTicketAfterMessages(
              state.selectedTicket,
              ticketId,
              nextMessages
            ),
            messagesByTicket: {
              ...state.messagesByTicket,
              [ticketId]: nextMessages
            }
          };
        });
      }
    } catch (error) {
      console.error('Erro ao remover reacao:', error);
      throw error;
    }
  },

  setQuotedMessage: (message) => {
    set({ quotedMessage: message });
  },

  fetchTicketInsights: async (ticketId: string) => {
    try {
      const { data } = await api.get<TicketAiInsights>(`/ai/tickets/${ticketId}/insights`);

      set((state) => {
        const grouped = data.suggestions.reduce<Record<string, AiSuggestion[]>>((acc, item) => {
          if (!acc[item.messageId]) {
            acc[item.messageId] = [];
          }
          acc[item.messageId].push({
            text: item.suggestion,
            confidence: item.confidence ?? undefined,
            source: item.source ?? null
          });
          return acc;
        }, {});

        const suggestionsByMessage = { ...state.aiSuggestionsByMessage };
        Object.entries(grouped).forEach(([messageId, suggestions]) => {
          suggestionsByMessage[messageId] = suggestions;
        });

        return {
          aiInsightsByTicket: {
            ...state.aiInsightsByTicket,
            [ticketId]: data
          },
          aiSuggestionsByMessage: suggestionsByMessage
        };
      });
    } catch (error) {
      console.error('Erro ao carregar insights de IA', error);
    }
  },

  previewChatbotReply: async (ticketId: string, message: string) => {
    try {
      const { data } = await api.post<AiChatbotReply>('/ai/chatbot/preview', { ticketId, message });

      set((state) => ({
        aiChatbotDrafts: {
          ...state.aiChatbotDrafts,
          [ticketId]: data
        }
      }));

      return data;
    } catch (error) {
      console.error('Erro ao gerar resposta automática de IA', error);
      return null;
    }
  },

  regenerateSuggestions: async (messageId: string, ticketId: string) => {
    try {
      const { data } = await api.post<{
        suggestions: Array<{ suggestion: string; confidence: number | null; source: string | null }>;
        autoReply: AiChatbotReply | null;
      }>(`/ai/messages/${messageId}/regenerate`);

      const mappedSuggestions =
        data.suggestions?.map((item) => ({
          text: item.suggestion,
          confidence: item.confidence ?? undefined,
          source: item.source ?? null
        })) ?? [];

      set((state) => ({
        aiSuggestionsByMessage: {
          ...state.aiSuggestionsByMessage,
          [messageId]: mappedSuggestions
        },
        aiChatbotDrafts: data.autoReply
          ? {
              ...state.aiChatbotDrafts,
              [ticketId]: data.autoReply
            }
          : state.aiChatbotDrafts
      }));
    } catch (error) {
      console.error('Erro ao regenerar sugestoes de IA', error);
    }
  },

  loadDemandForecast: async (options?: { horizon?: number; refresh?: boolean }) => {
    try {
      const { data } = await api.get<DemandForecastPayload>('/ai/forecast', {
        params: {
          horizon: options?.horizon,
          refresh: options?.refresh
        }
      });

      set({ demandForecast: data });
    } catch (error) {
      console.error('Erro ao carregar previsao de demanda', error);
    }
  },

  setupSocketListeners: () => {
    const socket = getSocket();
    if (!socket || socketListenersBound) return;

    socketListenersBound = true;

    socket.on('ticket:new', (payload: RawTicket) => {
      const ticket = normalizeTicket(payload);

      set((state) => ({
        tickets: reorderTicketsByLastMessage([
          ticket,
          ...state.tickets.filter((existing) => existing.id !== ticket.id)
        ])
      }));
    });

    socket.on('ticket:update', (payload: RawTicket) => {
      const ticket = normalizeTicket(payload);

      set((state) => ({
        tickets: reorderTicketsByLastMessage(
          state.tickets.map((existing) => (existing.id === ticket.id ? ticket : existing))
        ),
        selectedTicket:
          state.selectedTicket && state.selectedTicket.id === ticket.id
            ? ticket
            : state.selectedTicket
      }));
    });

    socket.on('message:new', (payload: MessageSocketPayload) => {
      if (!payload.ticketId) return;
      const message = normalizeMessage(payload, payload.ticketId);

      set((state) => {
        const currentMessages = state.messagesByTicket[payload.ticketId] ?? [];
        const nextMessages = sortByCreatedAtAsc(upsertMessage(currentMessages, message));

        const isFromAgent = Boolean(payload.userId);
        const isCurrentTicket = state.selectedTicket?.id === payload.ticketId;

        const tickets = reorderTicketsByLastMessage(
          syncTicketsAfterMessages(state.tickets, payload.ticketId, nextMessages).map((ticket) => {
            if (ticket.id !== payload.ticketId) return ticket;
            return {
              ...ticket,
              unreadMessages:
                isCurrentTicket || isFromAgent ? 0 : ticket.unreadMessages + 1,
              lastMessageAt: message.createdAt
            };
          })
        );

        const updatedSelected = syncSelectedTicketAfterMessages(
          state.selectedTicket,
          payload.ticketId,
          nextMessages
        );

        const selectedTicket =
          updatedSelected && updatedSelected.id === payload.ticketId
            ? { ...updatedSelected, unreadMessages: 0 }
            : updatedSelected;

        return {
          tickets,
          selectedTicket,
          messagesByTicket: {
            ...state.messagesByTicket,
            [payload.ticketId]: nextMessages
          },
          messagesLoaded: { ...state.messagesLoaded, [payload.ticketId]: true }
        };
      });
    });

    socket.on('message:update', (payload: MessageSocketPayload) => {
      if (!payload.ticketId) return;
      const message = normalizeMessage(payload, payload.ticketId);

      set((state) => {
        const currentMessages = state.messagesByTicket[payload.ticketId] ?? [];
        const nextMessages = sortByCreatedAtAsc(upsertMessage(currentMessages, message));

        return {
          tickets: syncTicketsAfterMessages(state.tickets, payload.ticketId, nextMessages),
          selectedTicket: syncSelectedTicketAfterMessages(state.selectedTicket, payload.ticketId, nextMessages),
          messagesByTicket: {
            ...state.messagesByTicket,
            [payload.ticketId]: nextMessages
          },
          messagesLoaded: { ...state.messagesLoaded, [payload.ticketId]: true }
        };
      });
    });

    socket.on('message:delete', ({ ticketId, messageId }: { ticketId: string; messageId: string }) => {
      set((state) => {
        const currentMessages = state.messagesByTicket[ticketId] ?? [];
        const nextMessages = sortByCreatedAtAsc(removeMessageById(currentMessages, messageId));

        return {
          tickets: syncTicketsAfterMessages(state.tickets, ticketId, nextMessages),
          selectedTicket: syncSelectedTicketAfterMessages(state.selectedTicket, ticketId, nextMessages),
          messagesByTicket: {
            ...state.messagesByTicket,
            [ticketId]: nextMessages
          },
          quotedMessage:
            state.quotedMessage && state.quotedMessage.id === messageId ? null : state.quotedMessage,
          messagesLoaded: { ...state.messagesLoaded, [ticketId]: true }
        };
      });
    });

    socket.on(
      'ai:suggestions',
      (payload: { ticketId: string; messageId: string; suggestions: AiSuggestion[] }) => {
        set((state) => ({
          aiSuggestionsByMessage: {
            ...state.aiSuggestionsByMessage,
            [payload.messageId]: payload.suggestions
          }
        }));
      }
    );

    socket.on(
      'ai:chatbotSuggestion',
      (payload: { ticketId: string; messageId: string; reply: AiChatbotReply }) => {
        set((state) => ({
          aiChatbotDrafts: {
            ...state.aiChatbotDrafts,
            [payload.ticketId]: payload.reply
          }
        }));
      }
    );

    socket.on('ai:insights', (payload: { ticketId: string }) => {
      get().fetchTicketInsights(payload.ticketId);
    });

    socket.on('ai:forecast', (payload: DemandForecastPayload) => {
      set({ demandForecast: payload });
    });
  }
}));




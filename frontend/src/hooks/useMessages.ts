import { useCallback, useEffect, useMemo } from 'react';
import {
  EditMessagePayload,
  SendMessagePayload,
  TicketMessage,
  useTicketStore
} from '@/store/ticketStore';

type UseMessagesOptions = {
  ticketId?: string | null;
  autoLoad?: boolean;
};

type UseMessagesResult = {
  messages: TicketMessage[];
  isLoaded: boolean;
  quotedMessage: TicketMessage | null;
  ensureLoaded: (force?: boolean) => Promise<void>;
  sendMessage: (payload: Omit<SendMessagePayload, 'ticketId'>) => Promise<TicketMessage | null>;
  editMessage: (payload: Omit<EditMessagePayload, 'ticketId'>) => Promise<TicketMessage | null>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, reactionId: string) => Promise<void>;
  setQuotedMessage: (message: TicketMessage | null) => void;
};

export const useMessages = ({ ticketId, autoLoad = true }: UseMessagesOptions): UseMessagesResult => {
  const {
    messagesByTicket,
    messagesLoaded,
    loadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    quotedMessage,
    setQuotedMessage
  } = useTicketStore((state) => ({
    messagesByTicket: state.messagesByTicket,
    messagesLoaded: state.messagesLoaded,
    loadMessages: state.loadMessages,
    sendMessage: state.sendMessage,
    editMessage: state.editMessage,
    deleteMessage: state.deleteMessage,
    addReaction: state.addReaction,
    removeReaction: state.removeReaction,
    quotedMessage: state.quotedMessage,
    setQuotedMessage: state.setQuotedMessage
  }));

  const messages = useMemo(
    () => (ticketId ? messagesByTicket[ticketId] ?? [] : []),
    [messagesByTicket, ticketId]
  );

  useEffect(() => {
    if (!ticketId || !autoLoad) return;
    loadMessages(ticketId).catch(() => undefined);
  }, [autoLoad, loadMessages, ticketId]);

  const ensureLoaded = useCallback(
    async (force?: boolean) => {
      if (!ticketId) return;
      await loadMessages(ticketId, { force });
    },
    [loadMessages, ticketId]
  );

  const handleSendMessage = useCallback(
    async (payload: Omit<SendMessagePayload, 'ticketId'>) => {
      if (!ticketId) return null;
      return sendMessage({ ticketId, ...payload });
    },
    [sendMessage, ticketId]
  );

  const handleEditMessage = useCallback(
    async (payload: Omit<EditMessagePayload, 'ticketId'>) => {
      if (!ticketId) return null;
      return editMessage({ ticketId, ...payload });
    },
    [editMessage, ticketId]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!ticketId) return;
      await deleteMessage(ticketId, messageId);
    },
    [deleteMessage, ticketId]
  );

  const handleAddReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!ticketId) return;
      await addReaction(ticketId, messageId, emoji);
    },
    [addReaction, ticketId]
  );

  const handleRemoveReaction = useCallback(
    async (messageId: string, reactionId: string) => {
      if (!ticketId) return;
      await removeReaction(ticketId, messageId, reactionId);
    },
    [removeReaction, ticketId]
  );

  return {
    messages,
    isLoaded: ticketId ? Boolean(messagesLoaded[ticketId]) : false,
    quotedMessage,
    ensureLoaded,
    sendMessage: handleSendMessage,
    editMessage: handleEditMessage,
    deleteMessage: handleDeleteMessage,
    addReaction: handleAddReaction,
    removeReaction: handleRemoveReaction,
    setQuotedMessage
  };
};

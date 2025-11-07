'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ChangeEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import data from '@emoji-mart/data';
import { format } from 'date-fns';
import {
  Send,
  Paperclip,
  Smile,
  MessageSquare,
  Tag as TagIcon,
  Mic,
  RotateCcw,
  Download,
  Loader2,
  Sparkles,
  Zap,
  X,
  Lock,
  Unlock,
  Clock3,
  Flag
} from 'lucide-react';
import { useTicketStore, TicketMessage, MessageChannel } from '@/store/ticketStore';
import { useMetadataStore } from '@/store/metadataStore';
import { useMessages } from '@/hooks/useMessages';
import { useAvatar } from '@/hooks/useAvatar';
import { useAuthStore } from '@/store/authStore';
import { useContactStore } from '@/store/contactStore';
import { useScheduledMessageStore } from '@/store/scheduledMessageStore';
import { MessageItem } from '@/components/chat/MessageItem';
import { QuickReplyModal } from '@/components/chat/QuickReplyModal';
import { ChatExportModal } from '@/components/chat/ChatExportModal';
import { useQuickReplyStore } from '@/store/quickReplyStore';
import ScheduledMessageSection from '@/components/chat/ScheduledMessageSection';
import {
  TICKET_PRIORITY_OPTIONS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS
} from '@/constants/ticketPriority';

const EmojiPicker = dynamic(() => import('@emoji-mart/react'), { ssr: false });

type MessageEditModalProps = {
  message: TicketMessage;
  value: string;
  isPrivate: boolean;
  canTogglePrivate: boolean;
  submitting: boolean;
  onChange: (value: string) => void;
  onTogglePrivate: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
};

function MessageEditModal({
  message,
  value,
  isPrivate,
  canTogglePrivate,
  submitting,
  onChange,
  onTogglePrivate,
  onClose,
  onConfirm
}: MessageEditModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Editar mensagem</h3>
            <p className="text-sm text-gray-500">Atualize o conteudo ou a visibilidade desta mensagem.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Conteudo</label>
            <textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Atualize o texto da mensagem..."
            />
          </div>

          {canTogglePrivate && (
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(event) => onTogglePrivate(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40"
              />
              Converter em nota interna (visivel apenas para a equipe)
            </label>
          )}

          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
            <span>ID: {message.id.slice(0, 8)}...</span>
            <span>{format(new Date(message.createdAt), 'dd/MM/yyyy HH:mm')}</span>
          </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
                disabled={submitting}
              >
                {submitting ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}

type MessageDeleteModalProps = {
  message: TicketMessage;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function MessageDeleteModal({ message, deleting, onClose, onConfirm }: MessageDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Remover mensagem</h3>
            <p className="text-sm text-gray-500">A mensagem sera removida para todos os participantes.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            <p className="font-semibold">Conteudo selecionado</p>
            <p className="mt-2 whitespace-pre-wrap text-xs text-red-700">
              {message.body || 'Mensagem sem texto (apenas midia)'}
            </p>
          </div>

          <p className="text-xs text-gray-500">
            Esta ação nao pode ser desfeita. Arquivos anexos tambem serao excluidos do servidor.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              disabled={deleting}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-400"
              disabled={deleting}
            >
              {deleting ? 'Removendo...' : 'Remover mensagem'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ScheduledMessagesModalProps = {
  open: boolean;
  ticketId: string;
  contactName: string;
  onClose: () => void;
};

function ScheduledMessagesModal({ open, ticketId, contactName, onClose }: ScheduledMessagesModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-10">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Mensagens agendadas</h3>
            <p className="text-sm text-gray-500">Gerencie os envios programados para {contactName}.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <ScheduledMessageSection ticketId={ticketId} contactName={contactName} />
        </div>
      </div>
    </div>
  );
}

export default function ChatArea() {
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id;
  const isAdmin = currentUser?.role === 'ADMIN';

  const {
    selectedTicket,
    updateTicketDetails,
    addTicketTags,
    removeTicketTag,
    aiSuggestionsByMessage,
    aiChatbotDrafts,
    regenerateSuggestions,
    previewChatbotReply
  } = useTicketStore((state) => ({
    selectedTicket: state.selectedTicket,
    updateTicketDetails: state.updateTicketDetails,
    addTicketTags: state.addTicketTags,
    removeTicketTag: state.removeTicketTag,
    aiSuggestionsByMessage: state.aiSuggestionsByMessage,
    aiChatbotDrafts: state.aiChatbotDrafts,
    regenerateSuggestions: state.regenerateSuggestions,
    previewChatbotReply: state.previewChatbotReply
  }));

  const { reactionPalette, tags, fetchTags } = useMetadataStore((state) => ({
    reactionPalette: state.reactionPalette,
    tags: state.tags,
    fetchTags: state.fetchTags
  }));

  const { selectedContact, updateContact } = useContactStore((state) => ({
    selectedContact: state.selectedContact,
    updateContact: state.updateContact
  }));

  const { itemsByTicket: scheduledByTicket, fetchScheduledMessages } = useScheduledMessageStore((state) => ({
    itemsByTicket: state.itemsByTicket,
    fetchScheduledMessages: state.fetchScheduledMessages
  }));

  const {
    fetchQuickReplies: loadQuickReplies,
    fetchVariables: loadQuickReplyVariables
  } = useQuickReplyStore((state) => ({
    fetchQuickReplies: state.fetchQuickReplies,
    fetchVariables: state.fetchVariables
  }));

  const {
    messages,
    isLoaded: messagesLoaded,
    ensureLoaded,
    sendMessage: sendMessageAction,
    editMessage: editMessageAction,
    deleteMessage: deleteMessageAction,
    addReaction: addReactionAction,
    removeReaction: removeReactionAction,
    quotedMessage,
    setQuotedMessage
  } = useMessages({ ticketId: selectedTicket?.id });

  const visibleMessages = useMemo(() => messages, [messages]);
  const quotedComposerSource =
    quotedMessage?.deliveryMetadata && typeof quotedMessage.deliveryMetadata['source'] === 'string'
      ? (quotedMessage.deliveryMetadata['source'] as string)
      : undefined;
  const quotedComposerAuthor =
    (quotedComposerSource ?? '').toUpperCase() === 'CHATBOT'
      ? 'KOVINHO 🤖'
      : selectedTicket?.contact.name ?? 'Contato';

  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isQuickReplyModalOpen, setQuickReplyModalOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRegeneratingSuggestions, setIsRegeneratingSuggestions] = useState(false);
  const [isAiSuggestionsVisible, setIsAiSuggestionsVisible] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [scheduledModalOpen, setScheduledModalOpen] = useState(false);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<TicketMessage | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [editingPrivate, setEditingPrivate] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [processingBlockToggle, setProcessingBlockToggle] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);


  const scheduledMessages = useMemo(() => {
    if (!selectedTicket) return [];
    return scheduledByTicket[selectedTicket.id] ?? [];
  }, [scheduledByTicket, selectedTicket]);

  const hasScheduledMessages = scheduledMessages.length > 0;

  const contactEmail = (
    selectedContact?.email ?? selectedTicket?.contact.email ?? ''
  ).trim();
  const contactBlocked = selectedContact?.isBlocked ?? false;
  const activeTagIds = useMemo(
    () => selectedTicket?.tags.map((relation) => relation.tag.id) ?? [],
    [selectedTicket?.tags]
  );

  const activeChannel = useMemo<MessageChannel>(() => {
    if (isPrivate) {
      return 'WHATSAPP';
    }
    const channel = selectedTicket?.type ?? 'WHATSAPP';
    return channel as MessageChannel;
  }, [isPrivate, selectedTicket?.type]);

  const isTicketClosed = selectedTicket?.status === 'CLOSED';
  const disableTicketAdjustments = contactBlocked || isTicketClosed;
  const currentPriority = selectedTicket?.priority ?? 'LOW';
  const priorityLabel = TICKET_PRIORITY_LABELS[currentPriority] ?? currentPriority;
  const priorityIndicatorClass = TICKET_PRIORITY_COLORS[currentPriority] ?? 'bg-gray-300';
  const conversationLocked = isTicketClosed || contactBlocked;
  const conversationLockedMessage = contactBlocked ? 'Contato bloqueado.' : 'Atendimento encerrado.';
  useEffect(() => {
    setBlockModalOpen(false);
    setProcessingBlockToggle(false);
  }, [selectedContact?.id]);
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);
  useEffect(() => {
    setShowPriorityMenu(false);
    setIsTagMenuOpen(false);
  }, [selectedTicket?.id]);
  useEffect(() => {
    if (!showPriorityMenu && !isTagMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (showPriorityMenu) {
        const menu = priorityMenuRef.current;
        const button = priorityButtonRef.current;
        if (menu && !menu.contains(target) && (!button || !button.contains(target))) {
          setShowPriorityMenu(false);
        }
      }

      if (isTagMenuOpen) {
        const menu = tagMenuRef.current;
        const button = tagButtonRef.current;
        if (menu && !menu.contains(target) && (!button || !button.contains(target))) {
          setIsTagMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPriorityMenu, isTagMenuOpen]);
  const [messageToDelete, setMessageToDelete] = useState<TicketMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const latestCustomerMessage = useMemo(() => {
    if (!selectedTicket || visibleMessages.length === 0) {
      return null;
    }
    for (let index = visibleMessages.length - 1; index >= 0; index -= 1) {
      const candidate = visibleMessages[index];
      if (!candidate.userId && !candidate.isPrivate && candidate.body && candidate.body.trim().length > 0) {
        return candidate;
      }
    }
    return null;
  }, [visibleMessages, selectedTicket]);

  const aiSuggestions = useMemo(
    () =>
      latestCustomerMessage ? aiSuggestionsByMessage[latestCustomerMessage.id] ?? [] : [],
    [aiSuggestionsByMessage, latestCustomerMessage]
  );

  const chatbotDraft = useMemo(
    () => (selectedTicket ? aiChatbotDrafts[selectedTicket.id] : undefined),
    [aiChatbotDrafts, selectedTicket]
  );
  const hasAiSuggestions = aiSuggestions.length > 0;
  const customerMessagePreview = latestCustomerMessage?.body
    ? latestCustomerMessage.body.length > 160
      ? `${latestCustomerMessage.body.slice(0, 160)}...`
      : latestCustomerMessage.body
    : '';
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldDiscardRecordingRef = useRef(false);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priorityButtonRef = useRef<HTMLButtonElement | null>(null);
  const priorityMenuRef = useRef<HTMLDivElement | null>(null);
  const tagButtonRef = useRef<HTMLButtonElement | null>(null);
  const tagMenuRef = useRef<HTMLDivElement | null>(null);

  const exportPreview = useMemo(
    () =>
      messages.slice(-5).map((message) => ({
        id: message.id,
        author: message.user ? message.user.name : selectedTicket?.contact.name ?? 'Contato',
        createdAt: message.createdAt,
        snippet: (message.body ?? '').slice(0, 200),
        isPrivate: message.isPrivate,
        hasMedia: Boolean(message.mediaUrl)
      })),
    [messages, selectedTicket?.contact.name]
  );

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    loadQuickReplyVariables();
  }, [loadQuickReplyVariables]);

  useEffect(() => {
    if (!selectedTicket) return;
    loadQuickReplies({
      queueId: selectedTicket.queue?.id,
      scope: 'available'
    });
  }, [selectedTicket, loadQuickReplies]);

  useEffect(() => {
    if (visibleMessages.length === 0) return;
    scrollToBottom();
  }, [visibleMessages.length, scrollToBottom]);

  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!activeMenuMessageId) return;

    const handleClickOutside = () => {
      setActiveMenuMessageId(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuMessageId]);

  useEffect(() => {
    setIsAiSuggestionsVisible(false);
  }, [selectedTicket?.id]);

  useEffect(() => {
    setScheduledModalOpen(false);
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (!latestCustomerMessage) {
      setIsAiSuggestionsVisible(false);
    }
  }, [latestCustomerMessage]);

  useEffect(() => {
    if (selectedTicket?.status === 'CLOSED') {
      setIsAiSuggestionsVisible(false);
    }
  }, [selectedTicket?.status]);


  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        shouldDiscardRecordingRef.current = true;
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const insertAtCursor = (value: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setNewMessage((prev) => prev + value);
      return;
    }

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;

    setNewMessage((prev) => {
      const before = prev.slice(0, start);
      const after = prev.slice(end);
      return `${before}${value}${after}`;
    });

    requestAnimationFrame(() => {
      const nextCursor = start + value.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
      textarea.focus();
    });
  };

  const handleEmojiSelect = (emoji: { native?: string; emoji?: string }) => {
    const value = emoji?.native ?? emoji?.emoji;
    if (!value) return;
    insertAtCursor(value);
  };

  const formatRecordingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${secs}`;
  };

  const resetRecordingState = () => {
    setIsRecording(false);
    setRecordingTime(0);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    recordingChunksRef.current = [];
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const focusMessage = useCallback(
    (messageId: string) => {
      const attemptFocus = (retries = 0) => {
        const element = document.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
        if (!element) {
          if (retries < 5) {
            setTimeout(() => attemptFocus(retries + 1), 120);
          }
          return;
        }

        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMessageId(messageId);
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightedMessageId((current) => (current === messageId ? null : current));
        }, 2200);
      };

      attemptFocus();
    },
    []
  );

  const stopRecording = useCallback(
    (discard = false) => {
      if (!mediaRecorderRef.current) return;
      shouldDiscardRecordingRef.current = discard;
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    },
    []
  );

  const handleToggleRecording = async () => {
    if (conversationLocked) {
      toast.error(conversationLockedMessage);
      return;
    }
    if (!isPrivate && activeChannel !== 'WHATSAPP') {
      toast.error('Gravacao disponivel apenas para WhatsApp.');
      return;
    }

    if (isRecording) {
      stopRecording(false);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.error('Gravacao de audio nao suportada neste navegador.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        options.mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      }
      
      const recorder = new MediaRecorder(stream, options);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      shouldDiscardRecordingRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const shouldDiscard = shouldDiscardRecordingRef.current;
        const chunks = [...recordingChunksRef.current];
        resetRecordingState();
        shouldDiscardRecordingRef.current = false;

        if (shouldDiscard) {
          return;
        }

        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });

        if (blob.size === 0) {
          toast.error('Nenhum audio gravado.');
          return;
        }

        const extension = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const audioFile = new File([blob], `audio-${Date.now()}.${extension}`, { type: mimeType });

        setUploadingFile(true);
        setUploadProgress(0);

        try {
          await sendMessageAction({
            mediaFile: audioFile,
            isPrivate,
            quotedMsgId: quotedMessage?.id ?? null,
            type: 'AUDIO',
            channel: activeChannel,
            onUploadProgress: (progress) => setUploadProgress(progress)
          });
          toast.success(isPrivate ? 'Nota interna por audio criada' : 'Audio enviado');
        } catch (error) {
          console.error('Erro ao enviar audio gravado:', error);
          toast.error('Falha ao enviar audio');
        } finally {
          setUploadingFile(false);
          setUploadProgress(null);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((previous) => previous + 1);
      }, 1000);
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      resetRecordingState();
      toast.error('Nao foi possivel acessar o microfone');
    }
  };

  const sendCurrentMessage = useCallback(async () => {
    if (!selectedTicket || isSending) return;
    const trimmed = newMessage.trim();
    if (!trimmed) return;

    setIsSending(true);
    try {
      await sendMessageAction({
        body: trimmed,
        isPrivate,
        quotedMsgId: quotedMessage?.id ?? null,
        channel: !isPrivate ? activeChannel : undefined
      });
      setNewMessage('');
      setShowEmojiPicker(false);
      setQuickReplyModalOpen(false);
      if (isPrivate) {
        toast.success('Nota interna criada');
      } else {
        toast.success('Mensagem enviada');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Falha ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  }, [selectedTicket, isSending, newMessage, sendMessageAction, isPrivate, quotedMessage, activeChannel]);

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (conversationLocked) {
      toast.error(conversationLockedMessage);
      return;
    }
    await sendCurrentMessage();
  };

  const handleFileButtonClick = () => {
    if (conversationLocked) {
      toast.error(conversationLockedMessage);
      return;
    }
    if (!selectedTicket) return;
    if (!isPrivate && activeChannel !== 'WHATSAPP') {
      toast.error('Envio de arquivos disponivel apenas para WhatsApp.');
      return;
    }
    setShowEmojiPicker(false);
    setQuickReplyModalOpen(false);
    fileInputRef.current?.click();
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      void sendCurrentMessage();
      return;
    }

    if (
      event.key === '/' &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      const { selectionStart } = event.currentTarget;
      const textBefore = event.currentTarget.value.slice(0, selectionStart);
      if (textBefore.trim().length === 0) {
        event.preventDefault();
        setQuickReplyModalOpen(true);
        setShowEmojiPicker(false);
      }
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedTicket) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isPrivate && activeChannel !== 'WHATSAPP') {
      toast.error('Envio de arquivos disponivel apenas para WhatsApp.');
      return;
    }

    setUploadingFile(true);
    setUploadProgress(0);
    try {
      await sendMessageAction({
        mediaFile: file,
        body: newMessage.trim() || undefined,
        isPrivate,
        quotedMsgId: quotedMessage?.id ?? null,
        onUploadProgress: (progress) => setUploadProgress(progress)
      });
      setNewMessage('');
      setShowEmojiPicker(false);
      setQuickReplyModalOpen(false);
      toast.success(isPrivate ? 'Nota interna anexada' : 'Arquivo enviado');
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      toast.error('Falha ao enviar arquivo');
    } finally {
      event.target.value = '';
      setUploadingFile(false);
      setUploadProgress(null);
    }
  };

  const handleInsertQuickReply = (message: string) => {
    setNewMessage((current) => (current ? `${current}\n${message}` : message));
    setQuickReplyModalOpen(false);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleApplySuggestion = (suggestion: string) => {
    if (conversationLocked) {
      toast.error(conversationLockedMessage);
      return;
    }
    setNewMessage(suggestion);
    setIsPrivate(false);
    setQuickReplyModalOpen(false);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleRegenerateAiSuggestions = async () => {
    if (conversationLocked) {
      toast.error(conversationLockedMessage);
      return;
    }
    if (!selectedTicket || !latestCustomerMessage) {
      toast.error('Nenhuma mensagem do cliente disponivel para sugestao.');
      return;
    }

    setIsRegeneratingSuggestions(true);
    try {
      await regenerateSuggestions(latestCustomerMessage.id, selectedTicket.id);
      toast.success('Sugestoes atualizadas com IA.');
      setIsAiSuggestionsVisible(true);
    } catch (error) {
      console.error('Erro ao regenerar sugestoes de IA:', error);
      toast.error('Nao foi possivel atualizar as sugestoes agora.');
    } finally {
      setIsRegeneratingSuggestions(false);
    }
  };

  const handleGenerateChatbotReply = async () => {
    if (conversationLocked) {
      toast.error(conversationLockedMessage);
      return;
    }
    if (!selectedTicket || !latestCustomerMessage?.body) {
      toast.error('Nenhuma mensagem valida para gerar resposta automatica.');
      return;
    }

    setIsGeneratingDraft(true);
    try {
      const result = await previewChatbotReply(selectedTicket.id, latestCustomerMessage.body);
      setIsAiSuggestionsVisible(true);
      if (result) {
        toast.success('Sugestao de resposta gerada com IA.');
      }
    } catch (error) {
      console.error('Erro ao gerar resposta com IA:', error);
      toast.error('Nao foi possivel gerar uma resposta automatica.');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleOpenScheduledModal = async () => {
    if (!selectedTicket || conversationLocked) {
      if (conversationLocked) {
        toast.error(conversationLockedMessage);
      }
      return;
    }
    setShowEmojiPicker(false);
    setQuickReplyModalOpen(false);
    try {
      await fetchScheduledMessages(selectedTicket.id);
    } catch (error) {
      console.error('Erro ao carregar mensagens agendadas:', error);
      toast.error('Nao foi possivel carregar as mensagens agendadas.');
    }
    setScheduledModalOpen(true);
  };

  const handleConfirmContactBlock = async () => {
    if (!selectedContact) return;
    setProcessingBlockToggle(true);
    try {
      await updateContact(selectedContact.id, { isBlocked: !contactBlocked });
      toast.success(
        contactBlocked ? 'Contato desbloqueado com sucesso.' : 'Contato bloqueado para novos atendimentos.'
      );
      setBlockModalOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar status do contato:', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Nao foi possivel atualizar o status do contato.';
      toast.error(message);
    } finally {
      setProcessingBlockToggle(false);
    }
  };

  const handleUseChatbotDraft = () => {
    if (!chatbotDraft) return;
    handleApplySuggestion(chatbotDraft.message);
  };

  const handleToggleMessageMenu = (messageId: string) => {
    setActiveMenuMessageId((current) => (current === messageId ? null : messageId));
  };

  const handleJumpToMessage = (messageId: string) => {
    ensureLoaded()
      .catch(() => undefined)
      .finally(() => focusMessage(messageId));
  };

  const handleRequestEdit = (message: TicketMessage) => {
    if (!message.body || !['TEXT', 'NOTE'].includes(message.type)) {
      toast.error('Apenas mensagens de texto podem ser editadas.');
      return;
    }

    setEditingMessage(message);
    setEditingBody(message.body ?? '');
    setEditingPrivate(Boolean(message.isPrivate));
    setActiveMenuMessageId(null);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditingBody('');
    setEditingPrivate(false);
    setIsSubmittingEdit(false);
  };

  const handleSubmitEdit = async () => {
    if (!editingMessage) return;
    const trimmed = editingBody.trim();

    if (!trimmed) {
      toast.error('Informe o novo conteudo da mensagem.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await editMessageAction({
        messageId: editingMessage.id,
        body: trimmed,
        isPrivate: editingMessage.type === 'NOTE' ? true : editingPrivate
      });
      toast.success('Mensagem atualizada.');
      handleCancelEdit();
    } catch (error) {
      console.error('Erro ao editar mensagem:', error);
      toast.error('Falha ao editar mensagem.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleRequestDelete = (message: TicketMessage) => {
    setMessageToDelete(message);
    setActiveMenuMessageId(null);
  };

  const handleCancelDelete = () => {
    setMessageToDelete(null);
    setIsDeleting(false);
  };

  const handleConfirmDelete = async () => {
    if (!messageToDelete) return;

    setIsDeleting(true);
    try {
      await deleteMessageAction(messageToDelete.id);
      toast.success('Mensagem removida.');
      handleCancelDelete();
    } catch (error) {
      console.error('Erro ao remover mensagem:', error);
      toast.error('Falha ao remover mensagem.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePriorityChange = async (priority: string) => {
    if (!selectedTicket) return;

    setShowPriorityMenu(false);
    try {
      await updateTicketDetails(selectedTicket.id, { priority });
      toast.success('Prioridade atualizada');
    } catch (error) {
      console.error('Erro ao atualizar prioridade:', error);
      toast.error('Nao foi possivel atualizar a prioridade.');
    }
  };

  const handleToggleTag = async (tagId: string) => {
    if (!selectedTicket) return;
    try {
      if (activeTagIds.includes(tagId)) {
        await removeTicketTag(selectedTicket.id, tagId);
        toast.success('Tag removida do atendimento');
      } else {
        await addTicketTags(selectedTicket.id, [tagId]);
        toast.success('Tag aplicada ao atendimento');
      }
    } catch (error) {
      console.error('Erro ao atualizar tags do ticket:', error);
      toast.error('Nao foi possivel atualizar as tags.');
    }
  };

  const handleExportConversation = () => {
    if (!selectedTicket) return;
    setExportModalOpen(true);
  };

  useEffect(() => {
    if (!selectedTicket) {
      setExportModalOpen(false);
    }
  }, [selectedTicket]);

  const handleQuoteMessage = (message: TicketMessage) => {
    setQuotedMessage(message);
    setActiveMenuMessageId(null);
    setShowEmojiPicker(false);
    setQuickReplyModalOpen(false);
  };

  const handleCancelQuote = () => {
    setQuotedMessage(null);
  };

  const handleToggleReaction = async (message: TicketMessage, emoji: string) => {
    try {
      const existing = message.reactions.find(
        (reaction) => reaction.emoji === emoji && reaction.userId === currentUserId
      );
      if (existing) {
        await removeReactionAction(message.id, existing.id);
      } else {
        await addReactionAction(message.id, emoji);
      }
    } catch (error) {
      console.error('Erro ao registrar reacao:', error);
      toast.error('Nao foi possivel atualizar a reacao');
    }
  };

  const contactAvatar = useAvatar({
    name: selectedTicket?.contact.name,
    avatar: selectedTicket?.contact.avatar,
    identifier: selectedTicket?.contact.phoneNumber
  });

  if (!selectedTicket) {
    return (
      <div className='flex flex-1 items-center justify-center bg-gray-50 transition-colors duration-300 dark:bg-slate-950'>
        <div className='text-center text-gray-500 dark:text-slate-400'>
          <MessageSquare size={64} className='mx-auto mb-4 opacity-40' />
          <p className='text-lg font-semibold'>Selecione um ticket para iniciar o atendimento</p>
          <p className='text-sm text-gray-400 dark:text-slate-500'>Os detalhes da conversa aparecem aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-gray-50 transition-colors duration-300 dark:bg-slate-950">
      <div className="border-b border-gray-200 bg-white px-4 py-2 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full">
              {contactAvatar.hasImage && contactAvatar.src ? (
                <Image
                  src={contactAvatar.src}
                  alt={selectedTicket.contact.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-base font-semibold text-primary"
                  style={{ backgroundColor: contactAvatar.backgroundColor }}
                >
                  {contactAvatar.initials || selectedTicket.contact.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                {selectedTicket.contact.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {selectedTicket.contact.phoneNumber}
              </p>
              {contactEmail && (
                <p className="truncate text-xs text-gray-500 dark:text-slate-400">{contactEmail}</p>
              )}
              <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
                Ticket #{selectedTicket.id.slice(0, 8).toUpperCase()}
              </p>
              {contactBlocked && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                  <Lock size={11} />
                  Contato bloqueado
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="relative">
              <button
                type="button"
                ref={priorityButtonRef}
                disabled={disableTicketAdjustments}
                onClick={() => {
                  if (disableTicketAdjustments) return;
                  setShowPriorityMenu((prev) => !prev);
                  setIsTagMenuOpen(false);
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 ${
                  disableTicketAdjustments ? 'bg-gray-200 text-gray-500' : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                <Flag size={14} />
                <div className="flex items-center gap-1">
                  <span>Prioridade</span>
                  <span className={`h-2 w-2 rounded-full ${priorityIndicatorClass}`} />
                  <span className="hidden text-[11px] font-normal sm:inline">{priorityLabel}</span>
                </div>
              </button>
              {showPriorityMenu && (
                <div
                  ref={priorityMenuRef}
                  className="absolute right-0 top-full z-40 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-2 shadow-xl"
                >
                  {TICKET_PRIORITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handlePriorityChange(option.value)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                    >
                      <span>{option.label}</span>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          TICKET_PRIORITY_COLORS[option.value] ?? 'bg-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                ref={tagButtonRef}
                disabled={disableTicketAdjustments}
                onClick={() => {
                  if (disableTicketAdjustments) return;
                  setIsTagMenuOpen((prev) => !prev);
                  setShowPriorityMenu(false);
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60 ${
                  disableTicketAdjustments ? 'bg-gray-200 text-gray-500' : 'bg-accent text-white hover:bg-accent/80'
                }`}
              >
                <TagIcon size={14} />
                <span>Tags</span>
                {activeTagIds.length > 0 && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
                    {activeTagIds.length}
                  </span>
                )}
              </button>
              {isTagMenuOpen && (
                <div
                  ref={tagMenuRef}
                  className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-2xl"
                >
                  <p className="text-[10px] font-semibold uppercase text-gray-400">Selecione tags</p>
                  <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                    {tags.length === 0 ? (
                      <span className="text-[11px] text-gray-500">Nenhuma tag cadastrada.</span>
                    ) : (
                      tags.map((tag) => {
                        const active = activeTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleToggleTag(tag.id)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[11px] font-semibold transition ${
                              active ? 'bg-primary text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                            #{tag.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportConversation}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Exportar conversa"
              title="Exportar conversa"
            >
              <Download size={14} />
            </button>
            <button
              type="button"
              onClick={() => setBlockModalOpen(true)}
              disabled={!selectedContact || processingBlockToggle}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                contactBlocked
                  ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              }`}
              aria-label={contactBlocked ? 'Desbloquear contato' : 'Bloquear contato'}
              title={contactBlocked ? 'Desbloquear contato' : 'Bloquear contato'}
            >
              {processingBlockToggle ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : contactBlocked ? (
                <Lock size={14} />
              ) : (
                <Unlock size={14} />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className='flex-1 space-y-4 overflow-y-auto bg-gray-100 px-5 py-4 transition-colors duration-300 dark:bg-slate-900'>
        {!messagesLoaded ? (
          <div className='flex h-full items-center justify-center text-sm text-gray-500'>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Carregando conversa...
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className='flex h-full items-center justify-center text-sm text-gray-500'>
            Nenhuma mensagem registrada ainda.
          </div>
        ) : (
          visibleMessages.map((message) => {
            const metadata = (message.deliveryMetadata ?? null) as Record<string, unknown> | null;
            const source =
              metadata && typeof metadata['source'] === 'string'
                ? (metadata['source'] as string)
                : undefined;
            const isBotMessage = (source ?? '').toUpperCase() === 'CHATBOT';
            const isFromAgent = isBotMessage || Boolean(message.userId);
            const author = isBotMessage
              ? 'KOVINHO 🤖'
              : message.user?.name ?? selectedTicket.contact.name;
            const isOwner = Boolean(message.userId && message.userId === currentUserId);
            const canModify = !isBotMessage && (isOwner || Boolean(isAdmin));
            const hasBody = Boolean(message.body && message.body.trim().length > 0);
            const isTextual = hasBody && ['TEXT', 'NOTE'].includes(message.type);
            const canEdit = Boolean(canModify && isTextual);
            const canDelete = Boolean(canModify);
            const isMenuOpen = activeMenuMessageId === message.id;
            const isHighlighted = highlightedMessageId === message.id;

            return (
              <MessageItem
                key={message.id}
                message={message}
                author={author}
                contactName={selectedTicket.contact.name}
                currentUserId={currentUserId ?? undefined}
                isFromAgent={isFromAgent}
                isFromBot={isBotMessage}
                reactionPalette={reactionPalette}
                onQuote={handleQuoteMessage}
                onToggleReaction={handleToggleReaction}
                onToggleMenu={handleToggleMessageMenu}
                onJumpToMessage={handleJumpToMessage}
                onEdit={handleRequestEdit}
                onDelete={handleRequestDelete}
                canEdit={canEdit}
                canDelete={canDelete}
                isMenuOpen={isMenuOpen}
                isHighlighted={isHighlighted}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className='border-t border-gray-200 bg-white px-5 py-4'>
        <div className='mb-2 flex flex-wrap items-center gap-2'>
          {selectedTicket.tags.map((relation) => (
            <span
              key={relation.id}
              className='inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide'
              style={{ backgroundColor: `${relation.tag.color}1A`, color: relation.tag.color }}
            >
              <TagIcon size={12} />
              {relation.tag.name}
            </span>
          ))}
        </div>
        {quotedMessage && (
          <div className='mb-3 flex items-start justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-primary'>
            <div className='pr-4'>
              <p className='font-semibold'>
                {quotedMessage.user?.name ?? quotedComposerAuthor}
              </p>
              <p className='mt-1 opacity-80'>
                {quotedMessage.body || (quotedMessage.mediaUrl ? 'Midia anexada' : 'Mensagem sem texto')}
              </p>
            </div>
            <button
              type='button'
              onClick={handleCancelQuote}
              className='ml-auto text-primary transition hover:text-primary/70'
            >
              <X size={14} />
            </button>
          </div>
        )}

        {isRecording && (
          <div className='mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600'>
            <div className='flex items-center gap-2'>
              <span className='inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500' />
              <span>Gravando audio</span>
              <span className='rounded-full bg-white/80 px-2 py-0.5 text-red-600 shadow'>
                {formatRecordingTime(recordingTime)}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => stopRecording(true)}
                className='rounded-lg border border-red-200 px-3 py-1 font-semibold text-red-500 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60'
                disabled={uploadingFile}
              >
                Cancelar
              </button>
              <button
                type='button'
                onClick={() => stopRecording(false)}
                className='inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1 font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-400'
                disabled={uploadingFile}
              >
                <Mic size={14} />
                Enviar
              </button>
            </div>
          </div>
        )}

        {uploadProgress !== null && (
          <div className='mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3'>
            <div className='flex items-center justify-between text-xs font-semibold text-primary'>
              <span>Enviando midia...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className='mt-2 h-2 w-full rounded-full bg-primary/10'>
              <div
                className='h-2 rounded-full bg-primary transition-all'
                style={{ width: `${Math.min(uploadProgress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {selectedTicket && latestCustomerMessage && isAiSuggestionsVisible && (
          <div className='mb-3 rounded-lg border border-violet-200 bg-violet-50/60 p-3 shadow-sm'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-violet-600'>Sugestoes com IA</p>
                {customerMessagePreview ? (
                  <p className='text-[10px] text-violet-600/80'>
                    Ultima mensagem analisada: &quot;{customerMessagePreview}&quot;
                  </p>
                ) : null}
              </div>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={handleRegenerateAiSuggestions}
                  disabled={conversationLocked || isRegeneratingSuggestions || !latestCustomerMessage.body}
                  className='inline-flex items-center gap-1 rounded-lg border border-violet-300 px-3 py-1 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {isRegeneratingSuggestions ? (
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <RotateCcw size={14} />
                  )}
                  Atualizar
                </button>
              </div>
            </div>

            {hasAiSuggestions ? (
              <div className='mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3'>
                {aiSuggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.text}-${index}`}
                    type='button'
                    onClick={() => handleApplySuggestion(suggestion.text)}
                    className='group h-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-left text-sm text-gray-700 transition hover:border-violet-400 hover:shadow-sm'
                  >
                    <span className='text-[11px] font-semibold uppercase tracking-wide text-violet-500'>
                      Sugestao #{index + 1}
                    </span>
                    <span className='mt-1 block text-sm leading-relaxed text-gray-700'>{suggestion.text}</span>
                    {suggestion.reason && (
                      <span className='mt-2 block text-[11px] text-gray-400'>Motivo: {suggestion.reason}</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className='mt-2 text-[11px] text-violet-700'>
                Nenhuma sugestao disponivel no momento. Gere uma nova sugestao para acelerar a resposta.
              </p>
            )}

            {isAiSuggestionsVisible && chatbotDraft && chatbotDraft.shouldReply && (
              <div className='mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <span className='font-semibold text-emerald-700'>Resposta sugerida pela IA</span>
                  <button
                    type='button'
                    onClick={handleUseChatbotDraft}
                    disabled={conversationLocked}
                    className='inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300'
                  >
                    Usar resposta
                  </button>
                </div>
                <p className='mt-2 text-sm leading-relaxed text-emerald-800'>{chatbotDraft.message}</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSendMessage} className='flex flex-col gap-3'>
          <div className='flex flex-1 gap-3'>
            <div className='relative flex-1'>
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                onKeyDown={(event) => handleTextareaKeyDown(event)}
                rows={isPrivate ? 4 : 3}
                placeholder={
                  conversationLocked
                    ? contactBlocked
                      ? 'Contato bloqueado. Desbloqueie para retomar o atendimento.'
                      : 'Atendimento encerrado'
                    : isPrivate
                    ? 'Escreva uma nota interna...'
                    : 'Digite sua mensagem...'
                }
                disabled={conversationLocked}
                className='h-full min-h-[77px] w-full resize-none rounded-xl border border-gray-300 px-4 pr-12 py-3 text-sm text-gray-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100'
              />
              <button
                type='submit'
                disabled={conversationLocked || isSending || !newMessage.trim()}
                className='absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40'
                aria-label='Enviar mensagem'
                title='Enviar mensagem'
              >
                {isSending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />}
              </button>
            </div>
            <div className='relative grid w-24 grid-cols-2 grid-rows-3 gap-2 justify-items-center'>
              <button
                type='button'
                ref={emojiButtonRef}
                onClick={() => {
                  setShowEmojiPicker((prev) => !prev);
                  setQuickReplyModalOpen(false);
                }}
                disabled={conversationLocked}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${
                  showEmojiPicker ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                } disabled:cursor-not-allowed disabled:opacity-60`}
                title='Emoji'
              >
                <Smile size={18} />
              </button>
              <button
                type='button'
                onClick={handleFileButtonClick}
                disabled={conversationLocked || uploadingFile}
                className='flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60'
                title='Anexar arquivo'
              >
                {uploadingFile ? <Loader2 className='h-4 w-4 animate-spin' /> : <Paperclip size={18} />}
              </button>
              <button
                type='button'
                onClick={handleToggleRecording}
                disabled={conversationLocked || uploadingFile}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${
                  isRecording
                    ? 'border-red-400 bg-red-50 text-red-500 hover:bg-red-100'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                } disabled:cursor-not-allowed disabled:opacity-60`}
                title='Gravar áudio'
              >
                <Mic size={18} />
              </button>
              <button
                type='button'
                onClick={handleOpenScheduledModal}
                disabled={conversationLocked}
                className='relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60'
                title='Agendamentos'
              >
                <Clock3 size={18} />
                {hasScheduledMessages && <span className='absolute right-1 top-1 h-2 w-2 rounded-full bg-primary' />}
              </button>
              <button
                type='button'
                onClick={() => {
                  if (conversationLocked) {
                    toast.error(conversationLockedMessage);
                    return;
                  }
                  setQuickReplyModalOpen(true);
                  setShowEmojiPicker(false);
                }}
                disabled={conversationLocked}
                className='flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white shadow transition hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:bg-amber-300'
                title='Respostas rápidas'
              >
                <Zap className='h-5 w-5' />
              </button>
              <button
                type='button'
                onClick={async () => {
                  if (isGeneratingDraft || !latestCustomerMessage?.body) return;
                  await handleGenerateChatbotReply();
                }}
                disabled={conversationLocked || isGeneratingDraft || !latestCustomerMessage?.body}
                className='flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600 text-white shadow transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:cursor-not-allowed disabled:bg-violet-400'
                title='IA responde'
              >
                {isGeneratingDraft ? <Loader2 className='h-4 w-4 animate-spin' /> : <Sparkles size={16} />}
              </button>

              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className='absolute bottom-0 right-full mr-3 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl'
                >
                  <EmojiPicker data={data} onEmojiSelect={handleEmojiSelect} locale='pt' theme='light' />
                </div>
              )}
            </div>
          </div>

        </form>

        <input ref={fileInputRef} type='file' className='hidden' onChange={handleFileUpload} />
      </div>

      {blockModalOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-10">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {contactBlocked ? 'Desbloquear contato' : 'Bloquear contato'}
                </h3>
                <p className="text-sm text-gray-500">
                  {contactBlocked
                    ? 'O contato voltara a receber notificacoes e mensagens dos agentes.'
                    : 'Nenhuma notificacao sera enviada e o atendimento ficara indisponivel enquanto estiver bloqueado.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!processingBlockToggle) {
                    setBlockModalOpen(false);
                  }
                }}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={processingBlockToggle}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-sm font-semibold text-gray-800">{selectedContact.name}</p>
                <p className="text-xs text-gray-500">{selectedContact.phoneNumber}</p>
              </div>
              <p className="text-sm text-gray-600">
                {contactBlocked
                  ? 'Confirme se deseja restabelecer o atendimento para este contato.'
                  : 'Confirme para bloquear o contato e impedir novas interacoes ate que seja desbloqueado.'}
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBlockModalOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={processingBlockToggle}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmContactBlock}
                  disabled={processingBlockToggle}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    contactBlocked ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
                  }`}
                >
                  {processingBlockToggle ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : contactBlocked ? (
                    <Unlock size={14} />
                  ) : (
                    <Lock size={14} />
                  )}
                  {contactBlocked ? 'Desbloquear' : 'Bloquear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingMessage && (
        <MessageEditModal
          message={editingMessage}
          value={editingBody}
          isPrivate={editingPrivate}
          canTogglePrivate={editingMessage.type === 'TEXT'}
          submitting={isSubmittingEdit}
          onChange={setEditingBody}
          onTogglePrivate={setEditingPrivate}
          onClose={handleCancelEdit}
          onConfirm={handleSubmitEdit}
        />
      )}

      {messageToDelete && (
        <MessageDeleteModal
          message={messageToDelete}
          deleting={isDeleting}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
        />
      )}

      {selectedTicket && (
        <ChatExportModal
          open={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          ticketId={selectedTicket.id}
          contactName={selectedTicket.contact.name}
          initialPreview={exportPreview}
        />
      )}

      {selectedTicket && (
        <ScheduledMessagesModal
          open={scheduledModalOpen}
          ticketId={selectedTicket.id}
          contactName={selectedTicket.contact.name}
          onClose={() => setScheduledModalOpen(false)}
        />
      )}

      <QuickReplyModal
        open={isQuickReplyModalOpen}
        onClose={() => setQuickReplyModalOpen(false)}
        ticketId={selectedTicket?.id}
        queueId={selectedTicket?.queue?.id ?? null}
        onInsert={handleInsertQuickReply}
      />
    </div>
);
}



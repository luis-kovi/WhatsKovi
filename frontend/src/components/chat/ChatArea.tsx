'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import data from '@emoji-mart/data';
import { format } from 'date-fns';
import {
  Send,
  Paperclip,
  Smile,
  MessageSquare,
  Tag as TagIcon,
  StickyNote,
  Mic,
  ChevronDown,
  Plus,
  RotateCcw,
  Download,
  Loader2,
  Sparkles,
  X
} from 'lucide-react';
import { useTicketStore, TicketMessage, MessageChannel } from '@/store/ticketStore';
import { useMetadataStore } from '@/store/metadataStore';
import { useMessages } from '@/hooks/useMessages';
import { useAvatar } from '@/hooks/useAvatar';
import { useAuthStore } from '@/store/authStore';
import { MessageItem } from '@/components/chat/MessageItem';
import { QuickReplyModal } from '@/components/chat/QuickReplyModal';
import { ChatExportModal } from '@/components/chat/ChatExportModal';
import { useQuickReplyStore } from '@/store/quickReplyStore';
import { fetchMultichannelCapabilities, MultichannelCapabilities } from '@/services/multichannel';

const EmojiPicker = dynamic(() => import('@emoji-mart/react'), { ssr: false });

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' }
];

const SENTIMENT_LABELS: Record<'POSITIVE' | 'NEUTRAL' | 'NEGATIVE', string> = {
  POSITIVE: 'Positivas',
  NEUTRAL: 'Neutras',
  NEGATIVE: 'Negativas'
};

const SENTIMENT_STYLES: Record<'POSITIVE' | 'NEUTRAL' | 'NEGATIVE', string> = {
  POSITIVE: 'bg-emerald-100 text-emerald-700',
  NEUTRAL: 'bg-slate-200 text-slate-700',
  NEGATIVE: 'bg-rose-100 text-rose-700'
};

type ChannelOption = {
  value: MessageChannel;
  label: string;
  disabled: boolean;
  reason?: string;
};

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

export default function ChatArea() {
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id;
  const isAdmin = currentUser?.role === 'ADMIN';

  const {
    selectedTicket,
    acceptTicket,
    closeTicket,
    updateTicketDetails,
    addTicketTags,
    removeTicketTag,
    createManualTicket,
    aiSuggestionsByMessage,
    aiChatbotDrafts,
    aiInsightsByTicket,
    regenerateSuggestions,
    previewChatbotReply
  } = useTicketStore((state) => ({
    selectedTicket: state.selectedTicket,
    acceptTicket: state.acceptTicket,
    closeTicket: state.closeTicket,
    updateTicketDetails: state.updateTicketDetails,
    addTicketTags: state.addTicketTags,
    removeTicketTag: state.removeTicketTag,
    createManualTicket: state.createManualTicket,
    aiSuggestionsByMessage: state.aiSuggestionsByMessage,
    aiChatbotDrafts: state.aiChatbotDrafts,
    aiInsightsByTicket: state.aiInsightsByTicket,
    regenerateSuggestions: state.regenerateSuggestions,
    previewChatbotReply: state.previewChatbotReply
  }));

  const { tags, queues, reactionPalette, fetchTags, fetchQueues } = useMetadataStore((state) => ({
    tags: state.tags,
    queues: state.queues,
    reactionPalette: state.reactionPalette,
    fetchTags: state.fetchTags,
    fetchQueues: state.fetchQueues
  }));

  const {
    quickReplies,
    fetchQuickReplies: loadQuickReplies,
    fetchVariables: loadQuickReplyVariables
  } = useQuickReplyStore((state) => ({
    quickReplies: state.quickReplies,
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

  const visibleMessages = useMemo(() => messages.filter((message) => !message.isPrivate), [messages]);


  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [messageChannel, setMessageChannel] = useState<MessageChannel>('WHATSAPP');
  const [isQuickReplyModalOpen, setQuickReplyModalOpen] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showQueueMenu, setShowQueueMenu] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [multichannelCapabilities, setMultichannelCapabilities] = useState<MultichannelCapabilities | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRegeneratingSuggestions, setIsRegeneratingSuggestions] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [creatingFollowUpTicket, setCreatingFollowUpTicket] = useState(false);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<TicketMessage | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [editingPrivate, setEditingPrivate] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const contactEmail = selectedTicket?.contact.email?.trim() ?? '';

  const channelOptions = useMemo<ChannelOption[]>(() => {
    if (isPrivate) {
      return [];
    }

    const options: ChannelOption[] = [{ value: 'WHATSAPP', label: 'WhatsApp', disabled: false }];

    if (!multichannelCapabilities) {
      return options;
    }

    const emailStatus = multichannelCapabilities.email;
    let emailReason: string | undefined;
    if (!emailStatus.enabled) {
      emailReason = 'Canal de e-mail desativado nas configuracoes.';
    } else if (!emailStatus.configured) {
      emailReason = 'Configure o SMTP em Configuracoes > Integracoes.';
    } else if (!contactEmail) {
      emailReason = 'Contato sem e-mail cadastrado.';
    }

    options.push({
      value: 'EMAIL',
      label: 'E-mail',
      disabled: Boolean(emailReason),
      reason: emailReason
    });

    const smsStatus = multichannelCapabilities.sms;
    let smsReason: string | undefined;
    if (!smsStatus.enabled) {
      smsReason = 'Canal de SMS desativado nas configuracoes.';
    } else if (!smsStatus.configured) {
      smsReason = 'Configure o provedor de SMS em Configuracoes > Integracoes.';
    }

    options.push({
      value: 'SMS',
      label: 'SMS',
      disabled: Boolean(smsReason),
      reason: smsReason
    });

    return options;
  }, [contactEmail, isPrivate, multichannelCapabilities]);

  useEffect(() => {
    if (isPrivate) {
      setMessageChannel('WHATSAPP');
    }
  }, [isPrivate]);

  useEffect(() => {
    if (isPrivate) return;
    const currentOption = channelOptions.find((option) => option.value === messageChannel);
    if (!currentOption || currentOption.disabled) {
      setMessageChannel('WHATSAPP');
    }
  }, [channelOptions, isPrivate, messageChannel]);
  const [messageToDelete, setMessageToDelete] = useState<TicketMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const ticketInsights = useMemo(
    () => (selectedTicket ? aiInsightsByTicket[selectedTicket.id] : undefined),
    [aiInsightsByTicket, selectedTicket]
  );

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

  const handleSelectChannelOption = useCallback(
    (channel: MessageChannel) => {
      if (isPrivate) return;
      const option = channelOptions.find((item) => item.value === channel);
      if (!option) return;
      if (option.disabled) {
        if (option.reason) {
          toast.error(option.reason);
        }
        return;
      }
      setMessageChannel(channel);
    },
    [channelOptions, isPrivate]
  );

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

  const activeTagIds = useMemo(
    () => selectedTicket?.tags.map((relation) => relation.tag.id) ?? [],
    [selectedTicket?.tags]
  );

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
    fetchTags();
    fetchQueues();
    loadQuickReplyVariables();
  }, [fetchTags, fetchQueues, loadQuickReplyVariables]);

  useEffect(() => {
    if (!selectedTicket) return;
    loadQuickReplies({
      queueId: selectedTicket.queue?.id,
      scope: 'available'
    });
  }, [selectedTicket, loadQuickReplies]);

  useEffect(() => {
    let mounted = true;

    fetchMultichannelCapabilities()
      .then((data) => {
        if (mounted) {
          setMultichannelCapabilities(data);
        }
      })
      .catch((error) => {
        console.error('Erro ao carregar configuracoes de multicanal:', error);
        toast.error('Nao foi possivel carregar os canais adicionais.');
      });

    return () => {
      mounted = false;
    };
  }, []);

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
    if (!isPrivate && messageChannel !== 'WHATSAPP') {
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
      const recorder = new MediaRecorder(stream);

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

        const extension = mimeType.includes('ogg')
          ? 'ogg'
          : mimeType.includes('mp3')
          ? 'mp3'
          : mimeType.includes('wav')
          ? 'wav'
          : 'webm';

        const audioFile = new File([blob], `audio-${Date.now()}.${extension}`, { type: mimeType });

        setUploadingFile(true);
        setUploadProgress(0);

        try {
          await sendMessageAction({
            mediaFile: audioFile,
            isPrivate,
            quotedMsgId: quotedMessage?.id ?? null,
            type: 'AUDIO',
            channel: 'WHATSAPP',
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

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTicket) return;
    const trimmed = newMessage.trim();
    if (!trimmed) return;

    setIsSending(true);
    try {
        await sendMessageAction({
          body: trimmed,
          isPrivate,
          quotedMsgId: quotedMessage?.id ?? null,
          channel: !isPrivate ? messageChannel : undefined
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
  };

  const handleFileButtonClick = () => {
    if (!selectedTicket) return;
    if (!isPrivate && messageChannel !== 'WHATSAPP') {
      toast.error('Envio de arquivos disponivel apenas para WhatsApp.');
      return;
    }
    setShowEmojiPicker(false);
    setQuickReplyModalOpen(false);
    fileInputRef.current?.click();
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
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
    if (!isPrivate && messageChannel !== 'WHATSAPP') {
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

  const handleAcceptTicket = async () => {
    if (!selectedTicket) return;
    await acceptTicket(selectedTicket.id);
    toast.success('Atendimento aceito');
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    await closeTicket(selectedTicket.id);
    toast.success('Atendimento finalizado');
  };

  const handleCreateFollowUpTicket = async () => {
    if (!selectedTicket || creatingFollowUpTicket) return;

    const phone = selectedTicket.contact.phoneNumber;
    const confirmed = window.confirm(
      `Confirma abertura de um novo ticket de atendimento para o telefone ${phone}?`
    );
    if (!confirmed) return;

    setCreatingFollowUpTicket(true);
    try {
      const tagIds = selectedTicket.tags.map((relation) => relation.tag.id);
      await createManualTicket({
        phoneNumber: selectedTicket.contact.phoneNumber,
        name: selectedTicket.contact.name,
        queueId: selectedTicket.queue?.id ?? undefined,
        priority: selectedTicket.priority,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
        carPlate: selectedTicket.carPlate ?? undefined
      });
      toast.success('Novo ticket criado para este contato.');
    } catch (error) {
      console.error('Erro ao criar novo ticket para contato:', error);
      toast.error('Nao foi possivel criar o novo ticket.');
    } finally {
      setCreatingFollowUpTicket(false);
    }
  };

  const handlePriorityChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedTicket) return;
    const priority = event.target.value;
    await updateTicketDetails(selectedTicket.id, { priority });
    toast.success('Prioridade atualizada');
  };

  const handleQueueChange = async (queueId: string | null) => {
    if (!selectedTicket) return;
    await updateTicketDetails(selectedTicket.id, { queueId });
    toast.success('Fila atualizada');
    setShowQueueMenu(false);
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

  const handleInsertQuickReply = (message: string) => {
    setNewMessage((current) => (current ? `${current}\n${message}` : message));
    setQuickReplyModalOpen(false);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleApplySuggestion = (suggestion: string) => {
    setNewMessage(suggestion);
    setIsPrivate(false);
    setQuickReplyModalOpen(false);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleRegenerateAiSuggestions = async () => {
    if (!selectedTicket || !latestCustomerMessage) {
      toast.error('Nenhuma mensagem do cliente disponível para sugestão.');
      return;
    }

    setIsRegeneratingSuggestions(true);
    try {
      await regenerateSuggestions(latestCustomerMessage.id, selectedTicket.id);
      toast.success('Sugestões atualizadas com IA.');
    } catch (error) {
      console.error('Erro ao regenerar sugestões de IA:', error);
      toast.error('Não foi possível atualizar as sugestões agora.');
    } finally {
      setIsRegeneratingSuggestions(false);
    }
  };

  const handleGenerateChatbotReply = async () => {
    if (!selectedTicket || !latestCustomerMessage?.body) {
      toast.error('Nenhuma mensagem válida para gerar resposta automática.');
      return;
    }

    setIsGeneratingDraft(true);
    try {
      const result = await previewChatbotReply(selectedTicket.id, latestCustomerMessage.body);
      if (result) {
        toast.success('Sugestão de resposta gerada com IA.');
      }
    } catch (error) {
      console.error('Erro ao gerar resposta com IA:', error);
      toast.error('Não foi possível gerar uma resposta automática.');
    } finally {
      setIsGeneratingDraft(false);
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
    <div className='flex flex-1 flex-col bg-gray-50 transition-colors duration-300 dark:bg-slate-950'>
      <div className='flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900'>
        <div className='flex items-center gap-2'>
          <div className='relative h-10 w-10 overflow-hidden rounded-full'>
            {contactAvatar.hasImage && contactAvatar.src ? (
              <Image
                src={contactAvatar.src}
                alt={selectedTicket.contact.name}
                fill
                className='object-cover'
                unoptimized
              />
            ) : (
              <div
                className='flex h-full w-full items-center justify-center text-base font-semibold text-primary'
                style={{ backgroundColor: contactAvatar.backgroundColor }}
              >
                {contactAvatar.initials || selectedTicket.contact.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className='text-sm font-semibold text-gray-800'>{selectedTicket.contact.name}</p>
            <p className='text-xs text-gray-500'>{selectedTicket.contact.phoneNumber}</p>
            <div className='mt-1 flex items-center gap-2'>
              <select
                value={selectedTicket.priority}
                onChange={handlePriorityChange}
                className='rounded-lg border border-gray-300 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Prioridade {option.label}
                  </option>
                ))}
              </select>

              <div className='relative'>
                <button
                  onClick={() => setShowQueueMenu((prev) => !prev)}
                  className='inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 transition hover:bg-gray-100'
                >
                  {selectedTicket.queue ? selectedTicket.queue.name : 'Sem fila'}
                  <ChevronDown size={12} />
                </button>

                {showQueueMenu && (
                  <div className='absolute right-0 z-10 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-2 text-left shadow-lg'>
                    <button
                      onClick={() => handleQueueChange(null)}
                      className='flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs text-left text-gray-600 hover:bg-gray-100'
                    >
                      Remover fila
                    </button>
                    <div className='my-1 border-t border-gray-100' />
                    {queues.map((queue) => (
                      <button
                        key={queue.id}
                        onClick={() => handleQueueChange(queue.id)}
                        className='flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs text-left text-gray-600 hover:bg-gray-100'
                      >
                        <span className='h-2 w-2 rounded-full' style={{ backgroundColor: queue.color }} />
                        {queue.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={() => setIsPrivate((prev) => !prev)}
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              isPrivate
                ? 'border-amber-400 bg-amber-50 text-amber-600 hover:bg-amber-100'
                : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <StickyNote size={14} />
            Nota interna
          </button>

          <button
            onClick={handleExportConversation}
            className='inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100'
          >
            <Download size={14} />
            Exportar
          </button>

          {selectedTicket.status === 'PENDING' && (
            <button
              onClick={handleAcceptTicket}
              className='rounded-lg bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90'
            >
              Aceitar
            </button>
          )}

          {selectedTicket.status === 'OPEN' && (
            <button
              onClick={handleCloseTicket}
              className='rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-600'
            >
              Finalizar
            </button>
          )}

          {selectedTicket.status === 'CLOSED' && (
            <button
              onClick={handleCreateFollowUpTicket}
              disabled={creatingFollowUpTicket}
              className='inline-flex items-center gap-1 rounded-lg border border-primary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {creatingFollowUpTicket ? <Loader2 className='h-4 w-4 animate-spin' /> : <Plus size={14} />}
              Criar novo ticket
            </button>
          )}

        </div>
      </div>

      <div className='flex-1 space-y-4 overflow-y-auto bg-gray-100 px-5 py-4 transition-colors duration-300 dark:bg-slate-900'>
        {ticketInsights && (
          <div className='rounded-2xl border border-primary/20 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:bg-slate-800/60'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-primary'>Resumo inteligente</p>
                {ticketInsights.classification ? (
                  <p className='text-sm text-gray-700 dark:text-gray-200'>
                    Classificação automática:{' '}
                    <span className='font-semibold capitalize text-primary'>
                      {ticketInsights.classification.category.replace(/_/g, ' ')}
                    </span>
                    {typeof ticketInsights.classification.confidence === 'number'
                      ? ` (${Math.round(ticketInsights.classification.confidence * 100)}% confiança)`
                      : ''}
                  </p>
                ) : (
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    Ainda sem classificação automática para este atendimento.
                  </p>
                )}
              </div>
              {ticketInsights.classification?.keywords?.length ? (
                <div className='flex flex-wrap gap-2 text-[11px] font-semibold text-primary'>
                  {ticketInsights.classification.keywords.slice(0, 4).map((keyword) => (
                    <span key={keyword} className='rounded-full bg-primary/10 px-2 py-1'>
                      #{keyword}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            {ticketInsights.sentiment && (
              <div className='mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300'>
                {(['POSITIVE', 'NEUTRAL', 'NEGATIVE'] as const).map((label) => {
                  const count = ticketInsights.sentiment?.totals?.[label] ?? 0;
                  return (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${SENTIMENT_STYLES[label]}`}
                    >
                      {SENTIMENT_LABELS[label]}: {count}
                    </span>
                  );
                })}
                {ticketInsights.sentiment.last && (
                  <span className='ml-auto text-xs font-normal text-gray-500 dark:text-gray-400'>
                    Última análise:{' '}
                    {ticketInsights.sentiment.last.summary
                      ? `"${ticketInsights.sentiment.last.summary}"`
                      : SENTIMENT_LABELS[
                          ticketInsights.sentiment.last.sentiment as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
                        ]}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
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
            const isFromAgent = Boolean(message.userId);
            const author = message.user?.name ?? selectedTicket.contact.name;
            const isOwner = Boolean(message.userId && message.userId === currentUserId);
            const canModify = isOwner || Boolean(isAdmin);
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
        <div className='mb-2 flex flex-wrap items-start justify-between gap-2'>
          <div className='flex flex-wrap items-center gap-2'>
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
          <button
            onClick={() => setShowTagManager((prev) => !prev)}
            className='inline-flex items-center gap-1 rounded-full border border-dashed border-primary px-3 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/10'
          >
            <TagIcon size={12} />
            Gerenciar tags
          </button>
        </div>

        {showTagManager && (
          <div className='mb-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2'>
            <p className='text-[11px] font-semibold uppercase text-gray-500'>Selecione tags para este atendimento</p>
            <div className='mt-2 flex flex-wrap gap-2'>
              {tags.length === 0 ? (
                <span className='text-[11px] text-gray-500'>Nenhuma tag cadastrada.</span>
              ) : (
                tags.map((tag) => {
                  const active = activeTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                        active ? 'bg-primary text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      #{tag.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
        {!isPrivate && channelOptions.length > 1 && (
          <div className='mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-gray-500'>
            <span className='uppercase tracking-wide'>Enviar via</span>
            {channelOptions.map((option) => (
              <button
                key={option.value}
                type='button'
                aria-disabled={option.disabled}
                onClick={() => handleSelectChannelOption(option.value)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                  messageChannel === option.value
                    ? 'border-primary bg-primary text-white shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                } ${option.disabled ? 'cursor-not-allowed opacity-60 hover:bg-transparent' : ''}`}
                title={option.disabled && option.reason ? option.reason : undefined}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
        {quotedMessage && (
          <div className='mb-3 flex items-start justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-primary'>
            <div className='pr-4'>
              <p className='font-semibold'>
                {quotedMessage.user?.name ?? selectedTicket.contact.name}
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

        {selectedTicket && latestCustomerMessage && (
          <div className='mb-3 rounded-lg border border-violet-200 bg-violet-50/60 p-3 shadow-sm'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-violet-600'>Sugestões com IA</p>
                {customerMessagePreview ? (
                  <p className='text-[10px] text-violet-600/80'>
                    Última mensagem analisada: “{customerMessagePreview}”
                  </p>
                ) : null}
              </div>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={handleRegenerateAiSuggestions}
                  disabled={isRegeneratingSuggestions || !latestCustomerMessage.body}
                  className='inline-flex items-center gap-1 rounded-lg border border-violet-300 px-3 py-1 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {isRegeneratingSuggestions ? (
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <RotateCcw size={14} />
                  )}
                  Atualizar
                </button>
                <button
                  type='button'
                  onClick={handleGenerateChatbotReply}
                  disabled={isGeneratingDraft || !latestCustomerMessage.body}
                  className='inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-400'
                >
                  {isGeneratingDraft ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Sparkles size={14} />}
                  Gerar resposta
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
                      Sugestão #{index + 1}
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
                Nenhuma sugestão disponível no momento. Gere uma nova sugestão para acelerar a resposta.
              </p>
            )}

            {chatbotDraft && chatbotDraft.shouldReply && (
              <div className='mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <span className='font-semibold text-emerald-700'>Resposta sugerida pela IA</span>
                  <button
                    type='button'
                    onClick={handleUseChatbotDraft}
                    className='inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-600'
                  >
                    Usar resposta
                  </button>
                </div>
                <p className='mt-2 text-sm leading-relaxed text-emerald-800'>{chatbotDraft.message}</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSendMessage} className='flex items-end gap-3'>
          <div className='relative flex items-center gap-2'>
            <button
              type='button'
              ref={emojiButtonRef}
              onClick={() => {
                setShowEmojiPicker((prev) => !prev);
                setQuickReplyModalOpen(false);
              }}
              className={`flex h-11 w-11 items-center justify-center rounded-lg border text-gray-500 transition ${
                showEmojiPicker ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Smile size={20} />
            </button>
            <button
              type='button'
              onClick={handleFileButtonClick}
              disabled={uploadingFile}
              className='flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {uploadingFile ? <Loader2 className='h-4 w-4 animate-spin' /> : <Paperclip size={20} />}
            </button>
            <button
              type='button'
              onClick={handleToggleRecording}
              disabled={uploadingFile}
              className={`flex h-11 w-11 items-center justify-center rounded-lg border transition ${
                isRecording
                  ? 'border-red-400 bg-red-50 text-red-500 hover:bg-red-100'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-100'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <Mic size={20} />
            </button>

            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className='absolute bottom-14 left-0 z-50 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl'
              >
                <EmojiPicker data={data} onEmojiSelect={handleEmojiSelect} locale='pt' theme='light' />
              </div>
            )}
          </div>

          <div className='relative flex-1'>
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              onKeyDown={(event) => handleTextareaKeyDown(event)}
              rows={isPrivate ? 4 : 3}
              placeholder={isPrivate ? 'Escreva uma nota interna...' : 'Digite sua mensagem...'}
              className='w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
            />
            <button
              type='button'
              onClick={() => {
                setQuickReplyModalOpen(true);
                setShowEmojiPicker(false);
              }}
              className='absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-100'
            >
              Respostas
              {quickReplies.length > 0 && (
                <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary'>
                  {quickReplies.length}
                </span>
              )}
              <ChevronDown size={12} />
            </button>
          </div>

          <button
            type='submit'
            disabled={isSending || !newMessage.trim()}
            className='flex h-11 w-14 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-300'
          >
            {isSending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send size={18} />}
          </button>
        </form>

        <input ref={fileInputRef} type='file' className='hidden' onChange={handleFileUpload} />
      </div>

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





















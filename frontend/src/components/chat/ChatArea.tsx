'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import data from '@emoji-mart/data';
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  MessageSquare,
  Tag as TagIcon,
  StickyNote,
  Mic,
  ChevronDown,
  RotateCcw,
  Download,
  Loader2,
  X
} from 'lucide-react';
import api from '@/services/api';
import { useTicketStore, TicketMessage } from '@/store/ticketStore';
import { useMetadataStore } from '@/store/metadataStore';
import { useMessages } from '@/hooks/useMessages';
import { useAvatar } from '@/hooks/useAvatar';
import { useAuthStore } from '@/store/authStore';
import { MessageItem } from '@/components/chat/MessageItem';

const EmojiPicker = dynamic(() => import('@emoji-mart/react'), { ssr: false });

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' }
];

export default function ChatArea() {
  const currentUserId = useAuthStore((state) => state.user?.id);

  const {
    selectedTicket,
    acceptTicket,
    closeTicket,
    reopenTicket,
    updateTicketDetails
  } = useTicketStore((state) => ({
    selectedTicket: state.selectedTicket,
    acceptTicket: state.acceptTicket,
    closeTicket: state.closeTicket,
    reopenTicket: state.reopenTicket,
    updateTicketDetails: state.updateTicketDetails
  }));

  const {
    tags,
    quickReplies,
    queues,
    reactionPalette,
    fetchTags,
    fetchQuickReplies,
    fetchQueues
  } = useMetadataStore((state) => ({
    tags: state.tags,
    quickReplies: state.quickReplies,
    queues: state.queues,
    reactionPalette: state.reactionPalette,
    fetchTags: state.fetchTags,
    fetchQuickReplies: state.fetchQuickReplies,
    fetchQueues: state.fetchQueues
  }));

  const {
    messages,
    isLoaded: messagesLoaded,
    sendMessage: sendMessageAction,
    addReaction: addReactionAction,
    removeReaction: removeReactionAction,
    quotedMessage,
    setQuotedMessage
  } = useMessages({ ticketId: selectedTicket?.id });

  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showQueueMenu, setShowQueueMenu] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

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

  const activeTagIds = useMemo(
    () => selectedTicket?.tags.map((relation) => relation.tag.id) ?? [],
    [selectedTicket?.tags]
  );

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    fetchTags();
    fetchQuickReplies();
    fetchQueues();
  }, [fetchTags, fetchQuickReplies, fetchQueues]);

  useEffect(() => {
    if (messages.length === 0) return;
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        shouldDiscardRecordingRef.current = true;
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
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
        quotedMsgId: quotedMessage?.id ?? null
      });
      setNewMessage('');
      setShowEmojiPicker(false);
      setShowQuickReplies(false);
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
    setShowEmojiPicker(false);
    setShowQuickReplies(false);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedTicket) return;
    const file = event.target.files?.[0];
    if (!file) return;

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
      setShowQuickReplies(false);
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

  const handleReopenTicket = async () => {
    if (!selectedTicket) return;
    await reopenTicket(selectedTicket.id);
    toast.success('Atendimento reaberto');
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
    const nextTags = activeTagIds.includes(tagId)
      ? activeTagIds.filter((id) => id !== tagId)
      : [...activeTagIds, tagId];

    await updateTicketDetails(selectedTicket.id, { tagIds: nextTags });
    toast.success('Tags atualizadas');
  };

  const handleInsertQuickReply = (message: string) => {
    setNewMessage((current) => (current ? `${current}\n${message}` : message));
    setShowQuickReplies(false);
    setShowEmojiPicker(false);
  };

  const handleExportConversation = async () => {
    if (!selectedTicket) return;
    try {
      const response = await api.get(`/tickets/${selectedTicket.id}/export`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket-${selectedTicket.id}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Exportacao iniciada');
    } catch (error) {
      console.error('Erro ao exportar ticket:', error);
      toast.error('Falha ao exportar conversacao');
    }
  };

  const handleQuoteMessage = (message: TicketMessage) => {
    setQuotedMessage(message);
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
      <div className='flex flex-1 items-center justify-center bg-gray-50'>
        <div className='text-center text-gray-500'>
          <MessageSquare size={64} className='mx-auto mb-4 opacity-40' />
          <p className='text-lg font-semibold'>Selecione um ticket para iniciar o atendimento</p>
          <p className='text-sm text-gray-400'>Os detalhes da conversa aparecem aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col bg-gray-50'>
      <div className='flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4'>
        <div className='flex items-center gap-3'>
          <div className='relative h-12 w-12 overflow-hidden rounded-full'>
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
            <div className='mt-2 flex items-center gap-2'>
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
              onClick={handleReopenTicket}
              className='inline-flex items-center gap-1 rounded-lg border border-primary bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10'
            >
              <RotateCcw size={14} />
              Reabrir
            </button>
          )}

          <button className='flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100'>
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      <div className='flex-1 space-y-4 overflow-y-auto bg-gray-100 px-5 py-4'>
        {!messagesLoaded ? (
          <div className='flex h-full items-center justify-center text-sm text-gray-500'>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Carregando conversa...
          </div>
        ) : messages.length === 0 ? (
          <div className='flex h-full items-center justify-center text-sm text-gray-500'>
            Nenhuma mensagem registrada ainda.
          </div>
        ) : (
          messages.map((message) => {
            const isFromAgent = Boolean(message.userId);
            const author = message.user?.name ?? selectedTicket.contact.name;

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
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className='border-t border-gray-200 bg-white px-5 py-4'>
        <div className='mb-3 flex flex-wrap items-center gap-2'>
          <div className='flex flex-wrap items-center gap-2'>
            {selectedTicket.tags.map((relation) => (
              <span
                key={relation.id}
                className='inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide'
                style={{ backgroundColor: `${relation.tag.color}22`, color: relation.tag.color }}
              >
                <TagIcon size={12} />
                {relation.tag.name}
              </span>
            ))}
            <button
              onClick={() => setShowTagManager((prev) => !prev)}
              className='inline-flex items-center gap-1 rounded-full border border-dashed border-primary px-3 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/10'
            >
              <TagIcon size={12} />
              Gerenciar tags
            </button>
          </div>

          <button
            onClick={() => setIsPrivate((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              isPrivate
                ? 'bg-amber-100 text-amber-600'
                : 'border border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}
          >
            <StickyNote size={12} />
            Nota interna
          </button>
        </div>

        {showTagManager && (
          <div className='mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3 shadow-inner'>
            <p className='text-xs font-semibold uppercase text-gray-500'>Selecione tags para este atendimento</p>
            <div className='mt-2 flex flex-wrap gap-2'>
              {tags.length === 0 ? (
                <span className='text-xs text-gray-500'>Nenhuma tag cadastrada.</span>
              ) : (
                tags.map((tag) => {
                  const active = activeTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
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

        {showQuickReplies && (
          <div className='mb-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl'>
            <p className='text-xs font-semibold uppercase text-gray-500'>Respostas rapidas</p>
            <div className='mt-2 max-h-60 space-y-2 overflow-y-auto'>
              {quickReplies.length === 0 ? (
                <p className='text-xs text-gray-500'>Nenhuma resposta configurada.</p>
              ) : (
                quickReplies.map((reply) => (
                  <button
                    key={reply.id}
                    type='button'
                    onClick={() => handleInsertQuickReply(reply.message)}
                    className='w-full rounded-xl border border-gray-200 px-3 py-2 text-left text-xs text-gray-700 transition hover:border-primary hover:bg-primary/5'
                  >
                    <span className='block font-semibold text-primary'>{reply.shortcut}</span>
                    <span className='mt-1 block'>{reply.message}</span>
                  </button>
                ))
              )}
            </div>
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

        <form onSubmit={handleSendMessage} className='flex items-end gap-3'>
          <div className='relative flex items-center gap-2'>
            <button
              type='button'
              ref={emojiButtonRef}
              onClick={() => {
                setShowEmojiPicker((prev) => !prev);
                setShowQuickReplies(false);
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
              rows={isPrivate ? 4 : 3}
              placeholder={isPrivate ? 'Escreva uma nota interna...' : 'Digite sua mensagem...'}
              className='w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
            />
            <button
              type='button'
              onClick={() => {
                setShowQuickReplies((prev) => !prev);
                setShowEmojiPicker(false);
              }}
              className='absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-100'
            >
              Respostas
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
    </div>
  );
}

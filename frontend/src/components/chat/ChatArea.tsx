'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTicketStore } from '@/store/ticketStore';
import { useMetadataStore } from '@/store/metadataStore';
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Check,
  CheckCheck,
  MessageSquare,
  Tag as TagIcon,
  Hash,
  StickyNote,
  Mic,
  ChevronDown,
  RotateCcw,
  Download,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '@/services/api';
import { getSocket } from '@/services/socket';

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' }
];

type MessagePayload = {
  id: string;
  body: string;
  type: string;
  status: string;
  mediaUrl?: string | null;
  isPrivate?: boolean;
  createdAt: string;
  userId?: string | null;
  user?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
};

const getMediaType = (message: MessagePayload) => {
  const type = message.type?.toUpperCase();
  if (type === 'IMAGE') return 'image';
  if (type === 'VIDEO') return 'video';
  if (type === 'AUDIO') return 'audio';
  return 'file';
};

const resolveMediaSource = (baseUrl: string, mediaUrl?: string | null) => {
  if (!mediaUrl) return null;
  if (/^https?:\/\//.test(mediaUrl)) return mediaUrl;
  return `${baseUrl}${mediaUrl}`;
};

export default function ChatArea() {
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

  const { tags, quickReplies, queues, fetchTags, fetchQuickReplies, fetchQueues } = useMetadataStore((state) => ({
    tags: state.tags,
    quickReplies: state.quickReplies,
    queues: state.queues,
    fetchTags: state.fetchTags,
    fetchQuickReplies: state.fetchQuickReplies,
    fetchQueues: state.fetchQueues
  }));

  const [messages, setMessages] = useState<MessagePayload[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showQueueMenu, setShowQueueMenu] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeTagIds = useMemo(
    () => selectedTicket?.tags.map((relation) => relation.tag.id) ?? [],
    [selectedTicket?.tags]
  );

  const apiBaseUrl = useMemo(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');
    return base;
  }, []);

  useEffect(() => {
    fetchTags();
    fetchQuickReplies();
    fetchQueues();
  }, [fetchTags, fetchQuickReplies, fetchQueues]);

  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }

    loadMessages(selectedTicket.id);
    setShowQuickReplies(false);
    setShowTagManager(false);
    setShowQueueMenu(false);
    setIsPrivate(false);
  }, [selectedTicket?.id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleIncoming = (payload: any) => {
      if (payload.ticketId === selectedTicket?.id) {
        setMessages((prev) => [...prev, payload]);
        scrollToBottom();
      }
    };

    socket.on('message:new', handleIncoming);
    return () => {
      socket.off('message:new', handleIncoming);
    };
  }, [selectedTicket?.id]);

  const loadMessages = async (ticketId: string) => {
    try {
      const response = await api.get(`/messages/${ticketId}`);
      setMessages(response.data);
      scrollToBottom();
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTicket || !newMessage.trim()) return;

    setIsSending(true);
    try {
      await api.post('/messages', {
        ticketId: selectedTicket.id,
        body: newMessage,
        isPrivate
      });
      setNewMessage('');
      if (isPrivate) {
        toast.success('Nota interna criada');
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
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedTicket) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('ticketId', selectedTicket.id);
      formData.append('media', file);
      if (newMessage.trim()) {
        formData.append('body', newMessage.trim());
      }
      if (isPrivate) {
        formData.append('isPrivate', 'true');
      }
      await api.post('/messages', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setNewMessage('');
      toast.success(isPrivate ? 'Nota interna anexada' : 'Arquivo enviado');
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      toast.error('Falha ao enviar arquivo');
    } finally {
      event.target.value = '';
      setUploadingFile(false);
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

  const renderMessageMedia = (message: MessagePayload) => {
    const src = resolveMediaSource(apiBaseUrl, message.mediaUrl);
    if (!src) return null;

    const mediaType = getMediaType(message);

    if (mediaType === 'image') {
      return <img src={src} alt="Midia enviada" className="mt-2 max-h-64 w-full rounded-lg object-cover" />;
    }

    if (mediaType === 'video') {
      return (
        <video controls className="mt-2 w-full rounded-lg">
          <source src={src} />
          Seu navegador nao suporta video.
        </video>
      );
    }

    if (mediaType === 'audio') {
      return (
        <audio controls className="mt-2 w-full">
          <source src={src} />
          Seu navegador nao suporta audio.
        </audio>
      );
    }

    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
      >
        <Paperclip size={14} />
        Baixar arquivo
      </a>
    );
  };

  if (!selectedTicket) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <MessageSquare size={64} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-semibold">Selecione um ticket para iniciar o atendimento</p>
          <p className="text-sm text-gray-400">Os detalhes da conversa aparecem aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            {selectedTicket.contact.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{selectedTicket.contact.name}</p>
            <p className="text-xs text-gray-500">{selectedTicket.contact.phoneNumber}</p>
            <div className="mt-2 flex items-center gap-2">
              <select
                value={selectedTicket.priority}
                onChange={handlePriorityChange}
                className="rounded-lg border border-gray-300 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Prioridade {option.label}
                  </option>
                ))}
              </select>

              <div className="relative">
                <button
                  onClick={() => setShowQueueMenu((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 transition hover:bg-gray-100"
                >
                  <Hash size={14} />
                  {selectedTicket.queue ? selectedTicket.queue.name : 'Sem fila'}
                  <ChevronDown size={12} />
                </button>

                {showQueueMenu && (
                  <div className="absolute left-0 z-30 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                    <button
                      onClick={() => handleQueueChange(null)}
                      className="w-full rounded-lg px-2 py-1 text-xs text-left text-gray-600 hover:bg-gray-100"
                    >
                      Remover fila
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    {queues.map((queue) => (
                      <button
                        key={queue.id}
                        onClick={() => handleQueueChange(queue.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs text-left text-gray-600 hover:bg-gray-100"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: queue.color }} />
                        {queue.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportConversation}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            <Download size={14} />
            Exportar
          </button>

          {selectedTicket.status === 'PENDING' && (
            <button
              onClick={handleAcceptTicket}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90"
            >
              Aceitar
            </button>
          )}

          {selectedTicket.status === 'OPEN' && (
            <button
              onClick={handleCloseTicket}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-600"
            >
              Finalizar
            </button>
          )}

          {selectedTicket.status === 'CLOSED' && (
            <button
              onClick={handleReopenTicket}
              className="inline-flex items-center gap-1 rounded-lg border border-primary bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
            >
              <RotateCcw size={14} />
              Reabrir
            </button>
          )}

          <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-gray-100 px-5 py-4">
        {messages.map((message) => {
          const isFromAgent = Boolean(message.userId);
          return (
            <div key={message.id} className={`flex ${isFromAgent ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                  isFromAgent ? 'bg-primary text-white' : 'bg-white text-gray-800'
                }`}
              >
                {message.isPrivate && (
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide">
                    <StickyNote size={12} />
                    Nota interna
                  </div>
                )}

                {message.body && <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>}

                {renderMessageMedia(message)}

                <div className="mt-2 flex items-center justify-end gap-1 text-[10px] opacity-75">
                  <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
                  {isFromAgent && (
                    <span>{message.status === 'READ' ? <CheckCheck size={14} /> : <Check size={14} />}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 bg-white px-5 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {selectedTicket.tags.map((relation) => (
              <span
                key={relation.id}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
                style={{ backgroundColor: `${relation.tag.color}22`, color: relation.tag.color }}
              >
                <TagIcon size={12} />
                {relation.tag.name}
              </span>
            ))}
            <button
              onClick={() => setShowTagManager((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary px-3 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/10"
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
          <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3 shadow-inner">
            <p className="text-xs font-semibold uppercase text-gray-500">Selecione tags para este atendimento</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <span className="text-xs text-gray-500">Nenhuma tag cadastrada.</span>
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
          <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl">
            <p className="text-xs font-semibold uppercase text-gray-500">Respostas rapidas</p>
            <div className="mt-2 max-h-60 space-y-2 overflow-y-auto">
              {quickReplies.length === 0 ? (
                <p className="text-xs text-gray-500">Nenhuma resposta configurada.</p>
              ) : (
                quickReplies.map((reply) => (
                  <button
                    key={reply.id}
                    type="button"
                    onClick={() => handleInsertQuickReply(reply.message)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-left text-xs text-gray-700 transition hover:border-primary hover:bg-primary/5"
                  >
                    <span className="block font-semibold text-primary">{reply.shortcut}</span>
                    <span className="mt-1 block">{reply.message}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100"
            >
              <Smile size={20} />
            </button>
            <button
              type="button"
              onClick={handleFileButtonClick}
              disabled={uploadingFile}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip size={20} />}
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100"
            >
              <Mic size={20} />
            </button>
          </div>

          <div className="relative flex-1">
            <textarea
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              rows={isPrivate ? 4 : 3}
              placeholder={isPrivate ? 'Escreva uma nota interna...' : 'Digite sua mensagem...'}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => setShowQuickReplies((prev) => !prev)}
              className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Respostas
              <ChevronDown size={12} />
            </button>
          </div>

          <button
            type="submit"
            disabled={isSending || !newMessage.trim()}
            className="flex h-11 w-14 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={18} />}
          </button>
        </form>

        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
      </div>
    </div>
  );
}

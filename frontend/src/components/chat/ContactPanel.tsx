'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { StickyNote, Plus, X, Clock3, Phone, Tags, ChevronRight, Lock, Unlock } from 'lucide-react';

import { useTicketStore } from '@/store/ticketStore';
import { useContactStore, ContactInternalNote, ContactTicketSummary } from '@/store/contactStore';
import ScheduledMessageSection from '@/components/chat/ScheduledMessageSection';
import { useScheduledMessageStore } from '@/store/scheduledMessageStore';
import { useMetadataStore } from '@/store/metadataStore';

const STATUS_LABELS: Record<string, string> = {
  BOT: 'Chatbot',
  PENDING: 'Pendente',
  OPEN: 'Em atendimento',
  CLOSED: 'Encerrado'
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short'
});

const PANEL_CARD_CLASS =
  'flex h-[150px] flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm';
const PANEL_SCROLL_WRAPPER = 'mt-2 flex-1 overflow-hidden';
const PANEL_SCROLL_AREA = 'h-full space-y-1.5 overflow-y-auto pr-1';

const SCHEDULE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativa',
  PAUSED: 'Pausada',
  COMPLETED: 'Concluida',
  CANCELLED: 'Cancelada'
};

const SCHEDULE_STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-600',
  PAUSED: 'bg-amber-100 text-amber-600',
  COMPLETED: 'bg-slate-200 text-slate-600',
  CANCELLED: 'bg-rose-100 text-rose-600'
};

const RECURRENCE_LABELS: Record<string, string> = {
  NONE: 'Unico envio',
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal'
};

const TICKET_STATUS_STYLES: Record<string, string> = {
  BOT: 'bg-indigo-100 text-indigo-600',
  PENDING: 'bg-amber-100 text-amber-600',
  OPEN: 'bg-sky-100 text-sky-600',
  CLOSED: 'bg-slate-200 text-slate-600'
};

const CONNECTION_LABEL: Record<string, string> = {
  CONNECTED: 'Conectado',
  CONNECTING: 'Conectando',
  DISCONNECTED: 'Desconectado'
};

const CONNECTION_COLOR: Record<string, string> = {
  CONNECTED: 'bg-emerald-500',
  CONNECTING: 'bg-amber-400',
  DISCONNECTED: 'bg-gray-400'
};

const numberFormatter = new Intl.NumberFormat('pt-BR');

const formatMetricValue = (value?: number | null, loading?: boolean) => {
  if (loading) return '...';
  if (typeof value !== 'number') return '--';
  return numberFormatter.format(value);
};

const formatDateTime = (isoDate: string) => {
  try {
    return DATE_TIME_FORMATTER.format(new Date(isoDate));
  } catch {
    return '-';
  }
};

type NoteDetailModalProps = {
  note: ContactInternalNote | null;
  contactName: string;
  contactPhone: string;
  onClose: () => void;
};

const NoteDetailModal = ({ note, contactName, contactPhone, onClose }: NoteDetailModalProps) => {
  if (!note) return null;

  const authorName = note.user?.name ?? 'Equipe WhatsKovi';
  const queueName = note.ticket?.queue?.name;
  const ticketStatus = note.ticket?.status ? STATUS_LABELS[note.ticket.status] ?? note.ticket.status : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Detalhes da nota interna</h3>
            <p className="text-sm text-gray-500">Contexto completo da anotacao registrada para este contato.</p>
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
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <StickyNote className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{contactName}</p>
                <p className="text-xs text-gray-500">{contactPhone}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <span className="text-xs font-semibold uppercase text-gray-500">Autor</span>
              <p className="mt-1 text-sm font-medium text-gray-900">{authorName}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <span className="text-xs font-semibold uppercase text-gray-500">Registrada em</span>
              <p className="mt-1 text-sm font-medium text-gray-900">{formatDateTime(note.createdAt)}</p>
            </div>
          </div>

          {(queueName || ticketStatus) && (
            <div className="flex flex-wrap gap-2">
              {queueName && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Tags className="h-3 w-3" />
                  {queueName}
                </span>
              )}
              {ticketStatus && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
                  <Clock3 className="h-3 w-3" />
                  {ticketStatus}
                </span>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <span className="text-xs font-semibold uppercase text-gray-500">Conteudo</span>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{note.body}</p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

type NoteCreateModalProps = {
  open: boolean;
  contactName: string;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
  submitting: boolean;
};

const NoteCreateModal = ({ open, contactName, onClose, onSubmit, submitting }: NoteCreateModalProps) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!open) {
      setContent('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || submitting) return;
    await onSubmit(trimmed);
    setContent('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Nova nota interna</h3>
            <p className="text-sm text-gray-500">
              Registre uma observacao exclusiva para a equipe sobre <strong>{contactName}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Conteudo da nota</label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={5}
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Descreva o contexto, proxima acoes ou informacoes relevantes..."
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
              disabled={submitting || content.trim().length === 0}
            >
              {submitting ? 'Salvando...' : 'Registrar nota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

type NotesHistoryModalProps = {
  open: boolean;
  notes: ContactInternalNote[];
  onClose: () => void;
  onSelect: (note: ContactInternalNote) => void;
};

const NotesHistoryModal = ({ open, notes, onClose, onSelect }: NotesHistoryModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Historico de notas internas</h3>
            <p className="text-sm text-gray-500">Consulte todas as anotacoes registradas para este contato.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-6 py-5">
          {notes.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma nota registrada ate o momento.</p>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => onSelect(note)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-primary/30 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{note.user?.name ?? 'Equipe WhatsKovi'}</p>
                    <p className="mt-1 line-clamp-3 text-sm text-gray-600">{note.body}</p>
                  </div>
                  <div className="text-[11px] font-medium text-gray-500">{formatDateTime(note.createdAt)}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

type TicketHistoryModalProps = {
  open: boolean;
  tickets: ContactTicketSummary[];
  onClose: () => void;
  onSelectTicket: (ticketId: string) => void;
};

const TicketHistoryModal = ({ open, tickets, onClose, onSelectTicket }: TicketHistoryModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Historico de tickets</h3>
            <p className="text-sm text-gray-500">Selecione um ticket para abrir os detalhes completos.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-6 py-5">
          {tickets.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum ticket registrado para este contato.</p>
          ) : (
            tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => onSelectTicket(ticket.id)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-primary/30 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Ticket #{ticket.id.slice(0, 8)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                      <span className='inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5'>
                        <Clock3 className='h-3 w-3' />
                        Atualizado {formatDateTime(ticket.updatedAt)}
                      </span>
                      <span className='inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5'>
                        {STATUS_LABELS[ticket.status] ?? ticket.status}
                      </span>
                      {ticket.queue?.name && (
                        <span className='inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5'>
                          <Tags className='h-3 w-3' />
                          {ticket.queue.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

type ScheduledMessagesModalProps = {
  open: boolean;
  ticketId: string;
  contactName: string;
  onClose: () => void;
};

const ScheduledMessagesModal = ({ open, ticketId, contactName, onClose }: ScheduledMessagesModalProps) => {
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
};

export default function ContactPanel() {
  const { selectedTicket, selectTicket } = useTicketStore((state) => ({
    selectedTicket: state.selectedTicket,
    selectTicket: state.selectTicket
  }));
  const {
    selectedContact,
    loadContact,
    updateContact,
    loading,
    clearSelected,
    notes,
    fetchContactNotes,
    createNote: createContactNote
  } = useContactStore((state) => ({
    selectedContact: state.selectedContact,
    loadContact: state.loadContact,
    updateContact: state.updateContact,
    loading: state.loading,
    clearSelected: state.clearSelected,
    notes: state.notes,
    fetchContactNotes: state.fetchContactNotes,
    createNote: state.createNote
  }));

  const { itemsByTicket: scheduledByTicket, fetchScheduledMessages } = useScheduledMessageStore((state) => ({
    itemsByTicket: state.itemsByTicket,
    fetchScheduledMessages: state.fetchScheduledMessages
  }));

  const { dashboard, connections, loading: metadataLoading } = useMetadataStore((state) => ({
    dashboard: state.dashboard,
    connections: state.connections,
    loading: state.loading
  }));

  const [noteDetail, setNoteDetail] = useState<ContactInternalNote | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [notesHistoryOpen, setNotesHistoryOpen] = useState(false);
  const [ticketHistoryOpen, setTicketHistoryOpen] = useState(false);
  const [scheduledModalOpen, setScheduledModalOpen] = useState(false);

  useEffect(() => {
    if (selectedTicket) {
      const contactId = selectedTicket.contact.id;
      loadContact(contactId);
      fetchContactNotes(contactId).catch(() => undefined);
      fetchScheduledMessages(selectedTicket.id).catch(() => undefined);
      return;
    }
    clearSelected();
  }, [selectedTicket, loadContact, fetchContactNotes, clearSelected, fetchScheduledMessages]);

  const sortedNotes = useMemo(
    () =>
      [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notes]
  );

  const recentTickets = useMemo(() => {
    if (!selectedContact) return [] as ContactTicketSummary[];
    return [...selectedContact.tickets].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [selectedContact]);

  const scheduledMessages = useMemo(() => {
    if (!selectedTicket) return [];
    return scheduledByTicket[selectedTicket.id] ?? [];
  }, [scheduledByTicket, selectedTicket]);

  const connectionInfo = useMemo(() => {
    if (metadataLoading) {
      return {
        label: 'Carregando...',
        detail: '',
        color: 'bg-gray-400'
      };
    }

    if (connections.length === 0) {
      return {
        label: 'Sem conexao',
        detail: 'Adicione uma conexao WhatsApp',
        color: 'bg-gray-400'
      };
    }

    const primary =
      connections.find((connection) => connection.isDefault) ??
      connections.find((connection) => connection.status === 'CONNECTED') ??
      connections[0];

    const label = CONNECTION_LABEL[primary.status] ?? primary.status;
    const color = CONNECTION_COLOR[primary.status] ?? 'bg-gray-400';
    const detail = primary.phoneNumber ? `+${primary.phoneNumber}` : 'Numero nao vinculado';

    return { label, detail, color };
  }, [connections, metadataLoading]);

  const dashboardMetrics = useMemo(
    () => [
      {
        key: 'agents-online',
        label: 'Agentes Online',
        value: formatMetricValue(dashboard?.agents.online ?? null, metadataLoading)
      },
      {
        key: 'tickets-open',
        label: 'Em atendimento',
        value: formatMetricValue(dashboard?.tickets.open ?? null, metadataLoading)
      },
      {
        key: 'tickets-pending',
        label: 'Pendentes',
        value: formatMetricValue(dashboard?.tickets.pending ?? null, metadataLoading)
      },
      {
        key: 'tickets-bot',
        label: 'No Chatbot',
        value: formatMetricValue(dashboard?.tickets.bot ?? null, metadataLoading)
      }
    ],
    [dashboard, metadataLoading]
  );

  const handleToggleBlock = async () => {
    if (!selectedContact) return;
    await updateContact(selectedContact.id, { isBlocked: !selectedContact.isBlocked });
    toast.success(
      selectedContact.isBlocked ? 'Contato desbloqueado com sucesso.' : 'Contato bloqueado para novos atendimentos.'
    );
  };

  const handleCreateNote = async (content: string) => {
    if (!selectedContact) return;
    const trimmed = content.trim();
    if (!trimmed) return;
    try {
      setSavingNote(true);
      await createContactNote(selectedContact.id, trimmed);
      await loadContact(selectedContact.id);
      toast.success('Nota interna registrada.');
      setCreateModalOpen(false);
    } catch (error) {
      console.error('Erro ao registrar nota interna:', error);
      toast.error('Nao foi possivel registrar a nota. Tente novamente.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleOpenTicketFromHistory = async (ticketId: string) => {
    await selectTicket(ticketId);
    setTicketHistoryOpen(false);
  };

  if (!selectedTicket) {
    return (
      <aside className="hidden w-80 flex-col border-l border-gray-200 bg-white p-4 xl:flex">
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          Selecione um ticket para ver detalhes do contato.
        </div>
      </aside>
    );
  }

  const contactName = selectedTicket.contact.name;
  const contactPhone = selectedTicket.contact.phoneNumber;
  return (
    <>
      <aside className="hidden w-96 flex-col gap-4 border-l border-gray-200 bg-white p-5 xl:flex">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Detalhes do contato</h2>
        </div>

        {loading || !selectedContact ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <section className="flex flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Visao geral</h3>
              </header>
              <div className="mt-3 space-y-3">
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <span className="text-[11px] font-semibold uppercase text-gray-500">Status da conexao</span>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <span className={`h-2.5 w-2.5 rounded-full ${connectionInfo.color}`} />
                    {metadataLoading ? '...' : connectionInfo.label}
                  </div>
                  {connectionInfo.detail && !metadataLoading && (
                    <p className="mt-1 text-[11px] text-gray-500">{connectionInfo.detail}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {dashboardMetrics.map((metric) => (
                    <div key={metric.key} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <span className="text-[11px] font-semibold uppercase text-gray-500">{metric.label}</span>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <section className={PANEL_CARD_CLASS}>
              <header className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{contactName}</p>
                  <div className="mt-1 space-y-1 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      {contactPhone}
                    </span>
                    {selectedContact.email && <span className="block break-all">{selectedContact.email}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleBlock}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition ${
                    selectedContact.isBlocked
                      ? 'border-red-300 text-red-600 hover:bg-red-50'
                      : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                  }`}
                  title={selectedContact.isBlocked ? 'Desbloquear contato' : 'Bloquear contato'}
                  aria-label={selectedContact.isBlocked ? 'Desbloquear contato' : 'Bloquear contato'}
                >
                  {selectedContact.isBlocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </button>
              </header>
              <div className={PANEL_SCROLL_WRAPPER}>
                <div className={`${PANEL_SCROLL_AREA} text-[12px] text-gray-600`}>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase text-gray-500">Status do contato</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          selectedContact.isBlocked ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                        }`}
                      >
                        {selectedContact.isBlocked ? 'Bloqueado' : 'Ativo'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase text-gray-500">Status do ticket</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          TICKET_STATUS_STYLES[selectedTicket.status] ?? 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {STATUS_LABELS[selectedTicket.status] ?? selectedTicket.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className={PANEL_CARD_CLASS}>
              <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  Tickets desse contato
                  <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-gray-100 px-2 text-[11px] font-semibold text-gray-600">
                    {recentTickets.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTicketHistoryOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition hover:underline"
                >
                  Historico
                </button>
              </header>
              <div className={PANEL_SCROLL_WRAPPER}>
                <div className={`${PANEL_SCROLL_AREA} text-[11px] text-gray-600`}>
                  {recentTickets.length === 0 ? (
                    <p>Nenhum ticket registrado.</p>
                  ) : (
                    recentTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => handleOpenTicketFromHistory(ticket.id)}
                        className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left transition hover:border-primary/40 hover:bg-primary/5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-800">#{ticket.id.slice(0, 8)}</span>
                          <span className="text-[10px] font-medium text-gray-500">
                            {formatDateTime(ticket.updatedAt)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-500">
                            {STATUS_LABELS[ticket.status] ?? ticket.status}
                          </span>
                          {ticket.queue?.name && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-500">
                              <Tags className="h-3 w-3" />
                              {ticket.queue.name}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className={PANEL_CARD_CLASS}>
              <header className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-800">Notas internas</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNotesHistoryOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition hover:underline"
                  >
                    Historico
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-primary/90"
                  >
                    <Plus className="h-3 w-3" />
                    Nova nota
                  </button>
                </div>
              </header>
              <div className={PANEL_SCROLL_WRAPPER}>
                <div className={`${PANEL_SCROLL_AREA} text-[12px] text-gray-700`}>
                  {sortedNotes.length === 0 ? (
                    <p className="text-[11px] text-gray-500">Sem notas internas.</p>
                  ) : (
                    sortedNotes.map((note) => (
                      <article
                        key={note.id}
                        className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5"
                      >
                        <div className="flex items-center justify-between text-[10px] font-medium text-gray-500">
                          <span>{formatDateTime(note.createdAt)}</span>
                          {note.user?.name && <span className="truncate">por {note.user.name}</span>}
                        </div>
                          <p className="mt-1.5 line-clamp-3 text-[13px] text-gray-700">{note.body}</p>
                        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-gray-500">
                          <div className="flex items-center gap-2">
                            {note.ticket?.id && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                                <Tags className="h-3 w-3" />
                                #{note.ticket.id.slice(0, 6)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setNoteDetail(note)}
                            className="text-[11px] font-semibold text-primary transition hover:underline"
                          >
                            Ver detalhes
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className={PANEL_CARD_CLASS}>
              <header className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-800">Mensagens agendadas</span>
                {scheduledMessages.length > 0 && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                    {scheduledMessages.length}
                  </span>
                )}
              </header>
              <div className={PANEL_SCROLL_WRAPPER}>
                <div className={`${PANEL_SCROLL_AREA} text-[12px] text-gray-700`}>
                  {scheduledMessages.length === 0 ? (
                    <p className="text-[11px] text-gray-500">Nenhuma mensagem agendada.</p>
                  ) : (
                    scheduledMessages.map((schedule) => {
                      const statusClass =
                        SCHEDULE_STATUS_STYLES[schedule.status] ?? 'bg-gray-100 text-gray-600';
                      const statusLabel = SCHEDULE_STATUS_LABELS[schedule.status] ?? schedule.status;
                      const nextRun = schedule.nextRunAt ?? schedule.scheduledFor;
                      const recurrenceLabel = RECURRENCE_LABELS[schedule.recurrence] ?? schedule.recurrence;
                      return (
                        <div
                          key={schedule.id}
                          className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700">
                              {nextRun ? formatDateTime(nextRun) : '-'}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-[13px] text-gray-700">{schedule.body}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                            <span>{recurrenceLabel}</span>
                            <span>{schedule.isPrivate ? 'Interna' : 'Visivel ao cliente'}</span>
                            {schedule.user?.name && <span>por {schedule.user.name}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScheduledModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-primary px-3 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/10"
                >
                  <Plus className="h-3 w-3" />
                  Agendar mensagem
                </button>
                <button
                  type="button"
                  onClick={() => setScheduledModalOpen(true)}
                  disabled={scheduledMessages.length === 0}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Gerenciar agendadas
                </button>
              </div>
            </section>
          </div>
        )}
      </aside>

      <NoteDetailModal note={noteDetail} contactName={contactName} contactPhone={contactPhone} onClose={() => setNoteDetail(null)} />
      <NoteCreateModal
        open={createModalOpen}
        contactName={contactName}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateNote}
        submitting={savingNote}
      />
      <NotesHistoryModal
        open={notesHistoryOpen}
        notes={sortedNotes}
        onClose={() => setNotesHistoryOpen(false)}
        onSelect={(note) => {
          setNoteDetail(note);
          setNotesHistoryOpen(false);
        }}
      />
      <TicketHistoryModal
        open={ticketHistoryOpen}
        tickets={recentTickets}
        onClose={() => setTicketHistoryOpen(false)}
        onSelectTicket={handleOpenTicketFromHistory}
      />
      {selectedTicket && (
        <ScheduledMessagesModal
          open={scheduledModalOpen}
          ticketId={selectedTicket.id}
          contactName={contactName}
          onClose={() => setScheduledModalOpen(false)}
        />
      )}
    </>
  );
}

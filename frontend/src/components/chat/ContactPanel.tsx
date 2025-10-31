'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { StickyNote, Plus, X, Clock3, Phone, User, Tags, ChevronRight, Lock, Unlock } from 'lucide-react';

import { useTicketStore } from '@/store/ticketStore';
import { useContactStore, ContactInternalNote, ContactTicketSummary } from '@/store/contactStore';
import { useMessages } from '@/hooks/useMessages';
import ScheduledMessageSection from '@/components/chat/ScheduledMessageSection';
import { useScheduledMessageStore } from '@/store/scheduledMessageStore';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  OPEN: 'Em atendimento',
  CLOSED: 'Encerrado'
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short'
});

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
  const { selectedContact, loadContact, updateContact, loading, clearSelected } = useContactStore((state) => ({
    selectedContact: state.selectedContact,
    loadContact: state.loadContact,
    updateContact: state.updateContact,
    loading: state.loading,
    clearSelected: state.clearSelected
  }));

  const { sendMessage } = useMessages({ ticketId: selectedTicket?.id, autoLoad: false });

  const { itemsByTicket: scheduledByTicket, fetchScheduledMessages } = useScheduledMessageStore((state) => ({
    itemsByTicket: state.itemsByTicket,
    fetchScheduledMessages: state.fetchScheduledMessages
  }));

  const [noteDetail, setNoteDetail] = useState<ContactInternalNote | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [notesHistoryOpen, setNotesHistoryOpen] = useState(false);
  const [ticketHistoryOpen, setTicketHistoryOpen] = useState(false);
  const [scheduledModalOpen, setScheduledModalOpen] = useState(false);

  useEffect(() => {
    if (selectedTicket) {
      loadContact(selectedTicket.contact.id);
      fetchScheduledMessages(selectedTicket.id).catch(() => undefined);
      return;
    }
    clearSelected();
  }, [selectedTicket, loadContact, clearSelected, fetchScheduledMessages]);

  const internalNotes = useMemo(
    () =>
      [...(selectedContact?.internalNotes ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [selectedContact?.internalNotes]
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

  const latestInternalNote = internalNotes[0] ?? null;

  const handleToggleBlock = async () => {
    if (!selectedContact) return;
    await updateContact(selectedContact.id, { isBlocked: !selectedContact.isBlocked });
    toast.success(
      selectedContact.isBlocked ? 'Contato desbloqueado com sucesso.' : 'Contato bloqueado para novos atendimentos.'
    );
  };

  const handleCreateNote = async (content: string) => {
    if (!selectedTicket || !selectedContact) return;
    try {
      setSavingNote(true);
      await sendMessage({
        body: content,
        isPrivate: true,
        type: 'NOTE'
      });
      toast.success('Nota interna registrada.');
      setCreateModalOpen(false);
      await loadContact(selectedContact.id);
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

  const displayedContactTags = selectedContact?.tags.slice(0, 3) ?? [];
  const remainingContactTags = selectedContact && selectedContact.tags.length > 3
    ? selectedContact.tags.length - displayedContactTags.length
    : 0;

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
            <section className="h-[190px] rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{contactName}</p>
                    <div className="mt-1 flex flex-col gap-1 text-[11px] text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        {contactPhone}
                      </span>
                      {selectedContact.email && <span className="break-all">{selectedContact.email}</span>}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase text-gray-500">Status do contato</span>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                          selectedContact.isBlocked ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                        }`}
                      >
                        {selectedContact.isBlocked ? 'Bloqueado' : 'Ativo'}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Ticket atual: {STATUS_LABELS[selectedTicket.status] ?? selectedTicket.status}
                    </p>
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
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {displayedContactTags.length > 0 ? (
                  <>
                    {displayedContactTags.map((tag) => (
                      <span
                        key={tag.id}
                        className='inline-flex items-center gap-1 rounded-full px-2 py-0.5'
                        style={{ backgroundColor: `${tag.color}15`, color: tag.color }}
                      >
                        <User className='h-3 w-3' />
                        #{tag.name}
                      </span>
                    ))}
                    {remainingContactTags > 0 && (
                      <span className='rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500'>
                        +{remainingContactTags}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[11px] text-gray-500">Nenhuma tag atribuida a este contato.</span>
                )}
              </div>
            </section>

            <section className="h-[170px] rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  Tickets desse contato
                  <span className='inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-gray-100 px-2 text-[11px] font-semibold text-gray-600'>
                    {recentTickets.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTicketHistoryOpen(true)}
                  className='inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition hover:underline'
                >
                  Ver historico completo
                </button>
              </div>
              <div className='mt-3 space-y-2 text-[11px] text-gray-600'>
                {recentTickets.length === 0 ? (
                  <p>Nenhum ticket registrado.</p>
                ) : (
                  recentTickets.slice(0, 2).map((ticket) => (
                    <div key={ticket.id} className='rounded-lg border border-gray-100 bg-gray-50 px-3 py-2'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm font-semibold text-gray-800'>#{ticket.id.slice(0, 8)}</span>
                        <span className='text-[10px] font-medium text-gray-500'>{formatDateTime(ticket.updatedAt)}</span>
                      </div>
                      <div className='mt-1 flex flex-wrap items-center gap-2'>
                        <span className='inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-500'>
                          {STATUS_LABELS[ticket.status] ?? ticket.status}
                        </span>
                        {ticket.queue?.name && (
                          <span className='inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-500'>
                            <Tags className='h-3 w-3' />
                            {ticket.queue.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className='h-[200px] rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-semibold text-gray-800'>Notas internas</span>
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => setNotesHistoryOpen(true)}
                    className='inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition hover:underline'
                  >
                    Ver historico completo
                  </button>
                  <button
                    type='button'
                    onClick={() => setCreateModalOpen(true)}
                    className='inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-primary/90'
                  >
                    <Plus className='h-3 w-3' />
                    Nova nota
                  </button>
                </div>
              </div>
              {latestInternalNote ? (
                <div className='mt-3 space-y-2'>
                  <p className='text-[11px] text-gray-500'>Registrada em {formatDateTime(latestInternalNote.createdAt)}</p>
                  <p className='line-clamp-3 text-sm text-gray-700'>{latestInternalNote.body}</p>
                  <button
                    type='button'
                    onClick={() => setNoteDetail(latestInternalNote)}
                    className='text-[11px] font-semibold text-primary transition hover:underline'
                  >
                    Ver detalhes
                  </button>
                </div>
              ) : (
                <p className='mt-3 text-[11px] text-gray-500'>Sem notas internas.</p>
              )}
            </section>

            <section className='h-[150px] rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-semibold text-gray-800'>Mensagens agendadas</span>
                {scheduledMessages.length > 0 && (
                  <span className='rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600'>
                    {scheduledMessages.length}
                  </span>
                )}
              </div>
              <div className='mt-3 flex flex-wrap items-center gap-2'>
                <button
                  type='button'
                  onClick={() => setScheduledModalOpen(true)}
                  className='inline-flex items-center gap-1 rounded-full border border-primary px-3 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/10'
                >
                  <Plus className='h-3 w-3' />
                  Agendar mensagem
                </button>
                <button
                  type='button'
                  onClick={() => setScheduledModalOpen(true)}
                  disabled={scheduledMessages.length === 0}
                  className='inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60'
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
        notes={internalNotes}
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

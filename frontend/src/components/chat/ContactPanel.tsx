'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  StickyNote,
  Plus,
  X,
  Clock3,
  Tags,
  ChevronRight,
  Flag,
  Layers,
  Tag as TagIcon,
  Lock,
  Unlock,
  Car,
  Loader2
} from 'lucide-react';

import { useTicketStore } from '@/store/ticketStore';
import { useContactStore, ContactInternalNote, ContactTicketSummary } from '@/store/contactStore';
import { useMetadataStore } from '@/store/metadataStore';
import { normalizeCarPlate, isValidCarPlate } from '@/utils/carPlate';

const STATUS_LABELS: Record<string, string> = {
  BOT: 'Chatbot',
  PENDING: 'Pendente',
  OPEN: 'Em atendimento',
  CLOSED: 'Encerrado'
};

const TICKET_STATUS_STYLES: Record<string, string> = {
  BOT: 'bg-indigo-100 text-indigo-600',
  PENDING: 'bg-amber-100 text-amber-600',
  OPEN: 'bg-emerald-100 text-emerald-600',
  CLOSED: 'bg-slate-200 text-slate-600'
};

const TICKET_TYPE_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  EMAIL: 'E-mail',
  SMS: 'SMS'
};

const TICKET_TYPE_STYLES: Record<string, string> = {
  WHATSAPP: 'bg-emerald-100 text-emerald-700',
  EMAIL: 'bg-sky-100 text-sky-600',
  SMS: 'bg-purple-100 text-purple-600'
};

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' }
] as const;

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente'
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-emerald-500',
  MEDIUM: 'bg-amber-400',
  HIGH: 'bg-orange-500',
  URGENT: 'bg-rose-500'
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short'
});

const PANEL_CARD_CLASS =
  'flex h-[150px] flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm';
const PANEL_SCROLL_WRAPPER = 'mt-2 flex-1 overflow-hidden';
const PANEL_SCROLL_AREA = 'h-full space-y-1.5 overflow-y-auto pr-1';

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

export default function ContactPanel() {
  const {
    selectedTicket,
    selectTicket,
    closeTicket,
    acceptTicket,
    updateTicketDetails,
    addTicketTags,
    removeTicketTag
  } = useTicketStore((state) => ({
    selectedTicket: state.selectedTicket,
    selectTicket: state.selectTicket,
    closeTicket: state.closeTicket,
    acceptTicket: state.acceptTicket,
    updateTicketDetails: state.updateTicketDetails,
    addTicketTags: state.addTicketTags,
    removeTicketTag: state.removeTicketTag
  }));
const {
  selectedContact,
  loadContact,
  loading,
  clearSelected,
  notes,
  fetchContactNotes,
  createNote: createContactNote,
  updateContact
  } = useContactStore((state) => ({
  selectedContact: state.selectedContact,
  loadContact: state.loadContact,
  loading: state.loading,
  clearSelected: state.clearSelected,
  notes: state.notes,
    fetchContactNotes: state.fetchContactNotes,
    createNote: state.createNote,
    updateContact: state.updateContact
  }));

  const { tags, queues, fetchTags, fetchQueues } = useMetadataStore((state) => ({
    tags: state.tags,
    queues: state.queues,
    fetchTags: state.fetchTags,
    fetchQueues: state.fetchQueues
  }));

  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showQueueMenu, setShowQueueMenu] = useState(false);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [isCarPlateEditorOpen, setCarPlateEditorOpen] = useState(false);
  const [carPlateInput, setCarPlateInput] = useState('');
  const [carPlateError, setCarPlateError] = useState<string | null>(null);
  const [carPlateSaving, setCarPlateSaving] = useState(false);
  const [blockingContact, setBlockingContact] = useState(false);

  const priorityButtonRef = useRef<HTMLButtonElement | null>(null);
  const priorityMenuRef = useRef<HTMLDivElement | null>(null);
  const queueButtonRef = useRef<HTMLButtonElement | null>(null);
  const queueMenuRef = useRef<HTMLDivElement | null>(null);
  const tagButtonRef = useRef<HTMLButtonElement | null>(null);
  const tagMenuRef = useRef<HTMLDivElement | null>(null);

  const [noteDetail, setNoteDetail] = useState<ContactInternalNote | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [notesHistoryOpen, setNotesHistoryOpen] = useState(false);
  const [ticketHistoryOpen, setTicketHistoryOpen] = useState(false);

  useEffect(() => {
    if (selectedTicket) {
      const contactId = selectedTicket.contact.id;
      loadContact(contactId);
      fetchContactNotes(contactId).catch(() => undefined);
      return;
    }
    clearSelected();
  }, [selectedTicket, loadContact, fetchContactNotes, clearSelected]);

  useEffect(() => {
    fetchTags();
    fetchQueues();
  }, [fetchTags, fetchQueues]);

  useEffect(() => {
    setShowPriorityMenu(false);
    setShowQueueMenu(false);
    setIsTagMenuOpen(false);
    setCarPlateEditorOpen(false);
    setCarPlateInput('');
    setCarPlateError(null);
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (!showPriorityMenu && !showQueueMenu && !isTagMenuOpen) {
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

      if (showQueueMenu) {
        const menu = queueMenuRef.current;
        const button = queueButtonRef.current;
        if (menu && !menu.contains(target) && (!button || !button.contains(target))) {
          setShowQueueMenu(false);
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
  }, [showPriorityMenu, showQueueMenu, isTagMenuOpen]);

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

  const activeTagIds = useMemo(
    () => selectedTicket?.tags.map((relation) => relation.tag.id) ?? [],
    [selectedTicket?.tags]
  );

  const contactBlocked = selectedContact?.isBlocked ?? false;
  const contactStatusLabel = contactBlocked ? 'Bloqueado' : 'Ativo';
  const contactStatusClass = contactBlocked
    ? 'border border-red-200 bg-red-100 text-red-600'
    : 'border border-emerald-200 bg-emerald-100 text-emerald-600';

  const ticketStatusLabel = STATUS_LABELS[ticket.status] ?? ticket.status;
  const ticketStatusClass = TICKET_STATUS_STYLES[ticket.status] ?? 'bg-slate-200 text-slate-600';

  const ticketTypeLabel = TICKET_TYPE_LABELS[ticket.type] ?? ticket.type;
  const ticketTypeClass = TICKET_TYPE_STYLES[ticket.type] ?? 'bg-gray-100 text-gray-600 border border-gray-200';

  const currentPriority = ticket.priority ?? 'LOW';
  const priorityLabel = PRIORITY_LABELS[currentPriority] ?? currentPriority;
  const priorityIndicatorClass = PRIORITY_COLORS[currentPriority] ?? 'bg-gray-300';

  const queueLabel = ticket.queue ? ticket.queue.name : 'Sem fila';

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

  const handleQueueChange = async (queueId: string | null) => {
    if (!selectedTicket) return;

    setShowQueueMenu(false);
    try {
      await updateTicketDetails(selectedTicket.id, { queueId });
      toast.success(queueId ? 'Fila atualizada' : 'Fila removida');
    } catch (error) {
      console.error('Erro ao atualizar fila:', error);
      toast.error('Nao foi possivel atualizar a fila.');
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

  const handleToggleBlockContact = async () => {
    if (!selectedContact) return;
    try {
      setBlockingContact(true);
      await updateContact(selectedContact.id, { isBlocked: !contactBlocked });
      toast.success(
        contactBlocked ? 'Contato desbloqueado com sucesso.' : 'Contato bloqueado para novos atendimentos.'
      );
    } catch (error) {
      console.error('Erro ao atualizar status do contato:', error);
      toast.error('Nao foi possivel atualizar o status do contato.');
    } finally {
      setBlockingContact(false);
    }
  };

  const handleAcceptTicket = async () => {
    if (!selectedTicket) return;
    try {
      await acceptTicket(selectedTicket.id);
      toast.success('Atendimento aceito');
    } catch (error) {
      console.error('Erro ao aceitar ticket:', error);
      toast.error('Nao foi possivel aceitar o ticket.');
    }
  };

  const handleFinalizeTicket = async () => {
    if (!selectedTicket) return;
    try {
      await closeTicket(selectedTicket.id);
      toast.success('Atendimento finalizado');
    } catch (error) {
      console.error('Erro ao finalizar ticket:', error);
      toast.error('Nao foi possivel finalizar o ticket.');
    }
  };

  const openCarPlateEditor = () => {
    if (!selectedTicket) return;
    const initialValue = selectedTicket.carPlate ? normalizeCarPlate(selectedTicket.carPlate) : '';
    setCarPlateInput(initialValue);
    setCarPlateError(null);
    setCarPlateEditorOpen(true);
  };

  const closeCarPlateEditor = () => {
    setCarPlateInput('');
    setCarPlateError(null);
    setCarPlateEditorOpen(false);
  };

  const handleCarPlateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCarPlateError(null);
    setCarPlateInput(event.target.value.toUpperCase());
  };

  const handleCarPlateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTicket) return;

    const normalized = normalizeCarPlate(carPlateInput);
    if (normalized.length > 0 && !isValidCarPlate(normalized)) {
      setCarPlateError('Placa invalida. Use o formato ABC1D23.');
      return;
    }

    const existing = selectedTicket.carPlate ?? '';
    if (normalized === existing) {
      closeCarPlateEditor();
      return;
    }

    setCarPlateSaving(true);
    try {
      await updateTicketDetails(selectedTicket.id, { carPlate: normalized || null });
      toast.success(normalized ? 'Placa do carro atualizada.' : 'Placa do carro removida.');
      closeCarPlateEditor();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel atualizar a placa do carro.';
      setCarPlateError(message);
      toast.error(message);
    } finally {
      setCarPlateSaving(false);
    }
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

  const ticket = selectedTicket;
  const contactName = ticket.contact.name;
  const contactPhone = ticket.contact.phoneNumber;
  const ticketReference = ticket.id.slice(0, 8).toUpperCase();
  const carPlateDisplay = ticket.carPlate ? ticket.carPlate : 'Nao cadastrada';
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
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <header className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Resumo do ticket</h3>
                  <p className="text-xs text-gray-500">Status atual e canal de atendimento.</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-500">
                  #{ticketReference}
                </span>
              </header>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <span className="text-[10px] font-semibold uppercase text-gray-500">Status</span>
                  <span
                    className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ticketStatusClass}`}
                  >
                    {ticketStatusLabel}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <span className="text-[10px] font-semibold uppercase text-gray-500">Canal</span>
                  <span
                    className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ticketTypeClass}`}
                  >
                    {ticketTypeLabel}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <span className="text-[10px] font-semibold uppercase text-gray-500">Prioridade</span>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${priorityIndicatorClass}`} />
                    <span className="text-sm font-semibold text-gray-800">{priorityLabel}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <span className="text-[10px] font-semibold uppercase text-gray-500">Fila</span>
                  <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                    {ticket.queue ? (
                      <>
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: ticket.queue.color }}
                        />
                        {queueLabel}
                      </>
                    ) : (
                      'Sem fila'
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <span className="text-[10px] font-semibold uppercase text-gray-500">Status do contato</span>
                  <span
                    className={`mt-2 inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${contactStatusClass}`}
                  >
                    {contactBlocked ? <Lock size={12} /> : <Unlock size={12} />}
                    {contactStatusLabel}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <span className="text-[10px] font-semibold uppercase text-gray-500">Placa do carro</span>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-sm uppercase tracking-wider text-gray-800">
                      {carPlateDisplay}
                    </span>
                    <button
                      type="button"
                      onClick={openCarPlateEditor}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary px-3 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/10"
                    >
                      <Car size={14} />
                      {ticket.carPlate ? 'Editar' : 'Adicionar'}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <header className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Acoes rapidas</h3>
                  <p className="text-xs text-gray-500">Gerencie o atendimento sem sair da conversa.</p>
                </div>
              </header>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="relative">
                  <button
                    type="button"
                    ref={priorityButtonRef}
                    onClick={() => setShowPriorityMenu((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Flag size={14} />
                      Prioridade
                    </span>
                    <span>{priorityLabel}</span>
                  </button>
                  {showPriorityMenu && (
                    <div
                      ref={priorityMenuRef}
                      className="absolute left-0 top-full z-40 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-2 shadow-lg"
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handlePriorityChange(option.value)}
                          className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                        >
                          <span>{option.label}</span>
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${PRIORITY_COLORS[option.value] ?? 'bg-gray-300'}`}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    ref={queueButtonRef}
                    onClick={() => setShowQueueMenu((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Layers size={14} />
                      Transferir
                    </span>
                    <span className="truncate text-right">{queueLabel}</span>
                  </button>
                  {showQueueMenu && (
                    <div
                      ref={queueMenuRef}
                      className="absolute left-0 top-full z-40 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg"
                    >
                      <button
                        type="button"
                        onClick={() => handleQueueChange(null)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs text-gray-600 hover:bg-gray-100"
                      >
                        Remover fila
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      {queues.map((queue) => (
                        <button
                          key={queue.id}
                          type="button"
                          onClick={() => handleQueueChange(queue.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs text-gray-600 hover:bg-gray-100"
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: queue.color }} />
                          {queue.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    ref={tagButtonRef}
                    onClick={() => setIsTagMenuOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center gap-2">
                      <TagIcon size={14} />
                      Tags
                    </span>
                    <span>{activeTagIds.length}</span>
                  </button>
                  {isTagMenuOpen && (
                    <div
                      ref={tagMenuRef}
                      className="absolute left-0 top-full z-40 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
                    >
                      <p className="text-[10px] font-semibold uppercase text-gray-400">Selecione tags</p>
                      <div className="mt-2 flex flex-col gap-1">
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
                                className={`flex items-center gap-2 rounded-lg px-2 py-1 text-left text-[11px] font-semibold transition ${
                                  active
                                    ? 'bg-primary text-white'
                                    : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
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
                  onClick={handleToggleBlockContact}
                  disabled={!selectedContact || blockingContact}
                  className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {contactBlocked ? <Unlock size={14} /> : <Lock size={14} />}
                  {contactBlocked ? 'Desbloquear contato' : 'Bloquear contato'}
                </button>

                {ticket.status === 'OPEN' && (
                  <button
                    type="button"
                    onClick={handleFinalizeTicket}
                    className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-600"
                  >
                    Finalizar ticket
                  </button>
                )}

                {(ticket.status === 'PENDING' || ticket.status === 'BOT') && (
                  <button
                    type="button"
                    onClick={handleAcceptTicket}
                    className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90"
                  >
                    Aceitar ticket
                  </button>
                )}
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

          </div>
        )}
      </aside>

      {isCarPlateEditorOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Car size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Placa do veículo</p>
                  <p className="text-xs text-gray-500">Associe ou atualize a placa vinculada ao ticket.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCarPlateEditor}
                className="rounded-lg p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Fechar editor de placa"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCarPlateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Placa do carro</label>
                <input
                  type="text"
                  value={carPlateInput}
                  onChange={handleCarPlateChange}
                  placeholder="ABC1D23"
                  maxLength={7}
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase tracking-widest focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="mt-1 text-[11px] text-gray-500">Use o padrão Mercosul (ABC1D23). Deixe vazio para remover.</p>
              </div>
              {carPlateError && <p className="text-sm text-rose-500">{carPlateError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCarPlateEditor}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                  disabled={carPlateSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={carPlateSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
                >
                  {carPlateSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Car size={14} />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </>
  );
}

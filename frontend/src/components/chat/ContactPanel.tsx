'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { StickyNote, Plus, X, Clock3, Phone, User, Tags, ChevronRight } from 'lucide-react';

import { useTicketStore } from '@/store/ticketStore';
import { useContactStore, ContactInternalNote } from '@/store/contactStore';
import { useMessages } from '@/hooks/useMessages';
import ScheduledMessageSection from '@/components/chat/ScheduledMessageSection';

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

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Conteudo</label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Inclua contexto relevante, instrucoes ou aprendizados do atendimento..."
              className="mt-2 h-40 w-full resize-none rounded-xl border border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-2 text-xs text-gray-400">Notas internas sao visiveis apenas para os agentes autorizados.</p>
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

export default function ContactPanel() {
  const selectedTicket = useTicketStore((state) => state.selectedTicket);
  const { selectedContact, loadContact, updateContact, loading, clearSelected } = useContactStore((state) => ({
    selectedContact: state.selectedContact,
    loadContact: state.loadContact,
    updateContact: state.updateContact,
    loading: state.loading,
    clearSelected: state.clearSelected
  }));

  const { sendMessage } = useMessages({ ticketId: selectedTicket?.id, autoLoad: false });

  const [noteDetail, setNoteDetail] = useState<ContactInternalNote | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (selectedTicket) {
      loadContact(selectedTicket.contact.id);
      return;
    }
    clearSelected();
  }, [selectedTicket, loadContact, clearSelected]);

  const internalNotes = useMemo(
    () =>
      [...(selectedContact?.internalNotes ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [selectedContact?.internalNotes]
  );

  const recentTickets = selectedContact?.tickets ?? [];
  const hasTicketOverflow = recentTickets.length > 3;

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
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Detalhes do contato</h2>
            <p className="text-xs text-gray-500">Visao consolidada para personalizar o atendimento.</p>
          </div>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            disabled={!selectedContact}
          >
            <Plus className="h-3.5 w-3.5" />
            Nova nota
          </button>
        </div>

        {loading || !selectedContact ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{contactName}</p>
                  <div className="mt-1 flex flex-col gap-1 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      {contactPhone}
                    </span>
                    {selectedContact.email && (
                      <span className="break-all">{selectedContact.email}</span>
                    )}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                    selectedContact.isBlocked
                      ? 'bg-red-100 text-red-600'
                      : 'bg-emerald-100 text-emerald-600'
                  }`}
                >
                  {selectedContact.isBlocked ? 'Bloqueado' : 'Ativo'}
                  <span
                    className={`h-2 w-2 rounded-full ${
                      selectedContact.isBlocked ? 'bg-red-600' : 'bg-emerald-500'
                    }`}
                  />
                </span>
              </div>

              {selectedContact.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedContact.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ backgroundColor: `${tag.color}1A`, color: tag.color }}
                    >
                      <User className="h-3 w-3" />
                      #{tag.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-500">Nenhuma tag atribuida a este contato.</p>
              )}

              <button
                type="button"
                onClick={handleToggleBlock}
                className="mt-4 w-full rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50"
              >
                {selectedContact.isBlocked ? 'Desbloquear contato' : 'Bloquear contato'}
              </button>
            </div>

            <ScheduledMessageSection ticketId={selectedTicket.id} contactName={contactName} />

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Notas internas</h3>
                <span className="text-xs font-semibold text-gray-400">{internalNotes.length}</span>
              </div>
              {internalNotes.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
                  Nenhuma nota registrada ainda. Utilize o botao &ldquo;Nova nota&rdquo; para documentar aprendizados,
                  instrucoes ou informacoes sensiveis sobre o contato.
                </p>
              ) : (
                <div className="mt-3 flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
                  {internalNotes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => setNoteDetail(note)}
                      className="group rounded-2xl border border-gray-100 bg-gray-50 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <StickyNote className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-800">
                              {note.user?.name ?? 'Equipe WhatsKovi'}
                            </span>
                            <span className="text-[11px] font-medium text-gray-500">
                              {formatDateTime(note.createdAt)}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-3 text-xs text-gray-600">{note.body}</p>
                          <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
                            {note.ticket?.queue?.name && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                                <Tags className="h-3 w-3" />
                                {note.ticket.queue.name}
                              </span>
                            )}
                            {note.ticket?.status && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                                <Clock3 className="h-3 w-3" />
                                {STATUS_LABELS[note.ticket.status] ?? note.ticket.status}
                              </span>
                            )}
                            <span className="ml-auto inline-flex items-center gap-1 text-primary">
                              Ver detalhes
                              <ChevronRight className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Atendimentos recentes</h3>
                  <p className="text-xs text-gray-500">Historico recente deste contato na operacao.</p>
                </div>
                {hasTicketOverflow && <span className="text-[11px] font-semibold text-gray-400">Scroll</span>}
              </div>
              {recentTickets.length === 0 ? (
                <p className="mt-3 text-xs text-gray-500">Sem historico registrado.</p>
              ) : (
                <ul className="mt-3 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '13.5rem' }}>
                  {recentTickets.map((ticket) => (
                    <li
                      key={ticket.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">
                          {STATUS_LABELS[ticket.status] ?? ticket.status}
                        </span>
                        {ticket.queue && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500">
                            {ticket.queue.name}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-gray-500">
                        <Clock3 className="h-3 w-3" />
                        Atualizado em {formatDateTime(ticket.updatedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </aside>

      <NoteDetailModal
        note={noteDetail}
        contactName={contactName}
        contactPhone={contactPhone}
        onClose={() => setNoteDetail(null)}
      />

      <NoteCreateModal
        open={createModalOpen}
        contactName={contactName}
        submitting={savingNote}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateNote}
      />
    </>
  );
}

import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import type {
  ContactDetail as ContactDetailType,
  ContactHistoryEvent,
  ContactNote,
  ContactFieldDefinition,
  UpdateContactPayload
} from '@/store/contactStore';
import type { Tag } from '@/store/metadataStore';
import ContactTimeline from './ContactTimeline';

type ContactDetailProps = {
  contact: ContactDetailType | null;
  tags: Tag[];
  fields: ContactFieldDefinition[];
  onUpdate: (payload: UpdateContactPayload) => Promise<void>;
  onRefresh: () => void;
  notes: ContactNote[];
  notesLoading: boolean;
  onCreateNote: (body: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  history: ContactHistoryEvent[];
  historyLoading: boolean;
  onLoadHistory: () => void;
};

type FormState = {
  name: string;
  email: string;
  notes: string;
  isBlocked: boolean;
  tagIds: string[];
  customFields: Record<string, string>;
};

const getInitialState = (contact: ContactDetailType | null): FormState => ({
  name: contact?.name ?? '',
  email: contact?.email ?? '',
  notes: contact?.notes ?? '',
  isBlocked: contact?.isBlocked ?? false,
  tagIds: contact?.tags.map((tag) => tag.id) ?? [],
  customFields: contact?.customFields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = field.value ?? '';
    return acc;
  }, {}) ?? {}
});

export default function ContactDetail({
  contact,
  tags,
  fields,
  onUpdate,
  onRefresh,
  notes,
  notesLoading,
  onCreateNote,
  onDeleteNote,
  history,
  historyLoading,
  onLoadHistory
}: ContactDetailProps) {
  const [formState, setFormState] = useState<FormState>(() => getInitialState(contact));
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    setFormState(getInitialState(contact));
  }, [contact]);

  if (!contact) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white">
        <div className="text-center text-sm text-gray-500">
          <p className="font-semibold text-gray-700">Selecione um contato da lista ao lado</p>
          <p className="mt-1">Detalhes, notas e histórico serão exibidos aqui.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onUpdate({
        name: formState.name,
        email: formState.email,
        notes: formState.notes,
        isBlocked: formState.isBlocked,
        tagIds: formState.tagIds,
        customFields: formState.customFields
      });
      toast.success('Contato atualizado com sucesso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o contato');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBlocked = async () => {
    setFormState((previous) => ({ ...previous, isBlocked: !previous.isBlocked }));
    try {
      await onUpdate({ isBlocked: !formState.isBlocked });
      toast.success('Status de bloqueio atualizado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao alterar bloqueio');
      setFormState((previous) => ({ ...previous, isBlocked: !previous.isBlocked }));
    }
  };

  const handleNoteSubmit = async () => {
    if (!newNote.trim()) return;
    try {
      await onCreateNote(newNote.trim());
      setNewNote('');
      toast.success('Nota registrada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível registrar a nota');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await onDeleteNote(noteId);
      toast.success('Nota removida.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover a nota');
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Informações do contato</h2>
            <p className="text-xs text-gray-500">Atualize dados, tags e campos personalizados deste contato.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleBlocked}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                formState.isBlocked ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {formState.isBlocked ? 'Contato bloqueado' : 'Bloquear contato'}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Recarregar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
            Nome
            <input
              value={formState.name}
              onChange={(event) => setFormState((previous) => ({ ...previous, name: event.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
            E-mail
            <input
              value={formState.email ?? ''}
              onChange={(event) => setFormState((previous) => ({ ...previous, email: event.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="email@exemplo.com"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600 md:col-span-2">
            Notas internas
            <textarea
              value={formState.notes ?? ''}
              onChange={(event) => setFormState((previous) => ({ ...previous, notes: event.target.value }))}
              rows={3}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
            Tags
            <select
              multiple
              value={formState.tagIds}
              onChange={(event) => {
                const selections = Array.from(event.target.selectedOptions).map((option) => option.value);
                setFormState((previous) => ({ ...previous, tagIds: selections }));
              }}
              className="min-h-[96px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-3">
            {fields.map((field) => (
              <label key={field.id} className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
                {field.name}
                <input
                  value={formState.customFields[field.key] ?? ''}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      customFields: { ...previous.customFields, [field.key]: event.target.value }
                    }))
                  }
                  placeholder={field.description ?? ''}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            ))}
          </div>
        </div>
      </form>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <header className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Notas rápidas</h3>
              <p className="text-xs text-gray-500">Registre observações e contexto relevantes para este contato.</p>
            </div>
            <button
              type="button"
              onClick={handleNoteSubmit}
              disabled={!newNote.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-40"
            >
              Adicionar nota
            </button>
          </header>
          <textarea
            value={newNote}
            onChange={(event) => setNewNote(event.target.value)}
            rows={3}
            className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Escreva uma nova nota interna"
          />
          <div className="flex-1 overflow-y-auto">
            {notesLoading && <p className="text-xs text-gray-500">Carregando notas...</p>}
            {!notesLoading && notes.length === 0 && (
              <p className="text-xs text-gray-500">Nenhuma nota registrada para este contato.</p>
            )}
            <div className="space-y-3">
              {notes.map((note) => (
                <article key={note.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <header className="flex items-center justify-between text-xs text-gray-500">
                    <span>{note.user?.name ?? 'Equipe'}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-[11px] font-semibold text-red-500 hover:text-red-600"
                    >
                      Remover
                    </button>
                  </header>
                  <p className="mt-2 text-sm text-gray-700">{note.body}</p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    {new Date(note.createdAt).toLocaleString('pt-BR')}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <ContactTimeline events={history} loading={historyLoading} onReload={onLoadHistory} />
      </div>
    </div>
  );
}

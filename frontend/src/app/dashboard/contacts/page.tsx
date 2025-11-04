'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import ContactFilters from '@/components/contacts/ContactFilters';
import ContactList from '@/components/contacts/ContactList';
import ContactDetail from '@/components/contacts/ContactDetail';
import ContactImportModal from '@/components/contacts/ContactImportModal';
import FieldManagerModal from '@/components/contacts/FieldManagerModal';
import SegmentManagerModal from '@/components/contacts/SegmentManagerModal';
import { useAuthStore } from '@/store/authStore';
import { useMetadataStore } from '@/store/metadataStore';
import {
  useContactStore,
  type ContactFieldType,
  type ContactQueryParams,
  type UpdateContactPayload,
  type ImportSummary
} from '@/store/contactStore';

const buildQueryParams = (
  search: string,
  tagIds: string[],
  blocked?: boolean,
  hasOpenTickets?: boolean,
  segmentId?: string
): ContactQueryParams => ({
  search: search.trim() || undefined,
  tagIds: tagIds.length ? tagIds : undefined,
  blocked,
  hasOpenTickets,
  segmentId: segmentId || undefined
});

export default function ContactsPage() {
  const router = useRouter();

  const loadUser = useAuthStore((state) => state.loadUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchTags = useMetadataStore((state) => state.fetchTags);
  const tags = useMetadataStore((state) => state.tags);

  const fetchContacts = useContactStore((state) => state.fetchContacts);
  const fetchContact = useContactStore((state) => state.fetchContact);
  const fetchFields = useContactStore((state) => state.fetchFields);
  const fetchSegments = useContactStore((state) => state.fetchSegments);
  const fetchHistory = useContactStore((state) => state.fetchContactHistory);
  const fetchNotes = useContactStore((state) => state.fetchContactNotes);
  const updateContact = useContactStore((state) => state.updateContact);
  const createNote = useContactStore((state) => state.createNote);
  const deleteNote = useContactStore((state) => state.deleteNote);
  const createField = useContactStore((state) => state.createField);
  const deleteField = useContactStore((state) => state.deleteField);
  const createSegment = useContactStore((state) => state.createSegment);
  const deleteSegment = useContactStore((state) => state.deleteSegment);
  const importContacts = useContactStore((state) => state.importContacts);
  const exportContacts = useContactStore((state) => state.exportContacts);
  const setSelectedId = useContactStore((state) => state.setSelectedId);

  const contacts = useContactStore((state) => state.contacts);
  const contactsLoading = useContactStore((state) => state.loading);
  const fields = useContactStore((state) => state.fields);
  const segments = useContactStore((state) => state.segments);
  const selectedId = useContactStore((state) => state.selectedId);
  const selectedContact = useContactStore((state) => state.selectedContact);
  const history = useContactStore((state) => state.history);
  const historyLoading = useContactStore((state) => state.historyLoading);
  const notes = useContactStore((state) => state.notes);
  const notesLoading = useContactStore((state) => state.notesLoading);
  const importing = useContactStore((state) => state.importing);
  const exporting = useContactStore((state) => state.exporting);

  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [blockedFilter, setBlockedFilter] = useState<boolean | undefined>(undefined);
  const [openTicketsFilter, setOpenTicketsFilter] = useState<boolean | undefined>(undefined);
  const [segmentFilter, setSegmentFilter] = useState('');

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [segmentModalOpen, setSegmentModalOpen] = useState(false);
  const [creatingField, setCreatingField] = useState(false);
  const [creatingSegment, setCreatingSegment] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isAuthenticated) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        router.replace('/login');
      }
      return;
    }

    (async () => {
      try {
        await Promise.all([fetchTags(), fetchFields(), fetchSegments()]);
      } catch {
        toast.error('Não foi possível carregar os dados iniciais.');
      }
    })();
  }, [
    isAuthenticated,
    router,
    fetchTags,
    fetchFields,
    fetchSegments,
    fetchContacts
  ]);

  const queryParams = useMemo(
    () => buildQueryParams(search, tagFilter, blockedFilter, openTicketsFilter, segmentFilter),
    [search, tagFilter, blockedFilter, openTicketsFilter, segmentFilter]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    const handle = setTimeout(() => {
      fetchContacts(queryParams);
    }, 300);
    return () => clearTimeout(handle);
  }, [queryParams, fetchContacts, isAuthenticated]);

  const handleSelectContact = async (id: string) => {
    setSelectedId(id);
    try {
      await Promise.all([fetchContact(id), fetchNotes(id), fetchHistory(id)]);
    } catch {
      toast.error('Não foi possível carregar os dados do contato.');
    }
  };

  const handleUpdateContact = async (payload: UpdateContactPayload) => {
    if (!selectedId) return;
    await updateContact(selectedId, payload);
  };

  const handleRefreshContact = async () => {
    if (!selectedId) return;
    try {
      await Promise.all([fetchContact(selectedId), fetchNotes(selectedId), fetchHistory(selectedId)]);
      toast.success('Contato atualizado.');
    } catch {
      toast.error('Não foi possível recarregar o contato.');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const summary: ImportSummary = await importContacts(file);
      toast.success(`Importação concluída: ${summary.created} novo(s), ${summary.updated} atualizado(s).`);
      if (summary.errors.length > 0) {
        toast.error(`${summary.errors.length} linha(s) apresentaram erros.`);
      }
      setImportModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao importar contatos');
    }
  };

  const handleCreateField = async (payload: { name: string; key?: string; type: string; description?: string }) => {
    setCreatingField(true);
    try {
      await createField({ ...payload, type: payload.type as ContactFieldType });
      toast.success('Campo criado com sucesso.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível criar o campo');
    } finally {
      setCreatingField(false);
    }
  };

  const handleDeleteField = async (id: string) => {
    try {
      await deleteField(id);
      toast.success('Campo removido.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível remover o campo');
    }
  };

  const handleCreateSegment = async (payload: { name: string; description?: string; filters: Record<string, unknown>; isFavorite?: boolean }) => {
    setCreatingSegment(true);
    try {
      await createSegment(payload);
      toast.success('Segmento criado com sucesso.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível criar o segmento');
    } finally {
      setCreatingSegment(false);
    }
  };

  const handleDeleteSegment = async (id: string) => {
    try {
      await deleteSegment(id);
      toast.success('Segmento removido.');
      if (segmentFilter === id) {
        setSegmentFilter('');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível remover o segmento');
    }
  };

  const handleExport = async () => {
    try {
      await exportContacts(queryParams);
      toast.success('Exportação iniciada.');
    } catch {
      toast.error('Não foi possível exportar os contatos.');
    }
  };

  const handleCreateNote = async (body: string) => {
    if (!selectedId) return;
    await createNote(selectedId, body);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedId) return;
    await deleteNote(selectedId, noteId);
  };

  const handleLoadHistory = () => {
    if (!selectedId) return;
    fetchHistory(selectedId);
  };

  return (
    <div className="flex min-h-screen bg-gray-100 transition-colors duration-300 dark:bg-slate-950">
      <Sidebar />
      <div className="ml-20 flex flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-6 py-8 lg:px-8">
          <ContactFilters
            search={search}
            onSearchChange={setSearch}
            selectedTagIds={tagFilter}
            onTagChange={setTagFilter}
            blocked={blockedFilter}
            onBlockedChange={setBlockedFilter}
            hasOpenTickets={openTicketsFilter}
            onHasOpenTicketsChange={setOpenTicketsFilter}
            selectedSegmentId={segmentFilter}
            onSegmentChange={setSegmentFilter}
            tags={tags}
            segments={segments}
            loading={contactsLoading}
            exporting={exporting}
            onRefresh={() => fetchContacts(queryParams)}
            onOpenImport={() => setImportModalOpen(true)}
            onExport={handleExport}
            onOpenFieldManager={() => setFieldModalOpen(true)}
            onOpenSegmentManager={() => setSegmentModalOpen(true)}
          />

          <div className="grid flex-1 gap-4 lg:grid-cols-[320px_1fr]">
            <ContactList
              contacts={contacts}
              selectedId={selectedId}
              loading={contactsLoading}
              onSelect={handleSelectContact}
            />

            <ContactDetail
              contact={selectedContact}
              tags={tags}
              fields={fields}
              onUpdate={handleUpdateContact}
              onRefresh={handleRefreshContact}
              notes={notes}
              notesLoading={notesLoading}
              onCreateNote={handleCreateNote}
              onDeleteNote={handleDeleteNote}
              history={history}
              historyLoading={historyLoading}
              onLoadHistory={handleLoadHistory}
            />
          </div>
        </div>
      </div>

      <ContactImportModal
        open={importModalOpen}
        importing={importing}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImport}
      />

      <FieldManagerModal
        open={fieldModalOpen}
        fields={fields}
        creating={creatingField}
        onClose={() => setFieldModalOpen(false)}
        onCreate={handleCreateField}
        onDelete={handleDeleteField}
      />

      <SegmentManagerModal
        open={segmentModalOpen}
        segments={segments}
        tags={tags}
        creating={creatingSegment}
        onClose={() => setSegmentModalOpen(false)}
        onCreate={handleCreateSegment}
        onDelete={handleDeleteSegment}
      />
    </div>
  );
}

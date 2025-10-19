import { create } from 'zustand';
import api from '@/services/api';
import type { Tag } from './metadataStore';

export type ContactFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT';

export type ContactCustomField = {
  id: string;
  key: string;
  name: string;
  type: ContactFieldType;
  value: string;
};

export type ContactTicketSummary = {
  id: string;
  status: string;
  queue?: { id: string; name: string } | null;
  user?: { id: string; name: string } | null;
  updatedAt: string;
  createdAt: string;
};

export type ContactSummary = {
  id: string;
  name: string;
  phoneNumber: string;
  email: string | null;
  avatar?: string | null;
  isBlocked: boolean;
  notes: string | null;
  tags: Tag[];
  customFields: ContactCustomField[];
  lastInteractionAt: string | null;
  createdAt: string;
  updatedAt: string;
  tickets: ContactTicketSummary[];
};

export type ContactNote = {
  id: string;
  body: string;
  createdAt: string;
  user?: { id: string; name: string; avatar?: string | null } | null;
  ticket?: {
    id: string;
    status: string;
    queue?: { id: string; name: string } | null;
  } | null;
};
export type ContactInternalNote = ContactNote;

export type ContactDetail = ContactSummary & {
  internalNotes?: ContactNote[];
};

export type ContactHistoryEvent = {
  id: string;
  type: 'note' | 'ticket' | 'message' | 'internal-message';
  title: string;
  description: string;
  createdAt: string;
  author?: { id: string; name: string; avatar?: string | null } | null;
  context?: Record<string, unknown> | null;
};

export type ContactFieldDefinition = {
  id: string;
  name: string;
  key: string;
  type: ContactFieldType;
  description: string | null;
  options: string[];
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContactSegment = {
  id: string;
  name: string;
  description: string | null;
  filters: Record<string, unknown>;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContactQueryParams = {
  search?: string;
  tagIds?: string[];
  excludedTagIds?: string[];
  blocked?: boolean;
  hasOpenTickets?: boolean;
  queueIds?: string[];
  segmentId?: string;
};

export type UpdateContactPayload = {
  name?: string;
  email?: string | null;
  notes?: string | null;
  isBlocked?: boolean;
  tagIds?: string[];
  customFields?: Record<string, unknown>;
};

export type ImportSummary = {
  imported: number;
  created: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
};

type ContactState = {
  contacts: ContactSummary[];
  loading: boolean;
  detailLoading: boolean;
  historyLoading: boolean;
  notesLoading: boolean;
  importing: boolean;
  exporting: boolean;
  error: string | null;
  fields: ContactFieldDefinition[];
  segments: ContactSegment[];
  selectedId: string | null;
  selectedContact: ContactDetail | null;
  history: ContactHistoryEvent[];
  notes: ContactNote[];
  fetchContacts: (params?: ContactQueryParams) => Promise<void>;
  fetchContact: (id: string) => Promise<void>;
  loadContact: (id: string) => Promise<void>;
  updateContact: (id: string, payload: UpdateContactPayload) => Promise<void>;
  fetchContactHistory: (id: string) => Promise<void>;
  fetchContactNotes: (id: string) => Promise<void>;
  createNote: (id: string, body: string) => Promise<void>;
  deleteNote: (id: string, noteId: string) => Promise<void>;
  fetchFields: () => Promise<void>;
  createField: (payload: { name: string; key?: string; type?: ContactFieldType; description?: string; options?: string[]; isRequired?: boolean }) => Promise<void>;
  updateField: (id: string, payload: { name?: string; description?: string | null; options?: string[]; isRequired?: boolean }) => Promise<void>;
  deleteField: (id: string) => Promise<void>;
  fetchSegments: () => Promise<void>;
  createSegment: (payload: { name: string; description?: string; filters: Record<string, unknown>; isFavorite?: boolean }) => Promise<void>;
  updateSegment: (id: string, payload: { name?: string; description?: string | null; filters?: Record<string, unknown>; isFavorite?: boolean }) => Promise<void>;
  deleteSegment: (id: string) => Promise<void>;
  fetchSegmentContacts: (segmentId: string) => Promise<void>;
  importContacts: (file: File) => Promise<ImportSummary>;
  exportContacts: (params: ContactQueryParams) => Promise<void>;
  setSelectedId: (id: string | null) => void;
  clearSelected: () => void;
};

const handleErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const apiError = error as { response?: { data?: { error?: string } } };
    const message = apiError.response?.data?.error;
    if (message) return message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  loading: false,
  detailLoading: false,
  historyLoading: false,
  notesLoading: false,
  importing: false,
  exporting: false,
  error: null,
  fields: [],
  segments: [],
  selectedId: null,
  selectedContact: null,
  history: [],
  notes: [],

  async fetchContacts(params) {
    set({ loading: true, error: null });
    try {
      const response = await api.get<ContactSummary[]>('/contacts', { params });
      set({ contacts: response.data, loading: false });
      const { selectedId, selectedContact } = get();
      if (selectedId && selectedContact) {
        const updated = response.data.find((item) => item.id === selectedId);
        if (updated) {
          set({ selectedContact: { ...selectedContact, ...updated } });
        }
      }
    } catch (error) {
      set({ loading: false, error: handleErrorMessage(error, 'Erro ao carregar contatos') });
    }
  },

  async fetchContact(id) {
    set({ detailLoading: true, error: null, selectedId: id });
    try {
      const response = await api.get<ContactDetail>(`/contacts/${id}`);
      const detail = {
        ...response.data,
        internalNotes: response.data.internalNotes ?? []
      };
      set({ selectedContact: detail, notes: response.data.internalNotes ?? [], detailLoading: false });
    } catch (error) {
      set({ detailLoading: false, error: handleErrorMessage(error, 'Erro ao carregar contato') });
    }
  },

  async loadContact(id) {
    await get().fetchContact(id);
  },

  async updateContact(id, payload) {
    try {
      const response = await api.put<ContactSummary>(`/contacts/${id}`, payload);
      const summary = response.data;
      set((state) => ({
        contacts: state.contacts.map((contact) => (contact.id === id ? summary : contact)),
        selectedContact: state.selectedContact && state.selectedContact.id === id ? { ...state.selectedContact, ...summary } : state.selectedContact
      }));
    } catch (error) {
      throw new Error(handleErrorMessage(error, 'Não foi possível atualizar o contato'));
    }
  },

  async fetchContactHistory(id) {
    set({ historyLoading: true, error: null });
    try {
      const response = await api.get<ContactHistoryEvent[]>(`/contacts/${id}/history`);
      set({ history: response.data, historyLoading: false });
    } catch (error) {
      set({ historyLoading: false, error: handleErrorMessage(error, 'Erro ao carregar histórico') });
    }
  },

  async fetchContactNotes(id) {
    set({ notesLoading: true, error: null });
    try {
      const response = await api.get<ContactNote[]>(`/contacts/${id}/notes`);
      set({ notes: response.data, notesLoading: false });
    } catch (error) {
      set({ notesLoading: false, error: handleErrorMessage(error, 'Erro ao carregar notas') });
    }
  },

  async createNote(id, body) {
    try {
      const response = await api.post<ContactNote>(`/contacts/${id}/notes`, { body });
      set((state) => ({ notes: [response.data, ...state.notes] }));
    } catch (error) {
      throw new Error(handleErrorMessage(error, 'Não foi possível registrar a nota'));
    }
  },

  async deleteNote(id, noteId) {
    try {
      await api.delete(`/contacts/${id}/notes/${noteId}`);
      set((state) => ({ notes: state.notes.filter((note) => note.id !== noteId) }));
    } catch (error) {
      throw new Error(handleErrorMessage(error, 'Não foi possível excluir a nota'));
    }
  },

  async fetchFields() {
    try {
      const response = await api.get<ContactFieldDefinition[]>('/contacts/fields');
      set({ fields: response.data });
    } catch (error) {
      set({ error: handleErrorMessage(error, 'Erro ao carregar campos personalizados') });
    }
  },

  async createField(payload) {
    try {
      await api.post('/contacts/fields', payload);
      await get().fetchFields();
    } catch (error) {
      throw new Error(handleErrorMessage(error, 'Não foi possível criar o campo'));
    }
  },

  async updateField(id, payload) {
    try {
      await api.put(`/contacts/fields/${id}`, payload);
      await get().fetchFields();
    } catch (error) {
      throw new Error(handleErrorMessage(error, 'Não foi possível atualizar o campo'));
    }
  },

  async deleteField(id) {
    try {
      await api.delete(`/contacts/fields/${id}`);
      set((state) => ({ fields: state.fields.filter((field) => field.id !== id) }));
    } catch (error) {
      throw new Error(handleErrorMessage(error, 'Não foi possível excluir o campo'));
    }
  },

  async fetchSegments() {
    try {
      const response = await api.get<ContactSegment[]>('/contact-segments');
      set({ segments: response.data });
    } catch (error) {
      set({ error: handleErrorMessage(error, 'Erro ao carregar segmentos') });
    }
  },

  async createSegment(payload) {
    try {
      await api.post('/contact-segments', payload);
      await get().fetchSegments();
    } catch (error) {
      throw new Error(handleErrorMessage(error, 'Não foi possível criar o segmento'));
    }
  },

  async updateSegment(id, payload) {
    try {
      await api.put(`/contact-segments/${id}`, payload);
      await get().fetchSegments();
    } catch (error) {
      throw new Error(handleErrorMessage(error, 'Não foi possível atualizar o segmento'));
    }
  },

  async deleteSegment(id) {
    try {
      await api.delete(`/contact-segments/${id}`);
      set((state) => ({ segments: state.segments.filter((segment) => segment.id !== id) }));
    } catch (error) {
      throw new Error(handleErrorMessage(error, 'Não foi possível remover o segmento'));
    }
  },

  async fetchSegmentContacts(segmentId) {
    await get().fetchContacts({ segmentId });
  },

  async importContacts(file) {
    set({ importing: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post<ImportSummary>('/contacts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      set({ importing: false });
      await get().fetchContacts();
      return response.data;
    } catch (error) {
      set({ importing: false });
      throw new Error(handleErrorMessage(error, 'Não foi possível importar os contatos'));
    }
  },

  async exportContacts(params) {
    set({ exporting: true, error: null });
    try {
      const response = await api.get<Blob>('/contacts/export', {
        params,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'contatos.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      set({ exporting: false });
    } catch (error) {
      set({ exporting: false, error: handleErrorMessage(error, 'Não foi possível exportar os contatos') });
    }
  },

  setSelectedId(id) {
    set({ selectedId: id });
  },

  clearSelected() {
    set({ selectedId: null, selectedContact: null, history: [], notes: [] });
  }
}));

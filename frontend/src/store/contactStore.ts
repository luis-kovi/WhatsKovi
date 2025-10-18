import { create } from 'zustand';
import api from '../services/api';

interface ContactTag {
  id: string;
  tag: {
    id: string;
    name: string;
    color: string;
  };
}

interface ContactNoteAuthor {
  id: string;
  name: string;
  avatar?: string | null;
}

interface ContactNoteTicket {
  id: string;
  status: string;
  queue?: {
    id: string;
    name: string;
  } | null;
}

export interface ContactInternalNote {
  id: string;
  body: string;
  type: string;
  createdAt: string;
  user?: ContactNoteAuthor | null;
  ticket?: ContactNoteTicket | null;
}

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string | null;
  notes?: string | null;
  isBlocked: boolean;
  tags: ContactTag[];
  tickets?: Array<{
    id: string;
    status: string;
    updatedAt: string;
    queue?: {
      id: string;
      name: string;
    } | null;
  }>;
  internalNotes?: ContactInternalNote[];
}

interface ContactState {
  contacts: Contact[];
  selectedContact: Contact | null;
  loading: boolean;
  fetchContacts: (filters?: { search?: string; tagIds?: string[] }) => Promise<void>;
  loadContact: (contactId: string) => Promise<void>;
  updateContact: (
    contactId: string,
    data: Partial<Omit<Contact, 'id' | 'tags' | 'tickets' | 'internalNotes'>> & { tagIds?: string[] }
  ) => Promise<void>;
  clearSelected: () => void;
}

const withNormalizedNotes = (contact: Contact): Contact => ({
  ...contact,
  internalNotes: contact.internalNotes ?? []
});

const serializeFilters = (filters?: { search?: string; tagIds?: string[] }) => ({
  search: filters?.search,
  tagIds: filters?.tagIds && filters.tagIds.length > 0 ? filters.tagIds.join(',') : undefined
});

export const useContactStore = create<ContactState>((set) => ({
  contacts: [],
  selectedContact: null,
  loading: false,

  fetchContacts: async (filters) => {
    set({ loading: true });
    try {
      const response = await api.get('/contacts', { params: serializeFilters(filters) });
      set({
        contacts: Array.isArray(response.data)
          ? response.data.map((contact: Contact) => withNormalizedNotes(contact))
          : [],
        loading: false
      });
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      set({ loading: false });
    }
  },

  loadContact: async (contactId) => {
    try {
      const response = await api.get(`/contacts/${contactId}`);
      set({ selectedContact: withNormalizedNotes(response.data) });
    } catch (error) {
      console.error('Erro ao buscar contato:', error);
    }
  },

  updateContact: async (contactId, data) => {
    try {
      const response = await api.put(`/contacts/${contactId}`, data);
      const updated = response.data;

      set((state) => ({
        contacts: state.contacts.map((contact) =>
          contact.id === contactId ? withNormalizedNotes({ ...contact, ...updated }) : contact
        ),
        selectedContact:
          state.selectedContact && state.selectedContact.id === contactId
            ? withNormalizedNotes({ ...state.selectedContact, ...updated })
            : state.selectedContact
      }));
    } catch (error) {
      console.error('Erro ao atualizar contato:', error);
    }
  },

  clearSelected: () => {
    set({ selectedContact: null });
  }
}));

import { create } from 'zustand';
import api from '../services/api';

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'AGENT';
export type UserStatus = 'ONLINE' | 'OFFLINE' | 'AWAY';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string | null;
  maxTickets: number;
  createdAt?: string;
}

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  maxTickets?: number;
};

export type UpdateUserPayload = {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
  maxTickets?: number;
};

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (payload: CreateUserPayload) => Promise<User>;
  updateUser: (id: string, payload: UpdateUserPayload) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get<User[]>('/users');
      set({ users: response.data, loading: false });
    } catch (error) {
      console.error('Erro ao carregar usuarios:', error);
      set({
        loading: false,
        error: 'Nao foi possivel carregar os usuarios. Tente novamente.'
      });
    }
  },

  createUser: async (payload) => {
    const response = await api.post<User>('/users', payload);
    const created = response.data;
    set((state) => ({
      users: [...state.users, created]
    }));
    return created;
  },

  updateUser: async (id, payload) => {
    const response = await api.put<User>(`/users/${id}`, payload);
    const updated = response.data;
    set((state) => ({
      users: state.users.map((user) => (user.id === id ? { ...user, ...updated } : user))
    }));
    return updated;
  },

  deleteUser: async (id) => {
    await api.delete(`/users/${id}`);
    set((state) => ({
      users: state.users.filter((user) => user.id !== id)
    }));
  }
}));

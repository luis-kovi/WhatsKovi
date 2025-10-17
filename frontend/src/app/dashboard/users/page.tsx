'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import UserFilters from '@/components/users/UserFilters';
import UserTable from '@/components/users/UserTable';
import UserFormModal, { UserFormValues } from '@/components/users/UserFormModal';
import UserDeleteModal from '@/components/users/UserDeleteModal';
import { useAuthStore } from '@/store/authStore';
import { useUserStore, User, UserRole, UserStatus } from '@/store/userStore';

type RoleFilter = 'ALL' | UserRole;
type StatusFilter = 'ALL' | UserStatus;

type ApiErrorResponse = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const apiError = error as ApiErrorResponse;
    const responseMessage = apiError.response?.data?.error;
    if (responseMessage) {
      return responseMessage;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export default function UsersPage() {
  const router = useRouter();
  const loadUser = useAuthStore((state) => state.loadUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.user);

  const users = useUserStore((state) => state.users);
  const loading = useUserStore((state) => state.loading);
  const error = useUserStore((state) => state.error);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const createUser = useUserStore((state) => state.createUser);
  const updateUser = useUserStore((state) => state.updateUser);
  const removeUser = useUserStore((state) => state.deleteUser);

  const [initialized, setInitialized] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

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

    if (!currentUser) {
      return;
    }

    if (currentUser.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }

    if (!initialized) {
      (async () => {
        try {
          await fetchUsers();
        } catch (fetchError) {
          toast.error(getErrorMessage(fetchError, 'Erro ao carregar usuarios.'));
        } finally {
          setInitialized(true);
        }
      })();
    }
  }, [isAuthenticated, currentUser, router, initialized, fetchUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users
      .filter((user) => (roleFilter === 'ALL' ? true : user.role === roleFilter))
      .filter((user) => (statusFilter === 'ALL' ? true : user.status === statusFilter))
      .filter((user) => {
        if (!normalizedSearch) return true;
        return (
          user.name.toLowerCase().includes(normalizedSearch) ||
          user.email.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [users, roleFilter, statusFilter, search]);

  const handleOpenCreate = () => {
    setFormMode('create');
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setFormMode('edit');
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setFormSubmitting(false);
  };

  const handleFormSubmit = async (values: UserFormValues) => {
    setFormSubmitting(true);
    try {
      if (formMode === 'create') {
        await createUser({
          name: values.name,
          email: values.email,
          password: values.password || '',
          role: values.role,
          maxTickets: values.maxTickets
        });
        toast.success('Usuario cadastrado com sucesso.');
      } else if (formMode === 'edit' && editingUser) {
        await updateUser(editingUser.id, {
          name: values.name,
          email: values.email,
          role: values.role,
          status: values.status,
          maxTickets: values.maxTickets,
          password: values.password
        });
        toast.success('Usuario atualizado.');
      }
      setFormOpen(false);
    } catch (submitError) {
      toast.error(getErrorMessage(submitError, 'Nao foi possivel salvar o usuario.'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await fetchUsers();
      toast.success('Lista atualizada.');
    } catch (refreshError) {
      toast.error(getErrorMessage(refreshError, 'Falha ao atualizar a lista.'));
    }
  };

  const handleOpenDelete = (user: User) => {
    setDeletingUser(user);
    setDeleteOpen(true);
  };

  const handleCancelDelete = () => {
    setDeleteOpen(false);
    setDeletingUser(null);
    setDeleteSubmitting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setDeleteSubmitting(true);
    try {
      await removeUser(deletingUser.id);
      toast.success('Usuario removido.');
      handleCancelDelete();
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, 'Nao foi possivel remover o usuario.'));
      setDeleteSubmitting(false);
    }
  };

  if (!isAuthenticated || !currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <UserFilters
            search={search}
            role={roleFilter}
            status={statusFilter}
            onSearch={setSearch}
            onRoleChange={(value) => setRoleFilter(value as RoleFilter)}
            onStatusChange={(value) => setStatusFilter(value as StatusFilter)}
            onCreate={handleOpenCreate}
            onRefresh={handleRefresh}
            refreshing={loading}
          />

          <div className="mt-6 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className={loading ? 'pointer-events-none opacity-60' : ''}>
              <UserTable users={filteredUsers} onEdit={handleOpenEdit} onDelete={handleOpenDelete} />
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Atualizando lista de usuarios...
              </div>
            )}
          </div>
        </div>
      </div>

      <UserFormModal
        open={formOpen}
        mode={formMode}
        initialData={formMode === 'edit' ? editingUser ?? undefined : undefined}
        submitting={formSubmitting}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
      />

      <UserDeleteModal
        open={deleteOpen}
        user={deletingUser}
        submitting={deleteSubmitting}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

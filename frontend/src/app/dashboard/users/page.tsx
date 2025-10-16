'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const router = useRouter();
  const { isAuthenticated, loadUser, user } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-8 py-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gestao de Usuarios</h1>
          <p className="text-sm text-gray-500">
            Em breve: cadastro, permissões e acompanhamento de disponibilidade da equipe.
          </p>
        </header>

        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-10 text-center text-gray-500">
          <p className="font-medium">Módulo em desenvolvimento.</p>
          <p className="mt-2 text-sm">
            Aqui ficará o painel completo de usuários com criação, edição, alocação em filas e limites de atendimento.
          </p>
        </div>
      </div>
    </div>
  );
}

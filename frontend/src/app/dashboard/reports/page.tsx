'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();
  const { isAuthenticated, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
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
          <h1 className="text-2xl font-bold text-gray-900">Relatorios</h1>
          <p className="text-sm text-gray-500">
            Projeção dos dashboards e métricas detalhadas ainda está em construção.
          </p>
        </header>

        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-10 text-center text-gray-500">
          <p className="font-medium">Módulo em desenvolvimento.</p>
          <p className="mt-2 text-sm">
            Em breve você poderá acompanhar SLA, desempenho da equipe, volume de tickets por fila e muito mais.
          </p>
        </div>
      </div>
    </div>
  );
}

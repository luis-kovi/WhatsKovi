'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TicketList from '@/components/tickets/TicketList';
import ChatArea from '@/components/chat/ChatArea';
import ContactPanel from '@/components/chat/ContactPanel';
import SummaryCards from '@/components/dashboard/SummaryCards';
import { useAuthStore } from '@/store/authStore';
import { useTicketStore } from '@/store/ticketStore';
import { useMetadataStore } from '@/store/metadataStore';

const CONNECTION_LABEL: Record<string, string> = {
  CONNECTED: 'Conectado',
  CONNECTING: 'Conectando',
  DISCONNECTED: 'Desconectado'
};

const CONNECTION_COLOR: Record<string, string> = {
  CONNECTED: 'bg-green-500',
  CONNECTING: 'bg-yellow-500',
  DISCONNECTED: 'bg-gray-400'
};

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadUser = useAuthStore((state) => state.loadUser);

  const fetchTickets = useTicketStore((state) => state.fetchTickets);
  const setupTicketSocket = useTicketStore((state) => state.setupSocketListeners);

  const fetchDashboard = useMetadataStore((state) => state.fetchDashboard);
  const dashboard = useMetadataStore((state) => state.dashboard);
  const metadataLoading = useMetadataStore((state) => state.loading);

  const connections = useMetadataStore((state) => state.connections);
  const fetchConnections = useMetadataStore((state) => state.fetchConnections);
  const setupRealtimeListeners = useMetadataStore((state) => state.setupRealtimeListeners);

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

    fetchTickets();
    setupTicketSocket();
    fetchDashboard();
    fetchConnections();
    setupRealtimeListeners();

    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [
    isAuthenticated,
    fetchTickets,
    setupTicketSocket,
    fetchDashboard,
    fetchConnections,
    setupRealtimeListeners,
    router
  ]);

  const connectionInfo = useMemo(() => {
    if (connections.length === 0) {
      return {
        label: 'Sem conexao',
        detail: 'Adicione uma conexao WhatsApp',
        color: 'bg-gray-400'
      };
    }

    const primary =
      connections.find((connection) => connection.isDefault) ??
      connections.find((connection) => connection.status === 'CONNECTED') ??
      connections[0];

    const label = CONNECTION_LABEL[primary.status] ?? primary.status;
    const color = CONNECTION_COLOR[primary.status] ?? 'bg-gray-400';
    const detail = primary.phoneNumber ? `+${primary.phoneNumber}` : 'Numero nao vinculado';

    return { label, detail, color };
  }, [connections]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <SummaryCards loading={metadataLoading} data={dashboard} />
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${connectionInfo.color}`} />
                <span className="font-semibold text-gray-800">{connectionInfo.label}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{connectionInfo.detail}</p>
            </div>
          </div>
        </header>
        <main className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <TicketList />
            <ChatArea />
            <ContactPanel />
          </div>
        </main>
      </div>
    </div>
  );
}


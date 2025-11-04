'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [forecastLoading, setForecastLoading] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadUser = useAuthStore((state) => state.loadUser);

  const fetchTickets = useTicketStore((state) => state.fetchTickets);
  const setupTicketSocket = useTicketStore((state) => state.setupSocketListeners);
  const loadDemandForecast = useTicketStore((state) => state.loadDemandForecast);
  const demandForecast = useTicketStore((state) => state.demandForecast);

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
    loadDemandForecast({ horizon: 7 }).catch(() => undefined);

    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [
    isAuthenticated,
    fetchTickets,
    setupTicketSocket,
    fetchDashboard,
    fetchConnections,
    setupRealtimeListeners,
    loadDemandForecast,
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

  const handleRefreshForecast = () => {
    setForecastLoading(true);
    loadDemandForecast({ horizon: 7, refresh: true })
      .catch(() => undefined)
      .finally(() => setForecastLoading(false));
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 transition-colors duration-300 dark:bg-slate-950">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 transition-colors duration-300 dark:bg-slate-950">
      <Sidebar />
      <div className="ml-20 flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-gray-200 bg-white px-4 py-0.5 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
          <SummaryCards
            loading={metadataLoading}
            data={dashboard}
            forecastTotal={demandForecast?.totalExpected ?? null}
            forecastLoading={forecastLoading}
            onRefreshForecast={handleRefreshForecast}
            connection={connectionInfo}
          />
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



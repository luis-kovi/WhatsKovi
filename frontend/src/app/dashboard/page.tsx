'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TicketList from '@/components/tickets/TicketList';
import ChatArea from '@/components/chat/ChatArea';
import ContactPanel from '@/components/chat/ContactPanel';
import ConnectionPanel from '@/components/dashboard/ConnectionPanel';
import SummaryCards from '@/components/dashboard/SummaryCards';
import { useAuthStore } from '@/store/authStore';
import { useTicketStore } from '@/store/ticketStore';
import { useMetadataStore } from '@/store/metadataStore';

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadUser = useAuthStore((state) => state.loadUser);

  const fetchTickets = useTicketStore((state) => state.fetchTickets);
  const setupTicketSocket = useTicketStore((state) => state.setupSocketListeners);

  const fetchDashboard = useMetadataStore((state) => state.fetchDashboard);
  const dashboard = useMetadataStore((state) => state.dashboard);
  const metadataLoading = useMetadataStore((state) => state.loading);
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
    setupRealtimeListeners();

    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchTickets, setupTicketSocket, fetchDashboard, setupRealtimeListeners, router]);

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
        <header className="border-b border-gray-200 bg-white px-8 py-6">
          <SummaryCards loading={metadataLoading} data={dashboard} />
        </header>
        <main className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <TicketList />
            <ChatArea />
            <ContactPanel />
          </div>
          <ConnectionPanel />
        </main>
      </div>
    </div>
  );
}

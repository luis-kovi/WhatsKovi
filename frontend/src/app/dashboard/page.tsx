'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useTicketStore } from '@/store/ticketStore';
import Sidebar from '@/components/layout/Sidebar';
import TicketList from '@/components/tickets/TicketList';
import ChatArea from '@/components/chat/ChatArea';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, loadUser } = useAuthStore();
  const { fetchTickets, setupSocketListeners } = useTicketStore();

  useEffect(() => {
    loadUser().then(() => {
      if (!isAuthenticated) {
        router.push('/login');
      }
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTickets();
      setupSocketListeners();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex">
        <TicketList />
        <ChatArea />
      </div>
    </div>
  );
}

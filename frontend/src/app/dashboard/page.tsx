'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Menu, Info, X, Clock3, MessageCircle, ShieldAlert } from 'lucide-react';

import Sidebar from '@/components/layout/Sidebar';
import TicketList from '@/components/tickets/TicketList';
import ChatArea from '@/components/chat/ChatArea';
import ContactPanel from '@/components/chat/ContactPanel';
import { useAuthStore } from '@/store/authStore';
import { useTicketStore } from '@/store/ticketStore';
import { useMetadataStore } from '@/store/metadataStore';
import { useContactStore } from '@/store/contactStore';
import { useAvatar } from '@/hooks/useAvatar';
import { TICKET_PRIORITY_COLORS, TICKET_PRIORITY_LABELS } from '@/constants/ticketPriority';

const MOBILE_USER_AGENT = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
const MOBILE_BREAKPOINT = 900;

const STATUS_LABELS: Record<string, string> = {
  BOT: 'Chatbot',
  PENDING: 'Pendente',
  OPEN: 'Em atendimento',
  CLOSED: 'Encerrado'
};

const STATUS_STYLES: Record<string, string> = {
  BOT: 'bg-indigo-100 text-indigo-700',
  PENDING: 'bg-amber-100 text-amber-700',
  OPEN: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-200 text-slate-600'
};

const TICKET_TYPE_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS',
  EMAIL: 'E-mail'
};

const TICKET_TYPE_STYLES: Record<string, string> = {
  WHATSAPP: 'bg-emerald-100 text-emerald-700',
  SMS: 'bg-purple-100 text-purple-700',
  EMAIL: 'bg-sky-100 text-sky-700'
};

const detectMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const matchesAgent = MOBILE_USER_AGENT.test(userAgent);
  return matchesAgent || window.innerWidth <= MOBILE_BREAKPOINT;
};

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadUser = useAuthStore((state) => state.loadUser);

  const fetchTickets = useTicketStore((state) => state.fetchTickets);
  const setupTicketSocket = useTicketStore((state) => state.setupSocketListeners);
  const selectedTicket = useTicketStore((state) => state.selectedTicket);

  const fetchDashboard = useMetadataStore((state) => state.fetchDashboard);
  const fetchConnections = useMetadataStore((state) => state.fetchConnections);
  const setupRealtimeListeners = useMetadataStore((state) => state.setupRealtimeListeners);

  const {
    selectedContact,
    notes,
    loading: contactLoading,
    loadContact,
    fetchContactNotes,
    clearSelected: clearSelectedContact
  } = useContactStore((state) => ({
    selectedContact: state.selectedContact,
    notes: state.notes,
    loading: state.loading,
    loadContact: state.loadContact,
    fetchContactNotes: state.fetchContactNotes,
    clearSelected: state.clearSelected
  }));

  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() => detectMobileDevice());
  const [mobileChatMenuOpen, setMobileChatMenuOpen] = useState(false);
  const [mobileContactDetailsOpen, setMobileContactDetailsOpen] = useState(false);

  const selectedTicketId = selectedTicket?.id ?? null;
  const selectedContactId = selectedTicket?.contact.id ?? null;

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobileDevice(detectMobileDevice());
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileDevice) return;
    if (selectedContactId) {
      loadContact(selectedContactId);
      fetchContactNotes(selectedContactId).catch(() => undefined);
      return;
    }
    clearSelectedContact();
  }, [isMobileDevice, selectedContactId, loadContact, fetchContactNotes, clearSelectedContact]);

  useEffect(() => {
    if (!isMobileDevice) {
      setMobileChatMenuOpen(false);
      setMobileContactDetailsOpen(false);
    }
  }, [isMobileDevice]);

  useEffect(() => {
    if (mobileChatMenuOpen && selectedTicketId) {
      setMobileChatMenuOpen(false);
    }
  }, [mobileChatMenuOpen, selectedTicketId]);

  useEffect(() => {
    if (mobileContactDetailsOpen && !selectedTicketId) {
      setMobileContactDetailsOpen(false);
    }
  }, [mobileContactDetailsOpen, selectedTicketId]);

  const notePreview = useMemo(
    () =>
      [...notes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3),
    [notes]
  );

  const recentTickets = useMemo(() => {
    if (!selectedContact) return [];
    return [...selectedContact.tickets]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [selectedContact]);

  const noteDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
      }),
    []
  );

  const contactName = selectedTicket?.contact.name ?? selectedContact?.name ?? 'Contato';
  const contactPhone = selectedTicket?.contact.phoneNumber ?? selectedContact?.phoneNumber ?? '--';
  const contactEmail = selectedTicket?.contact.email ?? selectedContact?.email ?? null;
  const carPlateLabel = selectedTicket?.carPlate ?? 'Nao cadastrada';
  const ticketReference = selectedTicket ? selectedTicket.id.slice(0, 8).toUpperCase() : '--';
  const tags = selectedTicket?.tags ?? [];
  const queueLabel = selectedTicket?.queue?.name ?? 'Sem fila';
  const ticketStatusLabel = selectedTicket ? STATUS_LABELS[selectedTicket.status] ?? selectedTicket.status : null;
  const ticketStatusClass = selectedTicket ? STATUS_STYLES[selectedTicket.status] ?? 'bg-gray-200 text-gray-600' : 'bg-gray-200 text-gray-600';
  const ticketTypeLabel = selectedTicket ? TICKET_TYPE_LABELS[selectedTicket.type] ?? selectedTicket.type : null;
  const ticketTypeClass = selectedTicket ? TICKET_TYPE_STYLES[selectedTicket.type] ?? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600';
  const priorityKey = selectedTicket?.priority ?? 'LOW';
  const priorityLabel = TICKET_PRIORITY_LABELS[priorityKey] ?? priorityKey;
  const priorityIndicatorClass = TICKET_PRIORITY_COLORS[priorityKey] ?? 'bg-gray-300';
  const contactBlocked = selectedContact?.isBlocked ?? false;

  const contactAvatar = useAvatar({
    name: contactName,
    avatar: selectedTicket?.contact.avatar ?? selectedContact?.avatar,
    identifier: selectedTicket?.contact.phoneNumber ?? selectedContact?.phoneNumber ?? undefined
  });

  const renderMobileContactDrawerContent = () => {
    if (contactLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      );
    }

    if (!selectedTicket) {
      return (
        <div className="py-20 text-center text-sm text-gray-500">
          Selecione um ticket para visualizar os detalhes.
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 pb-10">
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-full">
              {contactAvatar.hasImage && contactAvatar.src ? (
                <Image src={contactAvatar.src} alt={contactName} fill className="object-cover" unoptimized />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-lg font-semibold text-primary"
                  style={{ backgroundColor: contactAvatar.backgroundColor }}
                >
                  {contactAvatar.initials ?? contactName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900">{contactName}</p>
              <p className="text-sm text-gray-500">{contactPhone}</p>
              {contactEmail && <p className="text-xs text-gray-400">{contactEmail}</p>}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-gray-600">
            <div className="rounded-xl bg-gray-50 px-3 py-2">
              <span className="text-[10px] uppercase text-gray-400">Carro associado</span>
              <p className="mt-1 text-gray-900">{carPlateLabel}</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2">
              <span className="text-[10px] uppercase text-gray-400">Ticket atual</span>
              <p className="mt-1 text-gray-900">#{ticketReference}</p>
            </div>
          </div>

          {contactBlocked && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
              <ShieldAlert className="h-4 w-4" />
              Contato bloqueado
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resumo do atendimento</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 px-3 py-2">
              <span className="text-[10px] uppercase text-gray-400">Status</span>
              <div className={
                `mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${ticketStatusClass}`
              }>
                <Clock3 className="h-4 w-4" />
                {ticketStatusLabel}
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2">
              <span className="text-[10px] uppercase text-gray-400">Prioridade</span>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${priorityIndicatorClass}`} />
                {priorityLabel}
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2">
              <span className="text-[10px] uppercase text-gray-400">Fila</span>
              <p className="mt-2 text-sm font-semibold text-gray-900">{queueLabel}</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2">
              <span className="text-[10px] uppercase text-gray-400">Canal</span>
              <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${ticketTypeClass}`}>
                <MessageCircle className="h-4 w-4" />
                {ticketTypeLabel}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <span className="text-xs text-gray-500">Nenhuma tag associada.</span>
            ) : (
              tags.map((relation) => (
                <span
                  key={relation.id}
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: `${relation.tag.color}22`, color: relation.tag.color }}
                >
                  #{relation.tag.name}
                </span>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notas recentes</h3>
          <div className="mt-3 space-y-2">
            {notePreview.length === 0 ? (
              <p className="text-xs text-gray-500">Nenhuma nota registrada para este contato.</p>
            ) : (
              notePreview.map((note) => (
                <div key={note.id} className="rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>{note.user?.name ?? 'Equipe WhatsKovi'}</span>
                    <span>{noteDateFormatter.format(new Date(note.createdAt))}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-800">{note.body}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Histórico</h3>
          <div className="mt-3 space-y-2">
            {recentTickets.length === 0 ? (
              <p className="text-xs text-gray-500">Nenhum atendimento anterior encontrado.</p>
            ) : (
              recentTickets.map((ticketHistory) => {
                const historyStatusClass = STATUS_STYLES[ticketHistory.status] ?? 'bg-gray-200 text-gray-600';
                const historyStatusLabel = STATUS_LABELS[ticketHistory.status] ?? ticketHistory.status;
                return (
                  <div key={ticketHistory.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="font-semibold text-gray-800">{ticketHistory.queue?.name ?? 'Sem fila'}</span>
                      <span>{noteDateFormatter.format(new Date(ticketHistory.updatedAt))}</span>
                    </div>
                    <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${historyStatusClass}`}>
                      {historyStatusLabel}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 transition-colors duration-300 dark:bg-slate-950">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isMobileDevice) {
    return (
      <div className="relative flex h-screen flex-col bg-[#0b141a]">
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <button
            type="button"
            onClick={() => setMobileChatMenuOpen(true)}
            className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"
            aria-label="Abrir menu de conversas"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200">WhatsKovi</p>
            <p className="text-lg font-bold">Conversas</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileContactDetailsOpen(true)}
            disabled={!selectedTicketId}
            className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Abrir detalhes do contato"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-t-[36px] border border-[#e4e5e7] bg-[#f5f2ee] shadow-[0_-20px_60px_rgba(0,0,0,0.25)]">
          <ChatArea
            onHeaderContactClick={() => {
              if (selectedTicketId) {
                setMobileContactDetailsOpen(true);
              }
            }}
          />
        </div>

        {mobileChatMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-slate-900/70 backdrop-blur-sm"
              onClick={() => setMobileChatMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 flex w-full max-w-md flex-col rounded-r-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-[#008061] px-5 py-4 text-white">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70">Conversas</p>
                  <p className="text-lg font-semibold">Tickets ativos</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileChatMenuOpen(false)}
                  className="rounded-full bg-white/20 p-2 transition hover:bg-white/30"
                  aria-label="Fechar menu de conversas"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden bg-gray-50">
                <div className="h-full overflow-y-auto px-2 py-3">
                  <TicketList variant="mobile" />
                </div>
              </div>
            </div>
          </>
        )}

        {mobileContactDetailsOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 backdrop-blur-sm">
            <div className="mt-auto rounded-t-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Contato</p>
                  <p className="text-lg font-bold text-gray-900">{contactName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileContactDetailsOpen(false)}
                  className="rounded-full bg-gray-100 p-2 text-gray-500 transition hover:bg-gray-200"
                  aria-label="Fechar detalhes do contato"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="h-[75vh] overflow-y-auto px-5 py-4">{renderMobileContactDrawerContent()}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 transition-colors duration-300 dark:bg-slate-950">
      <Sidebar />
      <div className="ml-20 flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex min-w-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 overflow-hidden">
            <TicketList />
            <ChatArea />
            <ContactPanel />
          </div>
        </main>
      </div>
    </div>
  );
}

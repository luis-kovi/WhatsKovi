'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTicketStore, DEFAULT_STATUS_FILTERS } from '@/store/ticketStore';
import { useMetadataStore } from '@/store/metadataStore';
import { useAvatar } from '@/hooks/useAvatar';
import api from '@/services/api';
import { normalizeCarPlate, isValidCarPlate } from '@/utils/carPlate';
import { Search, Filter, ArrowUpDown, MessageSquare, RefreshCw, Plus, X, Loader2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_OPTIONS = [
  { value: 'BOT', label: 'Chatbot' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'OPEN', label: 'Em atendimento' },
  { value: 'CLOSED', label: 'Finalizados' }
];

const numberFormatter = new Intl.NumberFormat('pt-BR');

const CONNECTION_LABEL: Record<string, string> = {
  CONNECTED: 'Conectado',
  CONNECTING: 'Conectando',
  DISCONNECTED: 'Desconectado'
};

const CONNECTION_COLOR: Record<string, string> = {
  CONNECTED: 'bg-emerald-500',
  CONNECTING: 'bg-amber-400',
  DISCONNECTED: 'bg-gray-400'
};

const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'unread', label: 'Nao lidos primeiro' },
  { value: 'priority', label: 'Prioridade' }
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' }
];

type ContactMatch = {
  id: string;
  name: string;
  phoneNumber: string;
};

type ApiErrorResponse = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const apiError = error as ApiErrorResponse;
    const responseMessage = apiError.response?.data?.error;
    if (responseMessage) return responseMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'BOT':
      return 'bg-sky-500';
    case 'PENDING':
      return 'bg-yellow-500';
    case 'OPEN':
      return 'bg-green-500';
    case 'CLOSED':
      return 'bg-gray-500';
    default:
      return 'bg-gray-400';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'BOT':
      return 'Chatbot';
    case 'PENDING':
      return 'Pendente';
    case 'OPEN':
      return 'Aberto';
    case 'CLOSED':
      return 'Fechado';
    default:
      return status;
  }
};

type TicketItemProps = {
  ticket: {
    id: string;
    status: string;
    priority: string;
    lastMessageAt: string;
    unreadMessages: number;
    contact: {
      name: string;
      phoneNumber: string;
      avatar?: string | null;
    };
    queue?: {
      name: string;
      color: string;
    } | null;
    tags: Array<{
      id: string;
      tag: {
        name: string;
        color: string;
      };
    }>;
  };
  isSelected: boolean;
  onSelect: (id: string) => void;
};

type TicketListProps = {
  variant?: 'default' | 'mobile';
};

function TicketItem({ ticket, isSelected, onSelect }: TicketItemProps) {
  const avatar = useAvatar({
    name: ticket.contact.name,
    avatar: ticket.contact.avatar,
    identifier: ticket.contact.phoneNumber
  });

  return (
    <button
      onClick={() => onSelect(ticket.id)}
      className={`flex w-full border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50 ${
        isSelected ? 'bg-primary/5' : 'bg-white'
      }`}
    >
      <div className="relative mr-3 h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
        {avatar.hasImage && avatar.src ? (
          <Image
            src={avatar.src}
            alt={ticket.contact.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary"
            style={{ backgroundColor: avatar.backgroundColor }}
          >
            {avatar.initials || ticket.contact.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between">
          <p className="truncate text-sm font-semibold text-gray-800">{ticket.contact.name}</p>
          <span className="text-[10px] uppercase text-gray-400">
            {formatDistanceToNow(new Date(ticket.lastMessageAt), { addSuffix: true, locale: ptBR })}
          </span>
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${getStatusColor(ticket.status)}`} />
          <span className="text-[11px] font-semibold text-gray-600">{getStatusLabel(ticket.status)}</span>
          <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
            {ticket.priority}
          </span>
          {ticket.queue && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide"
              style={{ backgroundColor: `${ticket.queue.color}22`, color: ticket.queue.color }}
            >
              {ticket.queue.name}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {ticket.tags.map((relation) => (
            <span
              key={relation.id}
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ backgroundColor: `${relation.tag.color}22`, color: relation.tag.color }}
            >
              #{relation.tag.name}
            </span>
          ))}
        </div>

        {ticket.unreadMessages > 0 && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
            {ticket.unreadMessages} novas mensagens
          </div>
        )}
      </div>
    </button>
  );
}

export default function TicketList({ variant = 'default' }: TicketListProps = {}) {
  const {
    tickets,
    selectedTicket,
    selectTicket,
    loading,
    filters,
    setFilter,
    clearFilters,
    fetchTickets,
    createManualTicket
  } = useTicketStore((state) => ({
    tickets: state.tickets,
    selectedTicket: state.selectedTicket,
    selectTicket: state.selectTicket,
    loading: state.loading,
    filters: state.filters,
    setFilter: state.setFilter,
    clearFilters: state.clearFilters,
    fetchTickets: state.fetchTickets,
    createManualTicket: state.createManualTicket
  }));

  const {
    queues,
    tags,
    connections,
    dashboard,
    metadataLoading,
    fetchQueues,
    fetchTags
  } = useMetadataStore((state) => ({
    queues: state.queues,
    tags: state.tags,
    connections: state.connections,
    dashboard: state.dashboard,
    metadataLoading: state.loading,
    fetchQueues: state.fetchQueues,
    fetchTags: state.fetchTags
  }));

  const [searchTerm, setSearchTerm] = useState(filters.search ?? '');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activeFilterCategory, setActiveFilterCategory] = useState<'tags' | 'status' | 'queues'>('tags');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualQueueId, setManualQueueId] = useState<string>('');
  const [manualPriority, setManualPriority] = useState('MEDIUM');
  const [manualTagIds, setManualTagIds] = useState<string[]>([]);
  const [manualTicketType, setManualTicketType] = useState<'WHATSAPP' | 'SMS' | 'EMAIL'>('WHATSAPP');
  const isMobileVariant = variant === 'mobile';
  const [manualEmail, setManualEmail] = useState('');
  const [manualCarPlate, setManualCarPlate] = useState('');
  const [matchedContactName, setMatchedContactName] = useState<string | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const activeTagIds = useMemo(() => filters.tagIds || [], [filters.tagIds]);
  const defaultStatuses = useMemo<string[]>(() => Array.from(DEFAULT_STATUS_FILTERS), []);
  const defaultStatusSet = useMemo(() => new Set<string>(defaultStatuses), [defaultStatuses]);
  const activeStatuses = filters.status ?? defaultStatuses;
  const hasCustomStatus = useMemo(() => {
    const current = filters.status ?? defaultStatuses;
    if (current.length !== defaultStatuses.length) {
      return true;
    }
    return current.some((status) => !defaultStatusSet.has(status));
  }, [filters.status, defaultStatuses, defaultStatusSet]);

  const filterBadgeCount = activeTagIds.length + (filters.queueId ? 1 : 0) + (hasCustomStatus ? 1 : 0);
  const filterButtonActive = filterBadgeCount > 0;
  const sortOption =
    filters.sort && filters.sort !== 'recent'
      ? SORT_OPTIONS.find((option) => option.value === filters.sort) ?? null
      : null;
  const hasActiveFilters =
    Boolean(searchTerm.trim()) || filterBadgeCount > 0 || Boolean(sortOption);

  const isTicketsLoading = loading && tickets.length === 0;

  const connectionStatus = useMemo(() => {
    if (metadataLoading) {
      return { label: 'Carregando...', color: 'bg-gray-400' };
    }

    if (connections.length === 0) {
      return { label: 'Sem conexao', color: 'bg-gray-400' };
    }

    const primary =
      connections.find((connection) => connection.isDefault) ??
      connections.find((connection) => connection.status === 'CONNECTED') ??
      connections[0];

    const label = CONNECTION_LABEL[primary.status] ?? primary.status;
    const color = CONNECTION_COLOR[primary.status] ?? 'bg-gray-400';

    return { label, color };
  }, [connections, metadataLoading]);

  const overviewMetrics = useMemo(() => {
    const botCount = tickets.reduce((total, ticket) => (ticket.status === 'BOT' ? total + 1 : total), 0);
    const botFromDashboard =
      typeof dashboard?.tickets?.bot === 'number' ? dashboard.tickets.bot : null;
    const botLoading = metadataLoading || (botFromDashboard === null && isTicketsLoading);

    const getDisplayValue = (value: number | null | undefined, pending: boolean) => {
      if (pending) return '...';
      if (typeof value !== 'number') return '--';
      return numberFormatter.format(value);
    };

    return [
      {
        key: 'agents-online',
        label: 'Agentes online',
        displayValue: getDisplayValue(dashboard?.agents?.online ?? null, metadataLoading)
      },
      {
        key: 'tickets-open',
        label: 'Em atendimento',
        displayValue: getDisplayValue(dashboard?.tickets?.open ?? null, metadataLoading)
      },
      {
        key: 'tickets-pending',
        label: 'Pendentes',
        displayValue: getDisplayValue(dashboard?.tickets?.pending ?? null, metadataLoading)
      },
      {
        key: 'tickets-bot',
        label: 'No chatbot',
        displayValue: getDisplayValue(botFromDashboard ?? botCount, botLoading)
      }
    ];
  }, [dashboard, metadataLoading, tickets, isTicketsLoading]);


  useEffect(() => {
    fetchQueues();
    fetchTags();
  }, [fetchQueues, fetchTags]);
  useEffect(() => {
    if (!showFilterMenu && !showSortMenu) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showFilterMenu && filterMenuRef.current && !filterMenuRef.current.contains(target)) {
        setShowFilterMenu(false);
      }
      if (showSortMenu && sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterMenu, showSortMenu]);

  const handleSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await setFilter('search', searchTerm.trim() || undefined);
  };

  const handleStatusToggle = async (value: string) => {
    const current = filters.status ?? [...DEFAULT_STATUS_FILTERS];
    const exists = current.includes(value);
    const next = exists ? current.filter((status) => status !== value) : [...current, value];
    const ordered = STATUS_OPTIONS.filter((option) => next.includes(option.value)).map((option) => option.value);

    const currentOrdered = STATUS_OPTIONS.filter((option) => current.includes(option.value)).map(
      (option) => option.value
    );
    const hasChanged =
      ordered.length !== currentOrdered.length ||
      ordered.some((status, index) => status !== currentOrdered[index]);

    if (!hasChanged) return;

    await setFilter('status', ordered);
  };

  const toggleTag = async (tagId: string) => {
    const nextTags = activeTagIds.includes(tagId)
      ? activeTagIds.filter((id) => id !== tagId)
      : [...activeTagIds, tagId];
    await setFilter('tagIds', nextTags);
  };

  const handleQueueFilterSelect = async (queueId?: string) => {
    await setFilter('queueId', queueId || undefined);
  };

  const handleSortSelect = async (value: string) => {
    const nextValue = filters.sort === value ? undefined : value;
    await setFilter('sort', nextValue);
    setShowSortMenu(false);
  };

  const handleResetFilters = async () => {
    setSearchTerm('');
    setShowFilterMenu(false);
    setShowSortMenu(false);
    setActiveFilterCategory('tags');
    await clearFilters();
  };

  const resetManualForm = () => {
    setManualPhone('');
    setManualName('');
    setManualQueueId('');
    setManualPriority('MEDIUM');
    setManualTicketType('WHATSAPP');
    setManualEmail('');
    setManualTagIds([]);
    setManualCarPlate('');
    setMatchedContactName(null);
    setManualError(null);
  };

  const openCreateModal = () => {
    resetManualForm();
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    resetManualForm();
  };

  const handleManualTagToggle = (tagId: string) => {
    setManualTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

const handleCarPlateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const sanitized = normalizeCarPlate(event.target.value);
  setManualCarPlate(sanitized);
};

  const handlePhoneBlur = async () => {
    const digits = manualPhone.replace(/\D/g, '');

    if (digits.length < 10) {
      setMatchedContactName(null);
      return;
    }

    try {
      const response = await api.get<ContactMatch[]>('/contacts', { params: { search: digits } });
      const match = response.data.find((contact) => contact.phoneNumber === digits);

      if (match) {
        setMatchedContactName(match.name);
        setManualName('');
      } else {
        setMatchedContactName(null);
      }
    } catch (error) {
      console.error('Erro ao buscar contato:', error);
    }
  };

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setManualError(null);

    const digits = manualPhone.replace(/\D/g, '');

    if (digits.length < 10 || digits.length > 14) {
      setManualError('Informe um telefone valido com DDD.');
      return;
    }

    if (!matchedContactName) {
      const trimmedName = manualName.trim();
      if (!trimmedName) {
        setManualError('Informe o nome completo do contato.');
        return;
      }
      const parts = trimmedName.split(/\s+/);
      if (parts.length < 2) {
        setManualError('Informe nome e sobrenome.');
        return;
      }
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = manualEmail.trim();
    if (manualTicketType === 'EMAIL') {
      if (!trimmedEmail) {
        setManualError('Informe um email para tickets de e-mail.');
        return;
      }
      if (!emailPattern.test(trimmedEmail)) {
        setManualError('Informe um email valido.');
        return;
      }
    } else if (trimmedEmail && !emailPattern.test(trimmedEmail)) {
      setManualError('Informe um email valido.');
      return;
    }

    const normalizedPlate = normalizeCarPlate(manualCarPlate);
    if (!isValidCarPlate(normalizedPlate)) {
      setManualError('Placa invalida. Use o formato ABC1D23.');
      return;
    }

    setManualLoading(true);
    try {
      const createdId = await createManualTicket({
        phoneNumber: digits,
        name: matchedContactName ? undefined : manualName.trim(),
        queueId: manualQueueId || undefined,
        priority: manualPriority,
        tagIds: manualTagIds,
        carPlate: normalizedPlate,
        type: manualTicketType,
        email: trimmedEmail || undefined
      });

      await fetchTickets();
      if (createdId) {
        await selectTicket(createdId);
      }

      toast.success('Ticket criado com sucesso');
      closeCreateModal();
    } catch (error) {
      setManualError(getApiErrorMessage(error, 'Erro ao criar ticket'));
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <>
      <div
        className={`flex flex-col bg-white ${isMobileVariant ? 'h-full w-full border-none shadow-none' : 'border-r border-gray-200'}`}
        style={isMobileVariant ? undefined : { width: 'clamp(320px, 27vw, 420px)' }}
      >
        <div className="border-b border-gray-200 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <span className="text-[11px] font-semibold uppercase text-gray-500">Status da conexao</span>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                <span className={`h-2.5 w-2.5 rounded-full ${connectionStatus.color}`} />
                {metadataLoading ? '...' : connectionStatus.label}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {overviewMetrics.map((metric) => (
                <div key={metric.key} className="rounded-md border border-gray-200 bg-gray-50 px-2 py-2">
                  <span className="block text-[10px] font-semibold uppercase text-gray-500">{metric.label}</span>
                  <span className="mt-1 block text-sm font-semibold text-gray-900">{metric.displayValue}</span>
                </div>
              ))}
            </div>
          </div>
          <hr className="my-4 border-gray-200" />
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-gray-800">Atendimentos</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 whitespace-nowrap"
              >
                <Plus size={16} />
                Criar ticket
              </button>
              <button
                onClick={() => fetchTickets()}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-100"
                title="Atualizar lista"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="mb-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por contato, numero ou mensagem..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="group relative" ref={filterMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowFilterMenu((previous) => !previous);
                    setShowSortMenu(false);
                  }}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    filterButtonActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label="Filtrar atendimentos"
                >
                  <Filter size={16} />
                  {filterBadgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-md">
                      {filterBadgeCount}
                    </span>
                  )}
                </button>
                <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-700">
                  Filtrar
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full border-4 border-transparent border-b-gray-900 dark:border-b-slate-700" />
                </div>

                {showFilterMenu && (
                  <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-xl">
                    <div className="flex">
                      <div className="flex w-28 flex-col gap-1 border-r border-gray-100 p-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        <button
                          type="button"
                          onClick={() => setActiveFilterCategory('tags')}
                          className={`rounded-lg px-2 py-1 text-left transition ${
                            activeFilterCategory === 'tags' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100'
                          }`}
                        >
                          Tags
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveFilterCategory('status')}
                          className={`rounded-lg px-2 py-1 text-left transition ${
                            activeFilterCategory === 'status' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100'
                          }`}
                        >
                          Status
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveFilterCategory('queues')}
                          className={`rounded-lg px-2 py-1 text-left transition ${
                            activeFilterCategory === 'queues' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100'
                          }`}
                        >
                          Filas
                        </button>
                      </div>
                      <div className="flex-1 p-3">
                        {activeFilterCategory === 'tags' && (
                          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                            {tags.length === 0 ? (
                              <p className="text-xs text-gray-500">Nenhuma tag cadastrada.</p>
                            ) : (
                              tags.map((tag) => {
                                const checked = activeTagIds.includes(tag.id);
                                return (
                                  <label
                                    key={tag.id}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-xs hover:border-primary/30"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleTag(tag.id)}
                                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <span className="flex items-center gap-2">
                                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                      {tag.name}
                                    </span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        )}

                        {activeFilterCategory === 'status' && (
                          <div className="space-y-2">
                            {STATUS_OPTIONS.map((option) => {
                              const active = activeStatuses.includes(option.value);
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => void handleStatusToggle(option.value)}
                                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${
                                    active
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span
                                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                        active ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 text-gray-400'
                                      }`}
                                    >
                                      {active && <Check size={12} />}
                                    </span>
                                    {option.label}
                                  </span>
                                </button>
                              );
                            })}
                            {hasCustomStatus && (
                              <button
                                type="button"
                                onClick={() => void setFilter('status', [...DEFAULT_STATUS_FILTERS])}
                                className="w-full rounded-lg bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-100"
                              >
                                Restaurar padrão
                              </button>
                            )}
                          </div>
                        )}

                        {activeFilterCategory === 'queues' && (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => handleQueueFilterSelect()}
                              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${
                                !filters.queueId ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              Todas as filas
                            </button>
                            {queues.length === 0 ? (
                              <p className="text-xs text-gray-500">Nenhuma fila cadastrada.</p>
                            ) : (
                              queues.map((queue) => {
                                const active = filters.queueId === queue.id;
                                return (
                                  <button
                                    key={queue.id}
                                    type="button"
                                    onClick={() => handleQueueFilterSelect(queue.id)}
                                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${
                                      active ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: queue.color }} />
                                      {queue.name}
                                    </span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="group relative" ref={sortMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSortMenu((previous) => !previous);
                    setShowFilterMenu(false);
                  }}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    sortOption ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label="Classificar atendimentos"
                >
                  <ArrowUpDown size={16} />
                  {sortOption && <span className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-primary shadow-md" />}
                </button>
                <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-700">
                  Classificar
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full border-4 border-transparent border-b-gray-900 dark:border-b-slate-700" />
                </div>

                {showSortMenu && (
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                    {SORT_OPTIONS.map((option) => {
                      const active = filters.sort === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleSortSelect(option.value)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                            active ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {option.label}
                          {active && <span className="text-[10px] font-semibold uppercase text-primary">Ativo</span>}
                        </button>
                      );
                    })}
                    {filters.sort && (
                      <button
                        type="button"
                        onClick={() => handleSortSelect(filters.sort!)}
                        className="mt-1 w-full rounded-lg bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-100"
                      >
                        Limpar classificacao
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="group relative">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  disabled={!hasActiveFilters}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Resetar filtros"
                >
                  <X size={14} />
                </button>
                <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-700">
                  Resetar
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full border-4 border-transparent border-b-gray-900 dark:border-b-slate-700" />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-gray-500">
              <MessageSquare size={48} className="mb-2 opacity-40" />
              <p className="text-sm font-semibold">Nenhum atendimento encontrado</p>
              <p className="text-xs text-gray-400">Ajuste os filtros ou aguarde novas mensagens.</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <TicketItem
                key={ticket.id}
                ticket={ticket}
                isSelected={selectedTicket?.id === ticket.id}
                onSelect={selectTicket}
              />
            ))
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Criar ticket</h2>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500">Canal</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['WHATSAPP', 'EMAIL', 'SMS'] as const).map((option) => {
                    const isActive = manualTicketType === option;
                    const label =
                      option === 'WHATSAPP' ? 'WhatsApp' : option === 'EMAIL' ? 'E-mail' : 'SMS';
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setManualTicketType(option)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                          isActive
                            ? 'border-primary bg-primary text-white shadow-sm'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Telefone</label>
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(event) => setManualPhone(event.target.value)}
                  onBlur={handlePhoneBlur}
                  placeholder="51999999999"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
                {matchedContactName ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Contato encontrado: <span className="font-semibold text-gray-700">{matchedContactName}</span>
                  </p>
                ) : manualTicketType === 'EMAIL' ? (
                  <p className="mt-1 text-xs text-gray-400">
                    Utilize o telefone para localizar o contato. O envio sera realizado por e-mail.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">Informe o telefone com DDD.</p>
                )}
              </div>

              {!matchedContactName && (
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Nome completo</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(event) => setManualName(event.target.value)}
                    placeholder="Maria da Silva"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">
                  E-mail{' '}
                  <span className="text-[10px] font-medium text-gray-400">
                    {manualTicketType === 'EMAIL' ? 'Obrigatorio' : 'Opcional'}
                  </span>
                </label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(event) => setManualEmail(event.target.value)}
                  placeholder="contato@email.com"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required={manualTicketType === 'EMAIL'}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Placa do carro</label>
                <input
                  type="text"
                  value={manualCarPlate}
                  onChange={handleCarPlateChange}
                  placeholder="ABC1D23"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Fila</label>
                  <select
                    value={manualQueueId}
                    onChange={(event) => setManualQueueId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Sem fila</option>
                    {queues.map((queue) => (
                      <option key={queue.id} value={queue.id}>
                        {queue.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Prioridade</label>
                  <select
                    value={manualPriority}
                    onChange={(event) => setManualPriority(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Tags</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhuma tag cadastrada.</p>
                  ) : (
                    tags.map((tag) => {
                      const active = manualTagIds.includes(tag.id);
                      return (
                        <button
                          type="button"
                          key={tag.id}
                          onClick={() => handleManualTagToggle(tag.id)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            active
                              ? 'bg-primary text-white'
                              : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          #{tag.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {manualError && <p className="text-sm text-red-500">{manualError}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                  disabled={manualLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={manualLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
                >
                  {manualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}








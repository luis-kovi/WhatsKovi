'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search,
  Filter,
  Clock,
  Trash2,
  Loader2,
  MessageSquare,
  User,
  Users,
  ArrowRight
} from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store/authStore';
import { useMetadataStore } from '@/store/metadataStore';
import { useUserStore } from '@/store/userStore';
import {
  useSearchStore,
  type SearchType,
  type SearchHistoryItem,
  type MessageSearchResult,
  type TicketSearchResult,
  type ContactSearchResult
} from '@/store/searchStore';

const formatRelative = (value: string) =>
  formatDistanceToNow(new Date(value), { addSuffix: true, locale: ptBR });

const highlightSnippet = (snippet: string) => {
  const segments: Array<{ text: string; highlight: boolean }> = [];
  const markerRegex = /<\/?mark>/g;
  let lastIndex = 0;
  let highlight = false;
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(snippet)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: snippet.slice(lastIndex, match.index), highlight });
    }
    highlight = match[0] === '<mark>';
    lastIndex = markerRegex.lastIndex;
  }

  if (lastIndex < snippet.length) {
    segments.push({ text: snippet.slice(lastIndex), highlight });
  }

  if (segments.length === 0) {
    return <span>{snippet}</span>;
  }

  return (
    <>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark key={`${segment.text}-${index}`} className="rounded bg-primary/10 px-1 text-primary">
            {segment.text}
          </mark>
        ) : (
          <span key={`${segment.text}-${index}`}>{segment.text}</span>
        )
      )}
    </>
  );
};

const buildHistoryFilters = (item: SearchHistoryItem, fallbackTypes: SearchType[]) => {
  const filters = item.filters ?? {};

  const extractArray = (key: string): string[] => {
    const value = filters[key];
    if (Array.isArray(value)) {
      return value
        .map((entry) => (typeof entry === 'string' ? entry : undefined))
        .filter((entry): entry is string => Boolean(entry));
    }
    return [];
  };

  const extractDate = (key: string): string | undefined => {
    const value = filters[key];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  };

  const typesValue = extractArray('types') as SearchType[];

  return {
    types: typesValue.length ? typesValue : fallbackTypes,
    queueIds: extractArray('queueIds'),
    userIds: extractArray('userIds'),
    tagIds: extractArray('tagIds'),
    dateFrom: extractDate('dateFrom'),
    dateTo: extractDate('dateTo')
  };
};

const TypeBadge = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      active ? 'bg-primary text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100'
    }`}
  >
    {label}
  </button>
);

const ResultGroup = ({
  title,
  icon: Icon,
  count,
  children
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
    <header className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      </div>
      <span className="text-sm font-medium text-gray-500">{count} resultado{count === 1 ? '' : 's'}</span>
    </header>
    <div>{children}</div>
  </section>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
    <Search className="mb-2 h-6 w-6 text-gray-400" />
    <p>{message}</p>
  </div>
);

export default function AdvancedSearchPage() {
  const router = useRouter();
  const loadUser = useAuthStore((state) => state.loadUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const fetchQueues = useMetadataStore((state) => state.fetchQueues);
  const fetchTags = useMetadataStore((state) => state.fetchTags);
  const queues = useMetadataStore((state) => state.queues);
  const tags = useMetadataStore((state) => state.tags);

  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const users = useUserStore((state) => state.users);

  const term = useSearchStore((state) => state.term);
  const setTerm = useSearchStore((state) => state.setTerm);
  const filters = useSearchStore((state) => state.filters);
  const setFilters = useSearchStore((state) => state.setFilters);
  const toggleType = useSearchStore((state) => state.toggleType);
  const resetFilters = useSearchStore((state) => state.resetFilters);
  const search = useSearchStore((state) => state.search);
  const results = useSearchStore((state) => state.results);
  const loading = useSearchStore((state) => state.loading);
  const error = useSearchStore((state) => state.error);
  const history = useSearchStore((state) => state.history);
  const fetchHistory = useSearchStore((state) => state.fetchHistory);
  const clearHistory = useSearchStore((state) => state.clearHistory);

  const filterSignature = useMemo(
    () =>
      [
        filters.types.join(','),
        filters.queueIds.join(','),
        filters.userIds.join(','),
        filters.tagIds.join(','),
        filters.dateFrom ?? '',
        filters.dateTo ?? ''
      ].join('|'),
    [
      filters.types,
      filters.queueIds,
      filters.userIds,
      filters.tagIds,
      filters.dateFrom,
      filters.dateTo
    ]
  );

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

    void Promise.all([fetchQueues(), fetchTags(), fetchUsers(), fetchHistory()]);
  }, [isAuthenticated, router, fetchQueues, fetchTags, fetchUsers, fetchHistory]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const debounce = setTimeout(() => {
      void search();
    }, 350);

    return () => clearTimeout(debounce);
  }, [isAuthenticated, term, filterSignature, search]);

  const hasResults =
    results.messages.items.length > 0 || results.contacts.items.length > 0 || results.tickets.items.length > 0;

  const activeTypeSet = useMemo(() => new Set(filters.types), [filters.types]);

  const handleToggleArray = (key: 'queueIds' | 'userIds' | 'tagIds', value: string) => {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((id) => id !== value) : [...current, value];
    setFilters({ [key]: next } as Partial<typeof filters>);
  };

  const handleHistorySelection = (item: SearchHistoryItem) => {
    const nextFilters = buildHistoryFilters(item, filters.types);
    setTerm(item.term);
    setFilters(nextFilters);
  };

  const renderMessageItem = (item: MessageSearchResult) => (
    <li key={item.id} className="group rounded-xl border border-gray-200 p-4 transition hover:border-primary/40 hover:shadow">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span>{item.contactName}</span>
            {item.queueName && (
              <>
                <span className="text-gray-300">•</span>
                <span>{item.queueName}</span>
              </>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-700">{highlightSnippet(item.snippet)}</p>
        </div>
        <div className="text-xs text-gray-400">{formatRelative(item.createdAt)}</div>
      </div>
    </li>
  );

  const renderTicketItem = (item: TicketSearchResult) => (
    <li key={item.id} className="group rounded-xl border border-gray-200 p-4 transition hover:border-primary/40 hover:shadow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4 text-secondary" />
            <span>{item.contactName}</span>
            {item.queueName && (
              <>
                <span className="text-gray-300">•</span>
                <span>{item.queueName}</span>
              </>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-700">{highlightSnippet(item.snippet)}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
              Prioridade: {item.priority}
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-600">
              Status: {item.status}
            </span>
            {item.userName && (
              <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">
                Agente: {item.userName}
              </span>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-400">{formatRelative(item.lastMessageAt)}</div>
      </div>
    </li>
  );

  const renderContactItem = (item: ContactSearchResult) => (
    <li key={item.id} className="group rounded-xl border border-gray-200 p-4 transition hover:border-primary/40 hover:shadow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <User className="h-4 w-4 text-amber-500" />
            <span>{item.name}</span>
            <span className="text-gray-300">•</span>
            <span>{item.phoneNumber}</span>
          </div>
          <p className="mt-2 text-sm text-gray-700">{highlightSnippet(item.snippet)}</p>
          {item.tagIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
              {item.tagIds.map((tagId) => {
                const tag = tags.find((entry) => entry.id === tagId);
                return (
                  <span key={tagId} className="rounded-full bg-gray-100 px-2 py-1">
                    #{tag?.name ?? tagId}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="text-xs text-gray-400">
          Atualizado {item.updatedAt ? formatRelative(item.updatedAt) : '-'}
        </div>
      </div>
    </li>
  );

  return (
    <div className="flex min-h-screen bg-gray-100 transition-colors duration-300 dark:bg-slate-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-gray-200 bg-white px-8 py-6 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
              <Search className="h-4 w-4 text-primary" />
              <span>Busca global</span>
              {results.took > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{results.took} ms</span>
                </>
              )}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Pesquise por mensagens, contatos, tickets..."
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-4 pl-12 pr-12 text-lg text-gray-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
              {term && (
                <button
                  onClick={() => setTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-primary transition hover:text-primary/70"
                >
                  Limpar
                </button>
              )}
            </div>
            {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
          </div>
        </header>

        <main className="flex flex-1 overflow-hidden">
          <aside className="flex w-80 flex-col border-r border-gray-200 bg-gray-50 p-6">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Histórico
                </div>
                {history.length > 0 && (
                  <button
                    onClick={() => void clearHistory()}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 transition hover:text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                    Limpar
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {history.length === 0 ? (
                  <p className="text-xs text-gray-400">As pesquisas recentes aparecerão aqui.</p>
                ) : (
                  history.slice(0, 10).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleHistorySelection(item)}
                      className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-600 transition hover:border-primary/50 hover:text-primary"
                    >
                      <span className="line-clamp-1">{item.term}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="mt-6 border-t border-gray-200 pt-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Filter className="h-4 w-4 text-gray-500" />
                Filtros avançados
              </div>

              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <p className="mb-2 font-medium text-gray-700">Tipos</p>
                  <div className="flex flex-wrap gap-2">
                    <TypeBadge
                      label="Mensagens"
                      active={activeTypeSet.has('messages')}
                      onClick={() => toggleType('messages')}
                    />
                    <TypeBadge
                      label="Tickets"
                      active={activeTypeSet.has('tickets')}
                      onClick={() => toggleType('tickets')}
                    />
                    <TypeBadge
                      label="Contatos"
                      active={activeTypeSet.has('contacts')}
                      onClick={() => toggleType('contacts')}
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-2 font-medium text-gray-700">Filas</p>
                  <div className="flex flex-wrap gap-2">
                    {queues.map((queue) => (
                      <button
                        key={queue.id}
                        onClick={() => handleToggleArray('queueIds', queue.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          filters.queueIds.includes(queue.id)
                            ? 'bg-primary text-white shadow'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {queue.name}
                      </button>
                    ))}
                    {queues.length === 0 && <p className="text-xs text-gray-400">Nenhuma fila cadastrada.</p>}
                  </div>
                </div>

                <div>
                  <p className="mb-2 font-medium text-gray-700">Agentes</p>
                  <div className="flex flex-wrap gap-2">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleToggleArray('userIds', user.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          filters.userIds.includes(user.id)
                            ? 'bg-secondary text-white shadow'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {user.name}
                      </button>
                    ))}
                    {users.length === 0 && <p className="text-xs text-gray-400">Nenhum agente disponível.</p>}
                  </div>
                </div>

                <div>
                  <p className="mb-2 font-medium text-gray-700">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleToggleArray('tagIds', tag.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          filters.tagIds.includes(tag.id)
                            ? 'bg-amber-100 text-amber-700 shadow'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        #{tag.name}
                      </button>
                    ))}
                    {tags.length === 0 && <p className="text-xs text-gray-400">Nenhuma tag cadastrada.</p>}
                  </div>
                </div>

                <div>
                  <p className="mb-2 font-medium text-gray-700">Período</p>
                  <div className="flex flex-col gap-2 text-xs">
                    <input
                      type="date"
                      value={filters.dateFrom ?? ''}
                      onChange={(event) => setFilters({ dateFrom: event.target.value || undefined })}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                    />
                    <input
                      type="date"
                      value={filters.dateTo ?? ''}
                      onChange={(event) => setFilters({ dateTo: event.target.value || undefined })}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <button
                  onClick={() => resetFilters()}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-primary/50 hover:text-primary"
                >
                  Limpar filtros
                </button>
              </div>
            </section>
          </aside>

          <section className="flex-1 overflow-y-auto px-8 py-6">
            {loading && (
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Buscando resultados...</span>
              </div>
            )}

            {!loading && !hasResults && term.length >= 2 && (
              <EmptyState message="Nenhum resultado encontrado para a busca atual." />
            )}

            {!loading && term.length < 2 && (
              <EmptyState message="Digite pelo menos 2 caracteres para iniciar a busca." />
            )}

            {hasResults && (
              <div className="space-y-6">
                <ResultGroup title="Mensagens" icon={MessageSquare} count={results.messages.count}>
                  {results.messages.items.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma mensagem encontrada com os filtros atuais.</p>
                  ) : (
                    <ul className="space-y-3">{results.messages.items.map(renderMessageItem)}</ul>
                  )}
                </ResultGroup>

                <ResultGroup title="Tickets" icon={Users} count={results.tickets.count}>
                  {results.tickets.items.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum ticket encontrado com os filtros atuais.</p>
                  ) : (
                    <ul className="space-y-3">{results.tickets.items.map(renderTicketItem)}</ul>
                  )}
                </ResultGroup>

                <ResultGroup title="Contatos" icon={User} count={results.contacts.count}>
                  {results.contacts.items.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum contato encontrado com os filtros atuais.</p>
                  ) : (
                    <ul className="space-y-3">{results.contacts.items.map(renderContactItem)}</ul>
                  )}
                </ResultGroup>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

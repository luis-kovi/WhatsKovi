import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Edit3,
  Filter,
  Plus,
  RefreshCw,
  Trash2
} from 'lucide-react';
import {
  QuickReplyCategory,
  QuickReplyItem,
  useQuickReplyStore
} from '@/store/quickReplyStore';
import { useMetadataStore } from '@/store/metadataStore';
import { useUserStore } from '@/store/userStore';
import { QuickReplyFormModal } from './QuickReplyFormModal';
import { QuickReplyCategoryFormModal } from './QuickReplyCategoryFormModal';

type QuickReplySettingsSectionProps = {
  className?: string;
};

const formatUsageDate = (value?: string | null) => {
  if (!value) return 'Nunca utilizada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Nunca utilizada';
  return date.toLocaleString('pt-BR');
};

export function QuickReplySettingsSection({ className }: QuickReplySettingsSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuickReply, setEditingQuickReply] = useState<QuickReplyItem | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<QuickReplyCategory | null>(null);

  const {
    quickReplies,
    categories,
    uncategorizedCount,
    stats,
    variables,
    fetchQuickReplies,
    fetchCategories,
    fetchStats,
    fetchVariables,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply,
    createCategory,
    updateCategory,
    deleteCategory
  } = useQuickReplyStore((state) => ({
    quickReplies: state.quickReplies,
    categories: state.categories,
    uncategorizedCount: state.uncategorizedCount,
    stats: state.stats,
    variables: state.variables,
    fetchQuickReplies: state.fetchQuickReplies,
    fetchCategories: state.fetchCategories,
    fetchStats: state.fetchStats,
    fetchVariables: state.fetchVariables,
    createQuickReply: state.createQuickReply,
    updateQuickReply: state.updateQuickReply,
    deleteQuickReply: state.deleteQuickReply,
    createCategory: state.createCategory,
    updateCategory: state.updateCategory,
    deleteCategory: state.deleteCategory
  }));

  const queues = useMetadataStore((state) => state.queues);
  const fetchQueues = useMetadataStore((state) => state.fetchQueues);

  const users = useUserStore((state) => state.users);
  const fetchUsers = useUserStore((state) => state.fetchUsers);

  useEffect(() => {
    fetchCategories()
      .catch(() => undefined);
    fetchVariables().catch(() => undefined);
    fetchStats().catch(() => undefined);
    fetchQuickReplies({ scope: 'all' }).catch(() => undefined);

    if (queues.length === 0) {
      fetchQueues().catch(() => undefined);
    }

    if (users.length === 0) {
      fetchUsers().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCategoryFilter((current) => {
      if (current === 'ALL') return current;
      if (current === 'UNCATEGORIZED') return current;
      const exists = categories.some((category) => category.id === current);
      return exists ? current : 'ALL';
    });
  }, [categories]);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        if (a.displayOrder === b.displayOrder) {
          return a.name.localeCompare(b.name);
        }
        return a.displayOrder - b.displayOrder;
      }),
    [categories]
  );

  const filteredQuickReplies = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return quickReplies.filter((reply) => {
      const matchesSearch =
        term.length === 0 ||
        reply.shortcut.toLowerCase().includes(term) ||
        reply.message.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (categoryFilter === 'ALL') return true;
      if (categoryFilter === 'UNCATEGORIZED') {
        return !reply.categoryId;
      }
      return reply.categoryId === categoryFilter;
    });
  }, [quickReplies, searchTerm, categoryFilter]);

  const groupedQuickReplies = useMemo(() => {
    const groups = new Map<string | null, QuickReplyItem[]>();
    filteredQuickReplies.forEach((reply) => {
      const key = reply.categoryId ?? null;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(reply);
    });
    return groups;
  }, [filteredQuickReplies]);

  const uncategorizedReplies = groupedQuickReplies.get(null) ?? [];

  const handleOpenCreateQuickReply = () => {
    setEditingQuickReply(null);
    setFormOpen(true);
  };

  const handleEditQuickReply = (quickReply: QuickReplyItem) => {
    setEditingQuickReply(quickReply);
    setFormOpen(true);
  };

  const handleSubmitQuickReply = async (payload: {
    shortcut: string;
    message: string;
    mediaUrl?: string | null;
    isGlobal: boolean;
    queueId?: string | null;
    ownerId?: string | null;
    categoryId?: string | null;
  }) => {
    if (editingQuickReply) {
      await updateQuickReply(editingQuickReply.id, payload);
    } else {
      await createQuickReply(payload);
    }
    await fetchQuickReplies({ scope: 'all' });
  };

  const handleDeleteQuickReply = async (quickReply: QuickReplyItem) => {
    const confirmed = window.confirm(
      `Deseja remover a resposta rapida "/${quickReply.shortcut}"?`
    );
    if (!confirmed) return;

    try {
      await deleteQuickReply(quickReply.id);
      toast.success('Resposta rapida removida.');
      await fetchQuickReplies({ scope: 'all' });
    } catch (error) {
      console.error('Erro ao remover resposta rapida:', error);
      toast.error('Nao foi possivel remover esta resposta.');
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryModalOpen(true);
  };

  const handleEditCategory = (category: QuickReplyCategory) => {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  };

  const handleSubmitCategory = async (payload: {
    name: string;
    color?: string | null;
    displayOrder?: number;
  }) => {
    const normalizedPayload = {
      name: payload.name,
      color: payload.color && payload.color.trim().length > 0 ? payload.color : undefined,
      displayOrder: payload.displayOrder
    };

    if (editingCategory) {
      await updateCategory(editingCategory.id, normalizedPayload);
    } else {
      await createCategory(normalizedPayload);
    }
    await fetchQuickReplies({ scope: 'all' });
  };

  const handleDeleteCategory = async (category: QuickReplyCategory) => {
    const confirmed = window.confirm(
      `Remover a categoria "${category.name}"? As respostas serao movidas para \"Sem categoria\".`
    );
    if (!confirmed) return;

    try {
      await deleteCategory(category.id);
      toast.success('Categoria removida.');
      await fetchQuickReplies({ scope: 'all' });
    } catch (error) {
      console.error('Erro ao remover categoria:', error);
      toast.error('Nao foi possivel remover a categoria.');
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      fetchQuickReplies({ scope: 'all' }),
      fetchCategories(),
      fetchStats()
    ]).catch(() => undefined);
  };

  const totalQuickReplies = stats?.totals.quickReplies ?? quickReplies.length;
  const totalUsage = stats?.totals.usage ?? quickReplies.reduce((acc, reply) => acc + (reply.usageCount ?? 0), 0);
  const totalCategories = stats?.totals.categories ?? categories.length;

  return (
    <section className={`rounded-3xl border border-gray-200 bg-white px-6 py-6 shadow-sm ${className ?? ''}`}>
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Respostas rapidas</p>
          <h2 className="text-2xl font-bold text-gray-900">Biblioteca de respostas personalizadas</h2>
          <p className="text-sm text-gray-500">
            Gerencie atalhos reutilizaveis, categorias e disponibilidade por fila ou atendente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={handleCreateCategory}
            className="inline-flex items-center gap-2 rounded-full border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
          >
            <Plus size={16} />
            Nova categoria
          </button>
          <button
            type="button"
            onClick={handleOpenCreateQuickReply}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            <Plus size={16} />
            Nova resposta
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
            <BarChart3 size={14} />
            Total de respostas
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalQuickReplies}</p>
          <p className="text-xs text-gray-500">
            {uncategorizedCount} sem categoria • {categories.length} categorias ativas
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
            <BarChart3 size={14} />
            Uso acumulado
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalUsage}</p>
          <p className="text-xs text-gray-500">
            {stats?.topQuickReplies?.[0]
              ? `Mais utilizada: /${stats.topQuickReplies[0].shortcut} (${stats.topQuickReplies[0].usageCount}x)`
              : 'Nenhuma resposta utilizada ainda.'}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
            <BarChart3 size={14} />
            Categorias
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalCategories}</p>
          <p className="text-xs text-gray-500">
            Ajude sua equipe a localizar respostas por assunto ou etapa do atendimento.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-inner">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Filter size={16} className="text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Busque por atalho ou conteudo"
              className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">Todas as categorias</option>
              <option value="UNCATEGORIZED">Sem categoria ({uncategorizedCount})</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.quickReplyCount ?? 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-6">
          {sortedCategories.map((category) => {
            const replies = groupedQuickReplies.get(category.id) ?? [];
            if (replies.length === 0) return null;

            return (
              <div key={category.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color ?? '#2563EB' }}
                    />
                    <h3 className="text-base font-semibold text-gray-800">{category.name}</h3>
                    <span className="text-xs font-semibold uppercase text-gray-400">
                      {replies.length} resposta(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditCategory(category)}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                    >
                      <Edit3 size={14} />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Remover
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                              /{reply.shortcut}
                            </span>
                            <span className="text-[11px] font-semibold uppercase text-gray-400">
                              {reply.usageCount} uso(s)
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-700">{reply.message}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase">
                            {reply.isGlobal ? (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-600">
                                Global
                              </span>
                            ) : (
                              <>
                                {reply.queue && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-gray-600">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: reply.queue.color }}
                                    />
                                    {reply.queue.name}
                                  </span>
                                )}
                                {reply.owner && (
                                  <span className="rounded-full border border-gray-200 px-2 py-1 text-gray-600">
                                    {reply.owner.name}
                                  </span>
                                )}
                              </>
                            )}
                            {reply.lastUsedAt && (
                              <span className="rounded-full border border-gray-200 px-2 py-1 text-gray-500">
                                Ultimo uso: {formatUsageDate(reply.lastUsedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditQuickReply(reply)}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                          >
                            <Edit3 size={14} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuickReply(reply)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {uncategorizedReplies.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-3 w-3 rounded-full bg-gray-400" />
                  <h3 className="text-base font-semibold text-gray-800">Sem categoria</h3>
                  <span className="text-xs font-semibold uppercase text-gray-400">
                    {uncategorizedReplies.length} resposta(s)
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {uncategorizedReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                            /{reply.shortcut}
                          </span>
                          <span className="text-[11px] font-semibold uppercase text-gray-400">
                            {reply.usageCount} uso(s)
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-700">{reply.message}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase">
                          {reply.isGlobal ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-600">
                              Global
                            </span>
                          ) : (
                            <>
                              {reply.queue && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-gray-600">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: reply.queue.color }}
                                  />
                                  {reply.queue.name}
                                </span>
                              )}
                              {reply.owner && (
                                <span className="rounded-full border border-gray-200 px-2 py-1 text-gray-600">
                                  {reply.owner.name}
                                </span>
                              )}
                            </>
                          )}
                          {reply.lastUsedAt && (
                            <span className="rounded-full border border-gray-200 px-2 py-1 text-gray-500">
                              Ultimo uso: {formatUsageDate(reply.lastUsedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditQuickReply(reply)}
                          className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                        >
                          <Edit3 size={14} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickReply(reply)}
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredQuickReplies.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
              Nenhuma resposta encontrada com os filtros atuais.
            </div>
          )}
        </div>
      </div>

      <QuickReplyFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmitQuickReply}
        initialValue={editingQuickReply}
        categories={sortedCategories}
        queues={queues}
        users={users}
        variables={variables}
      />

      <QuickReplyCategoryFormModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSubmit={handleSubmitCategory}
        initialValue={editingCategory}
      />
    </section>
  );
}

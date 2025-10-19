import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Check,
  Hash,
  Layers,
  Loader2,
  Search,
  Send,
  Sparkles,
  X
} from 'lucide-react';
import {
  RenderQuickReplyResult,
  useQuickReplyStore
} from '@/store/quickReplyStore';

type QuickReplyModalProps = {
  open: boolean;
  onClose: () => void;
  ticketId?: string;
  queueId?: string | null;
  onInsert: (message: string) => void;
};

const CATEGORY_ALL = 'ALL';
const CATEGORY_UNCATEGORIZED = 'UNCATEGORIZED';

export function QuickReplyModal({ open, onClose, ticketId, queueId, onInsert }: QuickReplyModalProps) {
  const {
    quickReplies,
    categories,
    uncategorizedCount,
    variables,
    fetchQuickReplies,
    fetchCategories,
    fetchVariables,
    renderQuickReply,
    registerQuickReplyUsage,
    loading
  } = useQuickReplyStore((state) => ({
    quickReplies: state.quickReplies,
    categories: state.categories,
    uncategorizedCount: state.uncategorizedCount,
    variables: state.variables,
    fetchQuickReplies: state.fetchQuickReplies,
    fetchCategories: state.fetchCategories,
    fetchVariables: state.fetchVariables,
    renderQuickReply: state.renderQuickReply,
    registerQuickReplyUsage: state.registerQuickReplyUsage,
    loading: state.loading
  }));

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(CATEGORY_ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<RenderQuickReplyResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;

    fetchCategories()
      .catch(() => undefined)
      .finally(() => undefined);
    fetchVariables().catch(() => undefined);
    setSearching(true);
    fetchQuickReplies({
      queueId: queueId ?? undefined,
      scope: 'available'
    })
      .catch(() => undefined)
      .finally(() => setSearching(false));
  }, [open, fetchCategories, fetchVariables, fetchQuickReplies, queueId]);

  useEffect(() => {
    if (!open) return;

    const handle = setTimeout(() => {
      setSearching(true);
      fetchQuickReplies({
        queueId: queueId ?? undefined,
        scope: 'available',
        search: search.trim().length > 0 ? search.trim() : undefined,
        categoryId:
          categoryFilter !== CATEGORY_ALL && categoryFilter !== CATEGORY_UNCATEGORIZED
            ? categoryFilter
            : undefined
      })
        .catch(() => undefined)
        .finally(() => setSearching(false));
    }, 250);

    return () => clearTimeout(handle);
  }, [search, categoryFilter, queueId, open, fetchQuickReplies]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setCategoryFilter(CATEGORY_ALL);
      setSelectedId(null);
      setPreview(null);
      setPreviewLoading(false);
    }
  }, [open]);

  const filteredQuickReplies = useMemo(() => {
    const byCategory = quickReplies.filter((reply) => {
      if (categoryFilter === CATEGORY_ALL) return true;
      if (categoryFilter === CATEGORY_UNCATEGORIZED) {
        return !reply.categoryId;
      }
      return reply.categoryId === categoryFilter;
    });

    if (search.trim().length === 0) return byCategory;

    const term = search.trim().toLowerCase();
    return byCategory.filter(
      (reply) =>
        reply.shortcut.toLowerCase().includes(term) ||
        reply.message.toLowerCase().includes(term)
    );
  }, [quickReplies, categoryFilter, search]);

  const selectedQuickReply = selectedId
    ? filteredQuickReplies.find((reply) => reply.id === selectedId)
    : null;

  const handleSelectQuickReply = async (replyId: string) => {
    if (selectedId === replyId && preview) return;
    setSelectedId(replyId);
    setPreviewLoading(true);
    try {
      const result = await renderQuickReply(replyId, { ticketId });
      setPreview(result);
    } catch (error) {
      console.error('Erro ao gerar preview da resposta rapida:', error);
      toast.error('Nao foi possivel gerar o preview desta resposta.');
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleInsertQuickReply = async () => {
    if (!selectedId || !ticketId) {
      return;
    }

    try {
      const result = await registerQuickReplyUsage(selectedId, { ticketId });
      onInsert(result.renderedMessage);
      toast.success('Resposta rapida inserida com sucesso.');
      onClose();
    } catch (error) {
      console.error('Erro ao inserir resposta rapida:', error);
      toast.error('Nao foi possivel inserir esta resposta.');
    }
  };

  if (!open) {
    return null;
  }

  const categoriesWithActions = [
    {
      id: CATEGORY_ALL,
      name: 'Todas',
      quickReplyCount: quickReplies.length,
      color: null
    },
    {
      id: CATEGORY_UNCATEGORIZED,
      name: 'Sem categoria',
      quickReplyCount: uncategorizedCount,
      color: null
    },
    ...categories
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 px-4 py-10">
      <div className="flex h-[620px] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles size={14} />
              Respostas rapidas avancadas
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Biblioteca de respostas configuradas
            </h2>
            <p className="text-sm text-gray-500">
              Utilize atalhos prontos com variaveis dinamicas para agilizar seu atendimento.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100"
            aria-label="Fechar modal de respostas rapidas"
          >
            <X size={18} />
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden px-6 py-5 lg:grid-cols-[320px_1fr]">
          <aside className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <Search size={16} className="text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Busque por atalho ou conteudo"
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                <Layers size={14} />
                Categorias
              </p>
              <div className="flex flex-wrap gap-2">
                {categoriesWithActions.map((category) => {
                  const active = category.id === categoryFilter;
                  const count = category.quickReplyCount ?? 0;
                  const color = category.color ?? '#2563EB';
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setCategoryFilter(category.id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? 'border-transparent bg-primary text-white shadow'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: active ? 'rgba(255,255,255,0.9)' : color }}
                      />
                      {category.name}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                <Hash size={14} />
                Atalhos disponíveis
              </p>

              <div className="mt-2 space-y-2">
                {searching || loading ? (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-8 text-sm text-gray-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando respostas...
                  </div>
                ) : filteredQuickReplies.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-6 text-sm text-gray-500">
                    Nenhuma resposta encontrada com os filtros atuais.
                  </div>
                ) : (
                  filteredQuickReplies.map((reply) => {
                    const active = reply.id === selectedId;
                    return (
                      <button
                        type="button"
                        key={reply.id}
                        onClick={() => handleSelectQuickReply(reply.id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                          active
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                            /{reply.shortcut}
                          </span>
                          {reply.usageCount > 0 && (
                            <span className="text-[11px] font-semibold text-gray-400">
                              {reply.usageCount}x
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-600">{reply.message}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase text-gray-400">
                          {reply.isGlobal && (
                            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                              Global
                            </span>
                          )}
                          {!reply.isGlobal && (
                            <>
                              {reply.queue && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-gray-500">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: reply.queue.color }}
                                  />
                                  {reply.queue.name}
                                </span>
                              )}
                              {reply.owner && (
                                <span className="rounded-full border border-gray-200 px-2 py-0.5 text-gray-500">
                                  {reply.owner.name}
                                </span>
                              )}
                            </>
                          )}
                          {reply.category && (
                            <span className="rounded-full border border-gray-200 px-2 py-0.5 text-gray-500">
                              {reply.category.name}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          <section className="flex h-full flex-col rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Preview</p>
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedQuickReply ? `/${selectedQuickReply.shortcut}` : 'Selecione uma resposta'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInsertQuickReply}
                  disabled={!selectedQuickReply || !ticketId || previewLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/40"
                >
                  {previewLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send size={16} />
                      Inserir resposta
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4 flex-1 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white">
              {previewLoading ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Gerando preview com variaveis dinamicas...
                </div>
              ) : !preview ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-500">
                  <Sparkles className="h-6 w-6" />
                  Escolha uma resposta para visualizar o conteudo renderizado.
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-primary">
                        <Check size={12} />
                        Variaveis aplicadas
                      </span>
                      {preview.variables.used.length > 0 ? (
                        preview.variables.used.map((variable) => (
                          <span
                            key={variable}
                            className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-500"
                          >
                            {variable}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-gray-400">Nenhuma variavel dinamica utilizada.</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto px-4 py-4 text-sm text-gray-700">
                    <p className="whitespace-pre-line leading-relaxed">{preview.renderedMessage}</p>
                  </div>
                  {preview.variables.missing.length > 0 && (
                    <div className="border-t border-orange-200 bg-orange-50 px-4 py-3 text-xs text-orange-700">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertCircle size={14} />
                        Variaveis sem dados
                      </div>
                      <p className="mt-1 text-[11px] text-orange-600">
                        Preencha as informacoes faltantes no ticket ou utilize um valor padrao ao montar a mensagem.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {preview.variables.missing.map((variable) => (
                          <span
                            key={variable}
                            className="rounded-full border border-orange-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-orange-600"
                          >
                            {variable}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase text-gray-500">Variaveis disponiveis</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {variables.length === 0 ? (
                  <span className="text-[11px] text-gray-400">
                    As variaveis serao carregadas automaticamente quando disponiveis.
                  </span>
                ) : (
                  variables.map((variable) => (
                    <span
                      key={variable.key}
                      className="group relative rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-600"
                    >
                      {variable.key}
                      <span className="pointer-events-none absolute left-1/2 top-full z-10 hidden w-60 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-normal text-white shadow-lg group-hover:block">
                        <span className="block font-semibold text-primary-100">{variable.label}</span>
                        <span className="block opacity-90">{variable.description}</span>
                        {variable.example && (
                          <span className="mt-1 block text-[10px] text-primary-100/70">
                            Exemplo: {variable.example}
                          </span>
                        )}
                      </span>
                    </span>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

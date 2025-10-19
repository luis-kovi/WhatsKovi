import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { Queue } from '@/store/metadataStore';
import { User } from '@/store/userStore';
import {
  QuickReplyCategory,
  QuickReplyItem,
  QuickReplyVariable
} from '@/store/quickReplyStore';

type QuickReplyScope = 'GLOBAL' | 'QUEUE' | 'USER';

const SCOPE_OPTIONS: Array<{ value: QuickReplyScope; label: string }> = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'QUEUE', label: 'Por fila' },
  { value: 'USER', label: 'Por atendente' }
];

const SCOPE_DESCRIPTIONS: Record<QuickReplyScope, string> = {
  GLOBAL: 'Disponivel para todos os atendentes',
  QUEUE: 'Restrita a uma fila especifica',
  USER: 'Restrita a um atendente especifico'
};

type QuickReplyFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    shortcut: string;
    message: string;
    mediaUrl?: string | null;
    isGlobal: boolean;
    queueId?: string | null;
    ownerId?: string | null;
    categoryId?: string | null;
  }) => Promise<void>;
  initialValue?: QuickReplyItem | null;
  categories: QuickReplyCategory[];
  queues: Queue[];
  users: User[];
  variables: QuickReplyVariable[];
};

export function QuickReplyFormModal({
  open,
  onClose,
  onSubmit,
  initialValue,
  categories,
  queues,
  users,
  variables
}: QuickReplyFormModalProps) {
  const [shortcut, setShortcut] = useState('');
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [scope, setScope] = useState<QuickReplyScope>('GLOBAL');
  const [queueId, setQueueId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setShortcut(initialValue?.shortcut ?? '');
    setMessage(initialValue?.message ?? '');
    setMediaUrl(initialValue?.mediaUrl ?? '');
    setCategoryId(initialValue?.categoryId ?? null);

    if (!initialValue) {
      setScope('GLOBAL');
      setQueueId(null);
      setOwnerId(null);
      return;
    }

    if (initialValue.isGlobal) {
      setScope('GLOBAL');
      setQueueId(null);
      setOwnerId(null);
      return;
    }

    if (initialValue.queueId) {
      setScope('QUEUE');
      setQueueId(initialValue.queueId);
      setOwnerId(null);
      return;
    }

    if (initialValue.ownerId || initialValue.owner?.id) {
      setScope('USER');
      setOwnerId(initialValue.ownerId ?? initialValue.owner?.id ?? null);
      setQueueId(null);
      return;
    }

    setScope('GLOBAL');
    setQueueId(null);
    setOwnerId(null);
  }, [open, initialValue]);

  const selectedScopeLabel = useMemo(() => {
    switch (scope) {
      case 'GLOBAL':
        return 'Disponivel para todos os atendentes';
      case 'QUEUE':
        return 'Disponivel apenas para a fila selecionada';
      case 'USER':
        return 'Disponivel apenas para o atendente selecionado';
      default:
        return '';
    }
  }, [scope]);

  const handleInsertVariable = (variableKey: string) => {
    setMessage((current) => {
      const template = `{{${variableKey}}}`;
      if (!current) return template;
      if (current.endsWith(' ') || current.endsWith('\n')) {
        return `${current}${template}`;
      }
      return `${current} ${template}`;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedShortcut = shortcut.trim();
    const trimmedMessage = message.trim();

    if (trimmedShortcut.length === 0) {
      toast.error('Informe um atalho para a resposta.');
      return;
    }

    if (trimmedMessage.length === 0) {
      toast.error('Informe o conteudo da mensagem.');
      return;
    }

    if (scope === 'QUEUE' && !queueId) {
      toast.error('Selecione a fila que tera acesso a esta resposta.');
      return;
    }

    if (scope === 'USER' && !ownerId) {
      toast.error('Selecione o atendente que podera usar esta resposta.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        shortcut: trimmedShortcut,
        message: trimmedMessage,
        mediaUrl: mediaUrl.trim().length > 0 ? mediaUrl.trim() : null,
        categoryId: categoryId ?? null,
        isGlobal: scope === 'GLOBAL',
        queueId: scope === 'QUEUE' ? queueId : null,
        ownerId: scope === 'USER' ? ownerId : null
      });
      toast.success(initialValue ? 'Resposta atualizada com sucesso.' : 'Resposta criada com sucesso.');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar resposta rapida:', error);
      toast.error('Nao foi possivel salvar esta resposta. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/70 px-4 py-10">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles size={14} />
              {initialValue ? 'Editar resposta rapida' : 'Nova resposta rapida'}
            </p>
            <h2 className="text-xl font-bold text-gray-900">
              {initialValue ? `/${initialValue.shortcut}` : 'Configure um atalho'}
            </h2>
            <p className="text-sm text-gray-500">
              Utilize variaveis dinamicas para personalizar a mensagem automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100"
            aria-label="Fechar editor de resposta rapida"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <label className="flex flex-col gap-2 text-sm font-semibold text-gray-700">
              Atalho
              <input
                value={shortcut}
                onChange={(event) => setShortcut(event.target.value)}
                placeholder="Ex: boasvindas"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-gray-700">
              Categoria
              <select
                value={categoryId ?? ''}
                onChange={(event) => setCategoryId(event.target.value || null)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-semibold text-gray-700">
            Mensagem
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              placeholder="Escreva a mensagem que sera enviada ao selecionar este atalho..."
              className="rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-gray-500">Variaveis dinamicas</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {variables.length === 0 ? (
                <span className="text-[11px] text-gray-400">Nenhuma variavel carregada.</span>
              ) : (
                variables.map((variable) => (
                  <button
                    key={variable.key}
                    type="button"
                    onClick={() => handleInsertVariable(variable.key)}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-600 transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                  >
                    {variable.key}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 px-4 py-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Disponibilidade</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {SCOPE_OPTIONS.map((option) => {
                const active = scope === option.value;
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => setScope(option.value)}
                    className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      active
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 text-gray-600 hover:border-primary/60 hover:bg-primary/5'
                    }`}
                  >
                    <span>{option.label}</span>
                    <span className="text-xs font-normal text-gray-400">
                      {SCOPE_DESCRIPTIONS[option.value]}
                    </span>
                  </button>
                );
              })}
            </div>

            {scope === 'QUEUE' && (
              <div className="mt-3">
                <label className="text-xs font-semibold uppercase text-gray-500">
                  Selecione a fila
                </label>
                <select
                  value={queueId ?? ''}
                  onChange={(event) => setQueueId(event.target.value || null)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Escolha uma fila</option>
                  {queues.map((queue) => (
                    <option key={queue.id} value={queue.id}>
                      {queue.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {scope === 'USER' && (
              <div className="mt-3">
                <label className="text-xs font-semibold uppercase text-gray-500">
                  Selecione o atendente
                </label>
                <select
                  value={ownerId ?? ''}
                  onChange={(event) => setOwnerId(event.target.value || null)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Escolha um atendente</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <p className="mt-3 text-xs text-gray-500">{selectedScopeLabel}</p>
          </div>

          <label className="flex flex-col gap-2 text-sm font-semibold text-gray-700">
            Anexo (URL opcional)
            <input
              value={mediaUrl}
              onChange={(event) => setMediaUrl(event.target.value)}
              placeholder="https://..."
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-xs font-normal text-gray-400">
              Informe uma URL publica de imagem, video ou documento que sera anexado automaticamente.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/40"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? 'Salvando...' : 'Salvar resposta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

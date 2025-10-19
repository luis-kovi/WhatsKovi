import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Layers, X } from 'lucide-react';
import { QuickReplyCategory } from '@/store/quickReplyStore';

type QuickReplyCategoryFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; color?: string | null; displayOrder?: number }) => Promise<void>;
  initialValue?: QuickReplyCategory | null;
};

export function QuickReplyCategoryFormModal({
  open,
  onClose,
  onSubmit,
  initialValue
}: QuickReplyCategoryFormModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2563EB');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialValue?.name ?? '');
    setColor(initialValue?.color ?? '#2563EB');
    setDisplayOrder(initialValue?.displayOrder ?? 0);
  }, [open, initialValue]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      toast.error('Informe um nome para a categoria.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: trimmedName,
        color,
        displayOrder
      });
      toast.success(initialValue ? 'Categoria atualizada.' : 'Categoria criada com sucesso.');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar categoria de resposta rapida:', error);
      toast.error('Nao foi possivel salvar a categoria.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/70 px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Layers size={14} />
              {initialValue ? 'Editar categoria' : 'Nova categoria'}
            </p>
            <h2 className="text-lg font-semibold text-gray-900">
              {initialValue ? initialValue.name : 'Organize suas respostas'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100"
            aria-label="Fechar editor de categoria"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <label className="flex flex-col gap-2 text-sm font-semibold text-gray-700">
            Nome da categoria
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Follow-up"
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-gray-700">
            Cor
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color ?? '#2563EB'}
                onChange={(event) => setColor(event.target.value)}
                className="h-10 w-16 cursor-pointer rounded border border-gray-200 bg-white"
              />
              <input
                value={color ?? ''}
                onChange={(event) => setColor(event.target.value)}
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-gray-700">
            Ordem de exibicao
            <input
              type="number"
              value={displayOrder}
              onChange={(event) => setDisplayOrder(Number(event.target.value))}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-xs font-normal text-gray-400">
              Utilize numeros para definir a ordem (menor valor aparece primeiro).
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-1">
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
              {submitting ? 'Salvando...' : initialValue ? 'Atualizar categoria' : 'Criar categoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

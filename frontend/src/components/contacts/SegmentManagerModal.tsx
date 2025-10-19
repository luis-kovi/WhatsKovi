import { FormEvent, useState } from 'react';
import type { ContactSegment } from '@/store/contactStore';
import type { Tag } from '@/store/metadataStore';

type SegmentManagerModalProps = {
  open: boolean;
  segments: ContactSegment[];
  tags: Tag[];
  creating: boolean;
  onClose: () => void;
  onCreate: (payload: { name: string; description?: string; filters: Record<string, unknown>; isFavorite?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export default function SegmentManagerModal({ open, segments, tags, creating, onClose, onCreate, onDelete }: SegmentManagerModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagId, setTagId] = useState('');
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [openTickets, setOpenTickets] = useState(false);
  const [favorite, setFavorite] = useState(false);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;

    const filters: Record<string, unknown> = {};
    if (tagId) filters.tagIds = [tagId];
    if (blockedOnly) filters.isBlocked = true;
    if (openTickets) filters.hasOpenTickets = true;

    await onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      filters,
      isFavorite: favorite
    });

    setName('');
    setDescription('');
    setTagId('');
    setBlockedOnly(false);
    setOpenTickets(false);
    setFavorite(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Gerenciar segmentos</h2>
            <p className="text-xs text-gray-500">Crie segmentos baseados em filtros rápidos para reutilizar nas campanhas.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            type="button"
          >
            Fechar
          </button>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <label className="flex flex-col gap-2 text-xs font-semibold text-gray-600">
            Nome do segmento
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Ex.: VIP bloqueados"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-gray-600">
            Descrição (opcional)
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs font-semibold text-gray-600">
              Tag contida
              <select
                value={tagId}
                onChange={(event) => setTagId(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Qualquer tag</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-2 text-xs font-semibold text-gray-600">
              Regras
              <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={blockedOnly}
                    onChange={(event) => setBlockedOnly(event.target.checked)}
                  />
                  Apenas contatos bloqueados
                </label>
                <label className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={openTickets}
                    onChange={(event) => setOpenTickets(event.target.checked)}
                  />
                  Possuem tickets em aberto
                </label>
                <label className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={favorite}
                    onChange={(event) => setFavorite(event.target.checked)}
                  />
                  Marcar como favorito
                </label>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-40"
            >
              {creating ? 'Adicionando...' : 'Criar segmento' }
            </button>
          </div>
        </form>

        <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-left">Descrição</th>
                <th className="px-4 py-2 text-left">Favorito</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {segments.map((segment) => (
                <tr key={segment.id}>
                  <td className="px-4 py-2 text-gray-700">{segment.name}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{segment.description ?? '-'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{segment.isFavorite ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(segment.id)}
                      className="text-xs font-semibold text-red-500 transition hover:text-red-600"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {segments.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-xs text-gray-500" colSpan={4}>
                    Nenhum segmento cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

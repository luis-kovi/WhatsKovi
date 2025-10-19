import { ChangeEvent } from 'react';
import { Filter, RefreshCw, Upload, Download, SlidersHorizontal, Sparkles } from 'lucide-react';
import type { Tag } from '@/store/metadataStore';
import type { ContactSegment } from '@/store/contactStore';

type ContactFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  selectedTagIds: string[];
  onTagChange: (value: string[]) => void;
  blocked?: boolean;
  onBlockedChange: (value: boolean | undefined) => void;
  hasOpenTickets?: boolean;
  onHasOpenTicketsChange: (value: boolean | undefined) => void;
  selectedSegmentId: string;
  onSegmentChange: (value: string) => void;
  tags: Tag[];
  segments: ContactSegment[];
  loading: boolean;
  exporting: boolean;
  onRefresh: () => void;
  onOpenImport: () => void;
  onExport: () => void;
  onOpenFieldManager: () => void;
  onOpenSegmentManager: () => void;
};

const FILTER_BADGE_BASE = 'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition';

const pickButtonStyle = (active: boolean) =>
  active
    ? 'bg-primary text-white border-primary shadow-sm'
    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50';

const toggleState = (value: boolean | undefined) => (value ? undefined : true);

export default function ContactFilters({
  search,
  onSearchChange,
  selectedTagIds,
  onTagChange,
  blocked,
  onBlockedChange,
  hasOpenTickets,
  onHasOpenTicketsChange,
  selectedSegmentId,
  onSegmentChange,
  tags,
  segments,
  loading,
  exporting,
  onRefresh,
  onOpenImport,
  onExport,
  onOpenFieldManager,
  onOpenSegmentManager
}: ContactFiltersProps) {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  const handleTagChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
    onTagChange(selected);
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Contatos</h1>
          <p className="text-sm text-gray-500">
            Monitore contatos, personalize campos e organize segmentos para campanhas e atendimento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenFieldManager}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            type="button"
          >
            <Sparkles className="h-4 w-4" />
            Campos personalizados
          </button>
          <button
            onClick={onOpenSegmentManager}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            type="button"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Segmentos
          </button>
          <button
            onClick={onOpenImport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            type="button"
          >
            <Upload className="h-4 w-4" />
            Importar CSV
          </button>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
            type="button"
            disabled={exporting}
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-60"
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
            <Filter className="h-5 w-5 text-primary" />
            <input
              value={search}
              onChange={handleSearchChange}
              placeholder="Buscar por nome, telefone ou e-mail"
              className="w-full border-none text-sm text-gray-700 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-gray-500">Filtros rápidos:</span>
            <button
              type="button"
              onClick={() => onBlockedChange(toggleState(blocked))}
              className={`${FILTER_BADGE_BASE} ${pickButtonStyle(!!blocked)}`}
            >
              Bloqueados
            </button>
            <button
              type="button"
              onClick={() => onHasOpenTicketsChange(toggleState(hasOpenTickets))}
              className={`${FILTER_BADGE_BASE} ${pickButtonStyle(!!hasOpenTickets)}`}
            >
              Tickets em aberto
            </button>
            {selectedTagIds.length > 0 && (
              <span className="text-xs text-gray-500">
                {selectedTagIds.length} tag(s) selecionada(s)
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
          <label className="flex flex-col gap-2 text-xs font-semibold text-gray-600">
            Tags
            <select
              multiple
              value={selectedTagIds}
              onChange={handleTagChange}
              className="min-h-[96px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            <span className="text-[11px] font-normal text-gray-500">
              Use CTRL / CMD para selecionar múltiplas tags
            </span>
          </label>

          <label className="flex flex-col gap-2 text-xs font-semibold text-gray-600">
            Segmento salvo
            <select
              value={selectedSegmentId}
              onChange={(event) => onSegmentChange(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Todos os contatos</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.isFavorite ? '★ ' : ''}
                  {segment.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}

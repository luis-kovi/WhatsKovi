'use client';

type Option = {
  value: string;
  label: string;
};

type SatisfactionFiltersState = {
  startDate: string;
  endDate: string;
  queueId: string;
  agentId: string;
};

type SatisfactionFiltersProps = {
  filters: SatisfactionFiltersState;
  onChange: <Key extends keyof SatisfactionFiltersState>(
    key: Key,
    value: SatisfactionFiltersState[Key]
  ) => void;
  onApply: () => void;
  loading: boolean;
  queueOptions: Option[];
  agentOptions: Option[];
};

export default function SatisfactionFilters({
  filters,
  onChange,
  onApply,
  loading,
  queueOptions,
  agentOptions
}: SatisfactionFiltersProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
      <div className="grid flex-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
          Data inicial
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => onChange('startDate', event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
          Data final
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => onChange('endDate', event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
          Fila
          <select
            value={filters.queueId}
            onChange={(event) => onChange('queueId', event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todas</option>
            {queueOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
          Atendente
          <select
            value={filters.agentId}
            onChange={(event) => onChange('agentId', event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos</option>
            {agentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={onApply}
        disabled={loading}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
      >
        {loading ? 'Atualizando...' : 'Aplicar filtros'}
      </button>
    </section>
  );
}

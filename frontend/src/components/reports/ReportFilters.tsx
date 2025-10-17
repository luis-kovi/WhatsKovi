'use client';

import { ChangeEvent } from 'react';
import { CalendarDays, Filter, RefreshCw, SlidersHorizontal } from 'lucide-react';

type Option = {
  value: string;
  label: string;
  description?: string;
};

export type ReportsFiltersState = {
  startDate: string;
  endDate: string;
  queueId: string;
  userId: string;
  tagId: string;
  status: string;
  aggregation: 'day' | 'week' | 'month';
};

type ReportFiltersProps = {
  filters: ReportsFiltersState;
  onChange: <Key extends keyof ReportsFiltersState>(key: Key, value: ReportsFiltersState[Key]) => void;
  onApply: () => void;
  onReset: () => void;
  onExport: (format: 'csv' | 'xlsx' | 'pdf') => void;
  queueOptions: Option[];
  userOptions: Option[];
  tagOptions: Option[];
  statusOptions: Option[];
};

export default function ReportFilters({
  filters,
  onChange,
  onApply,
  onReset,
  onExport,
  queueOptions,
  userOptions,
  tagOptions,
  statusOptions
}: ReportFiltersProps) {
  const handleInput =
    (key: keyof ReportsFiltersState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange(key, event.target.value as ReportsFiltersState[keyof ReportsFiltersState]);
    };

  const handleDateChange =
    (key: 'startDate' | 'endDate') =>
      (event: ChangeEvent<HTMLInputElement>) => {
        onChange(key, event.target.value);
      };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Filtros avançados</h2>
          <p className="text-sm text-gray-500">
            Combine filtros para gerar relatórios focados por atendente, fila, status ou período específico.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onExport('csv')}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => onExport('xlsx')}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            Exportar Excel
          </button>
          <button
            onClick={() => onExport('pdf')}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            Exportar PDF
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="rounded-2xl border border-gray-200 p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
            <CalendarDays className="h-4 w-4" />
            Período analisado
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Data inicial
              <input
                type="date"
                value={filters.startDate}
                onChange={handleDateChange('startDate')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Data final
              <input
                type="date"
                value={filters.endDate}
                onChange={handleDateChange('endDate')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <SlidersHorizontal className="h-4 w-4" />
            <span>Agregação</span>
          </div>
          <div className="mt-2 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-semibold text-gray-600">
            {(['day', 'week', 'month'] as const).map((interval) => (
              <button
                key={interval}
                type="button"
                onClick={() => onChange('aggregation', interval)}
                className={`rounded-md px-3 py-1 capitalize transition ${
                  filters.aggregation === interval ? 'bg-primary text-white shadow-sm' : 'hover:bg-white'
                }`}
              >
                {interval === 'day' ? 'Diário' : interval === 'week' ? 'Semanal' : 'Mensal'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Fila
            <select
              value={filters.queueId}
              onChange={handleInput('queueId')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todas as filas</option>
              {queueOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Tag
            <select
              value={filters.tagId}
              onChange={handleInput('tagId')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todas as tags</option>
              {tagOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Atendente
            <select
              value={filters.userId}
              onChange={handleInput('userId')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todos os atendentes</option>
              {userOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Status
            <select
              value={filters.status}
              onChange={handleInput('status')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-primary/40 bg-white/60 px-4 py-6 text-center text-sm text-gray-500">
            <div>
              <p className="font-semibold text-gray-700">
                Combine filtros para cruzar dados de produtividade, SLA e satisfação.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Os filtros são aplicados sobre todos os widgets e exportações.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" />
              Limpar
            </button>
            <button
              onClick={onApply}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90"
            >
              <Filter className="h-4 w-4" />
              Aplicar filtros
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


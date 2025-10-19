'use client';

import type { QueueMetric } from '@/types/dashboard';
import { formatDuration, formatNumber, formatPercentage } from '@/utils/formatMetrics';

type QueuePerformanceTableProps = {
  queues: QueueMetric[];
  loading: boolean;
};

const resolveBadge = (rate: number) => {
  if (rate >= 0.9) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (rate >= 0.75) {
    return 'bg-yellow-100 text-yellow-700';
  }
  return 'bg-red-100 text-red-600';
};

export default function QueuePerformanceTable({ queues, loading }: QueuePerformanceTableProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Desempenho por fila</h2>
        <p className="text-xs text-gray-500">
          Volume de tickets, resolução e tempo médio organizado por fila/etapa.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Fila</th>
              <th className="px-4 py-3 text-center font-semibold">Tickets</th>
              <th className="px-4 py-3 text-center font-semibold">Encerrados</th>
              <th className="px-4 py-3 text-center font-semibold">Resolução</th>
              <th className="px-4 py-3 text-center font-semibold">Tempo médio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                  Carregando métricas...
                </td>
              </tr>
            ) : queues.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                  Nenhum dado disponível para os filtros selecionados.
                </td>
              </tr>
            ) : (
              queues.map((queue) => (
                <tr key={queue.id ?? 'no-queue'} className="hover:bg-gray-50/60">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: queue.color ?? '#FF355A' }}
                      />
                      {queue.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-900">
                    {formatNumber(queue.tickets)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {formatNumber(queue.closed)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${resolveBadge(queue.resolutionRate)}`}>
                      {formatPercentage(queue.resolutionRate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {formatDuration(queue.averageHandleTimeSeconds)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

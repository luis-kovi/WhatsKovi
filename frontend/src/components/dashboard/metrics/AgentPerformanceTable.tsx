'use client';

import type { AgentMetric } from '@/types/dashboard';
import { formatDuration, formatNumber, formatPercentage } from '@/utils/formatMetrics';

type AgentPerformanceTableProps = {
  agents: AgentMetric[];
  loading: boolean;
};

export default function AgentPerformanceTable({ agents, loading }: AgentPerformanceTableProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Produtividade por atendente</h2>
          <p className="text-xs text-gray-500">
            Tickets atendidos, resolvidos e tempo médio de atendimento por agente.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Top {Math.min(agents.length, 8)} atendentes
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Atendente</th>
              <th className="px-4 py-3 text-center font-semibold">Tickets</th>
              <th className="px-4 py-3 text-center font-semibold">Encerrados</th>
              <th className="px-4 py-3 text-center font-semibold">Resolução</th>
              <th className="px-4 py-3 text-center font-semibold">Tempo médio</th>
              <th className="px-4 py-3 text-center font-semibold">Mensagens</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  Carregando métricas...
                </td>
              </tr>
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  Nenhum dado disponível para os filtros selecionados.
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50/60">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">{agent.name}</td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-900">
                    {formatNumber(agent.tickets)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">{formatNumber(agent.closed)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${
                        agent.resolutionRate >= 0.9
                          ? 'bg-emerald-100 text-emerald-700'
                          : agent.resolutionRate >= 0.75
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {formatPercentage(agent.resolutionRate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {formatDuration(agent.averageHandleTimeSeconds)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {formatNumber(agent.messages)}
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

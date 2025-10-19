'use client';

import type { DashboardMetricsResponse } from '@/types/dashboard';
import { formatDuration, formatNumber, formatPercentage, formatDelta } from '@/utils/formatMetrics';

type MetricsSummaryProps = {
  metrics: DashboardMetricsResponse | null;
  loading: boolean;
};

const CARD_TITLES = [
  {
    key: 'created' as const,
    title: 'Tickets criados',
    description: 'Total de atendimentos abertos no período'
  },
  {
    key: 'closed' as const,
    title: 'Tickets encerrados',
    description: 'Chamados finalizados no período'
  },
  {
    key: 'resolution' as const,
    title: 'Taxa de resolução',
    description: 'Percentual de tickets com atendimento concluído'
  },
  {
    key: 'handleTime' as const,
    title: 'Tempo médio',
    description: 'Duração média do atendimento'
  }
];

const renderValue = (metrics: DashboardMetricsResponse | null, key: (typeof CARD_TITLES)[number]['key']) => {
  if (!metrics) {
    return '--';
  }

  switch (key) {
    case 'created':
      return formatNumber(metrics.period.totals.created);
    case 'closed':
      return formatNumber(metrics.period.totals.closed);
    case 'resolution':
      return formatPercentage(metrics.period.resolutionRate);
    case 'handleTime':
      return formatDuration(metrics.period.averages.handleTimeSeconds);
    default:
      return '--';
  }
};

const renderDelta = (
  metrics: DashboardMetricsResponse | null,
  key: (typeof CARD_TITLES)[number]['key']
) => {
  if (!metrics) {
    return null;
  }

  switch (key) {
    case 'created':
      return metrics.period.comparison.createdDelta;
    case 'closed':
      return metrics.period.comparison.closedDelta;
    case 'resolution':
      return metrics.period.comparison.resolutionRateDelta;
    case 'handleTime':
      return metrics.period.comparison.averageHandleTimeDeltaSeconds;
    default:
      return null;
  }
};

const formatDeltaValue = (
  delta: number | null | undefined,
  key: (typeof CARD_TITLES)[number]['key']
) => {
  if (delta === null || delta === undefined) {
    return null;
  }

  if (key === 'resolution') {
    return `${formatDelta(delta * 100, 1)} pts`;
  }

  if (key === 'handleTime') {
    return `${delta >= 0 ? '+' : '-'}${formatDuration(Math.abs(delta))}`;
  }

  return `${formatDelta(delta, 0)} tickets`;
};

export default function MetricsSummary({ metrics, loading }: MetricsSummaryProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {CARD_TITLES.map((card) => {
        const delta = renderDelta(metrics, card.key);
        const formattedDelta = formatDeltaValue(delta, card.key);
        const isPositive = delta !== null && delta !== undefined && delta >= 0;

        return (
          <article
            key={card.key}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{card.title}</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900">
              {loading ? '...' : renderValue(metrics, card.key)}
            </p>
            <p className="mt-1 text-xs text-gray-500">{card.description}</p>
            {formattedDelta && (
              <span
                className={`mt-3 inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${
                  isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                }`}
              >
                {formattedDelta} vs período anterior
              </span>
            )}
          </article>
        );
      })}
    </section>
  );
}

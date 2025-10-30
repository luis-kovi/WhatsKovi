'use client';

import type { SatisfactionOverview } from '@/types/satisfaction';
import { formatNumber } from '@/utils/formatMetrics';

type SatisfactionSummaryCardsProps = {
  totals: SatisfactionOverview['totals'];
};

const getNpsLabel = (nps: number | null) => {
  if (nps === null) {
    return 'Sem respostas suficientes';
  }
  if (nps >= 50) {
    return 'Zona de excelencia';
  }
  if (nps >= 0) {
    return 'Zona de crescimento';
  }
  return 'Zona de atencao';
};

export default function SatisfactionSummaryCards({ totals }: SatisfactionSummaryCardsProps) {
  const cards = [
    {
      label: 'Respostas recebidas',
      value: formatNumber(totals.responded),
      helper: totals.sent > 0 ? `de ${formatNumber(totals.sent)} pesquisas` : 'Sem envios registrados'
    },
    {
      label: 'Taxa de resposta',
      value: totals.responseRate > 0 ? `${totals.responseRate}%` : '0%',
      helper: 'Clientes que retornaram a pesquisa'
    },
    {
      label: 'Nota media',
      value: totals.averageRating !== null ? totals.averageRating.toFixed(1) : '—',
      helper: 'Escala de 0 a 10'
    },
    {
      label: 'NPS',
      value: totals.nps !== null ? `${totals.nps}` : '—',
      helper: getNpsLabel(totals.nps)
    }
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">{card.value}</p>
          <p className="mt-2 text-xs text-gray-500">{card.helper}</p>
        </article>
      ))}
    </section>
  );
}

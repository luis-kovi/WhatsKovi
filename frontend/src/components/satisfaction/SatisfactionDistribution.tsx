'use client';

import type { SatisfactionOverview } from '@/types/satisfaction';

type SatisfactionDistributionProps = {
  distribution: SatisfactionOverview['distribution'];
  totals: SatisfactionOverview['totals'];
};

const segments = [
  {
    key: 'promoters',
    label: 'Promotores',
    color: 'bg-emerald-500',
    subtle: 'bg-emerald-100/60 text-emerald-700'
  },
  {
    key: 'passives',
    label: 'Neutros',
    color: 'bg-amber-500',
    subtle: 'bg-amber-100/60 text-amber-700'
  },
  {
    key: 'detractors',
    label: 'Detratores',
    color: 'bg-red-500',
    subtle: 'bg-red-100/60 text-red-600'
  }
] as const;

export default function SatisfactionDistribution({
  distribution,
  totals
}: SatisfactionDistributionProps) {
  const totalResponses = totals.responded || 0;
  const percentages = segments.map((segment) => {
    const amount = distribution[segment.key];
    const percentage = totalResponses > 0 ? Math.round((amount / totalResponses) * 100) : 0;
    return {
      ...segment,
      amount,
      percentage
    };
  });

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase text-gray-500">Distribuicao das notas</h3>
          <p className="text-xs text-gray-500">Classificacao NPS das respostas recebidas</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {totalResponses} respostas
        </span>
      </header>

      <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
        {percentages.map((segment) => (
          <div
            key={segment.key}
            className={`${segment.color} transition-all`}
            style={{ width: `${segment.percentage}%` }}
            title={`${segment.label}: ${segment.amount} (${segment.percentage}%)`}
          />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {percentages.map((segment) => (
          <div
            key={segment.key}
            className={`rounded-xl border border-gray-100 px-4 py-3 text-sm ${segment.subtle}`}
          >
            <p className="text-xs font-semibold uppercase text-gray-500">{segment.label}</p>
            <p className="mt-1 text-xl font-semibold">
              {segment.amount}
              <span className="ml-1 text-xs font-medium">({segment.percentage}%)</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

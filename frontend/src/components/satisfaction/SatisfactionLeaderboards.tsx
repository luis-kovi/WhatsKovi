'use client';

import type { SatisfactionOverview } from '@/types/satisfaction';

type SatisfactionLeaderboardsProps = {
  queues: SatisfactionOverview['byQueue'];
  agents: SatisfactionOverview['byAgent'];
};

const getBadgeColor = (value: number | null) => {
  if (value === null) {
    return 'bg-gray-100 text-gray-500';
  }
  if (value >= 9) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (value >= 7) {
    return 'bg-amber-100 text-amber-700';
  }
  return 'bg-red-100 text-red-600';
};

const Leaderboard = ({
  title,
  items
}: {
  title: string;
  items: Array<{
    id: string;
    name: string;
    sent: number;
    responded: number;
    responseRate: number;
    averageRating: number | null;
    nps: number | null;
  }>;
}) => (
  <article className="flex-1 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
    <header className="mb-4">
      <h3 className="text-sm font-semibold uppercase text-gray-500">{title}</h3>
      <p className="text-xs text-gray-500">Top 5 por nota media no periodo selecionado</p>
    </header>
    {items.length === 0 ? (
      <p className="text-xs text-gray-500">Ainda sem dados suficientes.</p>
    ) : (
      <ul className="space-y-3">
        {items.slice(0, 5).map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">{item.name}</p>
              <p className="text-[11px] text-gray-500">
                {item.responded} de {item.sent} respostas • {item.responseRate}% retorno
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${getBadgeColor(item.averageRating)}`}>
                Nota {item.averageRating !== null ? item.averageRating.toFixed(1) : '—'}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500">NPS</p>
                <p className="text-sm font-semibold text-gray-900">
                  {item.nps !== null ? item.nps : '—'}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    )}
  </article>
);

export default function SatisfactionLeaderboards({ queues, agents }: SatisfactionLeaderboardsProps) {
  return (
    <section className="flex flex-col gap-4 lg:flex-row">
      <Leaderboard title="Filas com melhor avaliacao" items={queues} />
      <Leaderboard title="Atendentes destaque" items={agents} />
    </section>
  );
}

'use client';

import { format, parseISO } from 'date-fns';
import type { SatisfactionOverview } from '@/types/satisfaction';

type SatisfactionTrendProps = {
  trend: SatisfactionOverview['trend'];
};

const formatLabel = (value: string) => {
  try {
    return format(parseISO(value), 'dd/MM');
  } catch {
    return value;
  }
};

export default function SatisfactionTrend({ trend }: SatisfactionTrendProps) {
  if (trend.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white">
        <p className="text-sm text-gray-500">
          Nenhuma resposta no periodo selecionado.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase text-gray-500">Evolucao da satisfacao</h3>
          <p className="text-xs text-gray-500">Nota media e volume de respostas por dia</p>
        </div>
      </header>

      <div className="overflow-x-auto">
        <div className="flex min-w-[420px] gap-3">
          {trend.map((point) => {
            const rating = point.averageRating ?? 0;
            const height = Math.round((rating / 10) * 100);
            return (
              <div key={point.date} className="flex w-full flex-1 flex-col items-center gap-2">
                <div className="relative flex h-40 w-full items-end justify-center rounded-xl bg-gradient-to-t from-primary/5 via-primary/10 to-transparent">
                  <div
                    className="w-10 rounded-full bg-primary/80 transition-colors hover:bg-primary"
                    style={{ height: `${height}%` }}
                    title={`Nota media ${rating.toFixed(1)} • ${point.responses} respostas`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-700">{formatLabel(point.date)}</p>
                  <p className="text-[11px] text-gray-500">{point.responses} resp.</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

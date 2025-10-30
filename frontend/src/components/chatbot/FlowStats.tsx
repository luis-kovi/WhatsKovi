import { ChatbotFlowStats } from '@/types/chatbot';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

interface FlowStatsProps {
  stats?: ChatbotFlowStats | null;
  loading?: boolean;
}

const formatDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) {
    return '0s';
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes === 0) {
    return `${remaining}s`;
  }
  return `${minutes}m ${remaining.toString().padStart(2, '0')}s`;
};

export function FlowStats({ stats, loading }: FlowStatsProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white/70 p-6 text-sm text-gray-500 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        Carregando metricas...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white/50 p-6 text-sm text-gray-500 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
        Selecione um fluxo para visualizar as metricas.
      </div>
    );
  }

  const timeline = stats.timeline ?? [];

  const cards = [
    {
      label: 'Sessoes iniciadas',
      value: stats.totalSessions,
      accent: 'text-primary dark:text-primary/90'
    },
    {
      label: 'Sessoes concluidas',
      value: stats.completedSessions,
      accent: 'text-emerald-500 dark:text-emerald-400'
    },
    {
      label: 'Transferencias',
      value: stats.transferCount,
      accent: 'text-amber-500 dark:text-amber-400'
    },
    {
      label: 'Duracao media',
      value: formatDuration(stats.averageDurationSeconds),
      accent: 'text-rose-500 dark:text-rose-400'
    },
    {
      label: 'Taxa de conclusao',
      value: `${stats.completionRate}%`,
      accent: 'text-sky-500 dark:text-sky-400'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-5 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white/70 p-4 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
              {card.label}
            </p>
            <p className={`mt-2 text-xl font-semibold ${card.accent}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white/70 p-6 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between pb-4">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
              Evolucao das Sessoes
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Ultimos 14 dias de interacoes
            </p>
          </div>
        </div>
        {timeline.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-500 dark:text-slate-400">
            Ainda nao ha dados suficientes para o grafico.
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.3)" />
                <XAxis
                  dataKey="date"
                  stroke="currentColor"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-gray-400 dark:text-slate-500"
                />
                <YAxis
                  allowDecimals={false}
                  stroke="currentColor"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-gray-400 dark:text-slate-500"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,0.2)'
                  }}
                  labelStyle={{ color: '#cbd5f5' }}
                  itemStyle={{ color: '#22d3ee' }}
                />
                <Line
                  type="monotone"
                  dataKey="started"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Sessoes iniciadas"
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="Sessoes concluidas"
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlowStats;

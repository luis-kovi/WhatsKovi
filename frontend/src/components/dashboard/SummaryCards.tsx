import { RefreshCw, Sparkles } from 'lucide-react';
import { DashboardSummary } from '@/store/metadataStore';

const numberFormatter = new Intl.NumberFormat('pt-BR');

type SummaryCardsProps = {
  loading: boolean;
  data: DashboardSummary | null;
  forecastTotal?: number | null;
  forecastLoading?: boolean;
  onRefreshForecast?: () => void;
  connection: {
    label: string;
    detail: string;
    color: string;
  };
};

const getNumberValue = (value?: number | null, loading?: boolean) => {
  if (loading) return '...';
  if (typeof value !== 'number') return '--';
  return numberFormatter.format(value);
};

export default function SummaryCards({
  loading,
  data,
  forecastTotal,
  forecastLoading,
  onRefreshForecast,
  connection
}: SummaryCardsProps) {
  const metrics: Array<{ key: string; label: string; value: number | null }> = [
    { key: 'total', label: 'Atendimentos totais', value: data?.tickets.total ?? null },
    { key: 'bot', label: 'Em bot', value: data?.tickets.bot ?? null },
    { key: 'pending', label: 'Pendentes', value: data?.tickets.pending ?? null },
    { key: 'open', label: 'Em atendimento', value: data?.tickets.open ?? null },
    { key: 'agentsOnline', label: 'Agentes online', value: data?.agents.online ?? null },
    { key: 'messagesToday', label: 'Mensagens hoje', value: data?.messagesToday ?? null }
  ];

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {metrics.map((metric) => (
        <div
          key={metric.key}
          className="rounded-lg border border-gray-100 bg-white/90 px-2 py-[3px] shadow-sm transition-colors duration-300 dark:border-slate-800/80 dark:bg-slate-900/80"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">
            {metric.label}
          </p>
          <span className="mt-0.25 block text-base font-semibold text-gray-900 dark:text-white">
            {getNumberValue(metric.value, loading)}
          </span>
        </div>
      ))}

      <div className="rounded-lg border border-indigo-100 bg-indigo-50/80 px-2 py-[3px] shadow-sm transition-colors duration-300 dark:border-indigo-400/30 dark:bg-indigo-500/15">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-200">
              Previsão 7 dias
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-indigo-600 shadow-sm dark:bg-indigo-400/20 dark:text-indigo-100">
              <Sparkles className="h-3 w-3" />
              IA
            </span>
          </div>
          {onRefreshForecast && (
            <button
              type="button"
              onClick={onRefreshForecast}
              className="rounded-full p-1 text-indigo-500 transition hover:bg-white/70 hover:text-indigo-700 dark:hover:bg-indigo-400/20"
              aria-label="Atualizar previsão de demanda"
              disabled={forecastLoading}
            >
              <RefreshCw className={`h-4 w-4 ${forecastLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-indigo-700 dark:text-indigo-100">
          <span className="text-base font-semibold">
            {forecastLoading ? '...' : getNumberValue(forecastTotal, loading)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600/80 dark:text-indigo-200/80">
            tickets previstos
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white/90 px-2 py-[3px] shadow-sm transition-colors duration-300 dark:border-slate-800/80 dark:bg-slate-900/80">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">
          Status de conexão
        </p>
        <div className="mt-0.25 flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-slate-100">
          <span className={`h-2 w-2 rounded-full ${connection.color}`} />
          {connection.label}
        </div>
        <p className="mt-0.25 text-[10px] text-gray-500 dark:text-slate-400">{connection.detail}</p>
      </div>
    </div>
  );
}

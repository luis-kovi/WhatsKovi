import {
  Activity,
  Bot,
  Headphones,
  Layers,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Users
} from 'lucide-react';
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

const metricPalette = {
  total: {
    label: 'Atendimentos',
    description: 'Volume acumulado',
    Icon: Layers,
    tint: 'from-indigo-500/15 via-indigo-500/5 to-white/40',
    iconColor: 'text-indigo-600'
  },
  bot: {
    label: 'Fluxos bot',
    description: 'Conversas automatizadas',
    Icon: Bot,
    tint: 'from-sky-500/15 via-sky-500/5 to-white/40',
    iconColor: 'text-sky-600'
  },
  pending: {
    label: 'Pendentes',
    description: 'Aguardando agente',
    Icon: MessageSquare,
    tint: 'from-amber-500/15 via-amber-500/5 to-white/40',
    iconColor: 'text-amber-600'
  },
  open: {
    label: 'Em atendimento',
    description: 'Ativos com humano',
    Icon: Headphones,
    tint: 'from-emerald-500/15 via-emerald-500/5 to-white/40',
    iconColor: 'text-emerald-600'
  },
  agentsOnline: {
    label: 'Agentes online',
    description: 'Disponíveis agora',
    Icon: Users,
    tint: 'from-purple-500/15 via-purple-500/5 to-white/40',
    iconColor: 'text-purple-600'
  },
  messagesToday: {
    label: 'Mensagens hoje',
    description: 'Interações no dia',
    Icon: Activity,
    tint: 'from-rose-500/15 via-rose-500/5 to-white/40',
    iconColor: 'text-rose-600'
  }
} as const;

type MetricKey = keyof typeof metricPalette;

export default function SummaryCards({
  loading,
  data,
  forecastTotal,
  forecastLoading,
  onRefreshForecast,
  connection
}: SummaryCardsProps) {
  const metrics: Array<{ key: MetricKey; value: number | null }> = [
    { key: 'total', value: data?.tickets.total ?? null },
    { key: 'bot', value: data?.tickets.bot ?? null },
    { key: 'pending', value: data?.tickets.pending ?? null },
    { key: 'open', value: data?.tickets.open ?? null },
    { key: 'agentsOnline', value: data?.agents.online ?? null },
    { key: 'messagesToday', value: data?.messagesToday ?? null }
  ];

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -bottom-4 mx-2 h-1 rounded-full bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-40" />
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-3">
          {metrics.map(({ key, value }) => {
            const palette = metricPalette[key];
            const { Icon } = palette;
            return (
              <div
                key={key}
                className="group relative flex min-w-[170px] flex-col justify-between overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white via-white to-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900"
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${palette.tint} opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:opacity-70 dark:group-hover:opacity-100`}
                />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-400">
                      {palette.label}
                    </p>
                    <span className="mt-1 block text-xl font-semibold text-gray-900 dark:text-white">
                      {getNumberValue(value, loading)}
                    </span>
                  </div>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 text-sm shadow-sm ring-1 ring-white/60 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:scale-105 ${palette.iconColor} dark:bg-slate-800/60 dark:ring-slate-700`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="relative mt-2 text-[11px] text-gray-500 transition-colors duration-200 group-hover:text-gray-600 dark:text-slate-400 dark:group-hover:text-slate-300">
                  {palette.description}
                </p>
              </div>
            );
          })}

          <div className="relative flex min-w-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-white/60 px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-indigo-400/20 dark:from-indigo-500/20 dark:via-indigo-500/10 dark:to-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 text-indigo-600 shadow-sm ring-1 ring-white dark:bg-slate-800/60 dark:text-indigo-200 dark:ring-slate-700">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-200">
                    {'Previs\u00e3o 7 dias'}
                  </p>
                  <span className="mt-1 block text-xl font-semibold text-indigo-700 dark:text-indigo-100">
                    {forecastLoading ? '...' : getNumberValue(forecastTotal, loading)}
                  </span>
                </div>
              </div>
              {onRefreshForecast && (
                <button
                  type="button"
                  onClick={onRefreshForecast}
                  disabled={forecastLoading}
                  className="rounded-full border border-indigo-100 bg-white/80 p-2 text-indigo-500 shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed dark:border-indigo-400/30 dark:bg-indigo-500/20 dark:text-indigo-100"
                  aria-label={'Atualizar previs\u00e3o de demanda'}
                >
                  <RefreshCw className={`h-4 w-4 ${forecastLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-indigo-600/80 dark:text-indigo-200/80">
              {'Tickets esperados considerando sazonalidade e comportamento hist\u00f3rico.'}
            </p>
          </div>

          <div className="flex min-w-[200px] flex-col justify-between rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-gray-50 px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-400">
                  {'Status de conex\u00e3o'}
                </p>
                <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-slate-100">
                  <span className={`h-2.5 w-2.5 rounded-full ${connection.color}`} />
                  {connection.label}
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-gray-500 dark:text-slate-400">{connection.detail}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

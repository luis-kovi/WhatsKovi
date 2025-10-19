'use client';

import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line
} from 'recharts';
import type { DashboardMetricsResponse } from '@/types/dashboard';
import { formatNumber } from '@/utils/formatMetrics';

type MetricsTimelineProps = {
  metrics: DashboardMetricsResponse | null;
};

type TooltipPayload = {
  name: string;
  value: number;
  color: string;
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-xs text-gray-600">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium text-gray-800">{item.name}:</span>
            <span>{formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function MetricsTimeline({ metrics }: MetricsTimelineProps) {
  const data =
    metrics?.timeline.map((entry) => ({
      name: entry.label,
      Criados: entry.created,
      Encerrados: entry.closed,
      Mensagens: entry.messages
    })) ?? [];

  return (
    <article className="h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Evolução no período</h2>
          <p className="text-xs text-gray-500">
            Acompanhe o volume de tickets abertos, encerrados e mensagens trocadas.
          </p>
        </div>
      </header>
      <div className="mt-6 h-72">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Nenhum dado disponível para o período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tickLine={false} tickMargin={8} stroke="#9CA3AF" />
              <YAxis
                tickLine={false}
                tickMargin={8}
                stroke="#9CA3AF"
                tickFormatter={(value) => formatNumber(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={32} />
              <Line type="monotone" dataKey="Criados" stroke="#FF355A" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="Encerrados" stroke="#2563EB" strokeWidth={3} dot={false} />
              <Line
                type="monotone"
                dataKey="Mensagens"
                stroke="#0EA5E9"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </article>
  );
}

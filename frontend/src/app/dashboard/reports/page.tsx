'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import ReportFilters, { ReportsFiltersState } from '@/components/reports/ReportFilters';
import MetricsSummary from '@/components/dashboard/metrics/MetricsSummary';
import MetricsTimeline from '@/components/dashboard/metrics/MetricsTimeline';
import AgentPerformanceTable from '@/components/dashboard/metrics/AgentPerformanceTable';
import QueuePerformanceTable from '@/components/dashboard/metrics/QueuePerformanceTable';
import { useAuthStore } from '@/store/authStore';
import { useMetadataStore } from '@/store/metadataStore';
import { useUserStore } from '@/store/userStore';
import { useDashboardMetricsStore } from '@/store/dashboardMetricsStore';
import { exportMetrics } from '@/utils/exportMetrics';
import { formatDateRangeLabel, formatNumber } from '@/utils/formatMetrics';

const defaultFilters: ReportsFiltersState = {
  startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
  endDate: format(new Date(), 'yyyy-MM-dd'),
  queueId: '',
  userId: '',
  tagId: '',
  status: '',
  aggregation: 'day'
};

const mapFiltersToRequest = (filters: ReportsFiltersState) => ({
  startDate: filters.startDate,
  endDate: filters.endDate,
  interval: filters.aggregation,
  queueId: filters.queueId || undefined,
  userId: filters.userId || undefined
});

export default function ReportsPage() {
  const router = useRouter();
  const { isAuthenticated, loadUser } = useAuthStore();

  const queues = useMetadataStore((state) => state.queues);
  const tags = useMetadataStore((state) => state.tags);
  const fetchQueues = useMetadataStore((state) => state.fetchQueues);
  const fetchTags = useMetadataStore((state) => state.fetchTags);

  const users = useUserStore((state) => state.users);
  const fetchUsers = useUserStore((state) => state.fetchUsers);

  const metrics = useDashboardMetricsStore((state) => state.metrics);
  const metricsLoading = useDashboardMetricsStore((state) => state.loading);
  const metricsError = useDashboardMetricsStore((state) => state.error);
  const fetchMetrics = useDashboardMetricsStore((state) => state.fetchMetrics);

  const [filters, setFilters] = useState<ReportsFiltersState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportsFiltersState>(defaultFilters);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await Promise.all([fetchQueues(), fetchTags(), fetchUsers()]);
        if (!cancelled) {
          await fetchMetrics(mapFiltersToRequest(defaultFilters));
          setAppliedFilters({ ...defaultFilters });
        }
      } catch (error) {
        console.error('Erro ao preparar dados do dashboard:', error);
        if (!cancelled) {
          toast.error('Não foi possível carregar os dados iniciais do dashboard.');
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, fetchQueues, fetchTags, fetchUsers, fetchMetrics]);

  const handleFilterChange = <Key extends keyof ReportsFiltersState>(
    key: Key,
    value: ReportsFiltersState[Key]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyFilters = async () => {
    try {
      await fetchMetrics(mapFiltersToRequest(filters));
      setAppliedFilters({ ...filters });
      toast.success('Filtros aplicados ao relatório.');
    } catch (error) {
      console.error('Erro ao aplicar filtros no dashboard:', error);
      toast.error('Não foi possível atualizar as métricas com os filtros selecionados.');
    }
  };

  const handleResetFilters = async () => {
    setFilters({ ...defaultFilters });
    setAppliedFilters({ ...defaultFilters });

    try {
      await fetchMetrics(mapFiltersToRequest(defaultFilters));
      toast.success('Filtros redefinidos.');
    } catch (error) {
      console.error('Erro ao redefinir filtros no dashboard:', error);
      toast.error('Não foi possível recarregar as métricas padrão.');
    }
  };

  const handleExportReport = (formatType: 'csv' | 'xlsx' | 'pdf') => {
    if (!metrics) {
      toast.error('Carregue as métricas antes de exportar.');
      return;
    }

    try {
      exportMetrics(formatType, metrics, mapFiltersToRequest(appliedFilters));
      toast.success(`Exportação em ${formatType.toUpperCase()} concluída.`);
    } catch (error) {
      console.error('Erro ao exportar métricas:', error);
      toast.error('Não foi possível exportar as métricas.');
    }
  };

  const rangeLabel = useMemo(() => {
    if (!metrics) {
      return null;
    }
    return formatDateRangeLabel(metrics.period.start, metrics.period.end);
  }, [metrics]);

  const operationalStats = useMemo(() => {
    if (!metrics) {
      return [];
    }

    return [
      {
        key: 'open',
        label: 'Tickets em aberto',
        value: formatNumber(metrics.period.totals.open),
        accent: 'bg-blue-100 text-blue-700'
      },
      {
        key: 'pending',
        label: 'Tickets pendentes',
        value: formatNumber(metrics.period.totals.pending),
        accent: 'bg-amber-100 text-amber-700'
      },
      {
        key: 'messages',
        label: 'Mensagens no período',
        value: formatNumber(metrics.period.totals.messages),
        accent: 'bg-purple-100 text-purple-700'
      }
    ];
  }, [metrics]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-gray-500">Preparando dados do dashboard de métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 transition-colors duration-300 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-8 px-8 py-10">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard com Métricas</h1>
              <p className="text-sm text-gray-500">
                Visualize indicadores-chave por período, fila e atendente, exporte dados e acompanhe evolução.
              </p>
            </div>
            {rangeLabel && (
              <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
                Período analisado: {rangeLabel}
              </div>
            )}
          </header>

          {metricsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {metricsError}
            </div>
          )}

          <ReportFilters
            filters={filters}
            onChange={handleFilterChange}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
            onExport={handleExportReport}
            queueOptions={queues.map((queue) => ({ value: queue.id, label: queue.name }))}
            tagOptions={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
            userOptions={users.map((user) => ({ value: user.id, label: user.name }))}
            statusOptions={[
              { value: '', label: 'Todos os status' },
              { value: 'OPEN', label: 'Em atendimento' },
              { value: 'PENDING', label: 'Pendentes' },
              { value: 'CLOSED', label: 'Finalizados' }
            ]}
          />

          <MetricsSummary metrics={metrics} loading={metricsLoading} />

          <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <MetricsTimeline metrics={metrics} />
            <div className="flex flex-col gap-4">
              <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold uppercase text-gray-500">Status operacional</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Indicadores de volume complementares aos filtros atuais.
                </p>
                <div className="mt-4 space-y-3">
                  {operationalStats.map((stat) => (
                    <div
                      key={stat.key}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">{stat.label}</p>
                        <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stat.accent}`}>
                        Atualizado
                      </span>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold uppercase text-gray-500">Filtros aplicados</h3>
                <dl className="mt-3 space-y-2 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-gray-500">Agregação</dt>
                    <dd className="capitalize text-gray-800">
                      {appliedFilters.aggregation === 'day'
                        ? 'Diária'
                        : appliedFilters.aggregation === 'week'
                        ? 'Semanal'
                        : 'Mensal'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-gray-500">Fila</dt>
                    <dd className="text-gray-800">
                      {appliedFilters.queueId
                        ? queues.find((queue) => queue.id === appliedFilters.queueId)?.name ?? 'Fila selecionada'
                        : 'Todas'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-gray-500">Atendente</dt>
                    <dd className="text-gray-800">
                      {appliedFilters.userId
                        ? users.find((user) => user.id === appliedFilters.userId)?.name ?? 'Atendente selecionado'
                        : 'Todos'}
                    </dd>
                  </div>
                </dl>
              </article>
            </div>
          </section>

          <AgentPerformanceTable agents={metrics?.agents ?? []} loading={metricsLoading} />

          <QueuePerformanceTable queues={metrics?.queues ?? []} loading={metricsLoading} />
        </div>
      </div>
    </div>
  );
}

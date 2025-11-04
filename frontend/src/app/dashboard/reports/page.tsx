'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import ReportFilters, { ReportsFiltersState } from '@/components/reports/ReportFilters';
import ReportHighlights from '@/components/reports/ReportHighlights';
import ReportVisuals from '@/components/reports/ReportVisuals';
import ReportDetailTables from '@/components/reports/ReportDetailTables';
import { useAuthStore } from '@/store/authStore';
import { useMetadataStore } from '@/store/metadataStore';
import { useUserStore } from '@/store/userStore';
import { useReportStore } from '@/store/reportStore';
import { exportAdvancedReport } from '@/utils/exportReport';
import { formatDateRangeLabel, formatNumber } from '@/utils/formatMetrics';
import type { ReportFiltersRequest } from '@/types/reports';

const defaultFilters: ReportsFiltersState = {
  startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
  endDate: format(new Date(), 'yyyy-MM-dd'),
  queueId: '',
  userId: '',
  tagId: '',
  status: '',
  aggregation: 'day'
};

const mapFiltersToRequest = (filters: ReportsFiltersState): ReportFiltersRequest => ({
  startDate: filters.startDate,
  endDate: filters.endDate,
  aggregation: filters.aggregation,
  queueId: filters.queueId || undefined,
  userId: filters.userId || undefined,
  tagId: filters.tagId || undefined,
  status: filters.status || undefined
});

const SummaryCard = ({ label, value }: { label: string; value: string }) => (
  <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-gray-900">{value}</p>
  </article>
);

export default function ReportsPage() {
  const router = useRouter();
  const { isAuthenticated, loadUser } = useAuthStore();

  const queues = useMetadataStore((state) => state.queues);
  const tags = useMetadataStore((state) => state.tags);
  const fetchQueues = useMetadataStore((state) => state.fetchQueues);
  const fetchTags = useMetadataStore((state) => state.fetchTags);

  const users = useUserStore((state) => state.users);
  const fetchUsers = useUserStore((state) => state.fetchUsers);

  const report = useReportStore((state) => state.report);
  const reportLoading = useReportStore((state) => state.loading);
  const reportError = useReportStore((state) => state.error);
  const fetchReport = useReportStore((state) => state.fetchReport);
  const fetchSnapshots = useReportStore((state) => state.fetchSnapshots);
  const snapshots = useReportStore((state) => state.snapshots);
  const snapshotsLoading = useReportStore((state) => state.snapshotsLoading);

  const [filters, setFilters] = useState<ReportsFiltersState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportsFiltersState>(defaultFilters);
  const [initializing, setInitializing] = useState(true);
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

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
        const request = mapFiltersToRequest(defaultFilters);
        if (!cancelled) {
          await fetchReport(request);
          await fetchSnapshots();
          setAppliedFilters({ ...defaultFilters });
        }
      } catch (error) {
        console.error('Erro ao carregar dados do relatório:', error);
        if (!cancelled) {
          toast.error('Não foi possível carregar o relatório inicial.');
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
  }, [isAuthenticated, fetchQueues, fetchTags, fetchUsers, fetchReport, fetchSnapshots]);

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
    const request = mapFiltersToRequest(filters);
    try {
      await fetchReport(request);
      setAppliedFilters({ ...filters });
      toast.success('Filtros aplicados ao relatório.');
    } catch (error) {
      console.error('Erro ao aplicar filtros no relatório:', error);
      toast.error('Não foi possível atualizar os dados.');
    }
  };

  const handleResetFilters = async () => {
    setFilters({ ...defaultFilters });
    setAppliedFilters({ ...defaultFilters });
    const request = mapFiltersToRequest(defaultFilters);

    try {
      await fetchReport(request);
      toast.success('Filtros redefinidos.');
    } catch (error) {
      console.error('Erro ao redefinir filtros:', error);
      toast.error('Não foi possível carregar os dados padrão.');
    }
  };

  const handleExportReport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      await exportAdvancedReport(format, mapFiltersToRequest(appliedFilters));
      toast.success(`Relatório exportado em ${format.toUpperCase()}.`);
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast.error('Não foi possível exportar o relatório.');
    }
  };

  const rangeLabel = useMemo(() => {
    if (!report) {
      return '';
    }
    return formatDateRangeLabel(report.filters.startDate, report.filters.endDate);
  }, [report]);

  const summaryCards = useMemo(() => {
    if (!report) {
      return [];
    }

    return [
      {
        label: 'Tickets criados',
        value: formatNumber(report.totals.created)
      },
      {
        label: 'Tickets resolvidos',
        value: formatNumber(report.totals.closed)
      },
      {
        label: 'Em atendimento',
        value: formatNumber(report.totals.open)
      },
      {
        label: 'Pendentes',
        value: formatNumber(report.totals.pending)
      }
    ];
  }, [report]);

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-gray-500">Preparando dados avançados do relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 transition-colors duration-300 dark:bg-slate-950">
      <Sidebar />
      <div className="ml-20 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-8 px-8 py-10">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Relatórios Avançados</h1>
              <p className="text-sm text-gray-500">
                Combine filtros avançados para entender desempenho, produtividade e satisfação em
                profundidade.
              </p>
            </div>
            {rangeLabel && (
              <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
                Período analisado: {rangeLabel}
              </div>
            )}
          </header>

          {reportError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {reportError}
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

          {reportLoading && (
            <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white/80 p-10 shadow-sm">
              <div className="space-y-2 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-gray-500">Atualizando visão do relatório...</p>
              </div>
            </div>
          )}

          {report && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {summaryCards.map((card) => (
                  <SummaryCard key={card.label} label={card.label} value={card.value} />
                ))}
              </section>

              <ReportHighlights
                metrics={report.highlights.metrics}
                serviceLevels={report.highlights.serviceLevels}
              />

              <ReportVisuals
                timeline={report.visuals.timeline}
                queues={report.visuals.queues}
                agents={report.visuals.agents}
                tags={report.visuals.tags}
                heatmap={report.visuals.heatmap}
              />

              <ReportDetailTables
                responseMetrics={report.details.responseMetrics}
                productivity={report.details.productivity}
                conversations={report.details.conversations}
                satisfaction={report.details.satisfaction}
              />
            </>
          )}

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase text-gray-500">
                  Relatórios gerados automaticamente
                </h2>
                <p className="text-xs text-gray-500">
                  Acesse rapidamente os relatórios gerados pelos agendamentos configurados.
                </p>
              </div>
            </header>

            {snapshotsLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : snapshots.length === 0 ? (
              <p className="text-xs text-gray-500">
                Nenhum relatório agendado foi gerado ainda. Configure um agendamento para receber
                relatórios recorrentes.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3 text-left">Relatório</th>
                      <th className="px-4 py-3 text-left">Formato</th>
                      <th className="px-4 py-3 text-left">Gerado em</th>
                      <th className="px-4 py-3 text-left">Origem</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {snapshots.map((snapshot) => (
                      <tr key={snapshot.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {snapshot.summary?.totals
                            ? 'Relatório agendado'
                            : snapshot.fileName.replace(/\.(zip|pdf|csv|xlsx)$/i, '')}
                        </td>
                        <td className="px-4 py-3 text-xs uppercase text-gray-500">
                          {snapshot.format}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(snapshot.generatedAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {snapshot.schedule?.name ?? 'Execução manual'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`${apiBaseUrl}/reports/snapshots/${snapshot.id}/download`}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Baixar
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

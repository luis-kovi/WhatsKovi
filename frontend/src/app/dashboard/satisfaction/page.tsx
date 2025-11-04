'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import SatisfactionSummaryCards from '@/components/satisfaction/SatisfactionSummaryCards';
import SatisfactionFilters from '@/components/satisfaction/SatisfactionFilters';
import SatisfactionTrend from '@/components/satisfaction/SatisfactionTrend';
import SatisfactionDistribution from '@/components/satisfaction/SatisfactionDistribution';
import SatisfactionLeaderboards from '@/components/satisfaction/SatisfactionLeaderboards';
import SatisfactionComments from '@/components/satisfaction/SatisfactionComments';
import { useAuthStore } from '@/store/authStore';
import { useMetadataStore } from '@/store/metadataStore';
import { useUserStore } from '@/store/userStore';
import { useSatisfactionStore } from '@/store/satisfactionStore';

const defaultFilters = {
  startDate: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
  endDate: format(new Date(), 'yyyy-MM-dd'),
  queueId: '',
  agentId: ''
};

export default function SatisfactionDashboard() {
  const { isAuthenticated, loadUser } = useAuthStore();
  const router = useRouter();
  const fetchQueues = useMetadataStore((state) => state.fetchQueues);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const queues = useMetadataStore((state) => state.queues);
  const users = useUserStore((state) => state.users);

  const overview = useSatisfactionStore((state) => state.overview);
  const overviewLoading = useSatisfactionStore((state) => state.overviewLoading);
  const fetchOverview = useSatisfactionStore((state) => state.fetchOverview);
  const responses = useSatisfactionStore((state) => state.responses);
  const responsesLoading = useSatisfactionStore((state) => state.responsesLoading);
  const fetchResponses = useSatisfactionStore((state) => state.fetchResponses);

  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
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
        await Promise.all([fetchQueues(), fetchUsers()]);
        if (!cancelled) {
          await Promise.all([
            fetchOverview(defaultFilters),
            fetchResponses({ ...defaultFilters, page: 1, pageSize: 10 })
          ]);
          setAppliedFilters(defaultFilters);
        }
      } catch (error) {
        console.error('Erro ao inicializar dashboard de satisfacao:', error);
        toast.error('Nao foi possivel carregar os dados iniciais de satisfacao.');
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, fetchQueues, fetchUsers, fetchOverview, fetchResponses, router]);

  const queueOptions = useMemo(
    () => queues.map((queue) => ({ value: queue.id, label: queue.name })),
    [queues]
  );
  const agentOptions = useMemo(
    () => users.map((user) => ({ value: user.id, label: user.name })),
    [users]
  );

  const handleFilterChange = <Key extends keyof typeof filters>(
    key: Key,
    value: (typeof filters)[Key]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyFilters = async () => {
    try {
      await Promise.all([
        fetchOverview(filters),
        fetchResponses({ ...filters, page: 1, pageSize: 10 })
      ]);
      setAppliedFilters(filters);
      toast.success('Filtros de satisfacao atualizados.');
    } catch {
      toast.error('Nao foi possivel atualizar os dados de satisfacao.');
    }
  };

  const handleResponsesPageChange = async (page: number) => {
    try {
      await fetchResponses({ ...appliedFilters, page, pageSize: 10 });
    } catch {
      toast.error('Nao foi possivel carregar a pagina solicitada.');
    }
  };

  if (!isAuthenticated || initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 transition-colors duration-300 dark:bg-slate-950">
      <Sidebar />
      <main className="ml-20 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-6 px-8 py-10">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Satisfacao dos clientes</h1>
              <p className="text-sm text-gray-500">
                Acompanhe NPS, notas medias e comentarios por fila, atendente e periodo.
              </p>
            </div>
          </header>

          {overview && <SatisfactionSummaryCards totals={overview.totals} />}

          <SatisfactionFilters
            filters={filters}
            onChange={handleFilterChange}
            onApply={handleApplyFilters}
            loading={overviewLoading || responsesLoading}
            queueOptions={queueOptions}
            agentOptions={agentOptions}
          />

          {overview ? (
            <>
              <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <SatisfactionTrend trend={overview.trend} />
                <SatisfactionDistribution distribution={overview.distribution} totals={overview.totals} />
              </div>

              <SatisfactionLeaderboards queues={overview.byQueue} agents={overview.byAgent} />

              <SatisfactionComments
                highlights={overview.recentComments}
                responses={responses}
                loading={responsesLoading}
                onPageChange={handleResponsesPageChange}
              />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
              <p className="text-sm text-gray-500">
                Nenhuma informacao de satisfacao disponivel para os filtros selecionados.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, subDays, differenceInDays } from 'date-fns';
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

type ReportData = ReturnType<typeof generateReportData>;

const defaultFilters: ReportsFiltersState = {
  startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
  endDate: format(new Date(), 'yyyy-MM-dd'),
  queueId: '',
  userId: '',
  tagId: '',
  status: '',
  aggregation: 'day'
};

export default function ReportsPage() {
  const router = useRouter();
  const { isAuthenticated, loadUser } = useAuthStore();

  const queues = useMetadataStore((state) => state.queues);
  const tags = useMetadataStore((state) => state.tags);
  const fetchQueues = useMetadataStore((state) => state.fetchQueues);
  const fetchTags = useMetadataStore((state) => state.fetchTags);

  const users = useUserStore((state) => state.users);
  const fetchUsers = useUserStore((state) => state.fetchUsers);

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
      } catch (error) {
        console.error('Erro ao carregar metadados de relatórios:', error);
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, fetchQueues, fetchTags, fetchUsers]);

  const reportData = useMemo<ReportData>(() => generateReportData(appliedFilters, { queues, tags, users }), [
    appliedFilters,
    queues,
    tags,
    users
  ]);

  const handleFilterChange = <Key extends keyof ReportsFiltersState>(
    key: Key,
    value: ReportsFiltersState[Key]
  ) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    toast.success('Filtros aplicados ao relatório.');
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    toast.success('Filtros redefinidos.');
  };

  const handleExportReport = (formatType: 'csv' | 'xlsx' | 'pdf') => {
    toast.success(`Exportação em ${formatType.toUpperCase()} agendada.`);
  };

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
          <p className="text-sm text-gray-500">Preparando dados do módulo de relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-8 px-8 py-10">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Relatórios e Analytics</h1>
              <p className="text-sm text-gray-500">
                Combine filtros avançados para acompanhar produtividade, SLA, satisfação e volume de tickets.
              </p>
            </div>
            <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
              Dados atualizados às {format(new Date(), 'HH:mm')}
            </div>
          </header>

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

          <ReportHighlights metrics={reportData.highlights} serviceLevels={reportData.serviceLevels} />

          <ReportVisuals
            timeline={reportData.timeline}
            queues={reportData.queuePerformance}
            agents={reportData.agentPerformance}
            tags={reportData.tagDistribution}
            heatmap={reportData.heatmap}
          />

          <ReportDetailTables
            responseMetrics={reportData.responseMetrics}
            productivity={reportData.productivity}
            conversations={reportData.conversations}
            satisfaction={reportData.satisfaction}
          />
        </div>
      </div>
    </div>
  );
}

function generateReportData(
  filters: ReportsFiltersState,
  context: { queues: Array<{ id: string; name: string }>; tags: Array<{ id: string; name: string; color: string }>; users: Array<{ id: string; name: string }> }
) {
  const rangeInDays =
    differenceInDays(new Date(filters.endDate), new Date(filters.startDate)) + 1 || 7;
  const aggregationMultiplier = filters.aggregation === 'day' ? 1 : filters.aggregation === 'week' ? 1.4 : 1.8;
  const volumeBase = Math.max(420, rangeInDays * 35) * aggregationMultiplier;

  const highlights = [
    {
      label: 'Atendimentos no período',
      value: Math.round(volumeBase).toLocaleString('pt-BR'),
      description: 'Tickets gerados e processados com os filtros selecionados.',
      trend: { value: 8, label: 'vs período anterior' }
    },
    {
      label: 'Primeira resposta média',
      value: '4m 12s',
      description: 'Tempo entre abertura e primeira interação do atendente.',
      trend: { value: -6, label: 'melhoria' }
    },
    {
      label: 'Taxa de resolução',
      value: '92%',
      description: 'Tickets solucionados sem reabertura.',
      trend: { value: 3, label: 'em relação ao mês anterior' }
    },
    {
      label: 'Satisfação média',
      value: '4.6 / 5',
      description: 'Notas das pesquisas enviadas ao finalizar atendimento.',
      trend: { value: 5, label: 'promotores' }
    }
  ];

  const serviceLevels = [
    {
      label: 'SLA primeira resposta',
      value: '87%',
      hint: 'meta 90% em até 5 minutos'
    },
    {
      label: 'Tempo médio de atendimento',
      value: '12m 40s',
      hint: 'inclui tratativa e follow-up'
    },
    {
      label: 'Tempo médio de espera',
      value: '2m 15s',
      hint: 'fila até aceite pelo atendente'
    },
    {
      label: 'Taxa de reabertura',
      value: '6%',
      hint: 'tickets reabertos após conclusão'
    }
  ];

  const periods = Math.min(rangeInDays, filters.aggregation === 'month' ? 6 : filters.aggregation === 'week' ? 8 : 10);
  const timeline = Array.from({ length: periods }).map((_, index) => ({
    label:
      filters.aggregation === 'month'
        ? `M${index + 1}`
        : filters.aggregation === 'week'
        ? `Sem ${index + 1}`
        : `${index + 1}/${periods}`,
    tickets: Math.round(volumeBase / periods + index * 12),
    sla: Math.round(80 + (index % 3) * 4)
  }));

  const queuePerformance = (context.queues.length > 0
    ? context.queues
    : [
        { id: 'support', name: 'Suporte' },
        { id: 'sales', name: 'Vendas' },
        { id: 'vip', name: 'Clientes VIP' }
      ]
  ).map((queue, index) => ({
    id: queue.id,
    name: queue.name,
    volume: Math.max(Math.round(volumeBase / (index + 1.2)), 48),
    wait: `${2 + index}m ${15 + index * 3}s`,
    resolution: Math.max(75 - index * 4, 62)
  }));

  const agentPerformance = (context.users.length > 0
    ? context.users.slice(0, 6)
    : [
        { id: 'agent-1', name: 'Mariana Lima' },
        { id: 'agent-2', name: 'José Santos' },
        { id: 'agent-3', name: 'Carla Alves' },
        { id: 'agent-4', name: 'Ricardo Gomes' }
      ]
  ).map((user, index) => ({
    id: user.id,
    name: user.name,
    tickets: Math.max(Math.round((volumeBase / 10) * (1 - index * 0.08)), 42),
    avgHandle: `${10 + index * 2}m`,
    satisfaction: Math.max(95 - index * 3, 70)
  }));

  const baseTags = context.tags.length > 0
    ? context.tags.map((tag, index) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        value: Math.max(18 - index * 2, 6)
      }))
    : [
        { id: 'tag-prioridade', name: 'Prioridade', color: '#FF355A', value: 32 },
        { id: 'tag-vip', name: 'Clientes VIP', color: '#7C3AED', value: 26 },
        { id: 'tag-renovacao', name: 'Renovação', color: '#2563EB', value: 18 },
        { id: 'tag-financeiro', name: 'Financeiro', color: '#0EA5E9', value: 14 }
      ];

  const tagTotal = baseTags.reduce((sum, item) => sum + item.value, 0);
  const tagDistribution = baseTags.map((tag) => ({
    ...tag,
    value: (tag.value / tagTotal) * 100
  }));

  const heatmap = [
    { label: 'Segunda', values: [64, 92, 88, 73, 41, 26] },
    { label: 'Terça', values: [52, 84, 90, 76, 44, 28] },
    { label: 'Quarta', values: [48, 71, 83, 68, 39, 24] },
    { label: 'Quinta', values: [56, 88, 94, 82, 47, 29] },
    { label: 'Sexta', values: [61, 95, 102, 87, 58, 33] },
    { label: 'Sábado', values: [32, 46, 38, 24, 18, 9] },
    { label: 'Domingo', values: [18, 22, 19, 14, 9, 4] }
  ];

  const responseMetrics = [
    {
      id: 'first-response',
      label: 'Primeira resposta',
      value: '4m 12s',
      target: 'Até 5 minutos',
      status: 'on-track' as const
    },
    {
      id: 'completion',
      label: 'Tempo total médio',
      value: '18m 40s',
      target: 'Até 25 minutos',
      status: 'on-track' as const
    },
    {
      id: 'waiting',
      label: 'Tempo em fila',
      value: '2m 15s',
      target: 'Até 3 minutos',
      status: 'warning' as const
    }
  ];

  const productivity = [
    { id: 'messages', indicator: 'Mensagens enviadas por atendente', period: 'Últimos 7 dias', value: '182 mensagens', trend: 12 },
    { id: 'resolved', indicator: 'Tickets resolvidos por hora', period: 'Últimas 24h', value: '3.4 tickets', trend: 8 },
    { id: 'sla', indicator: 'Cumprimento de SLA', period: 'Últimos 30 dias', value: '91%', trend: 4 },
    { id: 'backlog', indicator: 'Backlog médio diário', period: 'Últimos 7 dias', value: '27 tickets', trend: -6 }
  ];

  const conversations = [
    { id: 'TCK-9821', contact: 'Ana Souza', queue: 'Suporte', agent: agentPerformance[0]?.name ?? 'Equipe', duration: '27m', satisfaction: '5/5', status: 'Resolvido' },
    { id: 'TCK-9746', contact: 'Carlos Pereira', queue: 'Vendas', agent: agentPerformance[1]?.name ?? 'Equipe', duration: '18m', satisfaction: '4/5', status: 'Resolvido' },
    { id: 'TCK-9630', contact: 'Fernanda Lopes', queue: 'Financeiro', agent: agentPerformance[2]?.name ?? 'Equipe', duration: '33m', satisfaction: '3/5', status: 'Reaberto' },
    { id: 'TCK-9584', contact: 'Gustavo Lima', queue: 'Suporte', agent: agentPerformance[3]?.name ?? 'Equipe', duration: '21m', satisfaction: '5/5', status: 'Resolvido' },
    { id: 'TCK-9512', contact: 'Vanessa Castro', queue: 'Clientes VIP', agent: agentPerformance[0]?.name ?? 'Equipe', duration: '12m', satisfaction: '5/5', status: 'Resolvido' }
  ];

  const satisfaction = {
    nps: 62,
    rating: 4.6,
    responses: 189,
    promoters: 118,
    passives: 42,
    detractors: 29,
    highlights: [
      {
        id: 'sat-1',
        customer: 'Juliana · Cliente VIP',
        comment: 'Atendimento rápido e muito cordial, resolveu minha solicitação em poucos minutos. Obrigada!',
        sentiment: 'positive' as const
      },
      {
        id: 'sat-2',
        customer: 'Rafael · Plano Business',
        comment: 'Tempo de espera poderia ser menor, mas o atendente foi super prestativo.',
        sentiment: 'neutral' as const
      },
      {
        id: 'sat-3',
        customer: 'Luciana · Plano Premium',
        comment: 'Demorou para retornar o contato e precisei explicar o problema duas vezes.',
        sentiment: 'negative' as const
      }
    ]
  };

  return {
    highlights,
    serviceLevels,
    timeline,
    queuePerformance,
    agentPerformance,
    tagDistribution,
    heatmap,
    responseMetrics,
    productivity,
    conversations,
    satisfaction
  };
}


'use client';

type ResponseMetric = {
  id: string;
  label: string;
  value: string;
  target: string;
  status: 'on-track' | 'warning' | 'critical';
};

type ProductivityMetric = {
  id: string;
  indicator: string;
  period: string;
  value: string;
  trend: number;
};

type ConversationRecord = {
  id: string;
  contact: string;
  queue: string;
  agent: string;
  duration: string;
  satisfaction: string;
  status: string;
};

type SatisfactionInsight = {
  nps: number;
  rating: number;
  responses: number;
  promoters: number;
  passives: number;
  detractors: number;
  highlights: Array<{
    id: string;
    customer: string;
    comment: string;
    sentiment: 'positive' | 'neutral' | 'negative';
  }>;
};

type ReportDetailTablesProps = {
  responseMetrics: ResponseMetric[];
  productivity: ProductivityMetric[];
  conversations: ConversationRecord[];
  satisfaction: SatisfactionInsight;
};

const statusStyles: Record<ResponseMetric['status'], string> = {
  'on-track': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  critical: 'bg-red-100 text-red-600 border-red-200'
};

const sentimentStyles: Record<SatisfactionInsight['highlights'][number]['sentiment'], string> = {
  positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  neutral: 'bg-gray-50 text-gray-600 border-gray-200',
  negative: 'bg-red-50 text-red-600 border-red-200'
};

export default function ReportDetailTables({
  responseMetrics,
  productivity,
  conversations,
  satisfaction
}: ReportDetailTablesProps) {
  return (
    <section className="space-y-6">
      <article className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1.2fr_1fr]">
        <div>
          <header className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-gray-500">Tempo de resposta e SLA</h3>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              Metas configuradas
            </span>
          </header>
          <div className="space-y-3">
            {responseMetrics.map((metric) => (
              <div key={metric.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{metric.label}</p>
                  <p className="text-xs text-gray-500">Meta: {metric.target}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-gray-900">{metric.value}</span>
                  <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${statusStyles[metric.status]}`}>
                    {metric.status === 'on-track' ? 'Dentro do SLA' : metric.status === 'warning' ? 'Atenção' : 'Crítico'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <header className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-gray-500">Satisfação dos clientes</h3>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {satisfaction.responses} respostas no período
            </span>
          </header>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-gray-500">NPS</p>
                <p className="text-3xl font-semibold text-gray-900">{satisfaction.nps}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-700">
                <p className="font-semibold">Classificação</p>
                <p>Zona de crescimento</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <p className="font-semibold">Promotores</p>
                <p>{satisfaction.promoters}</p>
              </div>
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <p className="font-semibold">Neutros</p>
                <p>{satisfaction.passives}</p>
              </div>
              <div className="rounded-lg bg-red-100 p-2 text-red-600">
                <p className="font-semibold">Detratores</p>
                <p>{satisfaction.detractors}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-500">Comentários recentes</p>
              {satisfaction.highlights.map((item) => (
                <div key={item.id} className={`rounded-xl border px-3 py-2 text-xs ${sentimentStyles[item.sentiment]}`}>
                  <p className="font-semibold">{item.customer}</p>
                  <p className="mt-1">{item.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-500">Produtividade</h3>
            <p className="text-xs text-gray-500">Mensagens enviadas, tickets resolvidos e taxa de conclusão por hora</p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            Indicadores semanais
          </span>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left">Indicador</th>
                <th className="px-4 py-3 text-left">Período</th>
                <th className="px-4 py-3 text-left">Valor</th>
                <th className="px-4 py-3 text-left">Variação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productivity.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{item.indicator}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.period}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{item.value}</td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={`inline-flex rounded-lg px-2 py-1 font-semibold ${
                        item.trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {item.trend >= 0 ? '+' : ''}
                      {item.trend}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-500">Histórico de conversas</h3>
            <p className="text-xs text-gray-500">Amostra filtrada para auditoria e análise qualitativa.</p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            {conversations.length} tickets selecionados
          </span>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left">Ticket</th>
                <th className="px-4 py-3 text-left">Contato</th>
                <th className="px-4 py-3 text-left">Fila</th>
                <th className="px-4 py-3 text-left">Atendente</th>
                <th className="px-4 py-3 text-left">Duração</th>
                <th className="px-4 py-3 text-left">Satisfação</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conversations.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.id}</td>
                  <td className="px-4 py-3">{item.contact}</td>
                  <td className="px-4 py-3">{item.queue}</td>
                  <td className="px-4 py-3">{item.agent}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.duration}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.satisfaction}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}


import { DashboardSummary } from '@/store/metadataStore';

type SummaryCardsProps = {
  loading: boolean;
  data: DashboardSummary | null;
};

const numberFormatter = new Intl.NumberFormat('pt-BR');

const cards = [
  {
    key: 'total',
    title: 'Atendimentos Totais',
    accessor: (data: DashboardSummary) => data.tickets.total,
    accent: 'bg-primary/10 text-primary'
  },
  {
    key: 'pending',
    title: 'Pendentes',
    accessor: (data: DashboardSummary) => data.tickets.pending,
    accent: 'bg-yellow-100 text-yellow-700'
  },
  {
    key: 'open',
    title: 'Em Atendimento',
    accessor: (data: DashboardSummary) => data.tickets.open,
    accent: 'bg-green-100 text-green-700'
  },
  {
    key: 'agentsOnline',
    title: 'Agentes Online',
    accessor: (data: DashboardSummary) => data.agents.online,
    accent: 'bg-blue-100 text-blue-700'
  },
  {
    key: 'messagesToday',
    title: 'Mensagens Hoje',
    accessor: (data: DashboardSummary) => data.messagesToday,
    accent: 'bg-purple-100 text-purple-700'
  }
];

export default function SummaryCards({ loading, data }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card.key} className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">{card.title}</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-3xl font-semibold text-gray-900">
              {loading || !data ? '...' : numberFormatter.format(card.accessor(data))}
            </span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${card.accent}`}>
              {card.key === 'total' ? 'Geral' : card.title}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

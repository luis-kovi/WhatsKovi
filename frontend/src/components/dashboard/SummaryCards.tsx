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
    accessor: (data: DashboardSummary) => data.tickets.total
  },
  {
    key: 'pending',
    title: 'Pendentes',
    accessor: (data: DashboardSummary) => data.tickets.pending
  },
  {
    key: 'open',
    title: 'Em Atendimento',
    accessor: (data: DashboardSummary) => data.tickets.open
  },
  {
    key: 'agentsOnline',
    title: 'Agentes Online',
    accessor: (data: DashboardSummary) => data.agents.online
  },
  {
    key: 'messagesToday',
    title: 'Mensagens Hoje',
    accessor: (data: DashboardSummary) => data.messagesToday
  }
];

export default function SummaryCards({ loading, data }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card.key} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{card.title}</p>
          <span className="mt-2 block text-2xl font-semibold text-gray-900">
            {loading || !data ? '...' : numberFormatter.format(card.accessor(data))}
          </span>
        </div>
      ))}
    </div>
  );
}

import type { MessageCampaign } from '@/types/campaigns';

type Props = {
  campaigns: MessageCampaign[];
};

const StatCard = ({
  title,
  subtitle,
  value,
  accent
}: {
  title: string;
  subtitle: string;
  value: string;
  accent: string;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase text-gray-500">{subtitle}</p>
    <div className="mt-2 flex items-baseline gap-2">
      <span className="text-2xl font-semibold text-gray-900">{value}</span>
      <span className={`text-xs font-medium ${accent}`}>{title}</span>
    </div>
  </div>
);

export default function CampaignSummaryCards({ campaigns }: Props) {
  const total = campaigns.length;
  const active = campaigns.filter((campaign) => campaign.status === 'RUNNING').length;
  const scheduled = campaigns.filter((campaign) => campaign.status === 'SCHEDULED').length;
  const completed = campaigns.filter((campaign) => campaign.status === 'COMPLETED').length;

  return (
    <section className="grid gap-4 md:grid-cols-4">
      <StatCard title="Campanhas" subtitle="Total" value={total.toString()} accent="text-primary" />
      <StatCard
        title="Em andamento"
        subtitle="Ativas"
        value={active.toString()}
        accent="text-emerald-600"
      />
      <StatCard
        title="Agendadas"
        subtitle="Na fila"
        value={scheduled.toString()}
        accent="text-blue-600"
      />
      <StatCard
        title="Concluídas"
        subtitle="Finalizadas"
        value={completed.toString()}
        accent="text-green-600"
      />
    </section>
  );
}

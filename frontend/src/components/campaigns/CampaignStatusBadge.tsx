import type { MessageCampaignStatus } from '@/types/campaigns';

const STATUS_STYLES: Record<MessageCampaignStatus, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
  SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  RUNNING: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  PAUSED: { bg: 'bg-amber-100', text: 'text-amber-700' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-700' },
  CANCELLED: { bg: 'bg-rose-100', text: 'text-rose-700' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700' }
};

const STATUS_LABEL: Record<MessageCampaignStatus, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendada',
  RUNNING: 'Em andamento',
  PAUSED: 'Pausada',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  FAILED: 'Falhou'
};

type Props = {
  status: MessageCampaignStatus;
  size?: 'sm' | 'md';
};

export default function CampaignStatusBadge({ status, size = 'md' }: Props) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  const label = STATUS_LABEL[status] ?? status;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${style.bg} ${style.text} ${padding}`}>
      <span
        className={`h-2 w-2 rounded-full ${
          status === 'RUNNING'
            ? 'bg-emerald-500'
            : status === 'FAILED'
            ? 'bg-red-500'
            : status === 'PAUSED'
            ? 'bg-amber-500'
            : status === 'CANCELLED'
            ? 'bg-rose-500'
            : status === 'COMPLETED'
            ? 'bg-green-500'
            : 'bg-gray-400'
        }`}
      />
      {label}
    </span>
  );
}

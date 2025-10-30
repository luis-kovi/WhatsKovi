import Link from 'next/link';
import { Pause, Play, StopCircle, ArrowUpRight } from 'lucide-react';
import CampaignStatusBadge from './CampaignStatusBadge';
import CampaignProgressBar from './CampaignProgressBar';
import type { MessageCampaign } from '@/types/campaigns';

type Props = {
  campaigns: MessageCampaign[];
  loading?: boolean;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onRefresh?: () => void;
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function CampaignTable({ campaigns, loading, onPause, onResume, onCancel }: Props) {
  if (!loading && campaigns.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-gray-500 shadow-sm">
        Nenhuma campanha foi cadastrada ainda. Clique em <span className="font-semibold text-primary">“Nova campanha”</span> para começar.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-6 py-4">Campanha</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Progresso</th>
            <th className="px-6 py-4">Agendamento</th>
            <th className="px-6 py-4">Limite/min</th>
            <th className="px-6 py-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="animate-pulse">
                  <td className="px-6 py-5">
                    <div className="h-4 w-40 rounded bg-gray-200" />
                    <div className="mt-2 h-3 w-24 rounded bg-gray-100" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="h-5 w-24 rounded-full bg-gray-200" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="h-2 w-full rounded-full bg-gray-200" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="h-4 w-24 rounded bg-gray-200" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="h-4 w-12 rounded bg-gray-200" />
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="ml-auto h-8 w-28 rounded bg-gray-200" />
                  </td>
                </tr>
              ))
            : campaigns.map((campaign) => (
                <tr key={campaign.id} className="transition hover:bg-gray-50/70">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900">{campaign.name}</p>
                    <p className="text-xs text-gray-500">
                      {campaign.queue ? `Fila ${campaign.queue.name}` : 'Sem fila definida'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <CampaignStatusBadge status={campaign.status} size="sm" />
                  </td>
                  <td className="px-6 py-4">
                    <CampaignProgressBar progress={campaign.progress} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(campaign.scheduledFor)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{campaign.rateLimitPerMinute}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {campaign.status === 'RUNNING' && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                          onClick={() => onPause(campaign.id)}
                        >
                          <Pause className="h-4 w-4" />
                          Pausar
                        </button>
                      )}
                      {campaign.status === 'PAUSED' && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100"
                          onClick={() => onResume(campaign.id)}
                        >
                          <Play className="h-4 w-4" />
                          Retomar
                        </button>
                      )}
                      {!['COMPLETED', 'CANCELLED'].includes(campaign.status) && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                          onClick={() => onCancel(campaign.id)}
                        >
                          <StopCircle className="h-4 w-4" />
                          Cancelar
                        </button>
                      )}
                      <Link
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90"
                      >
                        Ver detalhes
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

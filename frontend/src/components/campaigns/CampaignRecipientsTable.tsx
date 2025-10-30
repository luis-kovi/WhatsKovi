import { useMemo } from 'react';
import type {
  CampaignRecipientListResponse,
  MessageCampaignRecipientStatus
} from '@/types/campaigns';

const STATUS_OPTIONS: Array<{ value?: MessageCampaignRecipientStatus; label: string }> = [
  { value: undefined, label: 'Todos' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'SENDING', label: 'Enviando' },
  { value: 'SENT', label: 'Enviadas' },
  { value: 'FAILED', label: 'Falhas' },
  { value: 'SKIPPED', label: 'Ignoradas' },
  { value: 'CANCELLED', label: 'Canceladas' }
];

const STATUS_COLORS: Record<MessageCampaignRecipientStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  SENDING: 'bg-blue-100 text-blue-700',
  SENT: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-rose-100 text-rose-700',
  SKIPPED: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-gray-200 text-gray-500'
};

type Props = {
  data?: CampaignRecipientListResponse;
  loading?: boolean;
  status?: MessageCampaignRecipientStatus;
  onStatusChange?: (status: MessageCampaignRecipientStatus | undefined) => void;
  onPageChange?: (page: number) => void;
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function CampaignRecipientsTable({ data, loading, status, onStatusChange, onPageChange }: Props) {
  const items = data?.items ?? [];
  const pages = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: data.totalPages }, (_, index) => index + 1);
  }, [data]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Destinatários</h3>
          <p className="text-xs text-gray-500">
            Acompanhe o status de envio para cada contato e identifique possíveis falhas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {STATUS_OPTIONS.map((option) => {
            const active = option.value === status;
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => onStatusChange?.(option.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Contato</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Enviado em</th>
              <th className="px-6 py-3">Observações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 rounded bg-gray-200" />
                      <div className="mt-1 h-3 w-20 rounded bg-gray-100" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-24 rounded-full bg-gray-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-28 rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-3 w-40 rounded bg-gray-200" />
                    </td>
                  </tr>
                ))
              : items.map((recipient) => (
                  <tr key={recipient.id} className="transition hover:bg-gray-50/80">
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-gray-900">{recipient.contact.name}</p>
                      <p className="text-xs text-gray-500">{recipient.contact.phoneNumber}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          STATUS_COLORS[recipient.status]
                        }`}
                      >
                        {STATUS_OPTIONS.find((option) => option.value === recipient.status)?.label ??
                          recipient.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{formatDate(recipient.sentAt)}</td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {recipient.error
                        ? recipient.error
                        : recipient.status === 'SKIPPED'
                        ? 'Contato ignorado para evitar duplicidade.'
                        : '—'}
                    </td>
                  </tr>
                ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                  Nenhum destinatário corresponde ao filtro atual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 text-xs text-gray-500">
          <span>
            Mostrando {(data.page - 1) * data.pageSize + 1}-
            {Math.min(data.page * data.pageSize, data.total)} de {data.total}
          </span>
          <div className="inline-flex items-center gap-1">
            {pages.map((page) => {
              const active = page === data.page;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => onPageChange?.(page)}
                  className={`h-7 w-7 rounded-full text-xs font-semibold transition ${
                    active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { format, parseISO } from 'date-fns';
import type { SatisfactionOverview, SatisfactionResponseList } from '@/types/satisfaction';

type SatisfactionCommentsProps = {
  highlights: SatisfactionOverview['recentComments'];
  responses: SatisfactionResponseList | null;
  loading: boolean;
  onPageChange: (page: number) => void;
};

const sentimentColors: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  negative: 'bg-red-100 text-red-600 border-red-200'
};

const formatDateTime = (value: string) => {
  try {
    return format(parseISO(value), 'dd/MM/yyyy HH:mm');
  } catch {
    return value;
  }
};

export default function SatisfactionComments({
  highlights,
  responses,
  loading,
  onPageChange
}: SatisfactionCommentsProps) {
  const pagination = responses?.pagination;

  return (
    <section className="space-y-5">
      <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-500">Comentarios recentes</h3>
            <p className="text-xs text-gray-500">Feedback de clientes com analise de sentimento</p>
          </div>
        </header>

        {highlights.length === 0 ? (
          <p className="text-xs text-gray-500">Nenhum comentario coletado ate o momento.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {highlights.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 text-sm ${sentimentColors[item.sentiment]}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{item.contact}</p>
                  <span className="text-xs uppercase text-gray-500">
                    {formatDateTime(item.respondedAt)}
                  </span>
                </div>
                <p className="mt-2 leading-relaxed">{item.comment}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="font-mono text-gray-600">Nota {item.rating.toFixed(1)}</span>
                  <span className="text-gray-500">
                    {item.queue ?? 'Sem fila'} • {item.agent ?? 'Sem atendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-500">Todas as respostas</h3>
            <p className="text-xs text-gray-500">
              Lista completa para auditoria e acompanhamento de indicadores
            </p>
          </div>
          {pagination && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Pag {pagination.page} de {pagination.totalPages}
            </span>
          )}
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : responses && responses.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Contato</th>
                  <th className="px-4 py-3 text-left">Fila</th>
                  <th className="px-4 py-3 text-left">Atendente</th>
                  <th className="px-4 py-3 text-left">Nota</th>
                  <th className="px-4 py-3 text-left">Comentario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {responses.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDateTime(item.respondedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.contact.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {item.queue.name ?? 'Sem fila'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {item.agent.name ?? 'Sem atendente'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${sentimentColors[item.sentiment]}`}>
                        {item.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {item.comment ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-500">Nenhuma resposta registrada para o periodo.</p>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(pagination.page - 1, 1))}
              disabled={pagination.page === 1}
              className="rounded-lg border border-gray-200 px-3 py-1 font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(pagination.page + 1, pagination.totalPages))}
              disabled={pagination.page === pagination.totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1 font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            >
              Proxima
            </button>
          </div>
        )}
      </article>
    </section>
  );
}

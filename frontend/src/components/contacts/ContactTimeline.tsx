import type { ContactHistoryEvent } from '@/store/contactStore';

const colorByType: Record<ContactHistoryEvent['type'], string> = {
  note: 'bg-blue-100 text-blue-700',
  ticket: 'bg-emerald-100 text-emerald-700',
  message: 'bg-purple-100 text-purple-700',
  'internal-message': 'bg-amber-100 text-amber-700'
};

type ContactTimelineProps = {
  events: ContactHistoryEvent[];
  loading: boolean;
  onReload: () => void;
};

export default function ContactTimeline({ events, loading, onReload }: ContactTimelineProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Linha do tempo</h3>
          <p className="text-xs text-gray-500">Eventos recentes de atendimento, notas e mensagens.</p>
        </div>
        <button
          onClick={onReload}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
          type="button"
        >
          {loading ? 'Atualizando...' : 'Atualizar' }
        </button>
      </header>
      <div className="space-y-4">
        {events.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-xs text-gray-500">
            Nenhum evento disponível para este contato.
          </div>
        )}
        {events.map((event) => (
          <article key={event.id} className="flex gap-3 rounded-xl border border-gray-100 bg-white px-3 py-3 shadow-sm">
            <span className={`mt-1 h-6 rounded-full px-2 text-[10px] font-semibold uppercase ${colorByType[event.type]}`}>
              {event.type === 'note'
                ? 'Nota'
                : event.type === 'ticket'
                ? 'Ticket'
                : event.type === 'message'
                ? 'Mensagem'
                : 'Nota interna'}
            </span>
            <div className="flex-1">
              <header className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
                <span>{event.title}</span>
                {event.author?.name && <span className="text-xs font-normal text-gray-500">• {event.author.name}</span>}
                <span className="text-xs font-normal text-gray-400">• {new Date(event.createdAt).toLocaleString('pt-BR')}</span>
              </header>
              <p className="mt-1 text-xs text-gray-600">{event.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

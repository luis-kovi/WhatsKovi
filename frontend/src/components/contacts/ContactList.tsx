import type { ContactSummary } from '@/store/contactStore';

type ContactListProps = {
  contacts: ContactSummary[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
};

const formatDate = (value: string | null) => {
  if (!value) return 'Sem interação recente';
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Sem interação recente';
  }
};

export default function ContactList({ contacts, selectedId, loading, onSelect }: ContactListProps) {
  if (!loading && contacts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white">
        <div className="text-center text-sm text-gray-500">
          <p className="font-semibold text-gray-700">Nenhum contato encontrado</p>
          <p className="mt-1">Ajuste os filtros para visualizar outros resultados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3 text-xs font-semibold uppercase text-gray-500">
        {loading ? 'Carregando contatos...' : `${contacts.length} contato(s)`}
      </div>
      <div className="flex-1 overflow-y-auto">
        {contacts.map((contact) => {
          const isActive = contact.id === selectedId;
          return (
            <button
              key={contact.id}
              onClick={() => onSelect(contact.id)}
              className={`flex w-full flex-col gap-2 border-b border-gray-100 px-4 py-3 text-left transition ${
                isActive ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'
              }`}
              type="button"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{contact.name}</p>
                {contact.isBlocked && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                    Bloqueado
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{contact.phoneNumber}</p>
              <div className="flex flex-wrap items-center gap-2">
                {contact.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.id}
                    className="text-[10px] font-semibold uppercase text-gray-500"
                    style={{ color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
                {contact.tags.length > 3 && (
                  <span className="text-[10px] text-gray-400">+{contact.tags.length - 3}</span>
                )}
              </div>
              <p className="text-[11px] text-gray-400">Última interação: {formatDate(contact.lastInteractionAt)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

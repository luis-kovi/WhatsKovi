import { useEffect, useState } from 'react';
import { useTicketStore } from '@/store/ticketStore';
import { useContactStore } from '@/store/contactStore';

export default function ContactPanel() {
  const selectedTicket = useTicketStore((state) => state.selectedTicket);
  const { selectedContact, loadContact, updateContact, loading, clearSelected } = useContactStore((state) => ({
    selectedContact: state.selectedContact,
    loadContact: state.loadContact,
    updateContact: state.updateContact,
    loading: state.loading,
    clearSelected: state.clearSelected
  }));

  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (selectedTicket) {
      loadContact(selectedTicket.contact.id);
    } else {
      clearSelected();
    }
  }, [selectedTicket?.contact.id]);

  useEffect(() => {
    setNotes(selectedContact?.notes || '');
  }, [selectedContact?.notes]);

  const handleSaveNotes = async () => {
    if (!selectedContact || notes === selectedContact.notes) return;
    await updateContact(selectedContact.id, { notes });
  };

  const handleToggleBlock = async () => {
    if (!selectedContact) return;
    await updateContact(selectedContact.id, { isBlocked: !selectedContact.isBlocked });
  };

  if (!selectedTicket) {
    return (
    <aside className="hidden w-80 flex-col border-l border-gray-200 bg-white p-4 xl:flex">
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Selecione um ticket para ver detalhes do contato.
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden w-80 flex-col gap-4 border-l border-gray-200 bg-white p-4 xl:flex">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Detalhes do contato</h2>
        <p className="text-xs text-gray-500">Historico e preferencias do cliente</p>
      </div>

      {loading || !selectedContact ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">{selectedTicket.contact.name}</p>
                <p className="text-xs text-gray-500">{selectedTicket.contact.phoneNumber}</p>
                {selectedContact.email && <p className="text-xs text-gray-500">{selectedContact.email}</p>}
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
                {selectedContact.isBlocked ? 'Bloqueado' : 'Ativo'}
                <span className={`h-2 w-2 rounded-full ${selectedContact.isBlocked ? 'bg-red-500' : 'bg-green-500'}`} />
              </span>
            </div>

            {selectedContact.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedContact.tags.map((relation) => (
                  <span
                    key={relation.id}
                    className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                    style={{ backgroundColor: `${relation.tag.color}22`, color: relation.tag.color }}
                  >
                    #{relation.tag.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Nenhuma tag atribuida a este contato.</p>
            )}

            <button
              onClick={handleToggleBlock}
              className="mt-4 w-full rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50"
            >
              {selectedContact.isBlocked ? 'Desbloquear contato' : 'Bloquear contato'}
            </button>
          </div>

          <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <label className="text-xs font-semibold uppercase text-gray-500">Notas internas</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Adicione anotacoes relevantes sobre este contato..."
              className="mt-2 h-40 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-2 text-xs text-gray-400">Notas sao visiveis apenas para a equipe.</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-800">Atendimentos recentes</h3>
            <ul className="mt-3 space-y-2">
              {selectedContact.tickets && selectedContact.tickets.length > 0 ? (
                selectedContact.tickets.map((ticket) => (
                  <li key={ticket.id} className="rounded-lg bg-white p-2 text-xs shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{ticket.status}</span>
                      {ticket.queue && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                          {ticket.queue.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-gray-500">Atualizado em {new Date(ticket.updatedAt).toLocaleString()}</p>
                  </li>
                ))
              ) : (
                <li className="text-xs text-gray-500">Sem historico registrado.</li>
              )}
            </ul>
          </div>
        </>
      )}
    </aside>
  );
}

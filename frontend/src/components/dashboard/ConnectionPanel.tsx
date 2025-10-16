import { FormEvent, useEffect, useState } from 'react';
import { useMetadataStore, WhatsAppConnection } from '@/store/metadataStore';

const STATUS_COLORS: Record<string, string> = {
  CONNECTED: 'bg-green-500',
  CONNECTING: 'bg-yellow-500',
  DISCONNECTED: 'bg-gray-400'
};

const STATUS_LABELS: Record<string, string> = {
  CONNECTED: 'Conectado',
  CONNECTING: 'Conectando',
  DISCONNECTED: 'Desconectado'
};

const getStatusBadge = (status: string) => STATUS_LABELS[status] || status;

export default function ConnectionPanel() {
  const connections = useMetadataStore((state) => state.connections);
  const fetchConnections = useMetadataStore((state) => state.fetchConnections);
  const createConnection = useMetadataStore((state) => state.createConnection);
  const startConnection = useMetadataStore((state) => state.startConnection);
  const stopConnection = useMetadataStore((state) => state.stopConnection);
  const deleteConnection = useMetadataStore((state) => state.deleteConnection);
  const setupRealtimeListeners = useMetadataStore((state) => state.setupRealtimeListeners);

  const [newName, setNewName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchConnections();
    setupRealtimeListeners();
  }, [fetchConnections, setupRealtimeListeners]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;

    setSubmitting(true);
    await createConnection({ name: newName.trim(), isDefault });
    setNewName('');
    setIsDefault(false);
    setSubmitting(false);
  };

  const renderConnectionCard = (connection: WhatsAppConnection) => {
    const isConnected = connection.status === 'CONNECTED';
    const isConnecting = connection.status === 'CONNECTING';

    return (
      <div key={connection.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{connection.name}</h3>
            <p className="text-xs text-gray-500">
              {connection.phoneNumber ? `+${connection.phoneNumber}` : 'Numero nao vinculado'}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-100`}
          >
            <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[connection.status] || 'bg-gray-400'}`} />
            {getStatusBadge(connection.status)}
          </span>
        </div>

        {connection.qrCode && (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-2">
            <p className="text-xs text-gray-500 mb-2">Escaneie para autenticar</p>
            <img src={connection.qrCode} alt="QR Code" className="w-full rounded-md bg-white" />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => startConnection(connection.id)}
            disabled={isConnected || isConnecting}
            className="flex-1 rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
          >
            Iniciar
          </button>
          <button
            onClick={() => stopConnection(connection.id)}
            disabled={!isConnected && !isConnecting}
            className="flex-1 rounded-lg border border-amber-500 px-3 py-2 text-xs font-semibold text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
          >
            Parar
          </button>
          <button
            onClick={() => deleteConnection(connection.id)}
            className="flex-1 rounded-lg border border-red-500 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          >
            Remover
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside className="hidden xl:flex w-80 flex-col gap-4 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Conexoes WhatsApp</h2>
        <p className="text-xs text-gray-500">Gerencie multiplas instancias e acompanhe status.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">Nome da conexao</label>
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Ex: WhatsApp Suporte"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            checked={isDefault}
            onChange={(event) => setIsDefault(event.target.checked)}
          />
          Definir como conexao padrao
        </label>

        <button
          type="submit"
          disabled={submitting || !newName.trim()}
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {submitting ? 'Salvando...' : 'Adicionar conexao'}
        </button>
      </form>

      <div className="space-y-3">
        {connections.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma conexao configurada ainda.</p>
        ) : (
          connections.map((connection) => renderConnectionCard(connection))
        )}
      </div>
    </aside>
  );
}

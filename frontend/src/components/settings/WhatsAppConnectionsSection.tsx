'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
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

type WhatsAppConnectionsSectionProps = {
  onCreate?: (payload: { name: string; isDefault?: boolean }) => Promise<void>;
};

export default function WhatsAppConnectionsSection({ onCreate }: WhatsAppConnectionsSectionProps) {
  const connections = useMetadataStore((state) => state.connections);
  const fetchConnections = useMetadataStore((state) => state.fetchConnections);
  const storeCreateConnection = useMetadataStore((state) => state.createConnection);
  const createConnection = onCreate ?? storeCreateConnection;
  const startConnection = useMetadataStore((state) => state.startConnection);
  const stopConnection = useMetadataStore((state) => state.stopConnection);
  const deleteConnection = useMetadataStore((state) => state.deleteConnection);
  const setupRealtimeListeners = useMetadataStore((state) => state.setupRealtimeListeners);

  const [newName, setNewName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ id: string; action: 'start' | 'stop' | 'delete' } | null>(null);

  useEffect(() => {
    fetchConnections();
    setupRealtimeListeners();
  }, [fetchConnections, setupRealtimeListeners]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) {
      toast.error('Informe o nome da conexao.');
      return;
    }

    setSubmitting(true);
    try {
      await createConnection({ name: newName.trim(), isDefault });
      toast.success('Conexao criada com sucesso.');
      setNewName('');
      setIsDefault(false);
    } catch (error) {
      console.error('Erro ao criar conexao WhatsApp:', error);
      toast.error('Nao foi possivel criar a conexao.');
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (
    id: string,
    action: 'start' | 'stop' | 'delete',
    fn: () => Promise<void>,
    successMessage: string,
    errorMessage: string
  ) => {
    setActionLoading({ id, action });
    try {
      await fn();
      toast.success(successMessage);
    } catch (error) {
      console.error(errorMessage, error);
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStart = (id: string) =>
    runAction(id, 'start', () => startConnection(id), 'Conexao iniciada.', 'Nao foi possivel iniciar a conexao.');

  const handleStop = (id: string) =>
    runAction(id, 'stop', () => stopConnection(id), 'Conexao pausada.', 'Nao foi possivel parar a conexao.');

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Deseja remover esta conexao?');
    if (!confirmed) return;
    await runAction(id, 'delete', () => deleteConnection(id), 'Conexao removida.', 'Nao foi possivel remover a conexao.');
  };

  const isActionLoading = (id: string, action: 'start' | 'stop' | 'delete') =>
    actionLoading?.id === id && actionLoading.action === action;

  const renderConnectionCard = (connection: WhatsAppConnection) => {
    const isConnected = connection.status === 'CONNECTED';
    const isConnecting = connection.status === 'CONNECTING';

    return (
      <div key={connection.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{connection.name}</h3>
            <p className="text-xs text-gray-500">
              {connection.phoneNumber ? `+${connection.phoneNumber}` : 'Numero nao vinculado'}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
            <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[connection.status] || 'bg-gray-400'}`} />
            {getStatusBadge(connection.status)}
          </span>
        </div>

        {connection.qrCode && (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
            <p className="mb-2 text-xs text-gray-500">Escaneie para autenticar</p>
            <Image
              src={connection.qrCode}
              alt="QR Code para autenticar conexao"
              width={256}
              height={256}
              className="h-auto w-full rounded-md bg-white"
              unoptimized
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => handleStart(connection.id)}
            disabled={isConnected || isConnecting || isActionLoading(connection.id, 'start')}
            className="flex-1 rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
          >
            {isActionLoading(connection.id, 'start') ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Iniciando...
              </span>
            ) : (
              'Iniciar'
            )}
          </button>
          <button
            onClick={() => handleStop(connection.id)}
            disabled={(!isConnected && !isConnecting) || isActionLoading(connection.id, 'stop')}
            className="flex-1 rounded-lg border border-amber-500 px-3 py-2 text-xs font-semibold text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
          >
            {isActionLoading(connection.id, 'stop') ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Parando...
              </span>
            ) : (
              'Parar'
            )}
          </button>
          <button
            onClick={() => handleDelete(connection.id)}
            disabled={isActionLoading(connection.id, 'delete')}
            className="flex-1 rounded-lg border border-red-500 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-red-200 disabled:text-red-300"
          >
            {isActionLoading(connection.id, 'delete') ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Removendo...
              </span>
            ) : (
              'Remover'
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Conexoes WhatsApp</h2>
          <p className="text-sm text-gray-500">
            Configure multiplas instancias conectadas ao WhatsApp Web e monitore o status de cada sessao.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
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

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-600">
          <p className="font-semibold text-gray-800">Boas praticas</p>
          <ul className="mt-3 space-y-2 text-xs text-gray-500">
            <li>- Crie conexoes especificas por fila (ex.: Suporte, Comercial, VIP).</li>
            <li>- Defina uma sessao padrao para distribuir tickets automaticamente.</li>
            <li>- Caso uma sessao desconecte, reescaneie o QR Code disponivel na conexao.</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {connections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
            Nenhuma conexao cadastrada. Adicione uma nova instancia para iniciar os atendimentos via WhatsApp.
          </div>
        ) : (
          connections.map((connection) => renderConnectionCard(connection))
        )}
      </div>
    </section>
  );
}


'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Pause, Play, StopCircle } from 'lucide-react';
import CampaignStatusBadge from '@/components/campaigns/CampaignStatusBadge';
import CampaignProgressBar from '@/components/campaigns/CampaignProgressBar';
import CampaignRecipientsTable from '@/components/campaigns/CampaignRecipientsTable';
import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store/authStore';
import { useCampaignStore } from '@/store/campaignStore';
import type { MessageCampaignRecipientStatus } from '@/types/campaigns';

type PageProps = {
  params: {
    id: string;
  };
};

export default function CampaignDetailPage({ params }: PageProps) {
  const router = useRouter();
  const campaignId = params.id;
  const loadUser = useAuthStore((state) => state.loadUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.user);

  const detailById = useCampaignStore((state) => state.detailById);
  const statsById = useCampaignStore((state) => state.statsById);
  const recipientsById = useCampaignStore((state) => state.recipientsById);
  const recipientsLoadingById = useCampaignStore((state) => state.recipientsLoadingById);
  const recipientFiltersById = useCampaignStore((state) => state.recipientFiltersById);

  const fetchCampaign = useCampaignStore((state) => state.fetchCampaign);
  const fetchStats = useCampaignStore((state) => state.fetchCampaignStats);
  const fetchRecipients = useCampaignStore((state) => state.fetchCampaignRecipients);
  const pauseCampaign = useCampaignStore((state) => state.pauseCampaign);
  const resumeCampaign = useCampaignStore((state) => state.resumeCampaign);
  const cancelCampaign = useCampaignStore((state) => state.cancelCampaign);

  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<MessageCampaignRecipientStatus | undefined>(
    recipientFiltersById[campaignId]?.status
  );

  const campaign = detailById[campaignId];
  const progress = statsById[campaignId] ?? campaign?.progress;
  const recipients = recipientsById[campaignId];
  const recipientsLoading = recipientsLoadingById[campaignId];

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isAuthenticated) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        router.replace('/login');
      }
      return;
    }
    if (!currentUser) return;
    if (currentUser.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }

    const loadData = async () => {
      try {
        await fetchCampaign(campaignId);
        await fetchStats(campaignId, true);
        await fetchRecipients(campaignId, { status: statusFilter, page: 1 });
      } catch (error) {
        console.error(error);
        toast.error('Não foi possível carregar a campanha.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [
    isAuthenticated,
    currentUser,
    router,
    campaignId,
    fetchCampaign,
    fetchStats,
    fetchRecipients,
    statusFilter
  ]);

  const handleStatusChange = async (status: MessageCampaignRecipientStatus | undefined) => {
    setStatusFilter(status);
    try {
      await fetchRecipients(campaignId, { status, page: 1 });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao filtrar destinatários.');
    }
  };

  const handlePageChange = async (page: number) => {
    try {
      await fetchRecipients(campaignId, {
        status: statusFilter,
        page
      });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao paginar destinatários.');
    }
  };

  const handlePause = async () => {
    try {
      await pauseCampaign(campaignId);
      toast.success('Campanha pausada.');
      await fetchCampaign(campaignId);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível pausar a campanha.');
    }
  };

  const handleResume = async () => {
    try {
      await resumeCampaign(campaignId);
      toast.success('Campanha retomada.');
      await fetchCampaign(campaignId);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível retomar a campanha.');
    }
  };

  const handleCancel = async () => {
    const confirmation = window.confirm('Você confirma o cancelamento desta campanha?');
    if (!confirmation) return;
    try {
      await cancelCampaign(campaignId);
      toast.success('Campanha cancelada.');
      await fetchCampaign(campaignId);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível cancelar a campanha.');
    }
  };

  const recipientsByStatus = useMemo(() => campaign?.recipientsByStatus ?? {}, [campaign]);

  if (!isAuthenticated || !currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>

          {loading || !campaign ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando detalhes...
              </div>
            </div>
          ) : (
            <>
              <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-2 border-b border-gray-100 pb-4">
                    <h1 className="text-2xl font-semibold text-gray-900">{campaign.name}</h1>
                    <p className="text-sm text-gray-500">{campaign.description || 'Sem descrição vinculada.'}</p>
                    <CampaignStatusBadge status={campaign.status} />
                  </div>

                  <div className="mt-4 space-y-4 text-sm text-gray-600">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">Mensagem</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{campaign.body}</p>
                      {campaign.mediaUrl && (
                        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-600">
                          📎 Anexo configurado: {campaign.mediaUrl}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase text-gray-500">Conexão</p>
                        <p className="text-sm text-gray-700">
                          {campaign.whatsapp ? `${campaign.whatsapp.name} ${campaign.whatsapp.phoneNumber ?? ''}` : '—'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase text-gray-500">Fila</p>
                        <p className="text-sm text-gray-700">{campaign.queue?.name ?? '—'}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase text-gray-500">Agendamento</p>
                        <p className="text-sm text-gray-700">
                          {campaign.scheduledFor
                            ? new Date(campaign.scheduledFor).toLocaleString('pt-BR')
                            : 'Envio imediato'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase text-gray-500">Limite por minuto</p>
                        <p className="text-sm text-gray-700">{campaign.rateLimitPerMinute}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500">Progresso da campanha</p>
                    <div className="mt-3">
                      <CampaignProgressBar progress={progress} />
                    </div>
                    <div className="mt-4 grid gap-3 text-xs text-gray-600">
                      <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                        <span className="font-medium text-emerald-700">Enviadas</span>
                        <span className="text-sm font-semibold text-emerald-700">{progress?.sent ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                        <span className="font-medium text-amber-700">Ignoradas</span>
                        <span className="text-sm font-semibold text-amber-700">{progress?.skipped ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2">
                        <span className="font-medium text-rose-700">Falhas</span>
                        <span className="text-sm font-semibold text-rose-700">{progress?.failed ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <span className="font-medium text-gray-600">Pendentes</span>
                        <span className="text-sm font-semibold text-gray-700">{progress?.pending ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500">Ações</p>
                    <div className="mt-3 flex flex-col gap-2 text-sm text-gray-600">
                      {campaign.status === 'RUNNING' && (
                        <button
                          type="button"
                          onClick={handlePause}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 font-semibold text-gray-600 transition hover:bg-gray-100"
                        >
                          <Pause className="h-4 w-4" /> Pausar campanha
                        </button>
                      )}
                      {campaign.status === 'PAUSED' && (
                        <button
                          type="button"
                          onClick={handleResume}
                          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 font-semibold text-emerald-600 transition hover:bg-emerald-100"
                        >
                          <Play className="h-4 w-4" /> Retomar campanha
                        </button>
                      )}
                      {!['COMPLETED', 'CANCELLED'].includes(campaign.status) && (
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 font-semibold text-rose-600 transition hover:bg-rose-100"
                        >
                          <StopCircle className="h-4 w-4" /> Cancelar campanha
                        </button>
                      )}
                      <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                        <p>
                          <span className="font-semibold text-gray-600">Total de destinatários:</span>{' '}
                          {progress?.total ?? campaign.totalRecipients}
                        </p>
                        <p>
                          <span className="font-semibold text-gray-600">Criada por:</span>{' '}
                          {campaign.createdBy?.name ?? '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Estatísticas por status</h2>
                <p className="text-xs text-gray-500">
                  Disponibilidade de envios por status e checkpoints relacionados a essa campanha.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {(['PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED', 'CANCELLED'] as MessageCampaignRecipientStatus[]).map(
                    (key) => (
                      <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase text-gray-500">{key}</p>
                        <p className="text-lg font-semibold text-gray-800">
                          {recipientsByStatus[key] ?? 0}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </section>

              <CampaignRecipientsTable
                data={recipients}
                loading={recipientsLoading}
                status={statusFilter}
                onStatusChange={handleStatusChange}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, RefreshCw, Plus } from 'lucide-react';
import CampaignSummaryCards from '@/components/campaigns/CampaignSummaryCards';
import CampaignTable from '@/components/campaigns/CampaignTable';
import CampaignFormModal from '@/components/campaigns/CampaignFormModal';
import { useAuthStore } from '@/store/authStore';
import { useCampaignStore } from '@/store/campaignStore';
import { useMetadataStore } from '@/store/metadataStore';
import { useContactStore } from '@/store/contactStore';
import Sidebar from '@/components/layout/Sidebar';

export default function CampaignsPage() {
  const router = useRouter();
  const loadUser = useAuthStore((state) => state.loadUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.user);

  const campaigns = useCampaignStore((state) => state.items);
  const loadingCampaigns = useCampaignStore((state) => state.loading);
  const creatingCampaign = useCampaignStore((state) => state.creating);
  const fetchCampaigns = useCampaignStore((state) => state.fetchCampaigns);
  const refetchCampaigns = useCampaignStore((state) => state.refetchCampaigns);
  const createCampaign = useCampaignStore((state) => state.createCampaign);
  const pauseCampaign = useCampaignStore((state) => state.pauseCampaign);
  const resumeCampaign = useCampaignStore((state) => state.resumeCampaign);
  const cancelCampaign = useCampaignStore((state) => state.cancelCampaign);

  const queues = useMetadataStore((state) => state.queues);
  const connections = useMetadataStore((state) => state.connections);
  const fetchQueues = useMetadataStore((state) => state.fetchQueues);
  const fetchConnections = useMetadataStore((state) => state.fetchConnections);

  const segments = useContactStore((state) => state.segments);
  const contacts = useContactStore((state) => state.contacts);
  const fetchSegments = useContactStore((state) => state.fetchSegments);
  const fetchContacts = useContactStore((state) => state.fetchContacts);

  const [formOpen, setFormOpen] = useState(false);
  const [initializing, setInitializing] = useState(true);

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

    if (!currentUser) {
      return;
    }

    if (currentUser.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }

    const initialize = async () => {
      try {
        await Promise.all([fetchQueues(), fetchConnections(), fetchSegments(), fetchContacts()]);
        await fetchCampaigns();
      } catch (error) {
        console.error(error);
        toast.error('Não foi possível carregar as campanhas.');
      } finally {
        setInitializing(false);
      }
    };

    initialize();
  }, [
    isAuthenticated,
    currentUser,
    router,
    fetchQueues,
    fetchConnections,
    fetchSegments,
    fetchContacts,
    fetchCampaigns
  ]);

  const handleCreateCampaign = async (payload: Parameters<typeof createCampaign>[0]) => {
    try {
      await createCampaign(payload);
      toast.success('Campanha criada com sucesso.');
      setFormOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível criar a campanha.');
      throw error;
    }
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      await pauseCampaign(id);
      toast.success('Campanha pausada.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao pausar campanha.');
    }
  };

  const handleResumeCampaign = async (id: string) => {
    try {
      await resumeCampaign(id);
      toast.success('Campanha retomada.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao retomar campanha.');
    }
  };

  const handleCancelCampaign = async (id: string) => {
    const confirmation = window.confirm('Deseja realmente cancelar esta campanha?');
    if (!confirmation) return;
    try {
      await cancelCampaign(id);
      toast.success('Campanha cancelada.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao cancelar campanha.');
    }
  };

  const summaryCampaigns = useMemo(() => campaigns.slice(0, 6), [campaigns]);

  if (!isAuthenticated || !currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 transition-colors duration-300">
      <Sidebar />
      <main className="ml-20 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
          <header className="flex flex-col gap-3 border-b border-gray-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Campanhas de mensagens</h1>
              <p className="text-sm text-gray-500">
                Organize campanhas segmentadas, agende disparos e acompanhe resultados em tempo real.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  refetchCampaigns().catch(() => toast.error('Falha ao atualizar campanhas.'))
                }
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                <RefreshCw className={loadingCampaigns ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                Atualizar
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Nova campanha
              </button>
            </div>
          </header>

          {initializing ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados...
              </div>
            </div>
          ) : (
            <>
              <CampaignSummaryCards campaigns={summaryCampaigns} />

              <CampaignTable
                campaigns={campaigns}
                loading={loadingCampaigns}
                onPause={handlePauseCampaign}
                onResume={handleResumeCampaign}
                onCancel={handleCancelCampaign}
              />
            </>
          )}
        </div>
      </main>

      <CampaignFormModal
        open={formOpen}
        submitting={creatingCampaign}
        segments={segments}
        contacts={contacts}
        queues={queues}
        connections={connections}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreateCampaign}
      />
    </div>
  );
}

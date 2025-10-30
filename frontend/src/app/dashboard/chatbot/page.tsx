'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import FlowList from '@/components/chatbot/FlowList';
import FlowStats from '@/components/chatbot/FlowStats';
import FlowEditor from '@/components/chatbot/FlowEditor';
import FlowTester from '@/components/chatbot/FlowTester';
import { useAuthStore } from '@/store/authStore';
import { useChatbotStore } from '@/store/chatbotStore';
import { useMetadataStore } from '@/store/metadataStore';

export default function ChatbotPage() {
  const router = useRouter();
  const { isAuthenticated, loadUser } = useAuthStore();
  const {
    flows,
    selectedFlowId,
    currentFlow,
    stats,
    testResult,
    loading,
    saving,
    testing,
    error,
    fetchFlows,
    selectFlow,
    saveFlow,
    removeFlow,
    runFlowTest,
    resetTest
  } = useChatbotStore((state) => ({
    flows: state.flows,
    selectedFlowId: state.selectedFlowId,
    currentFlow: state.currentFlow,
    stats: state.stats,
    testResult: state.testResult,
    loading: state.loading,
    saving: state.saving,
    testing: state.testing,
    error: state.error,
    fetchFlows: state.fetchFlows,
    selectFlow: state.selectFlow,
    saveFlow: state.saveFlow,
    removeFlow: state.removeFlow,
    runFlowTest: state.runFlowTest,
    resetTest: state.resetTest
  }));
  const queues = useMetadataStore((state) => state.queues);
  const fetchQueues = useMetadataStore((state) => state.fetchQueues);

  const [ready, setReady] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isAuthenticated) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        router.replace('/login');
        return;
      }
    }
    const bootstrap = async () => {
      await Promise.all([fetchFlows(), fetchQueues()]);
      setReady(true);
    };
    bootstrap();
  }, [isAuthenticated, fetchFlows, fetchQueues, router]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const selectedFlow = isCreatingNew ? undefined : currentFlow;

  const handleSelectFlow = async (id: string) => {
    setIsCreatingNew(false);
    await selectFlow(id);
  };

  const handleCreateFlow = () => {
    setIsCreatingNew(true);
    resetTest();
    selectFlow(null);
  };

  const handleToggleActive = async (flowSummary: (typeof flows)[number]) => {
    try {
      await selectFlow(flowSummary.id);
      const detail = useChatbotStore.getState().currentFlow;
      if (!detail) {
        throw new Error('Fluxo nao encontrado para atualizacao.');
      }
      const newStatus = !flowSummary.isActive;
      await saveFlow(
        {
          name: detail.name,
          description: detail.description ?? null,
          isActive: newStatus,
          isPrimary: detail.isPrimary,
          triggerType: detail.isPrimary ? 'DEFAULT' : 'KEYWORD',
          keywords: detail.keywords ?? [],
          entryNodeId: detail.entryNodeId,
          definition: detail.definition,
          schedule: detail.schedule ?? null,
          offlineMessage: detail.offlineMessage ?? null,
          transferQueueId: detail.transferQueueId ?? null
        },
        flowSummary.id
      );
      toast.success(`Fluxo ${newStatus ? 'ativado' : 'desativado'} com sucesso.`);
      setIsCreatingNew(false);
    } catch (toggleError) {
      console.error(toggleError);
      toast.error('Nao foi possivel atualizar o status do fluxo.');
    }
  };

  const handleSaveFlow = async (payload: Parameters<typeof saveFlow>[0], id?: string) => {
    try {
      const result = await saveFlow(payload, id);
      toast.success('Fluxo salvo com sucesso.');
      setIsCreatingNew(false);
      await selectFlow(result.id);
    } catch (saveError) {
      console.error(saveError);
      toast.error('Nao foi possivel salvar o fluxo.');
    }
  };

  const handleDeleteFlow = async (id: string) => {
    try {
      await removeFlow(id);
      toast.success('Fluxo removido.');
      setIsCreatingNew(false);
    } catch (deleteError) {
      console.error(deleteError);
      toast.error('Nao foi possivel remover o fluxo.');
    }
  };

  const handleRunTest = async (messages: string[]) => {
    if (!selectedFlowId) {
      toast.error('Selecione um fluxo para testar.');
      return;
    }
    try {
      await runFlowTest(selectedFlowId, messages);
    } catch (testError) {
      console.error(testError);
      toast.error('Falha ao executar o teste do fluxo.');
    }
  };

  const activeFlowName = useMemo(() => {
    if (isCreatingNew) {
      return 'Novo fluxo';
    }
    return currentFlow?.name ?? 'Selecione um fluxo';
  }, [isCreatingNew, currentFlow?.name]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 transition-colors duration-300 dark:bg-slate-950">
      <Sidebar />
      <div className="flex flex-1">
        <FlowList
          flows={flows}
          selectedId={isCreatingNew ? undefined : selectedFlowId}
          loading={loading}
          onSelect={handleSelectFlow}
          onCreate={handleCreateFlow}
          onToggleActive={handleToggleActive}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50/60 px-8 py-10 transition-colors duration-300 dark:bg-slate-950/40">
          <header className="flex flex-col gap-2 border-b border-gray-200 pb-6 dark:border-slate-800">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Chatbot com fluxos</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Configure os fluxos automatizados, acompanhe desempenho e teste interacoes antes de publicar.
            </p>
            <div className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold text-primary dark:border-primary/40 dark:bg-primary/10 dark:text-primary/90">
              {activeFlowName}
            </div>
          </header>

          <div className="mt-8 space-y-10">
            <FlowEditor
              flow={selectedFlow}
              queues={queues}
              mode={isCreatingNew ? 'create' : 'edit'}
              saving={saving}
              onSave={handleSaveFlow}
              onDelete={currentFlow ? handleDeleteFlow : undefined}
              onCancel={() => {
                setIsCreatingNew(false);
                resetTest();
                if (flows.length > 0) {
                  selectFlow(flows[0].id);
                }
              }}
            />

            <FlowStats stats={isCreatingNew ? undefined : stats} loading={loading} />

            {!isCreatingNew && currentFlow && (
              <FlowTester
                flowId={currentFlow.id}
                disabled={!currentFlow}
                testing={testing}
                result={testResult}
                onRun={handleRunTest}
                onReset={resetTest}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

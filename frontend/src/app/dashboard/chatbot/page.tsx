'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import FlowList from '@/components/chatbot/FlowList';
import FlowStats from '@/components/chatbot/FlowStats';
import FlowEditor from '@/components/chatbot/FlowEditor';
import FlowTester from '@/components/chatbot/FlowTester';
import AiOrchestratorPanel from '@/components/chatbot/AiOrchestratorPanel';
import { useAuthStore } from '@/store/authStore';
import { useChatbotStore } from '@/store/chatbotStore';
import { useMetadataStore } from '@/store/metadataStore';

export default function ChatbotPage() {
  const router = useRouter();
  const { isAuthenticated, loadUser } = useAuthStore();
  const queues = useMetadataStore((state) => state.queues);
  const fetchQueues = useMetadataStore((state) => state.fetchQueues);

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
    aiConfig,
    aiSuggestion,
    aiLoading,
    aiAnalyzing,
    aiError,
    fetchFlows,
    selectFlow,
    saveFlow,
    removeFlow,
    runFlowTest,
    resetTest,
    fetchAiConfig,
    analyzeTranscript,
    resetAiSuggestion
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
    aiConfig: state.aiConfig,
    aiSuggestion: state.aiSuggestion,
    aiLoading: state.aiLoading,
    aiAnalyzing: state.aiAnalyzing,
    aiError: state.aiError,
    fetchFlows: state.fetchFlows,
    selectFlow: state.selectFlow,
    saveFlow: state.saveFlow,
    removeFlow: state.removeFlow,
    runFlowTest: state.runFlowTest,
    resetTest: state.resetTest,
    fetchAiConfig: state.fetchAiConfig,
    analyzeTranscript: state.analyzeTranscript,
    resetAiSuggestion: state.resetAiSuggestion
  }));

  const [ready, setReady] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const initialize = useCallback(async () => {
    setReady(false);
    try {
      await Promise.all([fetchFlows(), fetchQueues(), fetchAiConfig()]);
    } catch (bootstrapError) {
      console.error('Falha ao carregar dashboard do chatbot:', bootstrapError);
      toast.error('Nao foi possivel carregar os dados do chatbot.');
    } finally {
      setReady(true);
    }
  }, [fetchFlows, fetchQueues, fetchAiConfig]);

  useEffect(() => {
    if (!isAuthenticated) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        router.replace('/login');
        return;
      }
    }
    initialize();
  }, [isAuthenticated, initialize, router]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (aiError) {
      toast.error(aiError);
    }
  }, [aiError]);

  const selectedFlow = useMemo(
    () => (isCreatingNew ? undefined : currentFlow),
    [isCreatingNew, currentFlow]
  );

  const activeFlowName = useMemo(() => {
    if (isCreatingNew) {
      return 'Novo fluxo';
    }
    return currentFlow?.name ?? 'Selecione um fluxo';
  }, [isCreatingNew, currentFlow?.name]);

  const aiStatusLabel = useMemo(() => {
    if (!aiConfig?.enabled) {
      return 'IA desativada';
    }
    return `${aiConfig.provider} • ${aiConfig.defaultModel}`;
  }, [aiConfig]);

  const handleSelectFlow = useCallback(
    async (id: string) => {
      setIsCreatingNew(false);
      await selectFlow(id);
    },
    [selectFlow]
  );

  const handleCreateFlow = useCallback(() => {
    setIsCreatingNew(true);
    resetTest();
    resetAiSuggestion();
    void selectFlow(null);
  }, [resetTest, resetAiSuggestion, selectFlow]);

  const handleToggleActive = useCallback(
    async (flowSummary: (typeof flows)[number]) => {
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
    },
    [saveFlow, selectFlow]
  );

  const handleSaveFlow = useCallback(
    async (payload: Parameters<typeof saveFlow>[0], id?: string) => {
      try {
        const result = await saveFlow(payload, id);
        toast.success('Fluxo salvo com sucesso.');
        setIsCreatingNew(false);
        resetAiSuggestion();
        await selectFlow(result.id);
      } catch (saveError) {
        console.error(saveError);
        toast.error('Nao foi possivel salvar o fluxo.');
      }
    },
    [saveFlow, selectFlow, resetAiSuggestion]
  );

  const handleDeleteFlow = useCallback(
    async (id: string) => {
      try {
        await removeFlow(id);
        toast.success('Fluxo removido.');
        setIsCreatingNew(false);
        resetAiSuggestion();
      } catch (deleteError) {
        console.error(deleteError);
        toast.error('Nao foi possivel remover o fluxo.');
      }
    },
    [removeFlow, resetAiSuggestion]
  );

  const handleRunTest = useCallback(
    async (messages: string[]) => {
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
    },
    [runFlowTest, selectedFlowId]
  );

  const handleAnalyzeConversation = useCallback(
    async (payload: Parameters<typeof analyzeTranscript>[0]) => {
      const result = await analyzeTranscript(payload);
      if (result) {
        toast.success('Conversa analisada pela IA.');
      }
    },
    [analyzeTranscript]
  );

  const handleRefreshAi = useCallback(async () => {
    try {
      await fetchAiConfig();
      const { aiError: latestAiError } = useChatbotStore.getState();
      if (!latestAiError) {
        toast.success('Configuracao de IA atualizada.');
      }
    } catch (refreshError) {
      console.error(refreshError);
      // o toast de erro e disparado via estado global
    }
  }, [fetchAiConfig]);

  const handleResetAi = useCallback(() => {
    resetAiSuggestion();
  }, [resetAiSuggestion]);

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
      <div className="ml-20 flex flex-1 overflow-hidden">
        <FlowList
          flows={flows}
          selectedId={isCreatingNew ? undefined : selectedFlowId}
          loading={loading}
          onSelect={handleSelectFlow}
          onCreate={handleCreateFlow}
          onToggleActive={handleToggleActive}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50/60 px-8 py-10 transition-colors duration-300 dark:bg-slate-950/40">
          <header className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                Orquestrador inteligente do chatbot
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Construa fluxos, acompanhe performance e utilize IA generativa para direcionar clientes
                para as filas e canais corretos em tempo real.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold text-primary dark:border-primary/40 dark:bg-primary/10 dark:text-primary/90">
                {activeFlowName}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                {aiStatusLabel}
              </span>
            </div>
          </header>

          <div className="mt-8 grid gap-8 xl:grid-cols-[1.15fr_0.85fr] 2xl:grid-cols-[1.25fr_0.9fr]">
            <div className="space-y-10">
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
                  resetAiSuggestion();
                  if (flows.length > 0) {
                    void selectFlow(flows[0].id);
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

            <AiOrchestratorPanel
              aiConfig={aiConfig}
              aiSuggestion={aiSuggestion}
              aiLoading={aiLoading}
              aiAnalyzing={aiAnalyzing}
              queues={queues}
              onRefresh={handleRefreshAi}
              onAnalyze={handleAnalyzeConversation}
              onReset={handleResetAi}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

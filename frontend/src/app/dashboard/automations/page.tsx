'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import AutomationRuleCard from '@/components/automations/AutomationRuleCard';
import AutomationRuleFormModal from '@/components/automations/AutomationRuleFormModal';
import AutomationTestModal from '@/components/automations/AutomationTestModal';
import AutomationLogsPanel from '@/components/automations/AutomationLogsPanel';
import { useAuthStore } from '@/store/authStore';
import { useAutomationStore } from '@/store/automationStore';
import { useMetadataStore } from '@/store/metadataStore';
import type {
  AutomationRule,
  AutomationRulePayload,
  AutomationRunSummary,
  AutomationLogStatus,
  AutomationTrigger
} from '@/types/automation';

type ApiErrorResponse = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const apiError = error as ApiErrorResponse;
    const responseMessage = apiError.response?.data?.error;
    if (responseMessage) {
      return responseMessage;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export default function AutomationsPage() {
  const router = useRouter();
  const loadUser = useAuthStore((state) => state.loadUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.user);

  const rules = useAutomationStore((state) => state.rules);
  const logs = useAutomationStore((state) => state.logs);
  const agents = useAutomationStore((state) => state.agents);
  const loadingRules = useAutomationStore((state) => state.loading);
  const saving = useAutomationStore((state) => state.saving);
  const logsLoading = useAutomationStore((state) => state.logsLoading);
  const fetchRules = useAutomationStore((state) => state.fetchRules);
  const fetchLogs = useAutomationStore((state) => state.fetchLogs);
  const fetchAgents = useAutomationStore((state) => state.fetchAgents);
  const createRule = useAutomationStore((state) => state.createRule);
  const updateRule = useAutomationStore((state) => state.updateRule);
  const removeRule = useAutomationStore((state) => state.removeRule);
  const toggleRule = useAutomationStore((state) => state.toggleRule);
  const testRule = useAutomationStore((state) => state.testRule);

  const tags = useMetadataStore((state) => state.tags);
  const queues = useMetadataStore((state) => state.queues);
  const fetchTags = useMetadataStore((state) => state.fetchTags);
  const fetchQueues = useMetadataStore((state) => state.fetchQueues);

  const [initialized, setInitialized] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testingRule, setTestingRule] = useState<AutomationRule | null>(null);
  const [testResult, setTestResult] = useState<AutomationRunSummary | null>(null);
  const [logFilters, setLogFilters] = useState<{
    ruleId?: string;
    status?: AutomationLogStatus;
    trigger?: AutomationTrigger;
  }>({});

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

    if (initialized) {
      return;
    }

    (async () => {
      try {
        await Promise.all([fetchTags(), fetchQueues()]);
        await fetchAgents();
        await fetchRules();
        await fetchLogs({ limit: 30 });
        setInitialized(true);
      } catch (error) {
        console.error(error);
        toast.error('Nao foi possivel carregar as automacoes.');
      }
    })();
  }, [
    isAuthenticated,
    currentUser,
    router,
    initialized,
    fetchTags,
    fetchQueues,
    fetchAgents,
    fetchRules,
    fetchLogs
  ]);

  const tagLookup = useMemo(() => {
    const map: Record<string, string> = {};
    tags.forEach((tag) => {
      map[tag.id] = tag.name;
    });
    return map;
  }, [tags]);

  const queueLookup = useMemo(() => {
    const map: Record<string, string> = {};
    queues.forEach((queue) => {
      map[queue.id] = queue.name;
    });
    return map;
  }, [queues]);

  const agentLookup = useMemo(() => {
    const map: Record<string, string> = {};
    agents.forEach((agent) => {
      map[agent.id] = agent.name;
    });
    return map;
  }, [agents]);

  const handleOpenCreate = () => {
    setFormMode('create');
    setEditingRule(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (rule: AutomationRule) => {
    setFormMode('edit');
    setEditingRule(rule);
    setFormOpen(true);
  };

  const handleSubmitRule = async (payload: AutomationRulePayload) => {
    try {
      if (formMode === 'create') {
        await createRule(payload);
        toast.success('Automacao criada com sucesso.');
      } else if (editingRule) {
        await updateRule(editingRule.id, payload);
        toast.success('Automacao atualizada.');
      }
      setFormOpen(false);
      setEditingRule(null);
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Nao foi possivel salvar a automacao.'));
    }
  };

  const handleDeleteRule = async (rule: AutomationRule) => {
    const confirmed = window.confirm(`Remover a automacao "${rule.name}"?`);
    if (!confirmed) return;
    try {
      await removeRule(rule.id);
      toast.success('Automacao removida.');
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Nao foi possivel remover a automacao.'));
    }
  };

  const handleToggleRule = async (rule: AutomationRule, nextValue: boolean) => {
    try {
      await toggleRule(rule.id, nextValue);
      toast.success(nextValue ? 'Automacao ativada.' : 'Automacao desativada.');
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Nao foi possivel atualizar a automacao.'));
    }
  };

  const handleOpenTest = (rule: AutomationRule) => {
    setTestingRule(rule);
    setTestResult(null);
    setTestOpen(true);
  };

  const handleSubmitTest = async ({ ticketId, messageId }: { ticketId: string; messageId?: string }) => {
    if (!testingRule) return;
    try {
      const result = await testRule(testingRule.id, { ticketId, messageId });
      setTestResult(result);
      toast.success('Teste executado.');
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Nao foi possivel executar o teste.'));
    }
  };

  const handleRefreshLogs = async () => {
    try {
      await fetchLogs({ ...logFilters, limit: 30 });
      toast.success('Logs atualizados.');
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Nao foi possivel atualizar os logs.'));
    }
  };

  if (!isAuthenticated || !currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 transition-colors duration-300 dark:bg-slate-950">
      <Sidebar />
      <div className="ml-20 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-8 py-10">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Automacoes</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Crie regras inteligentes para distribuir tickets, aplicar tags, fechar atendimentos e integrar com sistemas externos.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:bg-primary/90"
            >
              Nova automacao
            </button>
          </header>

          <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-4">
              {loadingRules ? (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando automacoes...
                </div>
              ) : rules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  Nenhuma automacao cadastrada ainda. Clique em &quot;Nova automacao&quot; para iniciar.
                </div>
              ) : (
                rules.map((rule) => (
                  <AutomationRuleCard
                    key={rule.id}
                    rule={rule}
                    lookup={{ tags: tagLookup, queues: queueLookup, agents: agentLookup }}
                    onEdit={handleOpenEdit}
                    onDelete={handleDeleteRule}
                    onToggle={handleToggleRule}
                    onTest={handleOpenTest}
                  />
                ))
              )}
            </div>

            <AutomationLogsPanel
              logs={logs}
              loading={logsLoading}
              rules={rules}
              onRefresh={handleRefreshLogs}
              onFilterChange={(filters) => {
                setLogFilters(filters);
                fetchLogs({ ...filters, limit: 30 }).catch((error) => {
                  console.error(error);
                  toast.error(getErrorMessage(error, 'Nao foi possivel filtrar os logs.'));
                });
              }}
            />
          </section>
        </div>
      </div>

      <AutomationRuleFormModal
        open={formOpen}
        mode={formMode}
        initialRule={formMode === 'edit' ? editingRule ?? undefined : undefined}
        submitting={saving}
        tags={tags}
        queues={queues}
        agents={agents}
        onClose={() => {
          setFormOpen(false);
          setEditingRule(null);
        }}
        onSubmit={handleSubmitRule}
      />

      <AutomationTestModal
        open={testOpen}
        rule={testingRule}
        submitting={saving}
        result={testResult}
        onClose={() => {
          setTestOpen(false);
          setTestingRule(null);
          setTestResult(null);
        }}
        onSubmit={handleSubmitTest}
      />
    </div>
  );
}

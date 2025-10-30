'use client';

import { useMemo, useState } from 'react';
import { RotateCw } from 'lucide-react';
import type { AutomationLogEntry, AutomationLogStatus, AutomationTrigger, AutomationRule } from '@/types/automation';

interface AutomationLogsPanelProps {
  logs: AutomationLogEntry[];
  loading?: boolean;
  rules: AutomationRule[];
  onFilterChange?: (filters: { ruleId?: string; status?: AutomationLogStatus; trigger?: AutomationTrigger }) => void;
  onRefresh?: () => void;
}

const STATUS_LABEL: Record<AutomationLogStatus, string> = {
  SUCCESS: 'Sucesso',
  SKIPPED: 'Ignorado',
  FAILED: 'Falha'
};

const TRIGGER_LABEL: Record<AutomationTrigger, string> = {
  TICKET_CREATED: 'Ticket criado',
  MESSAGE_RECEIVED: 'Mensagem recebida',
  TICKET_STATUS_CHANGED: 'Status atualizado'
};

export default function AutomationLogsPanel({ logs, loading, rules, onFilterChange, onRefresh }: AutomationLogsPanelProps) {
  const [selectedRule, setSelectedRule] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<AutomationLogStatus | 'ALL'>('ALL');
  const [selectedTrigger, setSelectedTrigger] = useState<AutomationTrigger | 'ALL'>('ALL');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedRule !== 'ALL' && log.ruleId !== selectedRule) {
        return false;
      }
      if (selectedStatus !== 'ALL' && log.status !== selectedStatus) {
        return false;
      }
      if (selectedTrigger !== 'ALL' && log.trigger !== selectedTrigger) {
        return false;
      }
      return true;
    });
  }, [logs, selectedRule, selectedStatus, selectedTrigger]);

  const handleFilterChange = (
    nextRule: string,
    nextStatus: AutomationLogStatus | 'ALL',
    nextTrigger: AutomationTrigger | 'ALL'
  ) => {
    setSelectedRule(nextRule);
    setSelectedStatus(nextStatus);
    setSelectedTrigger(nextTrigger);
    onFilterChange?.({
      ruleId: nextRule === 'ALL' ? undefined : nextRule,
      status: nextStatus === 'ALL' ? undefined : nextStatus,
      trigger: nextTrigger === 'ALL' ? undefined : nextTrigger
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Logs de automacao</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Historico dos ultimos disparos e resultados registrados pelas automacoes.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-sm font-semibold text-gray-600 transition hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-300"
        >
          <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase text-gray-500">Automacao</label>
          <select
            value={selectedRule}
            onChange={(event) => handleFilterChange(event.target.value, selectedStatus, selectedTrigger)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="ALL">Todas</option>
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase text-gray-500">Status</label>
          <select
            value={selectedStatus}
            onChange={(event) =>
              handleFilterChange(
                selectedRule,
                event.target.value as AutomationLogStatus | 'ALL',
                selectedTrigger
              )
            }
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="ALL">Todos</option>
            {(['SUCCESS', 'SKIPPED', 'FAILED'] as AutomationLogStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase text-gray-500">Trigger</label>
          <select
            value={selectedTrigger}
            onChange={(event) =>
              handleFilterChange(selectedRule, selectedStatus, event.target.value as AutomationTrigger | 'ALL')
            }
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="ALL">Todos</option>
            {(['MESSAGE_RECEIVED', 'TICKET_CREATED', 'TICKET_STATUS_CHANGED'] as AutomationTrigger[]).map((trigger) => (
              <option key={trigger} value={trigger}>
                {TRIGGER_LABEL[trigger]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {filteredLogs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
            Nenhum log encontrado para os filtros selecionados.
          </p>
        ) : (
          filteredLogs.map((log) => (
            <article
              key={log.id}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      log.status === 'SUCCESS'
                        ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200'
                        : log.status === 'FAILED'
                        ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-200'
                        : 'bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {STATUS_LABEL[log.status] ?? log.status}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                    {TRIGGER_LABEL[log.trigger] ?? log.trigger}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {new Date(log.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-700 dark:text-slate-200">
                {log.message || 'Acao executada'}
              </div>
              {log.error && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-200">
                  {log.error}
                </p>
              )}
              {(log.context !== null && typeof log.context !== 'undefined') && (
                <pre className="mt-3 overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs text-gray-600 dark:bg-slate-900 dark:text-slate-300">
                  {JSON.stringify(log.context, null, 2)}
                </pre>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

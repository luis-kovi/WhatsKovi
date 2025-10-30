'use client';

import { AutomationRule } from '@/types/automation';
import { FlaskConical, Pencil, Power, Trash2 } from 'lucide-react';

type LookupMaps = {
  tags: Record<string, string>;
  queues: Record<string, string>;
  agents: Record<string, string>;
};

type AutomationRuleCardProps = {
  rule: AutomationRule;
  lookup: LookupMaps;
  onEdit: (rule: AutomationRule) => void;
  onDelete: (rule: AutomationRule) => void;
  onToggle: (rule: AutomationRule, nextValue: boolean) => void;
  onTest: (rule: AutomationRule) => void;
};

const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sab'
};

const TRIGGER_LABEL: Record<string, string> = {
  TICKET_CREATED: 'Ticket criado',
  MESSAGE_RECEIVED: 'Mensagem recebida',
  TICKET_STATUS_CHANGED: 'Status atualizado'
};

const formatCondition = (
  condition: AutomationRule['conditions'][number],
  lookup: LookupMaps
): string => {
  switch (condition.type) {
    case 'ticket_status':
      return `Status: ${condition.statuses.join(', ') || 'Qualquer'}`;
    case 'queue': {
      const names = condition.queueIds.map((id) => lookup.queues[id] ?? id);
      return `Filas: ${names.length > 0 ? names.join(', ') : 'Qualquer'}`;
    }
    case 'ticket_priority':
      return `Prioridade: ${condition.priorities.join(', ') || 'Qualquer'}`;
    case 'ticket_unassigned':
      return condition.value ? 'Apenas tickets sem agente' : 'Apenas tickets com agente';
    case 'ticket_has_tags': {
      const names = condition.tagIds.map((id) => lookup.tags[id] ?? id);
      const mode =
        condition.mode === 'all' ? 'todas' : condition.mode === 'none' ? 'nenhuma' : 'qualquer';
      return `Tags (${mode}): ${names.length > 0 ? names.join(', ') : 'Nenhuma'}`;
    }
    case 'message_body_contains':
      return `Mensagem contem: ${condition.keywords.join(', ') || 'Palavras-chave nao definidas'}`;
    case 'ticket_idle_minutes':
      return `Inatividade ${condition.operator} ${condition.minutes} min`;
    case 'ticket_unread_messages':
      return `Nao lidas ${condition.operator} ${condition.value}`;
    case 'business_hours': {
      const days = condition.daysOfWeek.length
        ? condition.daysOfWeek.map((day) => WEEKDAY_LABELS[day] ?? String(day)).join(', ')
        : 'Todos os dias';
      const window = `${condition.startTime} - ${condition.endTime}`;
      return `Janela ${days} (${window})`;
    }
    default:
      return 'Condicao desconhecida';
  }
};

const formatAction = (action: AutomationRule['actions'][number], lookup: LookupMaps): string => {
  switch (action.type) {
    case 'assign_agent': {
      const agentNames =
        action.agentIds && action.agentIds.length > 0
          ? action.agentIds.map((id) => lookup.agents[id] ?? id).join(', ')
          : 'Qualquer agente';
      const strategy = action.strategy === 'LEAST_TICKETS' ? 'Menor fila' : 'Personalizada';
      return `Atribuir agente (${strategy}, ${agentNames})`;
    }
    case 'assign_queue': {
      const queueName = lookup.queues[action.queueId] ?? action.queueId;
      return `Mover para fila ${queueName}`;
    }
    case 'apply_tags': {
      const tags = action.tagIds.map((id) => lookup.tags[id] ?? id);
      return `Aplicar tags: ${tags.join(', ')}`;
    }
    case 'close_ticket':
      return `Fechar ticket${action.applySurvey ? ' + enviar pesquisa' : ''}`;
    case 'trigger_webhook':
      return `Webhook ${action.method ?? 'POST'} ${action.url}`;
    default:
      return 'Acao desconhecida';
  }
};

export default function AutomationRuleCard({
  rule,
  lookup,
  onEdit,
  onDelete,
  onToggle,
  onTest
}: AutomationRuleCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                rule.isActive
                  ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {rule.isActive ? 'Ativa' : 'Inativa'}
            </span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {TRIGGER_LABEL[rule.trigger] ?? rule.trigger}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-slate-50">{rule.name}</h3>
          {rule.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{rule.description}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
            <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold dark:bg-slate-800">
              Prioridade {rule.priority}
            </span>
            {rule.stopOnMatch && (
              <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                Para ao executar
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-start">
          <button
            type="button"
            onClick={() => onToggle(rule, !rule.isActive)}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold transition ${
              rule.isActive
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'border border-gray-200 text-gray-600 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            <Power className="h-4 w-4" />
            {rule.isActive ? 'Desativar' : 'Ativar'}
          </button>
          <button
            type="button"
            onClick={() => onTest(rule)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-sm font-semibold text-gray-600 transition hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-300"
            title="Testar automacao"
          >
            <FlaskConical className="h-4 w-4" />
            Testar
          </button>
          <button
            type="button"
            onClick={() => onEdit(rule)}
            className="rounded-full border border-gray-200 p-2 text-gray-600 transition hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-300"
            title="Editar automacao"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(rule)}
            className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
            title="Excluir automacao"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Condicoes
          </h4>
          {rule.conditions.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">Sempre executar</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {rule.conditions.map((condition, index) => (
                <li
                  key={`${condition.type}-${index}`}
                  className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {formatCondition(condition, lookup)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Acoes
          </h4>
          <ul className="mt-2 space-y-2">
            {rule.actions.map((action, index) => (
              <li
                key={`${action.type}-${index}`}
                className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary-700 dark:bg-primary/10 dark:text-primary-200"
              >
                {formatAction(action, lookup)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

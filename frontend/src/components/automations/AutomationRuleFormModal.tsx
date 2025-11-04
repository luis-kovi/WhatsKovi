'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type {
  AutomationAction,
  AutomationCondition,
  AutomationRule,
  AutomationRulePayload,
  AutomationComparisonOperator
} from '@/types/automation';
import type { AutomationAgent } from '@/store/automationStore';
import type { Tag, Queue } from '@/store/metadataStore';

type AutomationRuleFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialRule?: AutomationRule | null;
  submitting?: boolean;
  tags: Tag[];
  queues: Queue[];
  agents: AutomationAgent[];
  onClose: () => void;
  onSubmit: (payload: AutomationRulePayload) => Promise<void>;
};

type ConditionEntry = {
  id: string;
  condition: AutomationCondition;
};

type ActionEntry = {
  id: string;
  action: AutomationAction;
};

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUSES = ['BOT', 'PENDING', 'OPEN', 'CLOSED'];
const TRIGGERS: AutomationRule['trigger'][] = [
  'MESSAGE_RECEIVED',
  'TICKET_CREATED',
  'TICKET_STATUS_CHANGED'
];

const TRIGGER_LABEL: Record<AutomationRule['trigger'], string> = {
  MESSAGE_RECEIVED: 'Mensagem recebida',
  TICKET_CREATED: 'Ticket criado',
  TICKET_STATUS_CHANGED: 'Status atualizado'
};

const makeId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const createDefaultCondition = (): AutomationCondition => ({
  type: 'ticket_status',
  statuses: ['BOT', 'PENDING', 'OPEN']
});

const createDefaultAction = (): AutomationAction => ({
  type: 'assign_agent',
  strategy: 'LEAST_TICKETS',
  includeQueueAgents: true
});

const daysOfWeek = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' },
  { value: 0, label: 'Dom' }
];

export default function AutomationRuleFormModal({
  open,
  mode,
  initialRule,
  submitting,
  tags,
  queues,
  agents,
  onClose,
  onSubmit
}: AutomationRuleFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<AutomationRule['trigger']>('MESSAGE_RECEIVED');
  const [priority, setPriority] = useState<number>(0);
  const [stopOnMatch, setStopOnMatch] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [conditions, setConditions] = useState<ConditionEntry[]>([]);
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === 'edit' && initialRule) {
      setName(initialRule.name);
      setDescription(initialRule.description ?? '');
      setTrigger(initialRule.trigger);
      setPriority(initialRule.priority ?? 0);
      setStopOnMatch(Boolean(initialRule.stopOnMatch));
      setIsActive(Boolean(initialRule.isActive));
      setConditions(
        initialRule.conditions.map((condition) => ({
          id: makeId(),
          condition
        }))
      );
      setActions(
        initialRule.actions.map((action) => ({
          id: makeId(),
          action
        }))
      );
    } else {
      setName('');
      setDescription('');
      setTrigger('MESSAGE_RECEIVED');
      setPriority(0);
      setStopOnMatch(false);
      setIsActive(true);
      setConditions([{ id: makeId(), condition: createDefaultCondition() }]);
      setActions([{ id: makeId(), action: createDefaultAction() }]);
    }
    setError(null);
  }, [open, mode, initialRule]);

  if (!open) {
    return null;
  }

  const handleAddCondition = () => {
    setConditions((prev) => [...prev, { id: makeId(), condition: createDefaultCondition() }]);
  };

  const handleRemoveCondition = (id: string) => {
    setConditions((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleConditionTypeChange = (id: string, nextType: AutomationCondition['type']) => {
    setConditions((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;

        let nextCondition: AutomationCondition;

        switch (nextType) {
          case 'ticket_status':
            nextCondition = { type: nextType, statuses: ['BOT', 'PENDING', 'OPEN'] };
            break;
          case 'queue':
            nextCondition = { type: nextType, queueIds: [] };
            break;
          case 'ticket_priority':
            nextCondition = { type: nextType, priorities: ['MEDIUM'] };
            break;
          case 'ticket_unassigned':
            nextCondition = { type: nextType, value: true };
            break;
          case 'ticket_has_tags':
            nextCondition = { type: nextType, tagIds: [], mode: 'any' };
            break;
          case 'message_body_contains':
            nextCondition = { type: nextType, keywords: [] };
            break;
          case 'ticket_idle_minutes':
            nextCondition = { type: nextType, operator: '>=', minutes: 15 };
            break;
          case 'ticket_unread_messages':
            nextCondition = { type: nextType, operator: '>=', value: 1 };
            break;
          case 'business_hours':
            nextCondition = {
              type: nextType,
              timezone: 'America/Sao_Paulo',
              daysOfWeek: [1, 2, 3, 4, 5],
              startTime: '08:00',
              endTime: '18:00'
            };
            break;
          default:
            nextCondition = createDefaultCondition();
        }

        return { ...entry, condition: nextCondition };
      })
    );
  };

  const handleConditionUpdate = (id: string, nextCondition: AutomationCondition) => {
    setConditions((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, condition: nextCondition } : entry))
    );
  };

  const handleAddAction = () => {
    setActions((prev) => [...prev, { id: makeId(), action: createDefaultAction() }]);
  };

  const handleRemoveAction = (id: string) => {
    setActions((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleActionTypeChange = (id: string, nextType: AutomationAction['type']) => {
    setActions((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;

        let nextAction: AutomationAction;

        switch (nextType) {
          case 'assign_agent':
            nextAction = {
              type: nextType,
              strategy: 'LEAST_TICKETS',
              includeQueueAgents: true,
              agentIds: []
            };
            break;
          case 'assign_queue':
            nextAction = { type: nextType, queueId: queues[0]?.id ?? '' };
            break;
          case 'apply_tags':
            nextAction = { type: nextType, tagIds: [] };
            break;
          case 'close_ticket':
            nextAction = { type: nextType, applySurvey: true };
            break;
          case 'trigger_webhook':
            nextAction = {
              type: nextType,
              url: '',
              method: 'POST',
              headers: {},
              bodyTemplate: ''
            };
            break;
          default:
            nextAction = createDefaultAction();
        }

        return { ...entry, action: nextAction };
      })
    );
  };

  const handleActionUpdate = (id: string, nextAction: AutomationAction) => {
    setActions((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, action: nextAction } : entry))
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Informe um nome para a automacao.');
      return;
    }

    if (actions.length === 0) {
      setError('Adicione ao menos uma acao.');
      return;
    }

    const payload: AutomationRulePayload = {
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      trigger,
      priority: priority ?? 0,
      stopOnMatch,
      isActive,
      conditions: conditions.map((entry) => entry.condition),
      actions: actions.map((entry) => entry.action),
      metadata: null
    };

    const webhookActions = payload.actions.filter(
      (action) => action.type === 'trigger_webhook'
    ) as Extract<AutomationAction, { type: 'trigger_webhook' }>[];

    for (const action of webhookActions) {
      if (!action.url || !action.url.trim()) {
        setError('Informe a URL para o webhook.');
        return;
      }
      action.url = action.url.trim();
    }

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-10">
      <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50">
              {mode === 'create' ? 'Criar automacao' : 'Editar automacao'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Configure regras inteligentes para distribuir atendimentos e automatizar rotinas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Nome</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Distribuicao inteligente"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Trigger</label>
              <select
                value={trigger}
                onChange={(event) => setTrigger(event.target.value as AutomationRule['trigger'])}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {TRIGGERS.map((item) => (
                  <option key={item} value={item}>
                    {TRIGGER_LABEL[item]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Descricao</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="Explique rapidamente o objetivo da regra."
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Prioridade</label>
              <input
                type="number"
                value={priority}
                onChange={(event) => setPriority(Number(event.target.value) || 0)}
                min={0}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-800">
              <input
                id="stop-on-match"
                type="checkbox"
                checked={stopOnMatch}
                onChange={(event) => setStopOnMatch(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-slate-700"
              />
              <label htmlFor="stop-on-match" className="text-sm text-gray-700 dark:text-slate-200">
                Parar apos executar uma acao
              </label>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-800">
              <input
                id="rule-active"
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-slate-700"
              />
              <label htmlFor="rule-active" className="text-sm text-gray-700 dark:text-slate-200">
                Ativar apos salvar
              </label>
            </div>
          </div>

          <section className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Condicoes</h3>
              <button
                type="button"
                onClick={handleAddCondition}
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
              >
                <Plus className="h-4 w-4" />
                Adicionar condicao
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {conditions.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
                  Nenhuma condicao definida. As acoes serao executadas sempre que o trigger ocorrer.
                </p>
              )}

              {conditions.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      Condicao {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(entry.id)}
                      className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
                      title="Remover condicao"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase text-gray-500">
                        Tipo
                      </label>
                      <select
                        value={entry.condition.type}
                        onChange={(event) =>
                          handleConditionTypeChange(
                            entry.id,
                            event.target.value as AutomationCondition['type']
                          )
                        }
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="ticket_status">Status do ticket</option>
                        <option value="queue">Fila do ticket</option>
                        <option value="ticket_priority">Prioridade</option>
                        <option value="ticket_unassigned">Ticket sem agente</option>
                        <option value="ticket_has_tags">Tags aplicadas</option>
                        <option value="message_body_contains">Mensagem contem</option>
                        <option value="ticket_idle_minutes">Tempo sem resposta</option>
                        <option value="ticket_unread_messages">Mensagens nao lidas</option>
                        <option value="business_hours">Janela de horario</option>
                      </select>
                    </div>

                    <ConditionFields
                      condition={entry.condition}
                      onChange={(nextCondition) => handleConditionUpdate(entry.id, nextCondition)}
                      tags={tags}
                      queues={queues}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Acoes</h3>
              <button
                type="button"
                onClick={handleAddAction}
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
              >
                <Plus className="h-4 w-4" />
                Adicionar acao
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {actions.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-primary/20 bg-white p-4 shadow-sm dark:border-primary/30 dark:bg-slate-900"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                      Acao {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAction(entry.id)}
                      className="rounded-full p-1 text-primary/60 transition hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20"
                      title="Remover acao"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                        Tipo
                      </label>
                      <select
                        value={entry.action.type}
                        onChange={(event) =>
                          handleActionTypeChange(
                            entry.id,
                            event.target.value as AutomationAction['type']
                          )
                        }
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="assign_agent">Atribuir agente</option>
                        <option value="assign_queue">Mover para fila</option>
                        <option value="apply_tags">Aplicar tags</option>
                        <option value="close_ticket">Fechar ticket</option>
                        <option value="trigger_webhook">Disparar webhook</option>
                      </select>
                    </div>

                    <ActionFields
                      action={entry.action}
                      onChange={(nextAction) => handleActionUpdate(entry.id, nextAction)}
                      agents={agents}
                      queues={queues}
                      tags={tags}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/70"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50"
              disabled={submitting}
            >
              {submitting ? 'Salvando...' : mode === 'create' ? 'Criar automacao' : 'Salvar alteracoes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type ConditionFieldsProps = {
  condition: AutomationCondition;
  onChange: (next: AutomationCondition) => void;
  tags: Tag[];
  queues: Queue[];
};

type ActionFieldsProps = {
  action: AutomationAction;
  onChange: (next: AutomationAction) => void;
  agents: AutomationAgent[];
  queues: Queue[];
  tags: Tag[];
};

function ConditionFields({ condition, onChange, tags, queues }: ConditionFieldsProps) {
  switch (condition.type) {
    case 'ticket_status':
      return (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase text-gray-500">Status permitidos</label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((status) => {
              const checked = condition.statuses.includes(status);
              return (
                <label
                  key={status}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    checked
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-primary/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const nextStatuses = event.target.checked
                        ? [...condition.statuses, status]
                        : condition.statuses.filter((item) => item !== status);
                      onChange({ ...condition, statuses: nextStatuses });
                    }}
                  />
                  {status}
                </label>
              );
            })}
          </div>
        </div>
      );
    case 'queue':
      return (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase text-gray-500">Filas</label>
          <div className="flex flex-wrap gap-2">
            {queues.map((queue) => {
              const checked = condition.queueIds.includes(queue.id);
              return (
                <label
                  key={queue.id}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    checked
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-primary/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const nextList = event.target.checked
                        ? [...condition.queueIds, queue.id]
                        : condition.queueIds.filter((item) => item !== queue.id);
                      onChange({ ...condition, queueIds: nextList });
                    }}
                  />
                  {queue.name}
                </label>
              );
            })}
          </div>
        </div>
      );
    case 'ticket_priority':
      return (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase text-gray-500">Prioridades</label>
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map((priority) => {
              const checked = condition.priorities.includes(priority);
              return (
                <label
                  key={priority}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    checked
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-primary/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const nextList = event.target.checked
                        ? [...condition.priorities, priority]
                        : condition.priorities.filter((item) => item !== priority);
                      onChange({ ...condition, priorities: nextList });
                    }}
                  />
                  {priority}
                </label>
              );
            })}
          </div>
        </div>
      );
    case 'ticket_unassigned':
      return (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-800">
          <input
            id="ticket-unassigned"
            type="checkbox"
            checked={condition.value}
            onChange={(event) => onChange({ ...condition, value: event.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-slate-700"
          />
          <label htmlFor="ticket-unassigned" className="text-sm text-gray-700 dark:text-slate-200">
            Aplicar apenas quando o ticket nao tiver agente responsavel
          </label>
        </div>
      );
    case 'ticket_has_tags':
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Comparacao</label>
            <select
              value={condition.mode ?? 'any'}
              onChange={(event) => {
                const nextMode = event.target.value as 'all' | 'any' | 'none';
                onChange({ ...condition, mode: nextMode });
              }}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="any">Qualquer uma das tags</option>
              <option value="all">Todas as tags</option>
              <option value="none">Nenhuma das tags</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const checked = condition.tagIds.includes(tag.id);
              return (
                <label
                  key={tag.id}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    checked
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-primary/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const nextList = event.target.checked
                        ? [...condition.tagIds, tag.id]
                        : condition.tagIds.filter((item) => item !== tag.id);
                      onChange({ ...condition, tagIds: nextList });
                    }}
                  />
                  {tag.name}
                </label>
              );
            })}
          </div>
        </div>
      );
    case 'message_body_contains':
      return (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase text-gray-500">
            Palavras-chave (separadas por virgula)
          </label>
          <textarea
            rows={2}
            value={condition.keywords.join(', ')}
            onChange={(event) =>
              onChange({
                ...condition,
                keywords: event.target.value
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean)
              })
            }
            placeholder="orçamento, status, pagamento"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      );
    case 'ticket_idle_minutes':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Comparador</label>
            <select
              value={condition.operator}
              onChange={(event) => {
                const nextOperator = event.target.value as AutomationComparisonOperator;
                onChange({ ...condition, operator: nextOperator });
              }}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value=">">&gt;</option>
              <option value=">=">&gt;=</option>
              <option value="<">&lt;</option>
              <option value="<=">&lt;=</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Minutos</label>
            <input
              type="number"
              min={0}
              value={condition.minutes}
              onChange={(event) => onChange({ ...condition, minutes: Number(event.target.value) || 0 })}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      );
    case 'ticket_unread_messages':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Comparador</label>
            <select
              value={condition.operator}
              onChange={(event) => {
                const nextOperator = event.target.value as AutomationComparisonOperator;
                onChange({ ...condition, operator: nextOperator });
              }}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value=">">&gt;</option>
              <option value=">=">&gt;=</option>
              <option value="<">&lt;</option>
              <option value="<=">&lt;=</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Quantidade</label>
            <input
              type="number"
              min={0}
              value={condition.value}
              onChange={(event) => onChange({ ...condition, value: Number(event.target.value) || 0 })}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      );
    case 'business_hours':
      return (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => {
              const checked = condition.daysOfWeek.includes(day.value);
              return (
                <label
                  key={day.value}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    checked
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-primary/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const nextList = event.target.checked
                        ? [...condition.daysOfWeek, day.value]
                        : condition.daysOfWeek.filter((value) => value !== day.value);
                      onChange({ ...condition, daysOfWeek: nextList });
                    }}
                  />
                  {day.label}
                </label>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Inicio</label>
              <input
                type="time"
                value={condition.startTime}
                onChange={(event) => onChange({ ...condition, startTime: event.target.value })}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Fim</label>
              <input
                type="time"
                value={condition.endTime}
                onChange={(event) => onChange({ ...condition, endTime: event.target.value })}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Timezone</label>
              <input
                value={condition.timezone ?? ''}
                onChange={(event) => onChange({ ...condition, timezone: event.target.value })}
                placeholder="America/Sao_Paulo"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>
      );
    default:
      return (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Configure os parametros para esta condicao.
        </p>
      );
  }
}

function ActionFields({
  action,
  onChange,
  agents,
  queues,
  tags
}: ActionFieldsProps) {
  switch (action.type) {
    case 'assign_agent':
      return (
        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Estrategia</label>
            <select
              value={action.strategy ?? 'LEAST_TICKETS'}
              onChange={(event) =>
                onChange({
                  ...action,
                  strategy: event.target.value as Extract<AutomationAction, { type: 'assign_agent' }>['strategy']
                })
              }
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="LEAST_TICKETS">Menor fila</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {agents.map((agent) => {
              const checked = Boolean(action.agentIds?.includes(agent.id));
              return (
                <label
                  key={agent.id}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    checked
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-primary/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const nextList = event.target.checked
                        ? [...(action.agentIds ?? []), agent.id]
                        : (action.agentIds ?? []).filter((id) => id !== agent.id);
                      onChange({ ...action, agentIds: nextList });
                    }}
                  />
                  {agent.name}
                </label>
              );
            })}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-800">
            <input
              id="include-queue-agents"
              type="checkbox"
              checked={action.includeQueueAgents ?? true}
              onChange={(event) =>
                onChange({ ...action, includeQueueAgents: event.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-slate-700"
            />
            <label htmlFor="include-queue-agents" className="text-sm text-gray-700 dark:text-slate-200">
              Priorizar agentes da fila do ticket
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-gray-500">
              Limite por agente (opcional)
            </label>
            <input
              type="number"
              min={0}
              value={action.maxTicketsPerAgent ?? ''}
              onChange={(event) =>
                onChange({
                  ...action,
                  maxTicketsPerAgent: event.target.value ? Number(event.target.value) : undefined
                })
              }
              placeholder="Usa configuracao do agente por padrão"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      );
    case 'assign_queue':
      return (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase text-gray-500">Fila destino</label>
          <select
            value={action.queueId}
            onChange={(event) => onChange({ ...action, queueId: event.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {queues.map((queue) => (
              <option key={queue.id} value={queue.id}>
                {queue.name}
              </option>
            ))}
          </select>
        </div>
      );
    case 'apply_tags':
      return (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const checked = action.tagIds.includes(tag.id);
            return (
              <label
                key={tag.id}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  checked
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-primary/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    const nextList = event.target.checked
                      ? [...action.tagIds, tag.id]
                      : action.tagIds.filter((id) => id !== tag.id);
                    onChange({ ...action, tagIds: nextList });
                  }}
                />
                {tag.name}
              </label>
            );
          })}
        </div>
      );
    case 'close_ticket':
      return (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-800">
          <input
            id="close-ticket-survey"
            type="checkbox"
            checked={action.applySurvey ?? false}
            onChange={(event) => onChange({ ...action, applySurvey: event.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-slate-700"
          />
          <label htmlFor="close-ticket-survey" className="text-sm text-gray-700 dark:text-slate-200">
            Enviar pesquisa de satisfacao automaticamente
          </label>
        </div>
      );
    case 'trigger_webhook': {
      const headerEntries = Object.entries(action.headers ?? {});
      return (
        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-gray-500">URL</label>
            <input
              value={action.url}
              onChange={(event) => onChange({ ...action, url: event.target.value })}
              placeholder="https://api.meusistema.com/webhook"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Metodo</label>
              <select
                value={action.method ?? 'POST'}
                onChange={(event) =>
                  onChange({
                    ...action,
                    method: event.target.value as Extract<
                      AutomationAction,
                      { type: 'trigger_webhook' }
                    >['method']
                  })
                }
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="GET">GET</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Timeout (ms)</label>
              <input
                type="number"
                min={1000}
                value={action.timeoutMs ?? 7000}
                onChange={(event) =>
                  onChange({
                    ...action,
                    timeoutMs: Number(event.target.value) || undefined
                  })
                }
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-gray-500">
                Headers (opcional)
              </label>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...action,
                    headers: { ...(action.headers ?? {}), [`X-Header-${Date.now()}`]: '' }
                  })
                }
                className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-2 py-0.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
              >
                <Plus className="h-3 w-3" />
                Header
              </button>
            </div>
            {headerEntries.length === 0 && (
              <p className="text-xs text-gray-500">Nenhum header definido.</p>
            )}
            {headerEntries.map(([key, value], index) => (
              <div key={`${key}-${index}`} className="grid gap-2 md:grid-cols-2">
                <input
                  value={key}
                  onChange={(event) => {
                    const newKey = event.target.value;
                    const nextHeaders: Record<string, string> = {};
                    headerEntries.forEach(([currentKey, currentValue], entryIndex) => {
                      if (entryIndex === index) {
                        if (newKey.trim()) {
                          nextHeaders[newKey] = currentValue;
                        }
                      } else {
                        nextHeaders[currentKey] = currentValue;
                      }
                    });
                    onChange({ ...action, headers: nextHeaders });
                  }}
                  placeholder="X-Custom-Header"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <div className="flex gap-2">
                  <input
                    value={value}
                    onChange={(event) => {
                      const nextHeaders: Record<string, string> = {};
                      headerEntries.forEach(([currentKey, currentValue], entryIndex) => {
                        if (entryIndex === index) {
                          nextHeaders[key] = event.target.value;
                        } else {
                          nextHeaders[currentKey] = currentValue;
                        }
                      });
                      onChange({ ...action, headers: nextHeaders });
                    }}
                    placeholder="Valor"
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nextHeaders: Record<string, string> = {};
                      headerEntries.forEach(([currentKey, currentValue], entryIndex) => {
                        if (entryIndex !== index) {
                          nextHeaders[currentKey] = currentValue;
                        }
                      });
                      onChange({ ...action, headers: nextHeaders });
                    }}
                    className="rounded-full border border-red-200 p-2 text-red-500 transition hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-gray-500">
              Corpo/template (opcional)
            </label>
            <textarea
              rows={3}
              value={action.bodyTemplate ?? ''}
              onChange={(event) => onChange({ ...action, bodyTemplate: event.target.value })}
              placeholder='Pode usar placeholders como {{ ticket.id }}'
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      );
    }
    default:
      return (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Configure os parametros da acao selecionada.
        </p>
      );
  }
}

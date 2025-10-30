import { useEffect, useMemo, useState } from 'react';
import {
  ChatbotFlow,
  ChatbotNode,
  ChatbotNodeType,
  ChatbotQuestionNode,
  ChatbotTriggerType,
  ChatbotInputValidation
} from '@/types/chatbot';
import { ChatbotFlowPayload } from '@/services/chatbot';
import { Queue } from '@/store/metadataStore';
import {
  ArrowDown,
  ArrowUp,
  ListChecks,
  Plus,
  Trash2
} from 'lucide-react';

type FormNode = ChatbotNode;
type MessageNode = Extract<FormNode, { type: 'message' }>;
type QuestionNode = Extract<FormNode, { type: 'question' }>;
type InputNode = Extract<FormNode, { type: 'input' }>;
type TransferNode = Extract<FormNode, { type: 'transfer' }>;
type EndNode = Extract<FormNode, { type: 'end' }>;

const isMessageNode = (node: FormNode): node is MessageNode => node.type === 'message';
const isQuestionNode = (node: FormNode): node is QuestionNode => node.type === 'question';
const isInputNode = (node: FormNode): node is InputNode => node.type === 'input';
const isTransferNode = (node: FormNode): node is TransferNode => node.type === 'transfer';
const isEndNode = (node: FormNode): node is EndNode => node.type === 'end';

interface FlowEditorProps {
  flow?: ChatbotFlow | null;
  queues: Queue[];
  mode: 'edit' | 'create';
  saving?: boolean;
  onSave: (payload: ChatbotFlowPayload, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onCancel?: () => void;
}

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

interface FormState {
  name: string;
  description: string;
  isActive: boolean;
  isPrimary: boolean;
  keywordsInput: string;
  entryNodeId: string;
  nodes: FormNode[];
  offlineMessage: string;
  transferQueueId?: string | null;
  schedule: {
    enabled: boolean;
    timezone: string;
    fallbackMessage: string;
    days: Record<number, DaySchedule>;
  };
}

const dayOptions = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terca' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sabado' }
];

const defaultSchedule = (): Record<number, DaySchedule> =>
  dayOptions.reduce<Record<number, DaySchedule>>((acc, day) => {
    acc[day.value] = {
      enabled: day.value >= 1 && day.value <= 5,
      start: '09:00',
      end: '18:00'
    };
    return acc;
  }, {});

const createDefaultNode = (): FormNode => ({
  id: crypto.randomUUID(),
  type: 'message',
  content: 'Ola! Como posso ajudar?',
  next: null
});

const buildInitialState = (flow?: ChatbotFlow | null): FormState => {
  if (!flow) {
    const baseNode = createDefaultNode();
    return {
      name: '',
      description: '',
      isActive: true,
      isPrimary: false,
      keywordsInput: '',
      entryNodeId: baseNode.id,
      nodes: [baseNode],
      offlineMessage: '',
      transferQueueId: undefined,
      schedule: {
        enabled: false,
        timezone: 'America/Sao_Paulo',
        fallbackMessage: 'Estamos fora do horario de atendimento. Voltaremos em breve!',
        days: defaultSchedule()
      }
    };
  }

  const { definition } = flow;
  const nodes = definition?.nodes ?? [];
  const entryNodeId = definition?.entryNodeId ?? nodes[0]?.id ?? createDefaultNode().id;

  const scheduleDays = defaultSchedule();
  if (flow.schedule?.windows) {
    flow.schedule.windows.forEach((window) => {
      window.days.forEach((day) => {
        scheduleDays[day] = {
          enabled: true,
          start: window.start,
          end: window.end
        };
      });
    });
  }

  return {
    name: flow.name ?? '',
    description: flow.description ?? '',
    isActive: flow.isActive,
    isPrimary: flow.isPrimary,
    keywordsInput: (flow.keywords ?? []).join(', '),
    entryNodeId,
    nodes: nodes.length > 0 ? nodes : [createDefaultNode()],
    offlineMessage: flow.offlineMessage ?? '',
    transferQueueId: flow.transferQueueId ?? undefined,
    schedule: {
      enabled: Boolean(flow.schedule?.enabled),
      timezone: flow.schedule?.timezone ?? 'America/Sao_Paulo',
      fallbackMessage:
        flow.schedule?.fallbackMessage ??
        flow.offlineMessage ??
        'Estamos fora do horario de atendimento. Voltaremos em breve!',
      days: scheduleDays
    }
  };
};

const parseKeywords = (value: string) =>
  value
    .split(/,|\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);

const nodeTypes: Array<{ value: ChatbotNodeType; label: string }> = [
  { value: 'message', label: 'Mensagem' },
  { value: 'question', label: 'Pergunta' },
  { value: 'input', label: 'Coleta de informacao' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'end', label: 'Finalizacao' }
];

const timezoneOptions = [
  'America/Sao_Paulo',
  'America/Bogota',
  'America/Mexico_City',
  'America/New_York',
  'Europe/Lisbon'
];
export function FlowEditor({ flow, queues, mode, saving, onSave, onDelete, onCancel }: FlowEditorProps) {
  const [form, setForm] = useState<FormState>(() => buildInitialState(flow));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildInitialState(flow));
    setValidationError(null);
  }, [flow, mode]);

  const nodeIds = useMemo(() => form.nodes.map((node) => node.id), [form.nodes]);

  const updateNode = (nodeId: string, updater: (node: FormNode) => FormNode) => {
    setForm((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => (node.id === nodeId ? updater(node) : node))
    }));
  };

  const reorderNode = (index: number, direction: 'up' | 'down') => {
    setForm((prev) => {
      const nodes = [...prev.nodes];
      const target = nodes[index];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (!target || swapIndex < 0 || swapIndex >= nodes.length) {
        return prev;
      }
      [nodes[index], nodes[swapIndex]] = [nodes[swapIndex], nodes[index]];
      return { ...prev, nodes };
    });
  };

  const removeNode = (nodeId: string) => {
    setForm((prev) => {
      const remaining = prev.nodes.filter((node) => node.id !== nodeId);
      if (remaining.length === 0) {
        return prev;
      }
      const entryNodeId = prev.entryNodeId === nodeId ? remaining[0].id : prev.entryNodeId;
      const updatedNodes = remaining.map((node) => {
        const next = node.next === nodeId ? null : node.next;
        if (node.type === 'question') {
          const questionNode = node as ChatbotQuestionNode;
          const options = questionNode.options?.map((option) => ({
            ...option,
            next: option.next === nodeId ? null : option.next
          }));
          return { ...questionNode, options };
        }
        return { ...node, next };
      });
      return { ...prev, nodes: updatedNodes, entryNodeId };
    });
  };

  const addNode = (type: ChatbotNodeType) => {
    const node: FormNode =
      type === 'question'
        ? {
            id: crypto.randomUUID(),
            type,
            content: 'Qual opcao voce deseja?',
            options: [
              { id: crypto.randomUUID(), value: '1', label: 'Opcao 1', next: null },
              { id: crypto.randomUUID(), value: '2', label: 'Opcao 2', next: null }
            ],
            retryMessage: 'Nao entendi sua resposta. Pode escolher uma opcao da lista?',
            allowFreeText: false
          }
        : type === 'input'
        ? {
            id: crypto.randomUUID(),
            type,
            content: 'Por favor, informe o dado solicitado:',
            field: 'informacao',
            validation: { type: 'text', minLength: 2 },
            next: null
          }
        : type === 'transfer'
        ? {
            id: crypto.randomUUID(),
            type,
            message: 'Vou transferir voce para um especialista.',
            next: null
          }
        : type === 'end'
        ? {
            id: crypto.randomUUID(),
            type,
            content: 'Obrigado pelo contato! Ate breve.'
          }
        : {
            id: crypto.randomUUID(),
            type: 'message',
            content: 'Mensagem do bot.',
            next: null
          };

    setForm((prev) => ({
      ...prev,
      nodes: [...prev.nodes, node]
    }));
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      setValidationError('Informe um nome para o fluxo.');
      return false;
    }
    if (!form.entryNodeId || !nodeIds.includes(form.entryNodeId)) {
      setValidationError('Selecione um no inicial valido.');
      return false;
    }
    const questionWithNoOptions = form.nodes.find(
      (node) => node.type === 'question' && (!node.options || node.options.length === 0)
    );
    if (questionWithNoOptions) {
      setValidationError('Ha uma pergunta sem opcoes configuradas.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const buildPayload = (): ChatbotFlowPayload => {
    const keywords = parseKeywords(form.keywordsInput);
    const enabledDays = Object.entries(form.schedule.days)
      .filter(([, schedule]) => schedule.enabled)
      .map(([day, schedule]) => ({
        days: [Number(day)],
        start: schedule.start,
        end: schedule.end
      }));

    const schedule =
      form.schedule.enabled && enabledDays.length > 0
        ? {
            enabled: true,
            timezone: form.schedule.timezone,
            windows: enabledDays,
            fallbackMessage: form.schedule.fallbackMessage
          }
        : null;

    const payload: ChatbotFlowPayload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      isActive: form.isActive,
      isPrimary: form.isPrimary,
      triggerType: form.isPrimary ? ('DEFAULT' as ChatbotTriggerType) : 'KEYWORD',
      keywords,
      entryNodeId: form.entryNodeId,
      definition: {
        entryNodeId: form.entryNodeId,
        nodes: form.nodes
      },
      schedule,
      offlineMessage: form.offlineMessage.trim() || null,
      transferQueueId: form.transferQueueId || null
    };

    return payload;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    const payload = buildPayload();
    await onSave(payload, mode === 'edit' && flow ? flow.id : undefined);
  };

  const handleDelete = async () => {
    if (mode === 'edit' && flow && onDelete) {
      await onDelete(flow.id);
    }
  };
  const renderNodeCard = (node: FormNode, index: number) => {
    const nextOptions = [{ id: '', label: 'Fim do fluxo' }, ...form.nodes.map((item) => ({ id: item.id, label: item.id }))];

    return (
      <div
        key={node.id}
        className="rounded-2xl border border-gray-200 bg-white/80 p-4 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/60"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              No {index + 1}
            </div>
            <select
              value={node.type}
              onChange={(event) => {
                const newType = event.target.value as ChatbotNodeType;
                setForm((prev) => {
                  const updatedNodes = [...prev.nodes];
                  const nodeIndex = updatedNodes.findIndex((item) => item.id === node.id);
                  if (nodeIndex === -1) return prev;
                  const existing = updatedNodes[nodeIndex];
                  const baseNode = {
                    id: existing.id,
                    label: existing.label,
                    metadata: existing.metadata,
                    next: existing.next ?? null
                  };
                  let newNode: FormNode;
                  if (newType === 'question') {
                    const options =
                      isQuestionNode(existing) && existing.options.length
                        ? existing.options.map((option) => ({
                            ...option,
                            id: option.id ?? crypto.randomUUID(),
                            next: option.next ?? null
                          }))
                        : [
                            { id: crypto.randomUUID(), value: '1', label: 'Opcao 1', next: null },
                            { id: crypto.randomUUID(), value: '2', label: 'Opcao 2', next: null }
                          ];
                    newNode = {
                      ...baseNode,
                      type: 'question',
                      content: isQuestionNode(existing) ? existing.content : 'Qual opcao voce deseja?',
                      options,
                      retryMessage:
                        isQuestionNode(existing) && existing.retryMessage
                          ? existing.retryMessage
                          : 'Nao entendi sua resposta. Pode escolher uma opcao valida?',
                      allowFreeText: isQuestionNode(existing) ? existing.allowFreeText ?? false : false,
                      storeField: isQuestionNode(existing) ? existing.storeField : undefined,
                      defaultNext: isQuestionNode(existing) ? existing.defaultNext ?? null : null
                    };
                  } else if (newType === 'input') {
                    newNode = {
                      ...baseNode,
                      type: 'input',
                      content: isInputNode(existing) ? existing.content : 'Informe a informacao solicitada:',
                      field: isInputNode(existing) ? existing.field : 'campo',
                      validation:
                        isInputNode(existing) && existing.validation
                          ? existing.validation
                          : { type: 'text', minLength: 1 },
                      storeField: isInputNode(existing) ? existing.storeField : undefined,
                      nextOnFail: isInputNode(existing) ? existing.nextOnFail ?? null : null
                    };
                  } else if (newType === 'transfer') {
                    newNode = {
                      ...baseNode,
                      type: 'transfer',
                      message: isTransferNode(existing)
                        ? existing.message
                        : 'Vou transferir seu atendimento agora.',
                      queueId: isTransferNode(existing) ? existing.queueId ?? null : null,
                      mode: isTransferNode(existing) ? existing.mode : undefined,
                      agentId: isTransferNode(existing) ? existing.agentId ?? null : null
                    };
                  } else if (newType === 'end') {
                    newNode = {
                      ...baseNode,
                      type: 'end',
                      content:
                        isEndNode(existing) && existing.content
                          ? existing.content
                          : 'Atendimento finalizado. Obrigado!'
                    };
                  } else {
                    newNode = {
                      ...baseNode,
                      type: 'message',
                      content: isMessageNode(existing) ? existing.content : 'Mensagem do bot.',
                      quickReplies: isMessageNode(existing) ? existing.quickReplies : undefined
                    };
                  }
                  updatedNodes[nodeIndex] = newNode;
                  return { ...prev, nodes: updatedNodes };
                });
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {nodeTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => reorderNode(index, 'up')}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:border-primary/60 dark:hover:text-primary/90"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              disabled={index === form.nodes.length - 1}
              onClick={() => reorderNode(index, 'down')}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:border-primary/60 dark:hover:text-primary/90"
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => removeNode(node.id)}
              className="rounded-lg border border-rose-200 p-2 text-rose-500 transition hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          {isMessageNode(node) && (
            <textarea
              value={node.content ?? ''}
              onChange={(event) =>
                updateNode(node.id, (current) => {
                  if (!isMessageNode(current)) {
                    return current;
                  }
                  return { ...current, content: event.target.value };
                })
              }
              className="w-full rounded-lg border border-gray-200 bg-white/90 p-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
              placeholder="Mensagem enviada pelo bot"
            />
          )}

          {isQuestionNode(node) && (
            <div className="space-y-4">
              <textarea
                value={node.content ?? ''}
                onChange={(event) =>
                  updateNode(node.id, (current) => ({
                    ...current,
                    content: event.target.value
                  }))
                }
                className="w-full rounded-lg border border-gray-200 bg-white/90 p-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                placeholder="Pergunta apresentada ao contato"
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Opcoes
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      updateNode(node.id, (current) => {
                        const question = current as ChatbotQuestionNode;
                        const options = question.options ?? [];
                        return {
                          ...question,
                          options: [
                            ...options,
                            {
                              id: crypto.randomUUID(),
                              value: `opcao_${options.length + 1}`,
                              label: 'Nova opcao',
                              next: null
                            }
                          ]
                        };
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300 dark:hover:border-primary/60 dark:hover:text-primary/90"
                  >
                    <Plus size={12} />
                    Adicionar
                  </button>
                </div>

                {(node as ChatbotQuestionNode).options?.map((option, optionIndex) => (
                  <div key={option.id ?? optionIndex} className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="flex justify-between gap-2">
                      <input
                        value={option.label ?? ''}
                        onChange={(event) =>
                          updateNode(node.id, (current) => {
                            const question = current as ChatbotQuestionNode;
                            const updated = question.options?.map((opt, idx) =>
                              idx === optionIndex ? { ...opt, label: event.target.value } : opt
                            );
                            return { ...question, options: updated };
                          })
                        }
                        className="flex-1 rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        placeholder="Titulo da opcao"
                      />
                      <input
                        value={option.value}
                        onChange={(event) =>
                          updateNode(node.id, (current) => {
                            const question = current as ChatbotQuestionNode;
                            const updated = question.options?.map((opt, idx) =>
                              idx === optionIndex ? { ...opt, value: event.target.value } : opt
                            );
                            return { ...question, options: updated };
                          })
                        }
                        className="w-32 rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        placeholder="Valor"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateNode(node.id, (current) => {
                            const question = current as ChatbotQuestionNode;
                            return {
                              ...question,
                              options: question.options?.filter((_, idx) => idx !== optionIndex)
                            };
                          })
                        }
                        className="rounded-lg border border-rose-200 p-2 text-rose-500 transition hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input
                        value={(option.keywords ?? []).join(', ')}
                        onChange={(event) =>
                          updateNode(node.id, (current) => {
                            const question = current as ChatbotQuestionNode;
                            const updated = question.options?.map((opt, idx) =>
                              idx === optionIndex
                                ? { ...opt, keywords: parseKeywords(event.target.value) }
                                : opt
                            );
                            return { ...question, options: updated };
                          })
                        }
                        className="rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        placeholder="Palavras-chave (separadas por virgula)"
                      />
                      <select
                        value={option.next ?? ''}
                        onChange={(event) =>
                          updateNode(node.id, (current) => {
                            const question = current as ChatbotQuestionNode;
                            const updated = question.options?.map((opt, idx) =>
                              idx === optionIndex ? { ...opt, next: event.target.value || null } : opt
                            );
                            return { ...question, options: updated };
                          })
                        }
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {nextOptions.map((optionNode) => (
                          <option key={optionNode.id} value={optionNode.id}>
                            {optionNode.label || 'Fim do fluxo'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isInputNode(node) && (
            <div className="grid gap-3 md:grid-cols-2">
              <textarea
                value={node.content ?? ''}
                onChange={(event) =>
                  updateNode(node.id, (current) => {
                    if (!isInputNode(current)) {
                      return current;
                    }
                    return { ...current, content: event.target.value };
                  })
                }
                className="md:col-span-2 rounded-lg border border-gray-200 bg-white/90 p-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                placeholder="Pergunta para coletar a informacao"
              />
              <input
                value={node.field ?? ''}
                onChange={(event) =>
                  updateNode(node.id, (current) => {
                    if (!isInputNode(current)) {
                      return current;
                    }
                    return { ...current, field: event.target.value };
                  })
                }
                className="rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                placeholder="Campo interno (ex: email)"
              />
              <select
                value={node.validation?.type ?? 'text'}
                onChange={(event) =>
                  updateNode(node.id, (current) => {
                    if (!isInputNode(current)) {
                      return current;
                    }
                    const validationType = event.target.value as ChatbotInputValidation['type'];
                    return {
                      ...current,
                      validation: { ...(current.validation ?? {}), type: validationType }
                    };
                  })
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="text">Texto</option>
                <option value="number">Numero</option>
                <option value="email">Email</option>
                <option value="phone">Telefone</option>
              </select>
              <input
                value={node.validation?.message ?? ''}
                onChange={(event) =>
                  updateNode(node.id, (current) => {
                    if (!isInputNode(current)) {
                      return current;
                    }
                    return {
                      ...current,
                      validation: { ...(current.validation ?? {}), message: event.target.value }
                    };
                  })
                }
                className="md:col-span-2 rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                placeholder="Mensagem de erro personalizada (opcional)"
              />
            </div>
          )}

          {isTransferNode(node) && (
            <div className="grid gap-3 md:grid-cols-2">
              <textarea
                value={node.message ?? ''}
                onChange={(event) =>
                  updateNode(node.id, (current) => {
                    if (!isTransferNode(current)) {
                      return current;
                    }
                    return { ...current, message: event.target.value };
                  })
                }
                className="md:col-span-2 rounded-lg border border-gray-200 bg-white/90 p-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                placeholder="Mensagem de transicao antes de transferir"
              />
              <select
                value={node.queueId ?? ''}
                onChange={(event) =>
                  updateNode(node.id, (current) => {
                    if (!isTransferNode(current)) {
                      return current;
                    }
                    return { ...current, queueId: event.target.value || null };
                  })
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="">Fila padrao do fluxo</option>
                {queues.map((queue) => (
                  <option key={queue.id} value={queue.id}>
                    {queue.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isQuestionNode(node) && !isEndNode(node) && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Proximo no
              </label>
              <select
                value={(node.next as string | null) ?? ''}
                onChange={(event) =>
                  updateNode(node.id, (current) => ({
                    ...current,
                    next: event.target.value || null
                  }))
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {nextOptions.map((optionNode) => (
                  <option key={optionNode.id} value={optionNode.id}>
                    {optionNode.label || 'Fim do fluxo'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isEndNode(node) && (
            <textarea
              value={node.content ?? ''}
              onChange={(event) =>
                updateNode(node.id, (current) => {
                  if (!isEndNode(current)) {
                    return current;
                  }
                  return { ...current, content: event.target.value };
                })
              }
              className="w-full rounded-lg border border-gray-200 bg-white/90 p-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
              placeholder="Mensagem final do fluxo"
            />
          )}
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white/70 p-6 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
              {mode === 'create' ? 'Novo fluxo de chatbot' : `Editar fluxo: ${flow?.name ?? ''}`}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Configure os detalhes gerais e os nos que compoem o fluxo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === 'edit' && onDelete && flow && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
              >
                Remover fluxo
              </button>
            )}
            {mode === 'create' && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/40"
            >
              <ListChecks size={14} />
              {saving ? 'Salvando...' : 'Salvar fluxo'}
            </button>
          </div>
        </div>

        {validationError && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-300">
            {validationError}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Nome do fluxo
              </label>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                placeholder="Ex: Atendimento inicial"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Descricao
              </label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="h-24 rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                placeholder="Descreva o objetivo deste fluxo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-primary/60 dark:hover:text-primary/90">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  className="accent-primary"
                />
                Ativo
              </label>
              <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-primary/60 dark:hover:text-primary/90">
                <input
                  type="checkbox"
                  checked={form.isPrimary}
                  onChange={(event) => setForm((prev) => ({ ...prev, isPrimary: event.target.checked }))}
                  className="accent-primary"
                />
                Fluxo principal
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Palavras-chave de ativacao
              </label>
              <textarea
                value={form.keywordsInput}
                onChange={(event) => setForm((prev) => ({ ...prev, keywordsInput: event.target.value }))}
                className="h-20 rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                placeholder="Ex: orcamento, suporte, financeiro"
              />
              <p className="text-[11px] text-gray-400 dark:text-slate-500">
                Separe palavras por virgula ou coloque uma por linha.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                No inicial
              </label>
              <select
                value={form.entryNodeId}
                onChange={(event) => setForm((prev) => ({ ...prev, entryNodeId: event.target.value }))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {form.nodes.map((node, index) => (
                  <option key={node.id} value={node.id}>
                    No {index + 1}  {node.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Fila padrao para transferencia
              </label>
              <select
                value={form.transferQueueId ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, transferQueueId: event.target.value || null }))
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="">Manter fila atual do ticket</option>
                {queues.map((queue) => (
                  <option key={queue.id} value={queue.id}>
                    {queue.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Mensagem fora do horario
              </label>
              <textarea
                value={form.offlineMessage}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, offlineMessage: event.target.value }))
                }
                className="h-24 rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                placeholder="Ex: Nosso atendimento funciona das 8h as 18h. Deixe sua mensagem e retornaremos em breve."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white/70 p-6 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Nos do fluxo</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Defina as etapas e caminhos possiveis do atendimento automatizado.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {nodeTypes.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => addNode(option.value)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300 dark:hover:border-primary/60 dark:hover:text-primary/90"
              >
                <Plus size={12} />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {form.nodes.map((node, index) => renderNodeCard(node, index))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white/70 p-6 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
              Horario de atuacao
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Controla quando o bot atende automaticamente.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.schedule.enabled}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  schedule: { ...prev.schedule, enabled: event.target.checked }
                }))
              }
              className="accent-primary"
            />
            Ativar restricao de horario
          </label>
        </div>

        {form.schedule.enabled && (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Fuso horario
                </label>
                <select
                  value={form.schedule.timezone}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      schedule: { ...prev.schedule, timezone: event.target.value }
                    }))
                  }
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {timezoneOptions.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Mensagem personalizada
                </label>
                <input
                  value={form.schedule.fallbackMessage}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      schedule: { ...prev.schedule, fallbackMessage: event.target.value }
                    }))
                  }
                  className="rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                  placeholder="Mensagem enviada fora do horario ativo"
                />
              </div>
            </div>

            <div className="space-y-3">
              {dayOptions.map((day) => (
                <div
                  key={day.value}
                  className="grid items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3 md:grid-cols-[1fr,120px,120px] dark:border-slate-700 dark:bg-slate-900/70"
                >
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.schedule.days[day.value]?.enabled ?? false}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          schedule: {
                            ...prev.schedule,
                            days: {
                              ...prev.schedule.days,
                              [day.value]: {
                                ...(prev.schedule.days[day.value] ?? { start: '09:00', end: '18:00' }),
                                enabled: event.target.checked
                              }
                            }
                          }
                        }))
                      }
                      className="accent-primary"
                    />
                    {day.label}
                  </label>
                  <input
                    type="time"
                    value={form.schedule.days[day.value]?.start ?? '09:00'}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          days: {
                            ...prev.schedule.days,
                            [day.value]: {
                              ...(prev.schedule.days[day.value] ?? { enabled: false, end: '18:00' }),
                              start: event.target.value
                            }
                          }
                        }
                      }))
                    }
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                  <input
                    type="time"
                    value={form.schedule.days[day.value]?.end ?? '18:00'}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          days: {
                            ...prev.schedule.days,
                            [day.value]: {
                              ...(prev.schedule.days[day.value] ?? { enabled: false, start: '09:00' }),
                              end: event.target.value
                            }
                          }
                        }
                      }))
                    }
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlowEditor;


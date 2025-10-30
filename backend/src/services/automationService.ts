import axios, { AxiosError } from 'axios';
import {
  AutomationLogStatus,
  AutomationTrigger,
  AutomationRule as AutomationRuleModel,
  Prisma,
  TicketStatus,
  UserRole
} from '@prisma/client';
import prisma from '../config/database';
import { io } from '../server';
import { ticketInclude } from '../utils/ticketInclude';
import {
  AutomationAction,
  AutomationCondition,
  AutomationComparisonOperator,
  AutomationRuleConfig
} from '../types/automation';
import { triggerSurveyForTicket } from './satisfactionSurveyService';
import { appendTagsToTicket } from './tagAutomation';

type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;
type MessageWithAuthor = Prisma.MessageGetPayload<{
  include: {
    user: { select: { id: true; name: true; avatar: true } };
  };
}>;

interface AutomationContext {
  trigger: AutomationTrigger;
  ticket: TicketWithRelations;
  message?: MessageWithAuthor | null;
}

interface RunAutomationsParams {
  ticketId: string;
  messageId?: string;
  dryRun?: boolean;
  specificRuleId?: string;
  skipLog?: boolean;
  contextOverride?: Partial<AutomationContext>;
}

interface ActionExecutionSummary {
  type: AutomationAction['type'];
  status: 'performed' | 'skipped' | 'failed';
  details?: string;
}

interface RuleExecutionSummary {
  ruleId: string;
  matched: boolean;
  actions: ActionExecutionSummary[];
  error?: string;
  stopProcessing?: boolean;
}

interface AutomationRunSummary {
  trigger: AutomationTrigger;
  results: RuleExecutionSummary[];
  ticketId?: string;
}

interface ActionRunResult {
  summary: ActionExecutionSummary;
  ticket?: TicketWithRelations;
}

interface ActionExecutionResult {
  summaries: ActionExecutionSummary[];
  ticket: TicketWithRelations;
  error?: string;
}

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
};

const refreshTicket = (ticketId: string) =>
  prisma.ticket.findUnique({
    where: { id: ticketId },
    include: ticketInclude
  });

const numericCompare = (value: number, operator: AutomationComparisonOperator, target: number) => {
  switch (operator) {
    case '>':
      return value > target;
    case '>=':
      return value >= target;
    case '=':
      return value === target;
    case '<':
      return value < target;
    case '<=':
      return value <= target;
    default:
      return false;
  }
};

const parseTimeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const getZonedDateParts = (date: Date, timezone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  const parts = formatter.formatToParts(date);
  const weekdayPart = parts.find((part) => part.type === 'weekday')?.value ?? 'mon';
  const hourPart = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minutePart = parts.find((part) => part.type === 'minute')?.value ?? '00';

  const weekdayKey = weekdayPart.slice(0, 3).toLowerCase();
  const weekday = WEEKDAY_MAP[weekdayKey] ?? WEEKDAY_MAP['mon'];
  const hour = Number.parseInt(hourPart, 10);
  const minute = Number.parseInt(minutePart, 10);

  return { weekday, minutes: hour * 60 + minute };
};

const normalizeText = (value?: string | null) =>
  value ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

const messageContainsKeywords = (message: MessageWithAuthor | null | undefined, keywords: string[]) => {
  if (!message?.body) {
    return false;
  }

  if (!Array.isArray(keywords) || keywords.length === 0) {
    return false;
  }

  const content = normalizeText(message.body);
  return keywords.some((keyword) => content.includes(normalizeText(keyword)));
};

const evaluateCondition = (condition: AutomationCondition, context: AutomationContext): boolean => {
  const { ticket, message } = context;

  switch (condition.type) {
    case 'ticket_status':
      return condition.statuses.length === 0 || condition.statuses.includes(ticket.status);
    case 'queue':
      if (!condition.queueIds || condition.queueIds.length === 0) {
        return true;
      }
      return ticket.queueId ? condition.queueIds.includes(ticket.queueId) : false;
    case 'ticket_priority':
      if (!condition.priorities || condition.priorities.length === 0) {
        return true;
      }
      return condition.priorities.includes(ticket.priority);
    case 'ticket_unassigned':
      return condition.value ? !ticket.userId : Boolean(ticket.userId);
    case 'ticket_has_tags': {
      if (!Array.isArray(condition.tagIds) || condition.tagIds.length === 0) {
        return false;
      }
      const tagIds = ticket.tags.map((relation) => relation.tagId);
      const mode = condition.mode ?? 'any';

      if (mode === 'all') {
        return condition.tagIds.every((tagId) => tagIds.includes(tagId));
      }
      if (mode === 'none') {
        return condition.tagIds.every((tagId) => !tagIds.includes(tagId));
      }
      return condition.tagIds.some((tagId) => tagIds.includes(tagId));
    }
    case 'message_body_contains':
      return messageContainsKeywords(message, condition.keywords);
    case 'ticket_idle_minutes': {
      if (!ticket.lastMessageAt) {
        return false;
      }
      const diffMinutes = (Date.now() - ticket.lastMessageAt.getTime()) / 60000;
      const operator = condition.operator ?? '>=';
      return numericCompare(diffMinutes, operator, condition.minutes);
    }
    case 'ticket_unread_messages': {
      const operator = condition.operator ?? '>=';
      return numericCompare(ticket.unreadMessages ?? 0, operator, condition.value);
    }
    case 'business_hours': {
      const timezone = condition.timezone || DEFAULT_TIMEZONE;
      const { weekday, minutes } = getZonedDateParts(new Date(), timezone);
      const allowedDays = Array.isArray(condition.daysOfWeek) ? condition.daysOfWeek : [];
      if (allowedDays.length > 0 && !allowedDays.includes(weekday)) {
        return false;
      }

      const start = parseTimeToMinutes(condition.startTime);
      const end = parseTimeToMinutes(condition.endTime);

      if (start === null || end === null) {
        return true;
      }

      if (start <= end) {
        return minutes >= start && minutes <= end;
      }

      return minutes >= start || minutes <= end;
    }
    default:
      return true;
  }
};

const matchesAllConditions = (conditions: AutomationCondition[], context: AutomationContext) => {
  if (!conditions || conditions.length === 0) {
    return true;
  }
  return conditions.every((condition) => evaluateCondition(condition, context));
};

const parseJsonValue = <T>(value: Prisma.JsonValue | null | undefined): T | null => {
  if (value === null || typeof value === 'undefined') {
    return null;
  }
  if (Array.isArray(value) || typeof value === 'object') {
    return value as unknown as T;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
};

const parseConditions = (value: Prisma.JsonValue | null | undefined): AutomationCondition[] => {
  const parsed = parseJsonValue<AutomationCondition[]>(value);
  if (!parsed || !Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(
    (entry): entry is AutomationCondition => Boolean(entry && typeof entry === 'object' && 'type' in entry)
  );
};

const parseActions = (value: Prisma.JsonValue | null | undefined): AutomationAction[] => {
  const parsed = parseJsonValue<AutomationAction[]>(value);
  if (!parsed || !Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(
    (entry): entry is AutomationAction => Boolean(entry && typeof entry === 'object' && 'type' in entry)
  );
};

export const serializeAutomationRule = (rule: AutomationRuleModel): AutomationRuleConfig => ({
  id: rule.id,
  name: rule.name,
  description: rule.description,
  trigger: rule.trigger,
  isActive: rule.isActive,
  priority: rule.priority,
  stopOnMatch: rule.stopOnMatch,
  conditions: parseConditions(rule.conditions),
  actions: parseActions(rule.actions),
  metadata: parseJsonValue<Record<string, unknown>>(rule.metadata) ?? undefined
});

const toSerializable = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const getNestedValue = (source: unknown, path: string): unknown => {
  if (source === null || typeof source === 'undefined') {
    return undefined;
  }

  const segments = path.split('.').map((segment) => segment.trim());
  let current: any = source;

  for (const segment of segments) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

const renderTemplate = (template: string, context: Record<string, unknown>) =>
  template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, token) => {
    const value = getNestedValue(context, String(token).trim());
    if (value === null || typeof value === 'undefined') {
      return '';
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '';
      }
    }
    return String(value);
  });

const buildTemplateContext = (context: AutomationContext) => ({
  trigger: context.trigger,
  ticket: toSerializable(context.ticket),
  message: context.message ? toSerializable(context.message) : null
});

const executeAssignAgentAction = async (
  action: Extract<AutomationAction, { type: 'assign_agent' }>,
  context: AutomationContext,
  dryRun: boolean
): Promise<ActionRunResult> => {
  const candidateIds = new Set<string>();

  if (Array.isArray(action.agentIds)) {
    action.agentIds.filter(Boolean).forEach((id) => candidateIds.add(id));
  }

  if ((action.includeQueueAgents ?? true) && context.ticket.queueId) {
    const queueAgents = await prisma.queueUser.findMany({
      where: { queueId: context.ticket.queueId },
      select: { userId: true }
    });
    queueAgents.forEach(({ userId }) => candidateIds.add(userId));
  }

  const idList = Array.from(candidateIds);

  const agents = await prisma.user.findMany({
    where:
      idList.length > 0
        ? { id: { in: idList }, role: UserRole.AGENT }
        : {
            role: UserRole.AGENT
          },
    select: {
      id: true,
      name: true,
      maxTickets: true
    }
  });

  if (agents.length === 0) {
    return {
      summary: {
        type: 'assign_agent',
        status: 'skipped',
        details: 'Nenhum agente elegível encontrado'
      }
    };
  }

  const counts = await prisma.ticket.groupBy({
    by: ['userId'],
    where: {
      userId: { in: agents.map((agent) => agent.id) },
      status: { in: [TicketStatus.PENDING, TicketStatus.OPEN] }
    },
    _count: { _all: true }
  });

  const countMap = new Map<string, number>();
  counts.forEach((entry) => {
    if (entry.userId) {
      countMap.set(entry.userId, entry._count._all);
    }
  });

  const candidates = agents
    .map((agent) => {
      const current = countMap.get(agent.id) ?? 0;
      const limit =
        typeof action.maxTicketsPerAgent === 'number'
          ? action.maxTicketsPerAgent
          : typeof agent.maxTickets === 'number'
          ? agent.maxTickets
          : Number.POSITIVE_INFINITY;

      return { ...agent, current, limit };
    })
    .filter((agent) => agent.current < agent.limit);

  if (candidates.length === 0) {
    return {
      summary: {
        type: 'assign_agent',
        status: 'skipped',
        details: 'Todos os agentes elegíveis atingiram a capacidade máxima'
      }
    };
  }

  let selected = candidates[0];

  if ((action.strategy ?? 'LEAST_TICKETS') === 'LEAST_TICKETS') {
    selected = candidates.reduce(
      (best, candidate) => (candidate.current < best.current ? candidate : best),
      candidates[0]
    );
  }

  if (context.ticket.userId === selected.id) {
    return {
      summary: {
        type: 'assign_agent',
        status: 'skipped',
        details: `Ticket já atribuído ao agente ${selected.name}`
      }
    };
  }

  if (dryRun) {
    return {
      summary: {
        type: 'assign_agent',
        status: 'performed',
        details: `Ticket seria atribuído ao agente ${selected.name}`
      }
    };
  }

  await prisma.ticket.update({
    where: { id: context.ticket.id },
    data: {
      userId: selected.id,
      status: context.ticket.status === TicketStatus.PENDING ? TicketStatus.OPEN : context.ticket.status
    }
  });

  const updatedTicket = await refreshTicket(context.ticket.id);

  return {
    summary: {
      type: 'assign_agent',
      status: 'performed',
      details: `Ticket atribuído ao agente ${selected.name}`
    },
    ticket: updatedTicket ?? context.ticket
  };
};

const executeAssignQueueAction = async (
  action: Extract<AutomationAction, { type: 'assign_queue' }>,
  context: AutomationContext,
  dryRun: boolean
): Promise<ActionRunResult> => {
  if (!action.queueId) {
    return {
      summary: {
        type: 'assign_queue',
        status: 'skipped',
        details: 'Nenhuma fila informada'
      }
    };
  }

  if (context.ticket.queueId === action.queueId) {
    return {
      summary: {
        type: 'assign_queue',
        status: 'skipped',
        details: 'Ticket já está na fila informada'
      }
    };
  }

  if (dryRun) {
    return {
      summary: {
        type: 'assign_queue',
        status: 'performed',
        details: 'Ticket seria movido para nova fila'
      }
    };
  }

  await prisma.ticket.update({
    where: { id: context.ticket.id },
    data: { queueId: action.queueId }
  });

  const updatedTicket = await refreshTicket(context.ticket.id);

  return {
    summary: {
      type: 'assign_queue',
      status: 'performed',
      details: 'Ticket movido para nova fila'
    },
    ticket: updatedTicket ?? context.ticket
  };
};

const executeApplyTagsAction = async (
  action: Extract<AutomationAction, { type: 'apply_tags' }>,
  context: AutomationContext,
  dryRun: boolean
): Promise<ActionRunResult> => {
  const tagIds = Array.isArray(action.tagIds) ? action.tagIds.filter(Boolean) : [];

  if (tagIds.length === 0) {
    return {
      summary: {
        type: 'apply_tags',
        status: 'skipped',
        details: 'Nenhuma tag informada'
      }
    };
  }

  if (dryRun) {
    return {
      summary: {
        type: 'apply_tags',
        status: 'performed',
        details: `Tags (${tagIds.length}) seriam aplicadas ao ticket`
      }
    };
  }

  const result = await appendTagsToTicket(context.ticket.id, tagIds);

  if (!result.changed) {
    return {
      summary: {
        type: 'apply_tags',
        status: 'skipped',
        details: 'Tags já estavam aplicadas ao ticket'
      }
    };
  }

  const updatedTicket = await refreshTicket(context.ticket.id);

  return {
    summary: {
      type: 'apply_tags',
      status: 'performed',
      details: 'Tags aplicadas ao ticket'
    },
    ticket: updatedTicket ?? context.ticket
  };
};

const executeCloseTicketAction = async (
  action: Extract<AutomationAction, { type: 'close_ticket' }>,
  context: AutomationContext,
  dryRun: boolean
): Promise<ActionRunResult> => {
  if (context.ticket.status === TicketStatus.CLOSED) {
    return {
      summary: {
        type: 'close_ticket',
        status: 'skipped',
        details: 'Ticket já está fechado'
      }
    };
  }

  if (dryRun) {
    return {
      summary: {
        type: 'close_ticket',
        status: 'performed',
        details: 'Ticket seria fechado automaticamente'
      }
    };
  }

  await prisma.ticket.update({
    where: { id: context.ticket.id },
    data: {
      status: TicketStatus.CLOSED,
      closedAt: new Date(),
      unreadMessages: 0
    }
  });

  let surveyNote: string | undefined;

  if (action.applySurvey) {
    try {
      await triggerSurveyForTicket(context.ticket.id, { autoSend: true });
      surveyNote = ' Pesquisa de satisfação disparada.';
    } catch (error) {
      surveyNote = ` Erro ao disparar pesquisa: ${
        error instanceof Error ? error.message : 'motivo desconhecido'
      }`;
    }
  }

  const updatedTicket = await refreshTicket(context.ticket.id);

  return {
    summary: {
      type: 'close_ticket',
      status: 'performed',
      details: `Ticket fechado automaticamente.${surveyNote ?? ''}`.trim()
    },
    ticket: updatedTicket ?? context.ticket
  };
};

const buildWebhookPayload = (
  action: Extract<AutomationAction, { type: 'trigger_webhook' }>,
  context: AutomationContext
) => {
  const templateContext = buildTemplateContext(context);

  if (!action.bodyTemplate) {
    return templateContext;
  }

  const rendered = renderTemplate(action.bodyTemplate, templateContext);

  try {
    return JSON.parse(rendered);
  } catch {
    return rendered;
  }
};

const executeWebhookAction = async (
  action: Extract<AutomationAction, { type: 'trigger_webhook' }>,
  context: AutomationContext,
  dryRun: boolean
): Promise<ActionRunResult> => {
  if (!action.url) {
    return {
      summary: {
        type: 'trigger_webhook',
        status: 'skipped',
        details: 'URL do webhook não informada'
      }
    };
  }

  const payload = buildWebhookPayload(action, context);
  const method = (action.method ?? 'POST').toUpperCase() as 'GET' | 'POST' | 'PUT' | 'PATCH';

  if (dryRun) {
    return {
      summary: {
        type: 'trigger_webhook',
        status: 'performed',
        details: `Webhook ${method} seria disparado para ${action.url}`
      }
    };
  }

  try {
    await axios.request({
      url: action.url,
      method,
      timeout: action.timeoutMs ?? 7000,
      headers: action.headers,
      data: method === 'GET' ? undefined : payload,
      params: method === 'GET' && payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : undefined,
      validateStatus: (status) => status >= 200 && status < 400
    });

    return {
      summary: {
        type: 'trigger_webhook',
        status: 'performed',
        details: `Webhook ${method} enviado com sucesso`
      }
    };
  } catch (error) {
    let details = 'Falha ao enviar webhook';

    if (error instanceof AxiosError) {
      if (error.response) {
        details = `Webhook retornou HTTP ${error.response.status}`;
      } else if (error.code === 'ECONNABORTED') {
        details = 'Webhook expirou por timeout';
      } else if (error.message) {
        details = error.message;
      }
    } else if (error instanceof Error) {
      details = error.message;
    }

    return {
      summary: {
        type: 'trigger_webhook',
        status: 'failed',
        details
      }
    };
  }
};

const executeAction = async (
  action: AutomationAction,
  context: AutomationContext,
  dryRun: boolean
): Promise<ActionRunResult> => {
  switch (action.type) {
    case 'assign_agent':
      return executeAssignAgentAction(action, context, dryRun);
    case 'assign_queue':
      return executeAssignQueueAction(action, context, dryRun);
    case 'apply_tags':
      return executeApplyTagsAction(action, context, dryRun);
    case 'close_ticket':
      return executeCloseTicketAction(action, context, dryRun);
    case 'trigger_webhook':
      return executeWebhookAction(action, context, dryRun);
    default:
      return {
        summary: {
          type: 'assign_agent',
          status: 'skipped',
          details: 'Acao nao suportada'
        }
      };
  }
};

const executeActions = async (
  actions: AutomationAction[],
  context: AutomationContext,
  dryRun: boolean
): Promise<ActionExecutionResult> => {
  const summaries: ActionExecutionSummary[] = [];
  let ticketState = context.ticket;
  let ticketChanged = false;

  for (const action of actions) {
    const result = await executeAction(action, { ...context, ticket: ticketState }, dryRun);
    summaries.push(result.summary);

    if (result.summary.status === 'failed') {
      return {
        summaries,
        ticket: ticketState,
        error: result.summary.details ?? 'Falha ao executar ação'
      };
    }

    if (!dryRun && result.ticket) {
      ticketState = result.ticket;
      ticketChanged = true;
    }
  }

  if (!dryRun && ticketChanged) {
    io.emit('ticket:update', ticketState);
  }

  return {
    summaries,
    ticket: ticketState
  };
};

const logRuleExecution = async (
  ruleId: string | null,
  trigger: AutomationTrigger,
  status: AutomationLogStatus,
  summary: RuleExecutionSummary,
  skipLog?: boolean
) => {
  if (skipLog) {
    return;
  }

  const plainSummary = JSON.parse(JSON.stringify(summary));
  const message = summary.actions.length
    ? summary.actions.map((action) => `${action.type}:${action.status}`).join(', ')
    : summary.error ?? 'Regra não executada';

  await prisma.automationLog.create({
    data: {
      ruleId,
      trigger,
      status,
      message,
      context: plainSummary as Prisma.InputJsonValue,
      error: summary.error
    }
  });
};

const loadAutomationContext = async (
  trigger: AutomationTrigger,
  params: RunAutomationsParams
): Promise<AutomationContext | null> => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.ticketId },
    include: ticketInclude
  });

  if (!ticket) {
    return null;
  }

  let message: MessageWithAuthor | null = null;

  if (params.messageId) {
    message = await prisma.message.findUnique({
      where: { id: params.messageId },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });
  }

  return {
    trigger,
    ticket,
    message
  };
};

const mergeContext = (base: AutomationContext, partial?: Partial<AutomationContext>): AutomationContext => {
  if (!partial) {
    return base;
  }

  return {
    trigger: partial.trigger ?? base.trigger,
    ticket: (partial.ticket as TicketWithRelations) ?? base.ticket,
    message: partial.message ?? base.message
  };
};

export const runAutomations = async (
  trigger: AutomationTrigger,
  params: RunAutomationsParams
): Promise<AutomationRunSummary> => {
  const summary: AutomationRunSummary = {
    trigger,
    results: [],
    ticketId: params.ticketId
  };

  let rules: AutomationRuleModel[] = [];

  if (params.specificRuleId) {
    const rule = await prisma.automationRule.findUnique({ where: { id: params.specificRuleId } });

    if (!rule) {
      summary.results.push({
        ruleId: params.specificRuleId,
        matched: false,
        actions: [],
        error: 'Regra não encontrada'
      });
      return summary;
    }

    if (!params.dryRun && !rule.isActive) {
      summary.results.push({
        ruleId: rule.id,
        matched: false,
        actions: [],
        error: 'Regra inativa'
      });
      return summary;
    }

    if (rule.trigger !== trigger) {
      summary.results.push({
        ruleId: rule.id,
        matched: false,
        actions: [],
        error: `Regra configurada para trigger ${rule.trigger}`
      });
      return summary;
    }

    rules = [rule];
  } else {
    rules = await prisma.automationRule.findMany({
      where: { trigger, isActive: true },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }]
    });
  }

  if (rules.length === 0) {
    return summary;
  }

  let context = await loadAutomationContext(trigger, params);

  if (!context) {
    for (const rule of rules) {
      const ruleSummary: RuleExecutionSummary = {
        ruleId: rule.id,
        matched: false,
        actions: [],
        error: 'Ticket não encontrado'
      };
      summary.results.push(ruleSummary);
      await logRuleExecution(rule.id, trigger, AutomationLogStatus.FAILED, ruleSummary, params.skipLog);
    }
    return summary;
  }

  context = mergeContext(context, params.contextOverride);

  for (const rule of rules) {
    const ruleConfig = serializeAutomationRule(rule);
    const ruleSummary: RuleExecutionSummary = {
      ruleId: ruleConfig.id,
      matched: false,
      actions: []
    };
    summary.results.push(ruleSummary);

    if (!matchesAllConditions(ruleConfig.conditions, context)) {
      await logRuleExecution(ruleConfig.id, trigger, AutomationLogStatus.SKIPPED, ruleSummary, params.skipLog);
      continue;
    }

    ruleSummary.matched = true;

    const actionResult = await executeActions(ruleConfig.actions, context, Boolean(params.dryRun));
    ruleSummary.actions = actionResult.summaries;

    if (actionResult.error) {
      ruleSummary.error = actionResult.error;
      await logRuleExecution(ruleConfig.id, trigger, AutomationLogStatus.FAILED, ruleSummary, params.skipLog);
      if (ruleConfig.stopOnMatch) {
        ruleSummary.stopProcessing = true;
        break;
      }
      continue;
    }

    if (!params.dryRun) {
      context = {
        ...context,
        ticket: actionResult.ticket
      };

      await prisma.automationRule.update({
        where: { id: ruleConfig.id },
        data: { lastExecutedAt: new Date() }
      });
    }

    const performed = actionResult.summaries.some((entry) => entry.status === 'performed');

    await logRuleExecution(
      ruleConfig.id,
      trigger,
      performed ? AutomationLogStatus.SUCCESS : AutomationLogStatus.SKIPPED,
      ruleSummary,
      params.skipLog
    );

    if (ruleConfig.stopOnMatch && performed) {
      ruleSummary.stopProcessing = true;
      break;
    }
  }

  return summary;
};

export const testAutomationRule = async (
  ruleId: string,
  params: Omit<RunAutomationsParams, 'specificRuleId'>
): Promise<AutomationRunSummary> => {
  const rule = await prisma.automationRule.findUnique({ where: { id: ruleId } });

  if (!rule) {
    return {
      trigger: AutomationTrigger.MESSAGE_RECEIVED,
      results: [
        {
          ruleId,
          matched: false,
          actions: [],
          error: 'Regra não encontrada'
        }
      ],
      ticketId: params.ticketId
    };
  }

  return runAutomations(rule.trigger, {
    ...params,
    specificRuleId: ruleId,
    dryRun: true,
    skipLog: true
  });
};

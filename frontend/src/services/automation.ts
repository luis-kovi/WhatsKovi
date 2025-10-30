import api from './api';
import type {
  AutomationAction,
  AutomationLogEntry,
  AutomationLogStatus,
  AutomationRule,
  AutomationRulePayload,
  AutomationRunSummary,
  AutomationTrigger
} from '@/types/automation';

const normalizeRule = (rule: Record<string, unknown>): AutomationRule => {
  const triggerValue = typeof rule.trigger === 'string' ? (rule.trigger as AutomationTrigger) : 'MESSAGE_RECEIVED';
  const conditions = Array.isArray(rule.conditions)
    ? (rule.conditions as AutomationRule['conditions'])
    : [];
  const actions = Array.isArray(rule.actions) ? (rule.actions as AutomationAction[]) : [];
  const metadata =
    rule.metadata && typeof rule.metadata === 'object'
      ? (rule.metadata as Record<string, unknown>)
      : null;

  return {
    id: String(rule.id),
    name: typeof rule.name === 'string' && rule.name.length > 0 ? rule.name : '',
    description: typeof rule.description === 'string' ? rule.description : null,
    trigger: triggerValue,
    isActive: Boolean(rule.isActive),
    priority: typeof rule.priority === 'number' && Number.isFinite(rule.priority) ? rule.priority : 0,
    stopOnMatch: Boolean(rule.stopOnMatch),
    conditions,
    actions,
    metadata
  };
};

export const listAutomationRules = async (): Promise<AutomationRule[]> => {
  const response = await api.get('/automations');
  if (!Array.isArray(response.data)) {
    return [];
  }
  return response.data.map((item) => normalizeRule(item as Record<string, unknown>));
};

export const createAutomationRule = async (
  payload: AutomationRulePayload
): Promise<AutomationRule> => {
  const response = await api.post('/automations', payload);
  return normalizeRule(response.data);
};

export const updateAutomationRule = async (
  id: string,
  payload: Partial<AutomationRulePayload>
): Promise<AutomationRule> => {
  const response = await api.put(`/automations/${id}`, payload);
  return normalizeRule(response.data);
};

export const deleteAutomationRule = async (id: string): Promise<void> => {
  await api.delete(`/automations/${id}`);
};

export const toggleAutomationRule = async (id: string, isActive: boolean): Promise<AutomationRule> => {
  const response = await api.post(`/automations/${id}/toggle`, { isActive });
  return normalizeRule(response.data);
};

export const testAutomationRule = async (
  id: string,
  payload: { ticketId: string; messageId?: string }
): Promise<AutomationRunSummary> => {
  const response = await api.post(`/automations/${id}/test`, payload);
  return response.data as AutomationRunSummary;
};

export const listAutomationLogs = async (params?: {
  ruleId?: string;
  status?: AutomationLogStatus;
  trigger?: AutomationTrigger;
  limit?: number;
}): Promise<AutomationLogEntry[]> => {
  const response = await api.get('/automation-logs', {
    params: {
      ruleId: params?.ruleId,
      status: params?.status,
      trigger: params?.trigger,
      limit: params?.limit
    }
  });

  if (!Array.isArray(response.data)) {
    return [];
  }

  return response.data.map((log) => {
    const entry = log as Record<string, unknown>;
    return {
      id: String(entry.id),
      trigger: (typeof entry.trigger === 'string' ? entry.trigger : 'MESSAGE_RECEIVED') as AutomationTrigger,
      status: (typeof entry.status === 'string' ? entry.status : 'SKIPPED') as AutomationLogStatus,
      ruleId: entry.ruleId ? String(entry.ruleId) : null,
      ruleName: typeof entry.ruleName === 'string' ? entry.ruleName : null,
      message: typeof entry.message === 'string' ? entry.message : null,
      error: typeof entry.error === 'string' ? entry.error : null,
      context: entry.context ?? null,
      createdAt: String(entry.createdAt ?? '')
    };
  });
};

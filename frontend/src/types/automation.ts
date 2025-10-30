'use client';

export type AutomationTrigger = 'TICKET_CREATED' | 'MESSAGE_RECEIVED' | 'TICKET_STATUS_CHANGED';
export type AutomationLogStatus = 'SUCCESS' | 'SKIPPED' | 'FAILED';
export type AutomationComparisonOperator = '>' | '>=' | '=' | '<' | '<=';

export type AutomationCondition =
  | {
      type: 'ticket_status';
      statuses: string[];
    }
  | {
      type: 'queue';
      queueIds: string[];
    }
  | {
      type: 'ticket_priority';
      priorities: string[];
    }
  | {
      type: 'ticket_unassigned';
      value: boolean;
    }
  | {
      type: 'ticket_has_tags';
      tagIds: string[];
      mode?: 'all' | 'any' | 'none';
    }
  | {
      type: 'message_body_contains';
      keywords: string[];
    }
  | {
      type: 'ticket_idle_minutes';
      operator: AutomationComparisonOperator;
      minutes: number;
    }
  | {
      type: 'ticket_unread_messages';
      operator: AutomationComparisonOperator;
      value: number;
    }
  | {
      type: 'business_hours';
      timezone?: string;
      daysOfWeek: number[];
      startTime: string;
      endTime: string;
    };

export type AutomationAction =
  | {
      type: 'assign_agent';
      strategy?: 'LEAST_TICKETS';
      agentIds?: string[];
      maxTicketsPerAgent?: number;
      includeQueueAgents?: boolean;
    }
  | {
      type: 'assign_queue';
      queueId: string;
    }
  | {
      type: 'apply_tags';
      tagIds: string[];
    }
  | {
      type: 'close_ticket';
      reason?: string;
      applySurvey?: boolean;
    }
  | {
      type: 'trigger_webhook';
      url: string;
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
      headers?: Record<string, string>;
      bodyTemplate?: string;
      timeoutMs?: number;
    };

export interface AutomationRule {
  id: string;
  name: string;
  description?: string | null;
  trigger: AutomationTrigger;
  isActive: boolean;
  priority: number;
  stopOnMatch: boolean;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  metadata?: Record<string, unknown> | null;
}

export type AutomationRulePayload = Omit<AutomationRule, 'id'>;

export interface AutomationActionSummary {
  type: AutomationAction['type'];
  status: 'performed' | 'skipped' | 'failed';
  details?: string;
}

export interface AutomationRuleResult {
  ruleId: string;
  matched: boolean;
  actions: AutomationActionSummary[];
  error?: string;
  stopProcessing?: boolean;
}

export interface AutomationRunSummary {
  trigger: AutomationTrigger;
  results: AutomationRuleResult[];
  ticketId?: string;
}

export interface AutomationLogEntry {
  id: string;
  trigger: AutomationTrigger;
  status: AutomationLogStatus;
  ruleId?: string | null;
  ruleName?: string | null;
  message?: string | null;
  error?: string | null;
  context?: unknown;
  createdAt: string;
}

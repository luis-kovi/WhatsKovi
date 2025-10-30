import { AutomationTrigger, AutomationLogStatus, TicketStatus, Priority } from '@prisma/client';

export type AutomationComparisonOperator = '>' | '>=' | '=' | '<' | '<=';

export type AutomationCondition =
  | {
      type: 'ticket_status';
      statuses: TicketStatus[];
    }
  | {
    type: 'queue';
    queueIds: string[];
  }
  | {
      type: 'ticket_priority';
      priorities: Priority[];
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
      daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
      startTime: string; // HH:mm
      endTime: string; // HH:mm
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

export interface AutomationRuleConfig {
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

export interface AutomationLogEntry {
  id: string;
  ruleId?: string | null;
  trigger: AutomationTrigger;
  status: AutomationLogStatus;
  message?: string | null;
  context?: unknown;
  error?: string | null;
  createdAt: Date;
}


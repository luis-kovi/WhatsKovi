import { create } from 'zustand';
import api from '@/services/api';
import {
  listAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  toggleAutomationRule,
  testAutomationRule,
  listAutomationLogs
} from '@/services/automation';
import type {
  AutomationRule,
  AutomationRulePayload,
  AutomationRunSummary,
  AutomationLogEntry,
  AutomationLogStatus,
  AutomationTrigger
} from '@/types/automation';

export interface AutomationAgent {
  id: string;
  name: string;
  role: string;
  status?: string;
}

interface AutomationStoreState {
  rules: AutomationRule[];
  logs: AutomationLogEntry[];
  agents: AutomationAgent[];
  loading: boolean;
  saving: boolean;
  logsLoading: boolean;
  fetchRules: () => Promise<void>;
  fetchAgents: () => Promise<void>;
  fetchLogs: (params?: {
    ruleId?: string;
    status?: AutomationLogStatus;
    trigger?: AutomationTrigger;
    limit?: number;
  }) => Promise<void>;
  createRule: (payload: AutomationRulePayload) => Promise<AutomationRule>;
  updateRule: (id: string, payload: Partial<AutomationRulePayload>) => Promise<AutomationRule>;
  removeRule: (id: string) => Promise<void>;
  toggleRule: (id: string, active: boolean) => Promise<AutomationRule>;
  testRule: (
    id: string,
    payload: { ticketId: string; messageId?: string }
  ) => Promise<AutomationRunSummary>;
}

export const useAutomationStore = create<AutomationStoreState>((set, get) => ({
  rules: [],
  logs: [],
  agents: [],
  loading: false,
  saving: false,
  logsLoading: false,

  fetchRules: async () => {
    set({ loading: true });
    try {
      const rules = await listAutomationRules();
      set({ rules });
    } finally {
      set({ loading: false });
    }
  },

  fetchAgents: async () => {
    const { agents } = get();
    if (agents.length > 0) {
      return;
    }

    try {
      const response = await api.get('/users');
      if (!Array.isArray(response.data)) {
        set({ agents: [] });
        return;
      }
      const rawList = Array.isArray(response.data) ? response.data : [];
      const mappedAgents = rawList
        .filter((user): user is { id: string; name?: string; role?: string; status?: string } => {
          return (
            typeof user === 'object' &&
            user !== null &&
            'id' in user &&
            'name' in user &&
            'role' in user
          );
        })
        .filter((user) => user.role === 'AGENT')
        .map((user) => ({
          id: String(user.id),
          name: typeof user.name === 'string' && user.name.length > 0 ? user.name : 'Agente',
          role: 'AGENT',
          status: typeof user.status === 'string' ? user.status : undefined
        }));
      set({ agents: mappedAgents });
    } catch (error) {
      console.error('Erro ao carregar agentes para automacao:', error);
      throw error;
    }
  },

  fetchLogs: async (params) => {
    set({ logsLoading: true });
    try {
      const logs = await listAutomationLogs(params);
      set({ logs });
    } finally {
      set({ logsLoading: false });
    }
  },

  createRule: async (payload) => {
    set({ saving: true });
    try {
      const rule = await createAutomationRule(payload);
      set((state) => ({ rules: [rule, ...state.rules] }));
      return rule;
    } finally {
      set({ saving: false });
    }
  },

  updateRule: async (id, payload) => {
    set({ saving: true });
    try {
      const rule = await updateAutomationRule(id, payload);
      set((state) => ({
        rules: state.rules.map((item) => (item.id === id ? rule : item))
      }));
      return rule;
    } finally {
      set({ saving: false });
    }
  },

  removeRule: async (id) => {
    set({ saving: true });
    try {
      await deleteAutomationRule(id);
      set((state) => ({
        rules: state.rules.filter((rule) => rule.id !== id)
      }));
    } finally {
      set({ saving: false });
    }
  },

  toggleRule: async (id, active) => {
    set({ saving: true });
    try {
      const rule = await toggleAutomationRule(id, active);
      set((state) => ({
        rules: state.rules.map((item) => (item.id === id ? rule : item))
      }));
      return rule;
    } finally {
      set({ saving: false });
    }
  },

  testRule: async (id, payload) => {
    return testAutomationRule(id, payload);
  }
}));

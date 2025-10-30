export type ChatbotTriggerType = 'KEYWORD' | 'DEFAULT' | 'MANUAL';

export type ChatbotNodeType = 'message' | 'question' | 'input' | 'transfer' | 'end';

export interface ChatbotQuestionOption {
  id?: string;
  value: string;
  label?: string;
  keywords?: string[];
  next?: string | null;
  storeValue?: string;
}

export interface ChatbotInputValidation {
  type?: 'text' | 'number' | 'email' | 'phone';
  regex?: string;
  minLength?: number;
  maxLength?: number;
  message?: string;
}

export interface ChatbotNodeBase {
  id: string;
  label?: string;
  next?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ChatbotMessageNode extends ChatbotNodeBase {
  type: 'message';
  content: string;
  quickReplies?: string[];
}

export interface ChatbotQuestionNode extends ChatbotNodeBase {
  type: 'question';
  content: string;
  options: ChatbotQuestionOption[];
  retryMessage?: string;
  storeField?: string;
  allowFreeText?: boolean;
  defaultNext?: string | null;
}

export interface ChatbotInputNode extends ChatbotNodeBase {
  type: 'input';
  content: string;
  field: string;
  validation?: ChatbotInputValidation;
  storeField?: string;
  nextOnFail?: string | null;
}

export interface ChatbotTransferNode extends ChatbotNodeBase {
  type: 'transfer';
  message?: string;
  queueId?: string | null;
  mode?: 'queue' | 'agent';
  agentId?: string | null;
}

export interface ChatbotEndNode extends ChatbotNodeBase {
  type: 'end';
  content?: string;
}

export type ChatbotNode =
  | ChatbotMessageNode
  | ChatbotQuestionNode
  | ChatbotInputNode
  | ChatbotTransferNode
  | ChatbotEndNode;

export interface ChatbotFlowDefinition {
  entryNodeId: string;
  nodes: ChatbotNode[];
  metadata?: Record<string, unknown>;
  version?: string;
}

export interface ChatbotOperatingWindow {
  days: number[];
  start: string;
  end: string;
}

export interface ChatbotSchedule {
  enabled?: boolean;
  timezone: string;
  windows: ChatbotOperatingWindow[];
  fallbackMessage?: string;
}

export interface ChatbotFlowSummary {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  isPrimary: boolean;
  triggerType: ChatbotTriggerType;
  keywords: string[];
  entryNodeId: string;
  transferQueueId?: string | null;
  offlineMessage?: string | null;
  queue?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    transferCount: number;
  };
}

export interface ChatbotFlow extends ChatbotFlowSummary {
  definition: ChatbotFlowDefinition;
  schedule?: ChatbotSchedule | null;
}

export interface ChatbotFlowStats {
  id: string;
  name: string;
  totalSessions: number;
  completedSessions: number;
  transferCount: number;
  averageDurationSeconds: number;
  completionRate: number;
  timeline: Array<{
    date: string;
    started: number;
    completed: number;
  }>;
}

export interface ChatbotTestResult {
  transcript: Array<{ from: 'BOT' | 'CONTACT'; message: string }>;
  state: {
    history: Array<{ nodeId: string; input?: string; occurredAt: string }>;
    collectedData: Record<string, string>;
    waitingFor?: { nodeId: string; type: 'question' | 'input' };
    completed?: boolean;
  };
  completed: boolean;
}

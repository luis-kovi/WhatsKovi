export type ChatbotNodeType = 'message' | 'question' | 'input' | 'transfer' | 'end';

export interface ChatbotBaseNode {
  id: string;
  type: ChatbotNodeType;
  label?: string;
  next?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ChatbotMessageNode extends ChatbotBaseNode {
  type: 'message';
  content: string;
  quickReplies?: string[];
}

export interface ChatbotQuestionOption {
  id?: string;
  value: string;
  label?: string;
  keywords?: string[];
  next?: string | null;
  storeValue?: string;
}

export interface ChatbotQuestionNode extends ChatbotBaseNode {
  type: 'question';
  content: string;
  options: ChatbotQuestionOption[];
  retryMessage?: string;
  storeField?: string;
  allowFreeText?: boolean;
  defaultNext?: string | null;
}

export interface ChatbotInputValidation {
  type?: 'text' | 'number' | 'email' | 'phone';
  regex?: string;
  minLength?: number;
  maxLength?: number;
  message?: string;
}

export interface ChatbotInputNode extends ChatbotBaseNode {
  type: 'input';
  content: string;
  field: string;
  validation?: ChatbotInputValidation;
  storeField?: string;
  nextOnFail?: string | null;
}

export interface ChatbotTransferNode extends ChatbotBaseNode {
  type: 'transfer';
  message?: string;
  queueId?: string | null;
  mode?: 'queue' | 'agent';
  agentId?: string | null;
}

export interface ChatbotEndNode extends ChatbotBaseNode {
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

export interface ChatbotSessionHistoryItem {
  nodeId: string;
  input?: string;
  occurredAt: string;
}

export interface ChatbotSessionState {
  history: ChatbotSessionHistoryItem[];
  collectedData: Record<string, string>;
  waitingFor?: {
    nodeId: string;
    type: 'question' | 'input';
  };
  completed?: boolean;
}

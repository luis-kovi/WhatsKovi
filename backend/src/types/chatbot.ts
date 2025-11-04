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

export type ChatbotAiProvider = 'OPENAI' | 'GEMINI' | 'HYBRID';

export interface ChatbotAiModel {
  name: string;
  provider: ChatbotAiProvider;
  description?: string;
  maxTokens?: number;
}

export interface ChatbotAiConfig {
  provider: ChatbotAiProvider;
  temperature: number;
  topP?: number;
  defaultModel: string;
  availableModels: ChatbotAiModel[];
  fallbackQueueId?: string | null;
  fallbackChannel?: string | null;
  lastTrainedAt?: string | null;
  enabled: boolean;
  confidenceThreshold?: number | null;
}

export type ChatbotAiMessageRole = 'CONTACT' | 'BOT' | 'SYSTEM';

export interface ChatbotAiMessage {
  role: ChatbotAiMessageRole;
  content: string;
  timestamp?: string;
}

export interface ChatbotAiRoutingRequest {
  transcript: ChatbotAiMessage[];
  channel?: string;
  metadata?: Record<string, unknown>;
  desiredOutcome?: 'ROUTE' | 'TRIAGE' | 'SUGGESTION';
}

export interface ChatbotAiRoutingResult {
  queue?: { id: string; name: string } | null;
  channel?: string | null;
  confidence: number;
  reasons: string[];
  tags: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  summary?: string;
  model: string;
  createdAt: string;
  followUp?: string | null;
  escalationRecommended?: boolean;
}

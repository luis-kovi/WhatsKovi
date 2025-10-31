import { SentimentLabel } from '@prisma/client';

export type SentimentAnalysis = {
  label: SentimentLabel;
  score: number;
  keywords: string[];
  summary?: string;
  metadata?: Record<string, unknown>;
};

export type ResponseSuggestion = {
  text: string;
  confidence: number;
  tone: 'friendly' | 'formal' | 'objective';
  reason?: string;
  source?: string;
};

export type ClassificationResult = {
  category: string;
  confidence: number;
  rationale?: string;
  keywords: string[];
};

export type DemandForecastSlice = {
  date: string;
  expected: number;
  lowerBound?: number;
  upperBound?: number;
};

export type DemandForecastPayload = {
  horizonDays: number;
  totalExpected: number;
  generatedAt: string;
  slices: DemandForecastSlice[];
  baseline?: number;
};

export type AiChatbotReply = {
  message: string;
  confidence: number;
  tone: 'friendly' | 'formal' | 'objective';
  shouldReply: boolean;
  reason?: string;
};

export type AnalyzeMessageResult = {
  sentiment?: SentimentAnalysis | null;
  suggestions?: ResponseSuggestion[];
  classification?: ClassificationResult | null;
  autoReply?: AiChatbotReply | null;
};

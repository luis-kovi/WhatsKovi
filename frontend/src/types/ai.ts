export type SentimentLabel = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export type AiSuggestion = {
  text: string;
  confidence?: number;
  tone?: 'friendly' | 'formal' | 'objective';
  reason?: string | null;
  source?: string | null;
};

export type AiChatbotReply = {
  message: string;
  confidence: number;
  tone: 'friendly' | 'formal' | 'objective';
  shouldReply: boolean;
  reason?: string | null;
};

export type AiClassification = {
  category: string;
  confidence: number;
  rationale?: string | null;
  keywords: string[];
} | null;

export type AiSentimentOverview = {
  totals: Partial<Record<SentimentLabel, number>>;
  last: {
    sentiment: SentimentLabel;
    sentimentScore: number | null;
    summary?: string | null;
    createdAt: string;
  } | null;
};

export type TicketAiInsights = {
  ticketId: string;
  classification: AiClassification;
  sentiment: AiSentimentOverview;
  suggestions: Array<{
    id: string;
    messageId: string;
    suggestion: string;
    confidence: number | null;
    source: string | null;
    createdAt: string;
  }>;
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

export type HighlightMetric = {
  label: string;
  value: string;
  description: string;
  trend?: {
    value: number;
    label: string;
  };
};

export type ServiceMetric = {
  label: string;
  value: string;
  hint: string;
};

export type ReportTimelinePoint = {
  label: string;
  tickets: number;
  sla: number;
};

export type ReportAgentPerformance = {
  id: string;
  name: string;
  tickets: number;
  avgHandle: string;
  satisfaction: number;
};

export type ReportQueuePerformance = {
  id: string;
  name: string;
  volume: number;
  wait: string;
  resolution: number;
};

export type TagDistribution = {
  id: string;
  name: string;
  value: number;
  color: string;
};

export type HeatmapRow = {
  label: string;
  values: number[];
};

export type ResponseMetric = {
  id: string;
  label: string;
  value: string;
  target: string;
  status: 'on-track' | 'warning' | 'critical';
};

export type ProductivityMetric = {
  id: string;
  indicator: string;
  period: string;
  value: string;
  trend: number;
};

export type ConversationRecord = {
  id: string;
  contact: string;
  queue: string;
  agent: string;
  duration: string;
  satisfaction: string;
  status: string;
};

export type SatisfactionHighlight = {
  id: string;
  customer: string;
  comment: string;
  sentiment: 'positive' | 'neutral' | 'negative';
};

export type SatisfactionInsight = {
  rating: number;
  responses: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps: number;
  highlights: SatisfactionHighlight[];
};

export type ReportHighlights = {
  metrics: HighlightMetric[];
  serviceLevels: ServiceMetric[];
};

export type ReportVisuals = {
  timeline: ReportTimelinePoint[];
  queues: ReportQueuePerformance[];
  agents: ReportAgentPerformance[];
  tags: TagDistribution[];
  heatmap: HeatmapRow[];
};

export type ReportDetails = {
  responseMetrics: ResponseMetric[];
  productivity: ProductivityMetric[];
  conversations: ConversationRecord[];
  satisfaction: SatisfactionInsight;
};

export type AdvancedReportResponse = {
  generatedAt: string;
  filters: {
    startDate: string;
    endDate: string;
    aggregation: 'day' | 'week' | 'month';
    queueId?: string;
    userId?: string;
    tagId?: string;
    status?: string;
  };
  totals: {
    created: number;
    closed: number;
    open: number;
    pending: number;
    resolutionRate: number;
    averageHandleSeconds: number | null;
    averageFirstResponseSeconds: number | null;
    satisfactionScore: number | null;
  };
  highlights: ReportHighlights;
  visuals: ReportVisuals;
  details: ReportDetails;
};

export type ReportFiltersRequest = {
  startDate: string;
  endDate: string;
  aggregation: 'day' | 'week' | 'month';
  queueId?: string;
  userId?: string;
  tagId?: string;
  status?: string;
};

export type ReportSnapshot = {
  id: string;
  scheduleId: string | null;
  userId: string;
  format: 'CSV' | 'XLSX' | 'PDF';
  filePath: string;
  fileName: string;
  fileSize: number | null;
  filters: Record<string, unknown>;
  summary: Record<string, unknown>;
  generatedAt: string;
  expiresAt: string | null;
  schedule?: {
    id: string;
    name: string;
  } | null;
};

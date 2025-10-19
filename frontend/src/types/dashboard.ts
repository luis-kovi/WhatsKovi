export type MetricsInterval = 'day' | 'week' | 'month';

export type DashboardMetricsFilters = {
  startDate: string;
  endDate: string;
  interval: MetricsInterval;
  queueId?: string;
  userId?: string;
};

export type TimelineMetric = {
  periodStart: string;
  label: string;
  created: number;
  closed: number;
  messages: number;
};

export type AgentMetric = {
  id: string;
  name: string;
  tickets: number;
  closed: number;
  resolutionRate: number;
  averageHandleTimeSeconds: number | null;
  messages: number;
};

export type QueueMetric = {
  id: string | null;
  name: string;
  color: string | null;
  tickets: number;
  closed: number;
  resolutionRate: number;
  averageHandleTimeSeconds: number | null;
};

export type DashboardMetricsResponse = {
  period: {
    start: string;
    end: string;
    interval: MetricsInterval;
    totals: {
      created: number;
      closed: number;
      open: number;
      pending: number;
      messages: number;
    };
    averages: {
      handleTimeSeconds: number | null;
    };
    resolutionRate: number;
    comparison: {
      createdDelta: number;
      closedDelta: number;
      resolutionRateDelta: number;
      averageHandleTimeDeltaSeconds: number | null;
    };
  };
  timeline: TimelineMetric[];
  agents: AgentMetric[];
  queues: QueueMetric[];
};

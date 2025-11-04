import { Prisma, TicketStatus } from '@prisma/client';
import prisma from '../config/database';

export type MetricsInterval = 'day' | 'week' | 'month';

export type DashboardMetricsFilters = {
  start: Date;
  end: Date;
  interval: MetricsInterval;
  queueId?: string;
  userId?: string;
};

type TimelineBucket = {
  periodStart: string;
  label: string;
  created: number;
  closed: number;
  messages: number;
};

type AgentMetric = {
  id: string;
  name: string;
  tickets: number;
  closed: number;
  resolutionRate: number;
  averageHandleTimeSeconds: number | null;
  messages: number;
};

type QueueMetric = {
  id: string | null;
  name: string;
  color: string | null;
  tickets: number;
  closed: number;
  resolutionRate: number;
  averageHandleTimeSeconds: number | null;
};

type PeriodSummary = {
  start: string;
  end: string;
  interval: MetricsInterval;
  totals: {
    created: number;
    closed: number;
    open: number;
    pending: number;
    bot: number;
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

export type DashboardMetrics = {
  period: PeriodSummary;
  timeline: TimelineBucket[];
  agents: AgentMetric[];
  queues: QueueMetric[];
};

type TicketWithRelations = {
  id: string;
  status: TicketStatus;
  createdAt: Date;
  closedAt: Date | null;
  queueId: string | null;
  queue: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  userId: string | null;
  user: {
    id: string;
    name: string;
  } | null;
};

type MessageSlice = {
  createdAt: Date;
  userId: string | null;
};

type RangeDataset = {
  tickets: TicketWithRelations[];
  messages: MessageSlice[];
};

const INTERVALS: MetricsInterval[] = ['day', 'week', 'month'];

const startOfDay = (value: Date) => {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (value: Date) => {
  const result = new Date(value);
  result.setHours(23, 59, 59, 999);
  return result;
};

const startOfWeek = (value: Date) => {
  const result = startOfDay(value);
  const day = result.getDay();
  const diff = (day + 6) % 7; // shift to Monday as week start
  result.setDate(result.getDate() - diff);
  return result;
};

const startOfMonth = (value: Date) => {
  const result = startOfDay(value);
  result.setDate(1);
  return result;
};

const addInterval = (value: Date, interval: MetricsInterval) => {
  const result = new Date(value);
  switch (interval) {
    case 'day':
      result.setDate(result.getDate() + 1);
      break;
    case 'week':
      result.setDate(result.getDate() + 7);
      break;
    case 'month':
      result.setMonth(result.getMonth() + 1);
      break;
  }
  return result;
};

const getBucketStart = (value: Date, interval: MetricsInterval) => {
  switch (interval) {
    case 'day':
      return startOfDay(value);
    case 'week':
      return startOfWeek(value);
    case 'month':
      return startOfMonth(value);
  }
};

const formatBucketLabel = (value: Date, interval: MetricsInterval) => {
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const day = value.getDate().toString().padStart(2, '0');
  const month = (value.getMonth() + 1).toString().padStart(2, '0');

  if (interval === 'day') {
    return `${day}/${month}`;
  }

  if (interval === 'week') {
    const weekNumber = Math.ceil(((value.getTime() - new Date(value.getFullYear(), 0, 1).getTime()) / 86400000 + value.getDay() + 1) / 7);
    return `Sem ${weekNumber.toString().padStart(2, '0')}`;
  }

  return `${monthNames[value.getMonth()]} ${value.getFullYear()}`;
};

const safeDivide = (numerator: number, denominator: number) => {
  if (denominator === 0) return 0;
  return numerator / denominator;
};

const secondsBetween = (start: Date, end: Date) => Math.max(Math.floor((end.getTime() - start.getTime()) / 1000), 0);

const createBucketSequence = (start: Date, end: Date, interval: MetricsInterval) => {
  const buckets: Date[] = [];
  let cursor = getBucketStart(start, interval);
  const limit = endOfDay(end);

  if (!cursor) {
    return buckets;
  }

  while (cursor <= limit) {
    buckets.push(new Date(cursor));
    cursor = addInterval(cursor, interval);
  }

  return buckets;
};

const buildBaseTicketFilter = (queueId?: string, userId?: string): Prisma.TicketWhereInput => {
  const filter: Prisma.TicketWhereInput = {};

  if (queueId) {
    filter.queueId = queueId;
  }

  if (userId) {
    filter.userId = userId;
  }

  return filter;
};

const buildMessageFilter = (start: Date, end: Date, queueId?: string, userId?: string): Prisma.MessageWhereInput => {
  const filter: Prisma.MessageWhereInput = {
    createdAt: {
      gte: start,
      lte: end
    }
  };

  if (queueId || userId) {
    const ticketFilter: Prisma.TicketWhereInput = {};

    if (queueId) {
      ticketFilter.queueId = queueId;
    }
    if (userId) {
      ticketFilter.userId = userId;
    }

    filter.ticket = ticketFilter;
  }

  return filter;
};

const fetchRangeDataset = async (
  start: Date,
  end: Date,
  queueId?: string,
  userId?: string
): Promise<RangeDataset> => {
  const ticketFilter = buildBaseTicketFilter(queueId, userId);
  const tickets = await prisma.ticket.findMany({
    where: {
      ...ticketFilter,
      OR: [
        {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        {
          closedAt: {
            not: null,
            gte: start,
            lte: end
          }
        }
      ]
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      closedAt: true,
      queueId: true,
      queue: {
        select: {
          id: true,
          name: true,
          color: true
        }
      },
      userId: true,
      user: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  const messages = await prisma.message.findMany({
    where: buildMessageFilter(start, end, queueId, userId),
    select: {
      createdAt: true,
      userId: true
    }
  });

  return {
    tickets,
    messages
  };
};

const ensureAgentName = async (stats: Map<string, AgentAccumulator>) => {
  const missingNames = Array.from(stats.entries())
    .filter(([, value]) => !value.name)
    .map(([key]) => key);

  if (missingNames.length === 0) {
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: missingNames
      }
    },
    select: {
      id: true,
      name: true
    }
  });

  users.forEach((user) => {
    const accumulator = stats.get(user.id);
    if (accumulator) {
      accumulator.name = user.name;
    }
  });
};

type AgentAccumulator = {
  id: string;
  name: string;
  tickets: Set<string>;
  closedTickets: number;
  handleTimeTotal: number;
  handleTimeCount: number;
  messages: number;
};

type QueueAccumulator = {
  id: string | null;
  name: string;
  color: string | null;
  tickets: Set<string>;
  closedTickets: number;
  handleTimeTotal: number;
  handleTimeCount: number;
};

export const computeDashboardMetrics = async ({
  start,
  end,
  interval,
  queueId,
  userId
}: DashboardMetricsFilters): Promise<DashboardMetrics> => {
  if (!INTERVALS.includes(interval)) {
    throw new Error('Intervalo de métricas inválido');
  }

  const normalizedStart = startOfDay(start);
  const normalizedEnd = endOfDay(end);

  const rangeDurationMs = Math.max(normalizedEnd.getTime() - normalizedStart.getTime(), 0);
  const previousEnd = endOfDay(new Date(normalizedStart.getTime() - 1));
  const previousStart = startOfDay(new Date(previousEnd.getTime() - rangeDurationMs));

  if (normalizedStart > normalizedEnd) {
    throw new Error('Período inválido: data inicial maior que final');
  }

  const [currentRange, previousRange, openCount, pendingCount, botCount] = await Promise.all([
    fetchRangeDataset(normalizedStart, normalizedEnd, queueId, userId),
    fetchRangeDataset(previousStart, previousEnd, queueId, userId),
    prisma.ticket.count({
      where: {
        ...buildBaseTicketFilter(queueId, userId),
        status: TicketStatus.OPEN
      }
    }),
    prisma.ticket.count({
      where: {
        ...buildBaseTicketFilter(queueId, userId),
        status: TicketStatus.PENDING
      }
    }),
    prisma.ticket.count({
      where: {
        ...buildBaseTicketFilter(queueId, userId),
        status: TicketStatus.BOT
      }
    })
  ]);

  const bucketDates = createBucketSequence(normalizedStart, normalizedEnd, interval);
  const bucketMap = new Map<string, TimelineBucket>();

  bucketDates.forEach((date) => {
    const key = date.toISOString();
    bucketMap.set(key, {
      periodStart: key,
      label: formatBucketLabel(date, interval),
      created: 0,
      closed: 0,
      messages: 0
    });
  });

  const agentStats = new Map<string, AgentAccumulator>();
  const queueStats = new Map<string | null, QueueAccumulator>();

  const getAgentAccumulator = (id: string, name?: string | null) => {
    if (!agentStats.has(id)) {
      agentStats.set(id, {
        id,
        name: name ?? '',
        tickets: new Set(),
        closedTickets: 0,
        handleTimeTotal: 0,
        handleTimeCount: 0,
        messages: 0
      });
    }
    const accumulator = agentStats.get(id)!;
    if (!accumulator.name && name) {
      accumulator.name = name;
    }
    return accumulator;
  };

  const getQueueAccumulator = (id: string | null, name?: string | null, color?: string | null) => {
    if (!queueStats.has(id ?? null)) {
      queueStats.set(id ?? null, {
        id: id ?? null,
        name: name ?? 'Sem fila',
        color: color ?? null,
        tickets: new Set(),
        closedTickets: 0,
        handleTimeTotal: 0,
        handleTimeCount: 0
      });
    }
    const accumulator = queueStats.get(id ?? null)!;
    if (!accumulator.name && name) {
      accumulator.name = name;
    }
    if (!accumulator.color && color) {
      accumulator.color = color;
    }
    return accumulator;
  };

  let createdCount = 0;
  let closedCount = 0;
  let handleTimeTotal = 0;
  let handleTimeCount = 0;

  currentRange.tickets.forEach((ticket) => {
    const createdInRange = ticket.createdAt >= normalizedStart && ticket.createdAt <= normalizedEnd;
    const closedInRange =
      ticket.closedAt !== null && ticket.closedAt >= normalizedStart && ticket.closedAt <= normalizedEnd;

    if (createdInRange) {
      createdCount += 1;
      const bucketKey = getBucketStart(ticket.createdAt, interval).toISOString();
      const bucket = bucketMap.get(bucketKey);
      if (bucket) {
        bucket.created += 1;
      }
    }

    if (closedInRange) {
      closedCount += 1;
      const bucketKey = getBucketStart(ticket.closedAt!, interval).toISOString();
      const bucket = bucketMap.get(bucketKey);
      if (bucket) {
        bucket.closed += 1;
      }
    }

    if (closedInRange && ticket.closedAt) {
      handleTimeTotal += secondsBetween(ticket.createdAt, ticket.closedAt);
      handleTimeCount += 1;
    }

    if (ticket.userId) {
      const accumulator = getAgentAccumulator(ticket.userId, ticket.user?.name);
      accumulator.tickets.add(ticket.id);

      if (closedInRange) {
        accumulator.closedTickets += 1;
        if (ticket.closedAt) {
          accumulator.handleTimeTotal += secondsBetween(ticket.createdAt, ticket.closedAt);
          accumulator.handleTimeCount += 1;
        }
      }
    }

    const queueAccumulator = getQueueAccumulator(ticket.queueId, ticket.queue?.name, ticket.queue?.color);
    queueAccumulator.tickets.add(ticket.id);

    if (closedInRange && ticket.closedAt) {
      queueAccumulator.closedTickets += 1;
      queueAccumulator.handleTimeTotal += secondsBetween(ticket.createdAt, ticket.closedAt);
      queueAccumulator.handleTimeCount += 1;
    }
  });

  currentRange.messages.forEach((message) => {
    const bucketKey = getBucketStart(message.createdAt, interval).toISOString();
    const bucket = bucketMap.get(bucketKey);
    if (bucket) {
      bucket.messages += 1;
    }

    if (message.userId) {
      const accumulator = getAgentAccumulator(message.userId);
      accumulator.messages += 1;
    }
  });

  await ensureAgentName(agentStats);

  const averageHandleSeconds = handleTimeCount > 0 ? Math.round(handleTimeTotal / handleTimeCount) : null;

  let previousCreated = 0;
  let previousClosed = 0;
  let previousHandleTotal = 0;
  let previousHandleCount = 0;

  previousRange.tickets.forEach((ticket) => {
    const created =
      ticket.createdAt >= previousStart && ticket.createdAt <= previousEnd;
    const closed =
      ticket.closedAt !== null && ticket.closedAt >= previousStart && ticket.closedAt <= previousEnd;

    if (created) {
      previousCreated += 1;
    }

    if (closed && ticket.closedAt) {
      previousClosed += 1;
      previousHandleTotal += secondsBetween(ticket.createdAt, ticket.closedAt);
      previousHandleCount += 1;
    }
  });

  const previousHandleAverage =
    previousHandleCount > 0 ? Math.round(previousHandleTotal / previousHandleCount) : null;

  const resolutionRate = safeDivide(closedCount, createdCount || closedCount);
  const previousResolutionRate = safeDivide(previousClosed, previousCreated || previousClosed);

  const period: PeriodSummary = {
    start: normalizedStart.toISOString(),
    end: normalizedEnd.toISOString(),
    interval,
    totals: {
      created: createdCount,
      closed: closedCount,
      open: openCount,
      pending: pendingCount,
      bot: botCount,
      messages: currentRange.messages.length
    },
    averages: {
      handleTimeSeconds: averageHandleSeconds
    },
    resolutionRate,
    comparison: {
      createdDelta: createdCount - previousCreated,
      closedDelta: closedCount - previousClosed,
      resolutionRateDelta: resolutionRate - previousResolutionRate,
      averageHandleTimeDeltaSeconds:
        averageHandleSeconds !== null && previousHandleAverage !== null
          ? averageHandleSeconds - previousHandleAverage
          : null
    }
  };

  const timeline = Array.from(bucketMap.values()).sort(
    (a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
  );

  const agents = Array.from(agentStats.values())
    .map<AgentMetric>((accumulator) => {
      const ticketsTotal = accumulator.tickets.size;
      const averageTime =
        accumulator.handleTimeCount > 0
          ? Math.round(accumulator.handleTimeTotal / accumulator.handleTimeCount)
          : null;

      return {
        id: accumulator.id,
        name: accumulator.name || 'Atendente',
        tickets: ticketsTotal,
        closed: accumulator.closedTickets,
        resolutionRate: safeDivide(accumulator.closedTickets, ticketsTotal),
        averageHandleTimeSeconds: averageTime,
        messages: accumulator.messages
      };
    })
    .sort((a, b) => b.tickets - a.tickets);

  const queues = Array.from(queueStats.values())
    .map<QueueMetric>((accumulator) => {
      const ticketsTotal = accumulator.tickets.size;
      const averageTime =
        accumulator.handleTimeCount > 0
          ? Math.round(accumulator.handleTimeTotal / accumulator.handleTimeCount)
          : null;

      return {
        id: accumulator.id,
        name: accumulator.name,
        color: accumulator.color,
        tickets: ticketsTotal,
        closed: accumulator.closedTickets,
        resolutionRate: safeDivide(accumulator.closedTickets, ticketsTotal),
        averageHandleTimeSeconds: averageTime
      };
    })
    .sort((a, b) => b.tickets - a.tickets);

  return {
    period,
    timeline,
    agents,
    queues
  };
};

export const normalizeDashboardFilters = (filters: {
  startDate?: string;
  endDate?: string;
  interval?: string;
  queueId?: string;
  userId?: string;
}): DashboardMetricsFilters => {
  const interval = (filters.interval as MetricsInterval) ?? 'day';

  if (!INTERVALS.includes(interval)) {
    throw new Error('Intervalo inválido. Utilize day, week ou month.');
  }

  const today = new Date();
  const defaultStart = startOfDay(new Date(today.getTime() - 6 * 86400000));
  const defaultEnd = endOfDay(today);

  const start = filters.startDate ? startOfDay(new Date(filters.startDate)) : defaultStart;
  const end = filters.endDate ? endOfDay(new Date(filters.endDate)) : defaultEnd;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Datas inválidas fornecidas nos filtros.');
  }

  return {
    start,
    end,
    interval,
    queueId: filters.queueId || undefined,
    userId: filters.userId || undefined
  };
};

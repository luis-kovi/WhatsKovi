import { Request, Response } from 'express';
import prisma from '../config/database';
import { computeDashboardMetrics, normalizeDashboardFilters } from '../services/dashboardMetricsService';

export const getDashboardSummary = async (_req: Request, res: Response) => {
  try {
    const [ticketCounts, agents, connections, queues, todaysMessages] = await prisma.$transaction([
      prisma.ticket.groupBy({
        by: ['status'],
        _count: { _all: true },
        orderBy: { status: 'asc' }
      }),
      prisma.user.findMany({
        select: { status: true }
      }),
      prisma.whatsAppConnection.findMany({
        select: { status: true }
      }),
      prisma.queue.count(),
      prisma.message.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    const extractCount = (entry: (typeof ticketCounts)[number] | undefined) => {
      if (!entry || !entry._count || typeof entry._count === 'boolean') {
        return 0;
      }
      return entry._count._all ?? 0;
    };

    const getCountForStatus = (status: string) => extractCount(ticketCounts.find((item) => item.status === status));

    const ticketsSummary = {
      total: ticketCounts.reduce((acc, item) => acc + extractCount(item), 0),
      bot: getCountForStatus('BOT'),
      pending: getCountForStatus('PENDING'),
      open: getCountForStatus('OPEN'),
      closed: getCountForStatus('CLOSED')
    };

    const totalAgents = agents.length;
    const onlineAgents = agents.filter((agent) => agent.status === 'ONLINE').length;

    const connectionSummary = connections.reduce(
      (acc, item) => {
        acc[item.status as keyof typeof acc] = (acc[item.status as keyof typeof acc] || 0) + 1;
        return acc;
      },
      { CONNECTED: 0, CONNECTING: 0, DISCONNECTED: 0 } as Record<string, number>
    );

    return res.json({
      tickets: ticketsSummary,
      agents: {
        total: totalAgents,
        online: onlineAgents,
        offline: totalAgents - onlineAgents
      },
      whatsappConnections: connectionSummary,
      queues: queues,
      messagesToday: todaysMessages
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
};

export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const filters = normalizeDashboardFilters({
      startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
      endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
      interval: typeof req.query.interval === 'string' ? req.query.interval : undefined,
      queueId: typeof req.query.queueId === 'string' ? req.query.queueId : undefined,
      userId: typeof req.query.userId === 'string' ? req.query.userId : undefined
    });

    const metrics = await computeDashboardMetrics(filters);
    return res.json(metrics);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('inválid')) {
      return res.status(400).json({ error: error.message });
    }

    console.error('Erro ao calcular métricas do dashboard:', error);
    return res.status(500).json({ error: 'Erro ao calcular métricas do dashboard' });
  }
};

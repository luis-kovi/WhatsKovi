import path from 'path';
import { promises as fs } from 'fs';
import { Prisma, TicketStatus, ReportFileFormat } from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import prisma from '../config/database';

export type ReportAggregation = 'day' | 'week' | 'month';

export type ReportFiltersInput = {
  startDate?: string;
  endDate?: string;
  aggregation?: string;
  queueId?: string;
  userId?: string;
  tagId?: string;
  status?: string;
};

export type ReportFiltersNormalized = {
  start: Date;
  end: Date;
  aggregation: ReportAggregation;
  queueId?: string;
  userId?: string;
  tagId?: string;
  status?: TicketStatus;
};

export type HighlightMetric = {
  label: string;
  value: string;
  description: string;
  trend?: {
    value: number;
    label: string;
  };
};

const loadTicketsForReport = async (filters: ReportFiltersNormalized) => {
  return prisma.ticket.findMany({
    where: buildTicketWhere(filters),
    include: {
      contact: {
        select: {
          id: true,
          name: true
        }
      },
      queue: {
        select: {
          id: true,
          name: true,
          color: true
        }
      },
      user: {
        select: {
          id: true,
          name: true
        }
      },
      tags: {
        include: {
          tag: true
        }
      },
      messages: {
        orderBy: {
          createdAt: 'asc'
        },
        select: {
          id: true,
          body: true,
          createdAt: true,
          userId: true,
          isPrivate: true
        }
      },
      satisfactionSurvey: true
    }
  });
};

const computePreviousFilters = (filters: ReportFiltersNormalized): ReportFiltersNormalized => {
  const periodMs = filters.end.getTime() - filters.start.getTime();
  const previousEnd = new Date(filters.start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - periodMs);

  return {
    start: startOfDay(previousStart),
    end: endOfDay(previousEnd),
    aggregation: filters.aggregation,
    queueId: filters.queueId,
    userId: filters.userId,
    tagId: filters.tagId,
    status: filters.status
  };
};

export const normalizeReportFilters = (input: ReportFiltersInput): ReportFiltersNormalized => {
  const aggregation = (input.aggregation as ReportAggregation) ?? 'day';

  if (!INTERVALS.includes(aggregation)) {
    throw new Error('Intervalo inválido. Utilize day, week ou month.');
  }

  const start = input.startDate
    ? new Date(input.startDate)
    : startOfDay(new Date(Date.now() - 6 * 86400000));
  const end = input.endDate ? new Date(input.endDate) : endOfDay(new Date());

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new Error('Datas inválidas fornecidas nos filtros.');
  }

  let status: TicketStatus | undefined;
  if (input.status) {
    const upper = input.status.toUpperCase();
    if (['PENDING', 'OPEN', 'CLOSED'].includes(upper)) {
      status = upper as TicketStatus;
    } else {
      throw new Error('Status de ticket inválido.');
    }
  }

  return {
    start: startOfDay(start),
    end: endOfDay(end),
    aggregation,
    queueId: input.queueId || undefined,
    userId: input.userId || undefined,
    tagId: input.tagId || undefined,
    status
  };
};

type SummaryTrend = {
  closedTrend: number;
  handleTrend: number;
  satisfactionTrend: number;
  resolutionTrend: number;
  messagesTrend: number;
  slaTrend: number;
};

const buildTrends = (
  current: ReportComputationResult,
  previous: ReportComputationResult
): SummaryTrend => {
  const currentAverageHandle = current.averages.handleSeconds ?? 0;
  const previousAverageHandle = previous.averages.handleSeconds ?? 0;

  return {
    closedTrend: percentageChange(current.totals.closed, previous.totals.closed),
    handleTrend: percentageChange(currentAverageHandle, previousAverageHandle, true),
    satisfactionTrend: percentageChange(
      current.averages.satisfactionScore ?? 0,
      previous.averages.satisfactionScore ?? 0
    ),
    resolutionTrend: percentageChange(current.rates.resolution, previous.rates.resolution),
    messagesTrend: percentageChange(
      current.messageTotals.agentMessages,
      previous.messageTotals.agentMessages
    ),
    slaTrend: percentageChange(current.rates.slaCompliance, previous.rates.slaCompliance)
  };
};

const buildHighlights = (
  current: ReportComputationResult,
  trends: SummaryTrend
): ReportHighlights => {
  const metrics: HighlightMetric[] = [
    {
      label: 'Tickets resolvidos',
      value: formatNumber(current.totals.closed),
      description: 'Encerrados no período selecionado',
      trend: {
        value: trends.closedTrend,
        label: 'vs período anterior'
      }
    },
    {
      label: 'Tempo médio de atendimento',
      value: formatDuration(current.averages.handleSeconds),
      description: 'Do primeiro contato até a conclusão',
      trend: {
        value: trends.handleTrend,
        label: 'variação de eficiência'
      }
    },
    {
      label: 'Satisfação média',
      value:
        current.averages.satisfactionScore !== null
          ? `${current.averages.satisfactionScore.toFixed(1)}/10`
          : '—',
      description: 'Pontuação média de satisfação dos clientes',
      trend: {
        value: trends.satisfactionTrend,
        label: 'sensação do cliente'
      }
    },
    {
      label: 'Taxa de resolução',
      value: formatPercentage(current.rates.resolution),
      description: 'Tickets finalizados sobre o total',
      trend: {
        value: trends.resolutionTrend,
        label: 'vs período anterior'
      }
    }
  ];

  const bestQueue = current.queues[0];
  const bestAgent = current.agents[0];

  const serviceLevels: ServiceMetric[] = [
    {
      label: 'Primeira resposta até 30m',
      value: formatPercentage(current.rates.slaCompliance),
      hint: 'Meta recomendada ≥ 90%'
    },
    {
      label: 'Resolução até 4h',
      value: formatPercentage(current.rates.handleWithinTarget),
      hint: 'Meta recomendada ≥ 85%'
    },
    {
      label: 'Fila com maior volume',
      value: bestQueue ? bestQueue.name : 'Sem dados',
      hint: bestQueue ? `${bestQueue.volume} tickets no período` : 'Sem filas registradas'
    },
    {
      label: 'Atendente destaque',
      value: bestAgent ? bestAgent.name : 'Sem dados',
      hint: bestAgent ? `${bestAgent.tickets} tickets concluídos` : 'Sem atendentes no período'
    }
  ];

  return {
    metrics,
    serviceLevels
  };
};

const applyProductivityTrends = (
  current: ReportComputationResult,
  previous: ReportComputationResult
) => {
  const trends = [
    percentageChange(current.totals.closed, previous.totals.closed),
    percentageChange(current.messageTotals.agentMessages, previous.messageTotals.agentMessages),
    percentageChange(current.rates.slaCompliance, previous.rates.slaCompliance)
  ];

  return current.productivity.map((item, index) => ({
    ...item,
    trend: trends[index] ?? 0
  }));
};

export const buildAdvancedReport = async (
  filters: ReportFiltersNormalized
): Promise<AdvancedReport> => {
  const [currentTickets, previousTickets] = await Promise.all([
    loadTicketsForReport(filters),
    loadTicketsForReport(computePreviousFilters(filters))
  ]);

  const current = computeReportData(currentTickets, filters);
  const previous = computeReportData(previousTickets, computePreviousFilters(filters), {
    collectDetails: false
  });
  const trends = buildTrends(current, previous);

  const highlights = buildHighlights(current, trends);
  const productivity = applyProductivityTrends(current, previous);

  const totals = {
    created: current.totals.created,
    closed: current.totals.closed,
    open: current.totals.open,
    pending: current.totals.pending,
    resolutionRate: current.rates.resolution,
    averageHandleSeconds: current.averages.handleSeconds,
    averageFirstResponseSeconds: current.averages.firstResponseSeconds,
    satisfactionScore: current.averages.satisfactionScore
  };

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      startDate: filters.start.toISOString(),
      endDate: filters.end.toISOString(),
      aggregation: filters.aggregation,
      queueId: filters.queueId,
      userId: filters.userId,
      tagId: filters.tagId,
      status: filters.status
    },
    totals,
    highlights,
    visuals: {
      timeline: current.timeline,
      queues: current.queues,
      agents: current.agents,
      tags: current.tags,
      heatmap: current.heatmap
    },
    details: {
      responseMetrics: current.responseMetrics,
      productivity,
      conversations: current.conversations,
      satisfaction: current.satisfaction
    }
  };
};

type ExportArtifact = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
};

const buildCsvExport = (report: AdvancedReport): Buffer => {
  const lines: string[] = [];

  const addSection = (title: string, headers: string[], rows: Array<Array<string | number>>) => {
    lines.push(title);
    lines.push(headers.join(';'));
    rows.forEach((row) => lines.push(row.map((value) => `"${value}"`).join(';')));
    lines.push('');
  };

  addSection('Resumo', ['Indicador', 'Valor'], [
    ['Tickets criados', formatNumber(report.totals.created)],
    ['Tickets resolvidos', formatNumber(report.totals.closed)],
    ['Tickets em atendimento', formatNumber(report.totals.open)],
    ['Tickets pendentes', formatNumber(report.totals.pending)],
    ['Taxa de resolução', formatPercentage(report.totals.resolutionRate)],
    ['Tempo médio de atendimento', formatDuration(report.totals.averageHandleSeconds)],
    ['Tempo médio até primeira resposta', formatDuration(report.totals.averageFirstResponseSeconds)],
    [
      'Satisfação média',
      report.totals.satisfactionScore !== null ? `${report.totals.satisfactionScore.toFixed(1)}/10` : '—'
    ]
  ]);

  addSection(
    'Linha do tempo',
    ['Período', 'Tickets', 'SLA cumprido (%)'],
    report.visuals.timeline.map((point) => [point.label, point.tickets, point.sla])
  );

  addSection(
    'Desempenho por atendente',
    ['Atendente', 'Tickets', 'Tempo médio', 'Satisfação (%)'],
    report.visuals.agents.map((agent) => [agent.name, agent.tickets, agent.avgHandle, agent.satisfaction])
  );

  addSection(
    'Desempenho por fila',
    ['Fila', 'Volume', 'Tempo de espera', 'Resolução (%)'],
    report.visuals.queues.map((queue) => [queue.name, queue.volume, queue.wait, queue.resolution])
  );

  addSection(
    'Níveis de serviço',
    ['Indicador', 'Valor', 'Observação'],
    report.highlights.serviceLevels.map((metric) => [metric.label, metric.value, metric.hint])
  );

  return Buffer.from(lines.join('\n'), 'utf-8');
};

const buildExcelExport = async (report: AdvancedReport): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WhatsKovi';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Resumo');
  summarySheet.addRow(['Indicador', 'Valor']);
  summarySheet.addRows([
    ['Tickets criados', report.totals.created],
    ['Tickets resolvidos', report.totals.closed],
    ['Tickets em atendimento', report.totals.open],
    ['Tickets pendentes', report.totals.pending],
    ['Taxa de resolução', report.totals.resolutionRate],
    ['Tempo médio de atendimento', report.totals.averageHandleSeconds ?? 0],
    ['Tempo médio até primeira resposta', report.totals.averageFirstResponseSeconds ?? 0],
    ['Satisfação média', report.totals.satisfactionScore ?? 0]
  ]);

  const timelineSheet = workbook.addWorksheet('Linha do tempo');
  timelineSheet.addRow(['Período', 'Tickets', 'SLA (%)']);
  report.visuals.timeline.forEach((point) => {
    timelineSheet.addRow([point.label, point.tickets, point.sla]);
  });

  const agentSheet = workbook.addWorksheet('Atendentes');
  agentSheet.addRow(['Atendente', 'Tickets', 'Tempo médio', 'Satisfação (%)']);
  report.visuals.agents.forEach((agent) => {
    agentSheet.addRow([agent.name, agent.tickets, agent.avgHandle, agent.satisfaction]);
  });

  const queueSheet = workbook.addWorksheet('Filas');
  queueSheet.addRow(['Fila', 'Volume', 'Tempo médio', 'Resolução (%)']);
  report.visuals.queues.forEach((queue) => {
    queueSheet.addRow([queue.name, queue.volume, queue.wait, queue.resolution]);
  });

  const satisfactionSheet = workbook.addWorksheet('Satisfação');
  satisfactionSheet.addRow(['Indicador', 'Valor']);
  satisfactionSheet.addRows([
    ['Respostas', report.details.satisfaction.responses],
    ['NPS', report.details.satisfaction.nps],
    ['Promotores', report.details.satisfaction.promoters],
    ['Neutros', report.details.satisfaction.passives],
    ['Detratores', report.details.satisfaction.detractors],
    ['Satisfação média', report.details.satisfaction.rating]
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

const buildPdfExport = async (report: AdvancedReport): Promise<Buffer> => {
  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (error) => reject(error));

    doc.fontSize(18).text('Relatório avançado de atendimento', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(
      `Período analisado: ${report.filters.startDate.slice(0, 10)} até ${report.filters.endDate.slice(0, 10)}`
    );
    doc.moveDown();

    doc.fontSize(14).text('Resumo', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Tickets criados: ${formatNumber(report.totals.created)}`);
    doc.text(`Tickets resolvidos: ${formatNumber(report.totals.closed)}`);
    doc.text(`Taxa de resolução: ${formatPercentage(report.totals.resolutionRate)}`);
    doc.text(`Tempo médio de atendimento: ${formatDuration(report.totals.averageHandleSeconds)}`);
    doc.text(`Tempo médio até primeira resposta: ${formatDuration(report.totals.averageFirstResponseSeconds)}`);
    doc.moveDown();

    doc.fontSize(14).text('Destaques', { underline: true });
    doc.moveDown(0.5);
    report.highlights.metrics.forEach((metric) => {
      doc.fontSize(11).text(`${metric.label}: ${metric.value} (${metric.description})`);
      if (metric.trend) {
        doc.fontSize(9).fillColor('#6B7280').text(`${metric.trend.value}% ${metric.trend.label}`);
        doc.fillColor('#111827');
      }
    });
    doc.moveDown();

    doc.fontSize(14).text('Desempenho por fila', { underline: true });
    doc.moveDown(0.5);
    report.visuals.queues.slice(0, 6).forEach((queue) => {
      doc.fontSize(11).text(
        `${queue.name}: ${queue.volume} tickets, espera ${queue.wait}, resolução ${queue.resolution}%`
      );
    });
    doc.moveDown();

    doc.fontSize(14).text('Produtividade dos atendentes', { underline: true });
    doc.moveDown(0.5);
    report.visuals.agents.slice(0, 6).forEach((agent) => {
      doc.fontSize(11).text(
        `${agent.name}: ${agent.tickets} tickets, tempo médio ${agent.avgHandle}, satisfação ${agent.satisfaction}%`
      );
    });
    doc.moveDown();

    doc.fontSize(14).text('Satisfação do cliente', { underline: true });
    doc.moveDown(0.5);
    const satisfaction = report.details.satisfaction;
    doc.fontSize(11).text(`NPS: ${satisfaction.nps}`);
    doc.text(`Respostas: ${satisfaction.responses}`);
    doc.text(
      `Promotores: ${satisfaction.promoters} • Neutros: ${satisfaction.passives} • Detratores: ${satisfaction.detractors}`
    );
    if (satisfaction.highlights.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(11).text('Feedbacks recentes:');
      satisfaction.highlights.forEach((highlight) => {
        doc.fontSize(10).text(`- ${highlight.customer}: ${highlight.comment}`);
      });
    }

    doc.end();
  });
};

export const generateReportExport = async (
  report: AdvancedReport,
  filters: ReportFiltersNormalized,
  format: ReportFileFormat
): Promise<ExportArtifact> => {
  let buffer: Buffer;
  if (format === 'CSV') {
    buffer = buildCsvExport(report);
  } else if (format === 'XLSX') {
    buffer = await buildExcelExport(report);
  } else if (format === 'PDF') {
    buffer = await buildPdfExport(report);
  } else {
    throw new Error(`Formato de exportação não suportado: ${format}`);
  }

  const fileName = resolveReportFileName(filters, format);
  const mimeType =
    format === 'CSV'
      ? 'text/csv'
      : format === 'XLSX'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';

  return {
    buffer,
    fileName,
    mimeType
  };
};

export const persistReportSnapshot = async (
  report: AdvancedReport,
  filters: ReportFiltersNormalized,
  format: ReportFileFormat,
  ownerId: string,
  scheduleId?: string
) => {
  await ensureDirectory(REPORTS_DIR);
  const scheduleDir = path.join(REPORTS_DIR, scheduleId ?? ownerId);
  await ensureDirectory(scheduleDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = resolveReportFileName(filters, format, `snapshot_${timestamp}`);
  const filePath = path.join(scheduleDir, fileName);

  const artifact = await generateReportExport(report, filters, format);
  await fs.writeFile(filePath, artifact.buffer);

  const stats = await fs.stat(filePath);

  const snapshot = await prisma.reportSnapshot.create({
    data: {
      scheduleId: scheduleId ?? null,
      userId: ownerId,
      format,
      filePath: path.relative(process.cwd(), filePath),
      fileName,
      fileSize: stats.size,
      filters: {
        ...report.filters
      } as Prisma.InputJsonValue,
      summary: {
        totals: report.totals,
        highlights: report.highlights.metrics,
        generatedAt: report.generatedAt
      } as Prisma.InputJsonValue,
      generatedAt: new Date(),
      expiresAt: null
    }
  });

  return snapshot;
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

export type AdvancedReport = {
  generatedAt: string;
  filters: {
    startDate: string;
    endDate: string;
    aggregation: ReportAggregation;
    queueId?: string;
    userId?: string;
    tagId?: string;
    status?: TicketStatus;
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

export type ReportExportFormat = ReportFileFormat;

type TicketForReport = Prisma.TicketGetPayload<{
  include: {
    contact: { select: { id: true; name: true } };
    queue: { select: { id: true; name: true; color: true } };
    user: { select: { id: true; name: true } };
    tags: { include: { tag: true } };
    messages: {
      orderBy: { createdAt: 'asc' };
      select: {
        id: true;
        body: true;
        createdAt: true;
        userId: true;
        isPrivate: true;
      };
    };
    satisfactionSurvey: true;
  };
}>;

const INTERVALS: ReportAggregation[] = ['day', 'week', 'month'];

const SLA_TARGET_SECONDS = 2 * 60 * 60; // 2h
const FIRST_RESPONSE_TARGET_SECONDS = 30 * 60; // 30m
const HANDLE_TARGET_SECONDS = 4 * 60 * 60; // 4h

const POSITIVE_KEYWORDS = [
  'obrigado',
  'obrigada',
  'excelente',
  'perfeito',
  'perfeita',
  'otimo',
  'ótimo',
  'boa',
  'bom',
  'resolveu',
  'resolvido',
  'satisfeito',
  'satisfeita',
  'top',
  'maravilhoso',
  'maravilhosa',
  'show'
];

const NEGATIVE_KEYWORDS = [
  'reclamacao',
  'reclamação',
  'ruim',
  'pessimo',
  'péssimo',
  'horrivel',
  'horrível',
  'demora',
  'demorando',
  'insatisfeito',
  'insatisfeita',
  'nao resolveu',
  'não resolveu',
  'problema',
  'erro',
  'cancelar'
];

const DAY_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const HEATMAP_COLUMNS = ['06h', '10h', '14h', '18h', '22h', '02h'];

const REPORTS_DIR = path.resolve(process.cwd(), process.env.REPORTS_DIR ?? 'reports');

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const secondsBetween = (start: Date, end: Date) =>
  Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));

const formatNumber = (value: number) => value.toLocaleString('pt-BR');

const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;

const formatDuration = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) {
    return '—';
  }

  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${remainingSeconds}s`;
};

const safeDivide = (numerator: number, denominator: number) => {
  if (denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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
  const diff = (day + 6) % 7; // Monday as start
  result.setDate(result.getDate() - diff);
  return result;
};

const startOfMonth = (value: Date) => {
  const result = startOfDay(value);
  result.setDate(1);
  return result;
};

const addInterval = (value: Date, aggregation: ReportAggregation) => {
  const result = new Date(value);
  switch (aggregation) {
    case 'day':
      result.setDate(result.getDate() + 1);
      break;
    case 'week':
      result.setDate(result.getDate() + 7);
      break;
    case 'month':
      result.setMonth(result.getMonth() + 1);
      break;
    default:
      break;
  }
  return result;
};

const formatTimelineLabel = (value: Date, aggregation: ReportAggregation) => {
  const formatter =
    aggregation === 'day'
      ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
      : aggregation === 'week'
      ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
      : new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' });
  return formatter.format(value);
};

const getBucketStart = (value: Date, aggregation: ReportAggregation) => {
  switch (aggregation) {
    case 'day':
      return startOfDay(value);
    case 'week':
      return startOfWeek(value);
    case 'month':
      return startOfMonth(value);
    default:
      return startOfDay(value);
  }
};

const getHeatmapDayIndex = (value: Date) => {
  const day = value.getDay();
  return (day + 6) % 7;
};

const getHeatmapSlotIndex = (value: Date) => {
  const hour = value.getHours();
  if (hour >= 6 && hour < 10) return 0;
  if (hour >= 10 && hour < 14) return 1;
  if (hour >= 14 && hour < 18) return 2;
  if (hour >= 18 && hour < 22) return 3;
  if (hour >= 22 || hour < 2) return 4;
  return 5;
};

const percentageChange = (current: number, previous: number, invert = false) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return 0;
  }
  const delta = invert ? previous - current : current - previous;
  return Number(((delta / Math.abs(previous)) * 100).toFixed(1));
};

const ensureDirectory = async (target: string) => {
  await fs.mkdir(target, { recursive: true });
};

const resolveReportFileName = (
  filters: ReportFiltersNormalized,
  format: ReportFileFormat,
  prefix = 'relatorio-avancado'
) => {
  const start = filters.start.toISOString().slice(0, 10);
  const end = filters.end.toISOString().slice(0, 10);
  return `${prefix}_${start}_a_${end}.${format.toLowerCase()}`;
};

type SatisfactionResult = {
  rating: number;
  classification: 'promoter' | 'passive' | 'detractor';
  highlights: SatisfactionHighlight[];
};

const deriveSentimentFromText = (
  text: string,
  ratingHint?: number
): SatisfactionHighlight['sentiment'] => {
  if (typeof ratingHint === 'number') {
    if (ratingHint >= 9) {
      return 'positive';
    }
    if (ratingHint <= 6) {
      return 'negative';
    }
  }

  const normalized = normalizeText(text);
  const hasPositive = POSITIVE_KEYWORDS.some((keyword) => normalized.includes(keyword));
  const hasNegative = NEGATIVE_KEYWORDS.some((keyword) => normalized.includes(keyword));

  if (hasPositive && !hasNegative) {
    return 'positive';
  }

  if (hasNegative && !hasPositive) {
    return 'negative';
  }

  return 'neutral';
};

const evaluateSatisfaction = (ticket: TicketForReport): SatisfactionResult => {
  const highlights: SatisfactionHighlight[] = [];
  const survey = ticket.satisfactionSurvey;

  if (survey && typeof survey.rating === 'number') {
    const rating = clamp(Number(Number(survey.rating).toFixed(1)), 0, 10);
    const classification: SatisfactionResult['classification'] =
      rating >= 9 ? 'promoter' : rating >= 7 ? 'passive' : 'detractor';

    if (survey.comment) {
      const trimmed = survey.comment.trim();
      if (trimmed.length > 0) {
        highlights.push({
          id: survey.id,
          customer: ticket.contact.name,
          comment: trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed,
          sentiment: deriveSentimentFromText(trimmed, rating)
        });
      }
    }

    return {
      rating,
      classification,
      highlights
    };
  }

  let score = 7;
  const seen = new Set<string>();

  ticket.tags.forEach(({ tag }) => {
    const normalized = normalizeText(tag.name);
    if (normalized.includes('elogio') || normalized.includes('satisfacao') || normalized.includes('satisfação')) {
      score += 2;
    }
    if (normalized.includes('reclamacao') || normalized.includes('reclamação') || normalized.includes('problema')) {
      score -= 2;
    }
  });

  ticket.messages.forEach((message) => {
    if (message.userId || message.isPrivate || !message.body) {
      return;
    }

    const normalized = normalizeText(message.body);
    const hasPositive = POSITIVE_KEYWORDS.some((keyword) => normalized.includes(keyword));
    const hasNegative = NEGATIVE_KEYWORDS.some((keyword) => normalized.includes(keyword));

    let sentiment: SatisfactionHighlight['sentiment'] = 'neutral';
    if (hasPositive && !hasNegative) {
      score += 1.5;
      sentiment = 'positive';
    } else if (hasNegative && !hasPositive) {
      score -= 2;
      sentiment = 'negative';
    } else if (hasPositive && hasNegative) {
      sentiment = 'neutral';
    }

    if (sentiment !== 'neutral') {
      const trimmed = message.body.trim();
      if (trimmed.length > 0 && !seen.has(trimmed)) {
        highlights.push({
          id: message.id,
          customer: ticket.contact.name,
          comment: trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed,
          sentiment
        });
        seen.add(trimmed);
      }
    }
  });

  const rating = clamp(Number(score.toFixed(1)), 0, 10);
  const classification: SatisfactionResult['classification'] =
    rating >= 9 ? 'promoter' : rating >= 7 ? 'passive' : 'detractor';

  return {
    rating,
    classification,
    highlights
  };
};

const buildTicketWhere = (filters: ReportFiltersNormalized): Prisma.TicketWhereInput => {
  const where: Prisma.TicketWhereInput = {
    createdAt: {
      gte: filters.start,
      lte: filters.end
    }
  };

  if (filters.queueId) {
    where.queueId = filters.queueId;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.tagId) {
    where.tags = {
      some: {
        tagId: filters.tagId
      }
    };
  }

  return where;
};

type AgentAccumulator = {
  id: string;
  name: string;
  tickets: Set<string>;
  closedTickets: number;
  handleTotal: number;
  handleCount: number;
  messages: number;
  satisfactionTotal: number;
  satisfactionCount: number;
};

type QueueAccumulator = {
  id: string;
  name: string;
  color: string;
  tickets: Set<string>;
  closedTickets: number;
  firstResponseTotal: number;
  firstResponseCount: number;
  satisfactionTotal: number;
  satisfactionCount: number;
};

type TimelineAccumulator = {
  start: Date;
  tickets: number;
  slaMet: number;
  total: number;
};

type ReportComputationOptions = {
  collectDetails?: boolean;
};

type ReportComputationResult = {
  totals: {
    created: number;
    closed: number;
    open: number;
    pending: number;
  };
  averages: {
    firstResponseSeconds: number | null;
    handleSeconds: number | null;
    satisfactionScore: number | null;
  };
  rates: {
    slaCompliance: number;
    handleWithinTarget: number;
    resolution: number;
    promoterRate: number;
  };
  messageTotals: {
    agentMessages: number;
  };
  satisfactionCounts: {
    promoters: number;
    passives: number;
    detractors: number;
  };
  timeline: ReportTimelinePoint[];
  queues: ReportQueuePerformance[];
  agents: ReportAgentPerformance[];
  tags: TagDistribution[];
  heatmap: HeatmapRow[];
  conversations: ConversationRecord[];
  satisfaction: SatisfactionInsight;
  responseMetrics: ResponseMetric[];
  productivity: ProductivityMetric[];
};

const computeReportData = (
  tickets: TicketForReport[],
  filters: ReportFiltersNormalized,
  options: ReportComputationOptions = {}
): ReportComputationResult => {
  const collectDetails = options.collectDetails !== false;

  const timelineMap = new Map<string, TimelineAccumulator>();
  const agentMap = new Map<string, AgentAccumulator>();
  const queueMap = new Map<string, QueueAccumulator>();
  const tagMap = new Map<string, { id: string; name: string; color: string; count: number }>();
  const heatmapMatrix = Array.from({ length: 7 }, () => Array(HEATMAP_COLUMNS.length).fill(0));

  const conversations: ConversationRecord[] = [];
  const satisfactionHighlights: SatisfactionHighlight[] = [];

  let firstResponseTotal = 0;
  let firstResponseCount = 0;
  let firstResponseWithinTarget = 0;

  let handleTotal = 0;
  let handleCount = 0;
  let handleWithinTarget = 0;

  let agentMessagesTotal = 0;

  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  let satisfactionScoreTotal = 0;
  let satisfactionResponses = 0;

  let closedTickets = 0;
  let openTickets = 0;
  let pendingTickets = 0;

  const samples: Array<{ ticket: TicketForReport; record: ConversationRecord }> = [];

  tickets.forEach((ticket) => {
    if (ticket.status === 'CLOSED') {
      closedTickets += 1;
    } else if (ticket.status === 'OPEN') {
      openTickets += 1;
    } else {
      pendingTickets += 1;
    }

    const firstAgentMessage = ticket.messages.find((message) => message.userId && !message.isPrivate);
    const firstResponseSeconds = firstAgentMessage
      ? secondsBetween(ticket.createdAt, firstAgentMessage.createdAt)
      : null;

    if (firstResponseSeconds !== null) {
      firstResponseTotal += firstResponseSeconds;
      firstResponseCount += 1;
      if (firstResponseSeconds <= SLA_TARGET_SECONDS) {
        firstResponseWithinTarget += 1;
      }
    }

    const handleSeconds =
      ticket.closedAt && ticket.closedAt > ticket.createdAt
        ? secondsBetween(ticket.createdAt, ticket.closedAt)
        : null;

    if (handleSeconds !== null) {
      handleTotal += handleSeconds;
      handleCount += 1;
      if (handleSeconds <= HANDLE_TARGET_SECONDS) {
        handleWithinTarget += 1;
      }
    }

    if (collectDetails) {
      const bucketStart = getBucketStart(ticket.createdAt, filters.aggregation);
      const bucketKey = bucketStart.toISOString();
      const bucket =
        timelineMap.get(bucketKey) ??
        {
          start: bucketStart,
          tickets: 0,
          slaMet: 0,
          total: 0
        };
      bucket.tickets += 1;
      bucket.total += 1;
      if (firstResponseSeconds !== null && firstResponseSeconds <= SLA_TARGET_SECONDS) {
        bucket.slaMet += 1;
      }
      timelineMap.set(bucketKey, bucket);
    }

    const agentKey = ticket.user?.id ?? 'unassigned';
    const agentRecord =
      agentMap.get(agentKey) ??
      {
        id: ticket.user?.id ?? 'unassigned',
        name: ticket.user?.name ?? 'Sem atendente',
        tickets: new Set<string>(),
        closedTickets: 0,
        handleTotal: 0,
        handleCount: 0,
        messages: 0,
        satisfactionTotal: 0,
        satisfactionCount: 0
      };
    agentRecord.tickets.add(ticket.id);
    if (ticket.status === 'CLOSED') {
      agentRecord.closedTickets += 1;
    }
    if (handleSeconds !== null) {
      agentRecord.handleTotal += handleSeconds;
      agentRecord.handleCount += 1;
    }
    agentMap.set(agentKey, agentRecord);

    const queueKey = ticket.queue?.id ?? 'unassigned';
    const queueRecord =
      queueMap.get(queueKey) ??
      {
        id: ticket.queue?.id ?? 'unassigned',
        name: ticket.queue?.name ?? 'Sem fila',
        color: ticket.queue?.color ?? '#94A3B8',
        tickets: new Set<string>(),
        closedTickets: 0,
        firstResponseTotal: 0,
        firstResponseCount: 0,
        satisfactionTotal: 0,
        satisfactionCount: 0
      };
    queueRecord.tickets.add(ticket.id);
    if (ticket.status === 'CLOSED') {
      queueRecord.closedTickets += 1;
    }
    if (firstResponseSeconds !== null) {
      queueRecord.firstResponseTotal += firstResponseSeconds;
      queueRecord.firstResponseCount += 1;
    }
    queueMap.set(queueKey, queueRecord);

    ticket.tags.forEach(({ tag }) => {
      const entry =
        tagMap.get(tag.id) ?? {
          id: tag.id,
          name: tag.name,
          color: tag.color ?? '#FF355A',
          count: 0
        };
      entry.count += 1;
      tagMap.set(tag.id, entry);
    });

    if (collectDetails) {
      const dayIndex = getHeatmapDayIndex(ticket.createdAt);
      const slotIndex = getHeatmapSlotIndex(ticket.createdAt);
      heatmapMatrix[dayIndex][slotIndex] += 1;
    }

    ticket.messages.forEach((message) => {
      if (message.createdAt < filters.start || message.createdAt > filters.end) {
        return;
      }

      if (message.userId && !message.isPrivate) {
        agentMessagesTotal += 1;
        const messageAgent = agentMap.get(message.userId);
        if (messageAgent) {
          messageAgent.messages += 1;
        }
      }
    });

    const satisfaction = evaluateSatisfaction(ticket);
    satisfactionScoreTotal += satisfaction.rating;
    satisfactionResponses += 1;

    switch (satisfaction.classification) {
      case 'promoter':
        promoters += 1;
        break;
      case 'passive':
        passives += 1;
        break;
      case 'detractor':
        detractors += 1;
        break;
      default:
        break;
    }

    if (collectDetails) {
      satisfactionHighlights.push(...satisfaction.highlights);
    }

    const agentSatisfaction = agentMap.get(agentKey);
    if (agentSatisfaction) {
      agentSatisfaction.satisfactionTotal += satisfaction.rating;
      agentSatisfaction.satisfactionCount += 1;
    }

    const queueSatisfaction = queueMap.get(queueKey);
    if (queueSatisfaction) {
      queueSatisfaction.satisfactionTotal += satisfaction.rating;
      queueSatisfaction.satisfactionCount += 1;
    }

    if (collectDetails) {
      const duration = handleSeconds !== null ? formatDuration(handleSeconds) : 'Em aberto';
      samples.push({
        ticket,
        record: {
          id: ticket.id,
          contact: ticket.contact.name,
          queue: ticket.queue?.name ?? 'Sem fila',
          agent: ticket.user?.name ?? 'Sem atendente',
          duration,
          satisfaction: `${satisfaction.rating.toFixed(1)}/10`,
          status: ticket.status
        }
      });
    }
  });

  if (collectDetails) {
    samples
      .sort((a, b) => {
        const aDate = a.ticket.closedAt ?? a.ticket.createdAt;
        const bDate = b.ticket.closedAt ?? b.ticket.createdAt;
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, 12)
      .forEach((sample) => conversations.push(sample.record));
  }

  const averageFirstResponse =
    firstResponseCount > 0 ? Math.round(firstResponseTotal / firstResponseCount) : null;
  const averageHandle = handleCount > 0 ? Math.round(handleTotal / handleCount) : null;
  const averageSatisfaction =
    satisfactionResponses > 0 ? Number((satisfactionScoreTotal / satisfactionResponses).toFixed(1)) : null;

  const timeline = collectDetails
    ? Array.from(timelineMap.values())
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .map<ReportTimelinePoint>((bucket) => ({
          label: formatTimelineLabel(bucket.start, filters.aggregation),
          tickets: bucket.tickets,
          sla: bucket.total > 0 ? Math.round((bucket.slaMet / bucket.total) * 100) : 0
        }))
    : [];

  const agents = collectDetails
    ? Array.from(agentMap.values())
        .map<ReportAgentPerformance>((agent) => ({
          id: agent.id,
          name: agent.name,
          tickets: agent.tickets.size,
          avgHandle: formatDuration(
            agent.handleCount > 0 ? Math.round(agent.handleTotal / agent.handleCount) : null
          ),
          satisfaction:
            agent.satisfactionCount > 0
              ? Math.round((agent.satisfactionTotal / agent.satisfactionCount) * 10)
              : 0
        }))
        .sort((a, b) => b.tickets - a.tickets)
    : [];

  const queues = collectDetails
    ? Array.from(queueMap.values())
        .map<ReportQueuePerformance>((queue) => ({
          id: queue.id,
          name: queue.name,
          volume: queue.tickets.size,
          wait: formatDuration(
            queue.firstResponseCount > 0
              ? Math.round(queue.firstResponseTotal / queue.firstResponseCount)
              : null
          ),
          resolution:
            queue.tickets.size > 0
              ? Math.round((queue.closedTickets / queue.tickets.size) * 100)
              : 0
        }))
        .sort((a, b) => b.volume - a.volume)
    : [];

  const tags = collectDetails
    ? (() => {
        const total = Array.from(tagMap.values()).reduce((acc, tag) => acc + tag.count, 0);
        if (total === 0) {
          return [];
        }
        return Array.from(tagMap.values())
          .map<TagDistribution>((tag) => ({
            id: tag.id,
            name: tag.name,
            value: (tag.count / total) * 100,
            color: tag.color
          }))
          .sort((a, b) => b.value - a.value);
      })()
    : [];

  const heatmap = collectDetails
    ? heatmapMatrix.map<HeatmapRow>((rowValues, index) => ({
        label: DAY_LABELS[index],
        values: rowValues
      }))
    : [];

  const sortedHighlights = collectDetails
    ? satisfactionHighlights
        .sort((a, b) => {
          const sentimentWeight = (sentiment: typeof a.sentiment) => {
            if (sentiment === 'positive') return 2;
            if (sentiment === 'neutral') return 1;
            return 0;
          };
          return sentimentWeight(b.sentiment) - sentimentWeight(a.sentiment);
        })
        .slice(0, 6)
    : [];

  const responseMetrics = collectDetails
    ? [
        {
          id: 'first-response',
          label: 'Tempo médio até primeira resposta',
          value: formatDuration(averageFirstResponse),
          target: '≤ 30m',
          status: (
            averageFirstResponse !== null && averageFirstResponse <= FIRST_RESPONSE_TARGET_SECONDS
              ? 'on-track'
              : averageFirstResponse !== null && averageFirstResponse <= SLA_TARGET_SECONDS
              ? 'warning'
              : 'critical'
          ) as ResponseMetric['status']
        },
        {
          id: 'handle-time',
          label: 'Tempo médio de resolução',
          value: formatDuration(averageHandle),
          target: '≤ 2h',
          status: (
            averageHandle !== null && averageHandle <= HANDLE_TARGET_SECONDS
              ? 'on-track'
              : averageHandle !== null && averageHandle <= HANDLE_TARGET_SECONDS * 1.5
              ? 'warning'
              : 'critical'
          ) as ResponseMetric['status']
        },
        {
          id: 'sla-compliance',
          label: 'Tickets dentro do SLA',
          value: formatPercentage(safeDivide(firstResponseWithinTarget, firstResponseCount || 1)),
          target: '≥ 90%',
          status: (
            safeDivide(firstResponseWithinTarget, firstResponseCount || 1) >= 0.9
              ? 'on-track'
              : safeDivide(firstResponseWithinTarget, firstResponseCount || 1) >= 0.8
              ? 'warning'
              : 'critical'
          ) as ResponseMetric['status']
        }
      ]
    : [];

  const productivity = collectDetails
    ? [
        {
          id: 'tickets-closed',
          indicator: 'Tickets resolvidos',
          period: 'Período atual',
          value: formatNumber(closedTickets),
          trend: 0
        },
        {
          id: 'messages-sent',
          indicator: 'Mensagens enviadas',
          period: 'Período atual',
          value: formatNumber(agentMessagesTotal),
          trend: 0
        },
        {
          id: 'sla-compliance',
          indicator: 'SLA cumprido',
          period: 'Período atual',
          value: formatPercentage(safeDivide(firstResponseWithinTarget, firstResponseCount || 1)),
          trend: 0
        }
      ]
    : [];

  const satisfactionInsight: SatisfactionInsight = {
    rating: averageSatisfaction ?? 0,
    responses: satisfactionResponses,
    promoters,
    passives,
    detractors,
    nps:
      satisfactionResponses > 0
        ? Math.round(((promoters - detractors) / satisfactionResponses) * 100)
        : 0,
    highlights: sortedHighlights
  };

  return {
    totals: {
      created: tickets.length,
      closed: closedTickets,
      open: openTickets,
      pending: pendingTickets
    },
    averages: {
      firstResponseSeconds: averageFirstResponse,
      handleSeconds: averageHandle,
      satisfactionScore: averageSatisfaction
    },
    rates: {
      slaCompliance: safeDivide(firstResponseWithinTarget, firstResponseCount || 1),
      handleWithinTarget: safeDivide(handleWithinTarget, handleCount || 1),
      resolution: safeDivide(closedTickets, tickets.length || 1),
      promoterRate: safeDivide(promoters, satisfactionResponses || 1)
    },
    messageTotals: {
      agentMessages: agentMessagesTotal
    },
    satisfactionCounts: {
      promoters,
      passives,
      detractors
    },
    timeline,
    queues,
    agents,
    tags,
    heatmap,
    conversations,
    satisfaction: satisfactionInsight,
    responseMetrics,
    productivity
  };
};

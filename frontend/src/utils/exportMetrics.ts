import { utils as XLSXUtils, writeFileXLSX } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DashboardMetricsResponse, DashboardMetricsFilters } from '@/types/dashboard';
import { formatDuration, formatNumber, formatPercentage } from './formatMetrics';

type ExportFormat = 'csv' | 'xlsx' | 'pdf';

type JsPDFWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

const buildFileName = (filters: DashboardMetricsFilters, extension: string) =>
  `dashboard-metricas_${filters.startDate}_a_${filters.endDate}.${extension}`;

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

const buildSummaryRows = (metrics: DashboardMetricsResponse) => [
  ['Total de tickets (período)', formatNumber(metrics.period.totals.created)],
  ['Tickets encerrados', formatNumber(metrics.period.totals.closed)],
  ['Tickets em aberto', formatNumber(metrics.period.totals.open)],
  ['Tickets em chatbot', formatNumber(metrics.period.totals.bot)],
  ['Tickets pendentes', formatNumber(metrics.period.totals.pending)],
  ['Mensagens trocadas', formatNumber(metrics.period.totals.messages)],
  [
    'Tempo médio de atendimento',
    formatDuration(metrics.period.averages.handleTimeSeconds)
  ],
  ['Taxa de resolução', formatPercentage(metrics.period.resolutionRate)]
];

const exportCsv = (metrics: DashboardMetricsResponse, filters: DashboardMetricsFilters) => {
  const lines: string[] = [];

  const addSection = (title: string, headers: string[], rows: Array<string[]>) => {
    lines.push(title);
    lines.push(headers.join(','));
    rows.forEach((row) => lines.push(row.map((cell) => `"${cell}"`).join(',')));
    lines.push('');
  };

  addSection('Resumo', ['Indicador', 'Valor'], buildSummaryRows(metrics));

  addSection(
    'Linha do tempo',
    ['Período', 'Criados', 'Encerrados', 'Mensagens'],
    metrics.timeline.map((entry) => [
      entry.label,
      formatNumber(entry.created),
      formatNumber(entry.closed),
      formatNumber(entry.messages)
    ])
  );

  addSection(
    'Métricas por atendente',
    ['Atendente', 'Tickets', 'Encerrados', 'Taxa de resolução', 'Tempo médio', 'Mensagens'],
    metrics.agents.map((agent) => [
      agent.name,
      formatNumber(agent.tickets),
      formatNumber(agent.closed),
      formatPercentage(agent.resolutionRate),
      formatDuration(agent.averageHandleTimeSeconds),
      formatNumber(agent.messages)
    ])
  );

  addSection(
    'Métricas por fila',
    ['Fila', 'Tickets', 'Encerrados', 'Taxa de resolução', 'Tempo médio'],
    metrics.queues.map((queue) => [
      queue.name,
      formatNumber(queue.tickets),
      formatNumber(queue.closed),
      formatPercentage(queue.resolutionRate),
      formatDuration(queue.averageHandleTimeSeconds)
    ])
  );

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, buildFileName(filters, 'csv'));
};

const exportXlsx = (metrics: DashboardMetricsResponse, filters: DashboardMetricsFilters) => {
  const workbook = XLSXUtils.book_new();

  const summarySheet = XLSXUtils.aoa_to_sheet([['Indicador', 'Valor'], ...buildSummaryRows(metrics)]);
  XLSXUtils.book_append_sheet(workbook, summarySheet, 'Resumo');

  const timelineSheet = XLSXUtils.json_to_sheet(
    metrics.timeline.map((entry) => ({
      Período: entry.label,
      Criados: entry.created,
      Encerrados: entry.closed,
      Mensagens: entry.messages
    }))
  );
  XLSXUtils.book_append_sheet(workbook, timelineSheet, 'Linha do tempo');

  const agentSheet = XLSXUtils.json_to_sheet(
    metrics.agents.map((agent) => ({
      Atendente: agent.name,
      Tickets: agent.tickets,
      Encerrados: agent.closed,
      'Taxa de resolução': agent.resolutionRate,
      'Tempo médio (s)': agent.averageHandleTimeSeconds ?? 0,
      Mensagens: agent.messages
    }))
  );
  XLSXUtils.book_append_sheet(workbook, agentSheet, 'Atendentes');

  const queueSheet = XLSXUtils.json_to_sheet(
    metrics.queues.map((queue) => ({
      Fila: queue.name,
      Tickets: queue.tickets,
      Encerrados: queue.closed,
      'Taxa de resolução': queue.resolutionRate,
      'Tempo médio (s)': queue.averageHandleTimeSeconds ?? 0
    }))
  );
  XLSXUtils.book_append_sheet(workbook, queueSheet, 'Filas');

  writeFileXLSX(workbook, buildFileName(filters, 'xlsx'));
};

const exportPdf = (metrics: DashboardMetricsResponse, filters: DashboardMetricsFilters) => {
  const doc = new jsPDF();
  const pdf = doc as JsPDFWithAutoTable;
  const margin = 14;

  doc.setFontSize(16);
  doc.text('Dashboard com Métricas', margin, 18);

  doc.setFontSize(10);
  doc.text(`Período: ${filters.startDate} até ${filters.endDate}`, margin, 26);

  autoTable(pdf, {
    head: [['Indicador', 'Valor']],
    body: buildSummaryRows(metrics),
    startY: 34,
    styles: { fontSize: 10 }
  });

  let currentY = pdf.lastAutoTable?.finalY ?? 34;

  autoTable(pdf, {
    head: [['Período', 'Criados', 'Encerrados', 'Mensagens']],
    body: metrics.timeline.map((entry) => [
      entry.label,
      formatNumber(entry.created),
      formatNumber(entry.closed),
      formatNumber(entry.messages)
    ]),
    startY: currentY + 10,
    styles: { fontSize: 9 }
  });

  currentY = pdf.lastAutoTable?.finalY ?? currentY;

  autoTable(pdf, {
    head: [['Atendente', 'Tickets', 'Encerrados', 'Resolução', 'Tempo médio', 'Mensagens']],
    body: metrics.agents.map((agent) => [
      agent.name,
      formatNumber(agent.tickets),
      formatNumber(agent.closed),
      formatPercentage(agent.resolutionRate),
      formatDuration(agent.averageHandleTimeSeconds),
      formatNumber(agent.messages)
    ]),
    startY: currentY + 10,
    styles: { fontSize: 9 }
  });

  currentY = pdf.lastAutoTable?.finalY ?? currentY;

  autoTable(pdf, {
    head: [['Fila', 'Tickets', 'Encerrados', 'Resolução', 'Tempo médio']],
    body: metrics.queues.map((queue) => [
      queue.name,
      formatNumber(queue.tickets),
      formatNumber(queue.closed),
      formatPercentage(queue.resolutionRate),
      formatDuration(queue.averageHandleTimeSeconds)
    ]),
    startY: currentY + 10,
    styles: { fontSize: 9 }
  });

  doc.save(buildFileName(filters, 'pdf'));
};

export const exportMetrics = (
  format: ExportFormat,
  metrics: DashboardMetricsResponse,
  filters: DashboardMetricsFilters
) => {
  if (typeof window === 'undefined') {
    return;
  }

  switch (format) {
    case 'csv':
      exportCsv(metrics, filters);
      break;
    case 'xlsx':
      exportXlsx(metrics, filters);
      break;
    case 'pdf':
      exportPdf(metrics, filters);
      break;
    default:
      throw new Error(`Formato de exportação não suportado: ${format}`);
  }
};

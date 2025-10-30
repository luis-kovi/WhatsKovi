import path from 'path';
import { Request, Response } from 'express';
import { ReportFileFormat } from '@prisma/client';
import {
  normalizeReportFilters,
  buildAdvancedReport,
  generateReportExport
} from '../services/reportingService';
import {
  listReportSchedules,
  createReportSchedule,
  updateReportSchedule,
  deleteReportSchedule,
  triggerReportSchedule,
  listReportSnapshots,
  getReportSnapshot
} from '../services/reportScheduleService';
import { AuthRequest } from '../middleware/auth';

const parseFiltersFromQuery = (req: Request) =>
  normalizeReportFilters({
    startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
    endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
    aggregation: typeof req.query.aggregation === 'string' ? req.query.aggregation : undefined,
    queueId: typeof req.query.queueId === 'string' ? req.query.queueId : undefined,
    userId: typeof req.query.userId === 'string' ? req.query.userId : undefined,
    tagId: typeof req.query.tagId === 'string' ? req.query.tagId : undefined,
    status: typeof req.query.status === 'string' ? req.query.status : undefined
  });

const resolveFormat = (value: unknown): ReportFileFormat => {
  const allowed: ReportFileFormat[] = ['CSV', 'XLSX', 'PDF'];
  if (typeof value !== 'string') {
    return 'PDF';
  }
  const upper = value.toUpperCase();
  if (!allowed.includes(upper as ReportFileFormat)) {
    throw new Error('Formato de exportação inválido.');
  }
  return upper as ReportFileFormat;
};

export const getAdvancedReport = async (req: AuthRequest, res: Response) => {
  try {
    const filters = parseFiltersFromQuery(req);
    const report = await buildAdvancedReport(filters);
    return res.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível gerar o relatório.';
    return res.status(400).json({ error: message });
  }
};

export const exportAdvancedReport = async (req: AuthRequest, res: Response) => {
  try {
    const filters = parseFiltersFromQuery(req);
    const format = resolveFormat(req.query.format);
    const report = await buildAdvancedReport(filters);
    const artifact = await generateReportExport(report, filters, format);

    res.setHeader('Content-Type', artifact.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${artifact.fileName}"`);
    return res.send(artifact.buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao exportar relatório.';
    return res.status(400).json({ error: message });
  }
};

export const listReportSchedulesHandler = async (req: AuthRequest, res: Response) => {
  try {
    const schedules = await listReportSchedules(req.user!.id);
    return res.json(schedules);
  } catch (error) {
    console.error('Erro ao listar agendamentos de relatório:', error);
    return res.status(500).json({ error: 'Erro ao listar agendamentos.' });
  }
};

export const createReportScheduleHandler = async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Dados inválidos para agendamento.' });
    }

    if (!payload.name || !payload.format || !payload.frequency || !payload.timeOfDay) {
      return res.status(400).json({ error: 'Campos obrigatórios não informados.' });
    }

    const schedule = await createReportSchedule(req.user!.id, {
      name: payload.name,
      description: payload.description,
      format: payload.format,
      frequency: payload.frequency,
      timeOfDay: payload.timeOfDay,
      weekdays: Array.isArray(payload.weekdays) ? payload.weekdays : [],
      dayOfMonth: payload.dayOfMonth ?? null,
      timezone: payload.timezone ?? 'UTC',
      recipients: Array.isArray(payload.recipients) ? payload.recipients : [],
      filters: payload.filters ?? {},
      isActive: payload.isActive ?? true
    });

    return res.status(201).json(schedule);
  } catch (error) {
    console.error('Erro ao criar agendamento de relatório:', error);
    const message = error instanceof Error ? error.message : 'Não foi possível criar o agendamento.';
    return res.status(400).json({ error: message });
  }
};

export const updateReportScheduleHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Agendamento não informado.' });
    }

    const schedule = await updateReportSchedule(id, req.user!.id, req.body ?? {});
    return res.json(schedule);
  } catch (error) {
    console.error('Erro ao atualizar agendamento de relatório:', error);
    const message = error instanceof Error ? error.message : 'Não foi possível atualizar o agendamento.';
    return res.status(400).json({ error: message });
  }
};

export const deleteReportScheduleHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Agendamento não informado.' });
    }

    await deleteReportSchedule(id, req.user!.id);
    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover agendamento de relatório:', error);
    const message = error instanceof Error ? error.message : 'Não foi possível remover o agendamento.';
    return res.status(400).json({ error: message });
  }
};

export const runReportScheduleHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Agendamento não informado.' });
    }

    await triggerReportSchedule({ scheduleId: id, userId: req.user!.id });
    return res.status(202).json({ message: 'Agendamento enfileirado para execução.' });
  } catch (error) {
    console.error('Erro ao executar agendamento de relatório:', error);
    const message = error instanceof Error ? error.message : 'Não foi possível enfileirar o relatório.';
    return res.status(400).json({ error: message });
  }
};

export const listReportSnapshotsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const snapshots = await listReportSnapshots(req.user!.id);
    return res.json(snapshots);
  } catch (error) {
    console.error('Erro ao listar relatórios gerados:', error);
    return res.status(500).json({ error: 'Erro ao listar relatórios gerados.' });
  }
};

export const downloadReportSnapshotHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Relatório não informado.' });
    }

    const snapshot = await getReportSnapshot(id, req.user!.id);
    if (!snapshot) {
      return res.status(404).json({ error: 'Relatório não encontrado.' });
    }

    const absolutePath = path.resolve(process.cwd(), snapshot.filePath);
    return res.download(absolutePath, snapshot.fileName);
  } catch (error) {
    console.error('Erro ao baixar relatório gerado:', error);
    return res.status(500).json({ error: 'Erro ao baixar o relatório.' });
  }
};

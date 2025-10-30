import Queue from 'bull';
import { Prisma, ReportFileFormat, ReportFrequency, ReportSchedule, NotificationType } from '@prisma/client';
import prisma from '../config/database';
import {
  normalizeReportFilters,
  buildAdvancedReport,
  persistReportSnapshot,
  ReportFiltersInput,
  ReportFiltersNormalized
} from './reportingService';
import { dispatchNotification } from './notificationService';

const queueName = 'report:schedule';
const connection = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const reportScheduleQueue = new Queue(queueName, connection);

type ReportSchedulePayload = {
  name: string;
  description?: string;
  format: ReportFileFormat;
  frequency: ReportFrequency;
  timeOfDay: string;
  weekdays?: string[];
  dayOfMonth?: number | null;
  timezone?: string;
  recipients: string[];
  filters: ReportFiltersInput;
  isActive?: boolean;
};

type ManualRunOptions = {
  scheduleId: string;
  userId: string;
};

const WEEKDAY_MAP: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6
};

const parseTimeOfDay = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return { hour: 8, minute: 0 };
  }
  const hour = Math.min(Math.max(parseInt(match[1], 10), 0), 23);
  const minute = Math.min(Math.max(parseInt(match[2], 10), 0), 59);
  return { hour, minute };
};

const clampDayOfMonth = (value: number | null | undefined) => {
  if (!value || Number.isNaN(value)) {
    return 1;
  }
  return Math.min(Math.max(value, 1), 28);
};

const buildCronExpression = (schedule: { frequency: ReportFrequency; timeOfDay: string; weekdays: string[]; dayOfMonth?: number | null; timezone?: string }) => {
  const { hour, minute } = parseTimeOfDay(schedule.timeOfDay ?? '08:00');

  switch (schedule.frequency) {
    case 'DAILY':
      return `${minute} ${hour} * * *`;
    case 'WEEKLY': {
      const days =
        schedule.weekdays && schedule.weekdays.length > 0 ? schedule.weekdays : ['MON'];
      const cronDays = days
        .map((day) => WEEKDAY_MAP[day.toUpperCase()] ?? 1)
        .join(',');
      return `${minute} ${hour} * * ${cronDays}`;
    }
    case 'MONTHLY': {
      const day = clampDayOfMonth(schedule.dayOfMonth);
      return `${minute} ${hour} ${day} * *`;
    }
    default:
      return `${minute} ${hour} * * *`;
  }
};

const computeNextRunDate = (schedule: {
  frequency: ReportFrequency;
  timeOfDay: string;
  weekdays: string[];
  dayOfMonth?: number | null;
  timezone?: string;
}) => {
  const now = new Date();
  const { hour, minute } = parseTimeOfDay(schedule.timeOfDay ?? '08:00');
  let candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setHours(hour, minute, 0, 0);

  if (schedule.frequency === 'DAILY') {
    if (candidate <= now) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  if (schedule.frequency === 'WEEKLY') {
    const days = schedule.weekdays && schedule.weekdays.length > 0 ? schedule.weekdays : ['MON'];
    const dayNumbers = days.map((day) => WEEKDAY_MAP[day.toUpperCase()] ?? 1);
    for (let i = 0; i < 14; i += 1) {
      if (dayNumbers.includes(candidate.getDay()) && candidate > now) {
        return candidate;
      }
      candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
      candidate.setHours(hour, minute, 0, 0);
    }
    return candidate;
  }

  // MONTHLY
  const targetDay = clampDayOfMonth(schedule.dayOfMonth);
  const currentMonth = candidate.getMonth();
  candidate.setDate(targetDay);
  if (candidate <= now) {
    candidate.setMonth(currentMonth + 1, targetDay);
  }
  const lastDay = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
  candidate.setDate(Math.min(targetDay, lastDay));
  candidate.setHours(hour, minute, 0, 0);
  return candidate;
};

const parseFiltersInput = (filters: Prisma.JsonValue): ReportFiltersInput => {
  const payload = (filters && typeof filters === 'object' ? filters : {}) as Record<string, unknown>;
  return {
    startDate: typeof payload.startDate === 'string' ? payload.startDate : undefined,
    endDate: typeof payload.endDate === 'string' ? payload.endDate : undefined,
    aggregation: typeof payload.aggregation === 'string' ? payload.aggregation : undefined,
    queueId: typeof payload.queueId === 'string' ? payload.queueId : undefined,
    userId: typeof payload.userId === 'string' ? payload.userId : undefined,
    tagId: typeof payload.tagId === 'string' ? payload.tagId : undefined,
    status: typeof payload.status === 'string' ? payload.status : undefined
  };
};

const registerScheduleJob = async (schedule: ReportSchedule) => {
  const cron = buildCronExpression(schedule);

  return reportScheduleQueue.add(
    'execute',
    { scheduleId: schedule.id },
    {
      jobId: schedule.id,
      repeat: {
        cron,
        tz: schedule.timezone ?? 'UTC'
      },
      removeOnComplete: true,
      removeOnFail: true
    }
  );
};

const removeScheduleJob = async (schedule: ReportSchedule) => {
  const cron = buildCronExpression(schedule);
  try {
    await reportScheduleQueue.removeRepeatable('execute', {
      cron,
      jobId: schedule.id,
      tz: schedule.timezone ?? 'UTC'
    });
  } catch (error) {
    // removeRepeatable throws if job not found; ignore
  }
};

export const bootstrapReportSchedules = async () => {
  const schedules = await prisma.reportSchedule.findMany({
    where: { isActive: true }
  });

  for (const schedule of schedules) {
    await registerScheduleJob(schedule);
  }
};

const runReportGeneration = async (schedule: ReportSchedule) => {
  const filtersInput = parseFiltersInput(schedule.filters);
  const filtersNormalized: ReportFiltersNormalized = normalizeReportFilters(filtersInput);
  const report = await buildAdvancedReport(filtersNormalized);

  const snapshot = await persistReportSnapshot(
    report,
    filtersNormalized,
    schedule.format,
    schedule.userId,
    schedule.id
  );

  await prisma.reportSchedule.update({
    where: { id: schedule.id },
    data: {
      lastRunAt: new Date(),
      nextRunAt: computeNextRunDate(schedule)
    }
  });

  await dispatchNotification({
    userId: schedule.userId,
    type: 'REPORT_READY' as NotificationType,
    title: `Relatório ${schedule.name} disponível`,
    body: 'Um novo relatório agendado foi gerado.',
    data: {
      snapshotId: snapshot.id,
      scheduleId: schedule.id
    }
  });
};

reportScheduleQueue.process('execute', async (job) => {
  const { scheduleId } = job.data as { scheduleId?: string };

  if (!scheduleId) {
    return;
  }

  const schedule = await prisma.reportSchedule.findUnique({
    where: { id: scheduleId }
  });

  if (!schedule) {
    return;
  }

  if (!schedule.isActive) {
    return;
  }

  await runReportGeneration(schedule);
});

export const listReportSchedules = async (userId: string) => {
  return prisma.reportSchedule.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
};

export const createReportSchedule = async (userId: string, payload: ReportSchedulePayload) => {
  const normalizedFilters = normalizeReportFilters(payload.filters);
  const nextRun = computeNextRunDate({
    frequency: payload.frequency,
    timeOfDay: payload.timeOfDay,
    weekdays: payload.weekdays ?? [],
    dayOfMonth: payload.dayOfMonth,
    timezone: payload.timezone
  });

  const isActive = payload.isActive ?? true;

  let schedule = await prisma.reportSchedule.create({
    data: {
      userId,
      name: payload.name,
      description: payload.description ?? null,
      format: payload.format,
      frequency: payload.frequency,
      timeOfDay: payload.timeOfDay,
      weekdays: payload.weekdays ?? [],
      dayOfMonth: payload.dayOfMonth ?? null,
      timezone: payload.timezone ?? 'UTC',
      recipients: payload.recipients,
      filters: {
        startDate: normalizedFilters.start.toISOString().slice(0, 10),
        endDate: normalizedFilters.end.toISOString().slice(0, 10),
        aggregation: normalizedFilters.aggregation,
        queueId: normalizedFilters.queueId ?? '',
        userId: normalizedFilters.userId ?? '',
        tagId: normalizedFilters.tagId ?? '',
        status: normalizedFilters.status ?? ''
      } as Prisma.InputJsonValue,
      isActive,
      nextRunAt: isActive ? nextRun : null
    }
  });

  if (schedule.isActive) {
    const job = await registerScheduleJob(schedule);
    const jobId = job?.id ? job.id.toString() : schedule.id;
    await prisma.reportSchedule.update({
      where: { id: schedule.id },
      data: { jobId }
    });
    const refreshed = await prisma.reportSchedule.findUnique({ where: { id: schedule.id } });
    if (refreshed) {
      schedule = refreshed;
    }
  }

  return schedule;
};

export const updateReportSchedule = async (
  scheduleId: string,
  userId: string,
  payload: Partial<ReportSchedulePayload>
) => {
  const existing = await prisma.reportSchedule.findUnique({
    where: { id: scheduleId }
  });

  if (!existing || existing.userId !== userId) {
    throw new Error('Relatório não encontrado.');
  }

  await removeScheduleJob(existing);

  const filtersInput =
    payload.filters !== undefined ? normalizeReportFilters(payload.filters) : normalizeReportFilters(parseFiltersInput(existing.filters));

  const nextRun = computeNextRunDate({
    frequency: payload.frequency ?? existing.frequency,
    timeOfDay: payload.timeOfDay ?? existing.timeOfDay,
    weekdays: payload.weekdays ?? existing.weekdays,
    dayOfMonth: payload.dayOfMonth ?? existing.dayOfMonth ?? undefined,
    timezone: payload.timezone ?? existing.timezone ?? 'UTC'
  });

  const updateData: Prisma.ReportScheduleUpdateInput = {
    name: payload.name ?? existing.name,
    description: payload.description ?? existing.description,
    format: payload.format ?? existing.format,
    frequency: payload.frequency ?? existing.frequency,
    timeOfDay: payload.timeOfDay ?? existing.timeOfDay,
    weekdays: payload.weekdays ?? existing.weekdays,
    dayOfMonth: payload.dayOfMonth !== undefined ? payload.dayOfMonth : existing.dayOfMonth,
    timezone: payload.timezone ?? existing.timezone ?? 'UTC',
    recipients: payload.recipients ?? existing.recipients,
    isActive: payload.isActive ?? existing.isActive,
    nextRunAt: payload.isActive === false ? null : nextRun,
    jobId: null
  };

  if (payload.filters !== undefined) {
    updateData.filters = {
      startDate: filtersInput.start.toISOString().slice(0, 10),
      endDate: filtersInput.end.toISOString().slice(0, 10),
      aggregation: filtersInput.aggregation,
      queueId: filtersInput.queueId ?? '',
      userId: filtersInput.userId ?? '',
      tagId: filtersInput.tagId ?? '',
      status: filtersInput.status ?? ''
    } as Prisma.InputJsonValue;
  }

  const updated = await prisma.reportSchedule.update({
    where: { id: scheduleId },
    data: updateData
  });

  if (updated.isActive) {
    const job = await registerScheduleJob(updated);
    const jobId = job?.id ? job.id.toString() : updated.id;
    await prisma.reportSchedule.update({
      where: { id: updated.id },
      data: { jobId }
    });
    const refreshed = await prisma.reportSchedule.findUnique({ where: { id: updated.id } });
    if (refreshed) {
      return refreshed;
    }
  }

  return updated;
};

export const deleteReportSchedule = async (scheduleId: string, userId: string) => {
  const existing = await prisma.reportSchedule.findUnique({
    where: { id: scheduleId }
  });

  if (!existing || existing.userId !== userId) {
    throw new Error('Relatório não encontrado.');
  }

  await removeScheduleJob(existing);
  await prisma.reportSchedule.delete({ where: { id: scheduleId } });
};

export const triggerReportSchedule = async ({ scheduleId, userId }: ManualRunOptions) => {
  const schedule = await prisma.reportSchedule.findUnique({
    where: { id: scheduleId }
  });

  if (!schedule || schedule.userId !== userId) {
    throw new Error('Relatório não encontrado.');
  }

  return reportScheduleQueue.add(
    'execute',
    { scheduleId },
    {
      jobId: `manual:${scheduleId}:${Date.now()}`,
      removeOnComplete: true,
      removeOnFail: true
    }
  );
};

export const listReportSnapshots = async (userId: string, limit = 25) => {
  return prisma.reportSnapshot.findMany({
    where: { userId },
    orderBy: { generatedAt: 'desc' },
    take: limit,
    include: {
      schedule: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
};

export const getReportSnapshot = async (snapshotId: string, userId: string) => {
  return prisma.reportSnapshot.findFirst({
    where: { id: snapshotId, userId }
  });
};

import Queue from 'bull';
import {
  MessageChannel,
  MessageStatus,
  MessageType,
  Prisma,
  ScheduledMessage,
  ScheduledMessageLogStatus,
  ScheduledMessageRecurrence,
  ScheduledMessageStatus
} from '@prisma/client';
import prisma from '../config/database';
import { sendWhatsAppMessage } from './whatsappService';
import { applyAutomaticTagsToTicket } from './tagAutomation';
import { io } from '../server';
import { emitMessageEvent } from './integrationService';

const connection = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const queueName = 'message:schedule';

export const scheduledMessageQueue = new Queue(queueName, connection);

type WeekdayCode = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

const WEEKDAY_MAP: Record<WeekdayCode, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6
};

const messageInclude: Prisma.MessageInclude = {
  user: { select: { id: true, name: true, avatar: true } },
  quotedMessage: {
    select: {
      id: true,
      body: true,
      type: true,
      mediaUrl: true,
      createdAt: true,
      user: { select: { id: true, name: true, avatar: true } },
      deliveryMetadata: true
    }
  },
  reactions: {
    include: {
      user: { select: { id: true, name: true, avatar: true } }
    }
  }
};

const clampDayOfMonth = (value?: number | null) => {
  if (!value || Number.isNaN(value)) {
    return undefined;
  }
  return Math.min(Math.max(value, 1), 28);
};

const normalizeWeekdays = (weekdays?: string[] | string) => {
  if (!weekdays) {
    return [] as WeekdayCode[];
  }
  const input = Array.isArray(weekdays) ? weekdays : [weekdays];
  const normalized = input
    .map((day) => day?.toString().trim().toUpperCase())
    .filter((day): day is WeekdayCode => Boolean(day) && (day as WeekdayCode) in WEEKDAY_MAP);
  return Array.from(new Set(normalized));
};

const computeNextRun = (options: {
  scheduledFor: Date;
  recurrence: ScheduledMessageRecurrence;
  weekdays: WeekdayCode[];
  dayOfMonth?: number | null;
  after?: Date;
}) => {
  const { scheduledFor, recurrence, weekdays, dayOfMonth } = options;
  const reference = options.after ?? new Date();
  const base = new Date(scheduledFor);
  base.setMilliseconds(0);
  base.setSeconds(0);

  if (Number.isNaN(base.getTime())) {
    return null;
  }

  const compare = (candidate: Date) => candidate.getTime() > reference.getTime();
  const cloneWithBaseTime = (target: Date) => {
    target.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), 0);
    return target;
  };

  if (recurrence === 'NONE') {
    return compare(base) ? base : null;
  }

  if (recurrence === 'DAILY') {
    const candidate = new Date(base);
    while (!compare(candidate)) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  if (recurrence === 'WEEKLY') {
    const allowed = weekdays.length > 0 ? weekdays.map((day) => WEEKDAY_MAP[day]) : [base.getDay()];
    let candidate =
      compare(base) && allowed.includes(base.getDay()) ? new Date(base) : cloneWithBaseTime(new Date(reference));

    candidate = cloneWithBaseTime(candidate);

    for (let i = 0; i < 14; i += 1) {
      if (compare(candidate) && allowed.includes(candidate.getDay())) {
        return candidate;
      }
      candidate.setDate(candidate.getDate() + 1);
      candidate = cloneWithBaseTime(candidate);
    }
    return null;
  }

  if (recurrence === 'MONTHLY') {
    const desiredDay = clampDayOfMonth(dayOfMonth) ?? base.getDate();
    const candidate = new Date(base);
    candidate.setDate(desiredDay);
    candidate.setMilliseconds(0);

    if (!compare(candidate)) {
      const tmp = cloneWithBaseTime(new Date(reference));
      tmp.setDate(desiredDay);
      if (!compare(tmp)) {
        tmp.setMonth(tmp.getMonth() + 1);
        const lastDay = new Date(tmp.getFullYear(), tmp.getMonth() + 1, 0).getDate();
        tmp.setDate(Math.min(desiredDay, lastDay));
      }
      tmp.setMilliseconds(0);
      return tmp;
    }

    return candidate;
  }

  return null;
};

const registerScheduledMessageJob = async (schedule: ScheduledMessage) => {
  if (!schedule.nextRunAt || schedule.status !== 'ACTIVE') {
    return null;
  }

  const delay = Math.max(schedule.nextRunAt.getTime() - Date.now(), 0);

  const job = await scheduledMessageQueue.add(
    'send',
    { id: schedule.id },
    {
      jobId: schedule.id,
      delay,
      removeOnComplete: true,
      removeOnFail: true,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000
      }
    }
  );

  await prisma.scheduledMessage.update({
    where: { id: schedule.id },
    data: { jobId: job.id?.toString() ?? schedule.id }
  });

  return job;
};

const removeScheduledMessageJob = async (schedule: ScheduledMessage | null) => {
  if (!schedule) {
    return;
  }

  const jobId = schedule.jobId ?? schedule.id;
  const job = await scheduledMessageQueue.getJob(jobId);
  if (job) {
    await job.remove();
  }
};

const ensureTicketForScheduling = async (ticketId: string) => {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      contact: true,
      whatsapp: true
    }
  });
};

type SchedulePayload = {
  body: string;
  type?: MessageType;
  isPrivate?: boolean;
  mediaUrl?: string | null;
  recurrence?: ScheduledMessageRecurrence;
  weekdays?: string[] | string;
  dayOfMonth?: number | null;
  timezone?: string;
  scheduledFor: string | Date;
};

type UpdateSchedulePayload = Partial<SchedulePayload> & {
  status?: ScheduledMessageStatus;
  cancelReason?: string | null;
};

const computeScheduleState = (
  base: ScheduledMessage,
  overrides: Partial<{
    recurrence: ScheduledMessageRecurrence;
    weekdays: WeekdayCode[];
    dayOfMonth?: number | null;
    scheduledFor: Date;
  }>
) => {
  return {
    recurrence: overrides.recurrence ?? base.recurrence,
    weekdays: overrides.weekdays ?? (base.weekdays as WeekdayCode[]),
    dayOfMonth: overrides.dayOfMonth ?? base.dayOfMonth ?? undefined,
    scheduledFor: overrides.scheduledFor ?? base.scheduledFor
  };
};

const finalizeScheduleRun = async (
  schedule: ScheduledMessage,
  runAt: Date,
  options: { succeeded: boolean; errorMessage?: string | null }
) => {
  const state = computeScheduleState(schedule, {});
  const nextRun = options.succeeded
    ? computeNextRun({
        scheduledFor: state.scheduledFor,
        recurrence: state.recurrence,
        weekdays: state.weekdays,
        dayOfMonth: state.dayOfMonth,
        after: runAt
      })
    : null;

  const updateData: Prisma.ScheduledMessageUpdateInput = {
    lastRunAt: runAt,
    jobId: null
  };

  if (options.succeeded) {
    if (nextRun) {
      updateData.nextRunAt = nextRun;
    } else {
      updateData.nextRunAt = null;
      updateData.status = ScheduledMessageStatus.COMPLETED;
    }
  } else {
    updateData.nextRunAt = null;
    updateData.status = ScheduledMessageStatus.PAUSED;
    updateData.cancelReason = options.errorMessage ?? 'Falha ao enviar mensagem agendada.';
  }

  const updated = await prisma.scheduledMessage.update({
    where: { id: schedule.id },
    data: updateData
  });

  if (options.succeeded && updated.status === ScheduledMessageStatus.ACTIVE && updated.nextRunAt) {
    await registerScheduledMessageJob(updated);
  }
};

scheduledMessageQueue.process('send', async (job) => {
  const { id } = job.data as { id?: string };
  if (!id) {
    return;
  }

  const schedule = await prisma.scheduledMessage.findUnique({
    where: { id },
    include: {
      ticket: {
        include: {
          contact: true,
          whatsapp: true
        }
      }
    }
  });

  if (!schedule || schedule.status !== ScheduledMessageStatus.ACTIVE || !schedule.ticket) {
    return;
  }

  const runAt = new Date();

  let logStatus: ScheduledMessageLogStatus = ScheduledMessageLogStatus.SUCCESS;
  let errorMessage: string | null = null;
  let messageId: string | undefined;

  try {
    const ticket = schedule.ticket;
    if (!ticket.contact || !ticket.whatsapp) {
      throw new Error('Ticket sem contato ou conexao WhatsApp ativa.');
    }

    const channel = schedule.isPrivate ? MessageChannel.INTERNAL : MessageChannel.WHATSAPP;
    const initialStatus = schedule.isPrivate ? MessageStatus.SENT : MessageStatus.PENDING;

    const createdMessage = await prisma.message.create({
      data: {
        body: schedule.body,
        type: schedule.type,
        isPrivate: schedule.isPrivate,
        mediaUrl: schedule.mediaUrl,
        ticketId: schedule.ticketId,
        userId: schedule.userId,
        status: initialStatus,
        channel
      }
    });

    messageId = createdMessage.id;

    await prisma.ticket.update({
      where: { id: schedule.ticketId },
      data: {
        lastMessageAt: runAt,
        ...(schedule.isPrivate ? {} : { unreadMessages: 0 })
      }
    });

    await prisma.contact.update({
      where: { id: ticket.contactId },
      data: { lastInteractionAt: runAt }
    });

    let finalMessage: Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

    if (!schedule.isPrivate) {
      await sendWhatsAppMessage(
        ticket.whatsappId,
        ticket.contact.phoneNumber,
        schedule.body,
        schedule.mediaUrl ?? undefined
      );

      finalMessage = await prisma.message.update({
        where: { id: createdMessage.id },
        data: { status: MessageStatus.SENT },
        include: messageInclude
      });
    } else {
      const fetched = await prisma.message.findUnique({
        where: { id: createdMessage.id },
        include: messageInclude
      });

      if (!fetched) {
        throw new Error('Mensagem agendada nao encontrada apos a criacao.');
      }

      finalMessage = fetched;
    }

    if (!schedule.isPrivate) {
      await applyAutomaticTagsToTicket(schedule.ticketId, finalMessage.body ?? '');
    }

    io.emit('message:new', { ...finalMessage, ticketId: schedule.ticketId });
    if (!schedule.isPrivate) {
      emitMessageEvent(finalMessage.id, 'OUTBOUND').catch((error) => {
        console.warn('[Integration] Failed to emit scheduled message event', error);
      });
    }
  } catch (error) {
    if (messageId) {
      await prisma.message.update({
        where: { id: messageId },
        data: { status: MessageStatus.FAILED }
      }).catch(() => undefined);
    }

    logStatus = ScheduledMessageLogStatus.FAILED;
    errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao enviar mensagem.';
  }

  await prisma.scheduledMessageLog.create({
    data: {
      scheduledMessageId: schedule.id,
      messageId,
      status: logStatus,
      error: errorMessage ?? undefined
    }
  });

  await finalizeScheduleRun(schedule, runAt, {
    succeeded: logStatus === ScheduledMessageLogStatus.SUCCESS,
    errorMessage
  });
});

export const bootstrapScheduledMessages = async () => {
  const activeSchedules = await prisma.scheduledMessage.findMany({
    where: {
      status: ScheduledMessageStatus.ACTIVE
    }
  });

  const now = new Date();

  await Promise.all(
    activeSchedules.map(async (schedule) => {
      let nextRun = schedule.nextRunAt;
      if (!nextRun || nextRun.getTime() <= now.getTime()) {
        const computed = computeNextRun({
          scheduledFor: schedule.scheduledFor,
          recurrence: schedule.recurrence,
          weekdays: schedule.weekdays as WeekdayCode[],
          dayOfMonth: schedule.dayOfMonth ?? undefined,
          after: now
        });

        if (!computed) {
          await prisma.scheduledMessage.update({
            where: { id: schedule.id },
            data: {
              status: ScheduledMessageStatus.COMPLETED,
              nextRunAt: null
            }
          });
          return;
        }

        nextRun = computed;
        await prisma.scheduledMessage.update({
          where: { id: schedule.id },
          data: {
            nextRunAt: computed
          }
        });
      }

      await registerScheduledMessageJob({
        ...schedule,
        nextRunAt: nextRun
      });
    })
  );
};

export const listScheduledMessages = async (ticketId: string) => {
  return prisma.scheduledMessage.findMany({
    where: { ticketId },
    orderBy: [{ status: 'asc' }, { nextRunAt: 'asc' }],
    include: {
      logs: {
        orderBy: { runAt: 'desc' },
        take: 10
      },
      user: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
};

export const createScheduledMessage = async (
  userId: string,
  ticketId: string,
  payload: SchedulePayload
) => {
  if (!payload.body || payload.body.trim().length === 0) {
    throw new Error('Mensagem obrigatoria para agendamento.');
  }

  const ticket = await ensureTicketForScheduling(ticketId);
  if (!ticket) {
    throw new Error('Ticket nao encontrado.');
  }
  if (!ticket.contact || !ticket.whatsapp) {
    throw new Error('Ticket sem contato ou conexao WhatsApp ativa.');
  }

  const scheduledFor = new Date(payload.scheduledFor);
  if (Number.isNaN(scheduledFor.getTime())) {
    throw new Error('Data de envio invalida.');
  }

  const recurrence = payload.recurrence ?? ScheduledMessageRecurrence.NONE;
  const weekdays = normalizeWeekdays(payload.weekdays);
  const dayOfMonth = clampDayOfMonth(payload.dayOfMonth);

  const nextRun = computeNextRun({
    scheduledFor,
    recurrence,
    weekdays,
    dayOfMonth,
    after: new Date(Date.now() - 1000)
  });

  if (!nextRun) {
    throw new Error('Nao foi possivel calcular a proxima execucao. Verifique a data informada.');
  }

  const schedule = await prisma.scheduledMessage.create({
    data: {
      ticketId,
      userId,
      body: payload.body.trim(),
      type: payload.type ?? MessageType.TEXT,
      isPrivate: payload.isPrivate ?? false,
      mediaUrl: payload.mediaUrl ?? null,
      recurrence,
      weekdays,
      dayOfMonth,
      timezone: payload.timezone ?? 'UTC',
      scheduledFor,
      nextRunAt: nextRun,
      status: ScheduledMessageStatus.ACTIVE
    }
  });

  await registerScheduledMessageJob(schedule);

  return prisma.scheduledMessage.findUnique({
    where: { id: schedule.id },
    include: {
      logs: {
        orderBy: { runAt: 'desc' },
        take: 10
      },
      user: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
};

export const updateScheduledMessage = async (
  scheduleId: string,
  userId: string,
  payload: UpdateSchedulePayload,
  allowAdminOverride = false
) => {
  const schedule = await prisma.scheduledMessage.findUnique({ where: { id: scheduleId } });
  if (!schedule) {
    throw new Error('Agendamento nao encontrado.');
  }

  if (schedule.userId !== userId && !allowAdminOverride) {
    throw new Error('Sem permissao para alterar este agendamento.');
  }

  const weekdays = payload.weekdays ? normalizeWeekdays(payload.weekdays) : (schedule.weekdays as WeekdayCode[]);
  const dayOfMonth =
    payload.dayOfMonth !== undefined ? clampDayOfMonth(payload.dayOfMonth) : schedule.dayOfMonth ?? undefined;
  const scheduledFor =
    payload.scheduledFor !== undefined
      ? new Date(payload.scheduledFor)
      : schedule.scheduledFor;

  if (payload.scheduledFor && Number.isNaN(scheduledFor.getTime())) {
    throw new Error('Data de envio invalida.');
  }

  let recurrence = schedule.recurrence;
  if (payload.recurrence) {
    recurrence = payload.recurrence;
  }

  let bodyValue = schedule.body;
  if (payload.body !== undefined) {
    const trimmed = payload.body.trim();
    if (!trimmed) {
      throw new Error('Mensagem nao pode ficar vazia.');
    }
    bodyValue = trimmed;
  }

  const updateData: Prisma.ScheduledMessageUpdateInput = {
    body: bodyValue,
    type: payload.type ?? schedule.type,
    isPrivate: payload.isPrivate ?? schedule.isPrivate,
    mediaUrl: payload.mediaUrl !== undefined ? payload.mediaUrl : schedule.mediaUrl,
    recurrence,
    weekdays,
    dayOfMonth: dayOfMonth ?? null,
    timezone: payload.timezone ?? schedule.timezone,
    scheduledFor,
    cancelReason: payload.cancelReason ?? schedule.cancelReason
  };

  let nextRun: Date | null = schedule.nextRunAt;
  let status = schedule.status;

  if (
    payload.scheduledFor !== undefined ||
    payload.recurrence !== undefined ||
    payload.weekdays !== undefined ||
    payload.dayOfMonth !== undefined
  ) {
    nextRun = computeNextRun({
      scheduledFor,
      recurrence,
      weekdays,
      dayOfMonth,
      after: new Date(Date.now() - 1000)
    });
    updateData.nextRunAt = nextRun;
  }

  if (payload.status) {
    status = payload.status;
    updateData.status = status;
    if (status === ScheduledMessageStatus.PAUSED) {
      updateData.nextRunAt = null;
      nextRun = null;
      updateData.jobId = null;
    }
    if (status === ScheduledMessageStatus.ACTIVE && !nextRun) {
      nextRun = computeNextRun({
        scheduledFor,
        recurrence,
        weekdays,
        dayOfMonth,
        after: new Date()
      });
      if (!nextRun) {
        throw new Error('Nao foi possivel reagendar a proxima execucao.');
      }
      updateData.nextRunAt = nextRun;
    }
    if (
      status === ScheduledMessageStatus.CANCELLED ||
      status === ScheduledMessageStatus.COMPLETED
    ) {
      updateData.nextRunAt = null;
      nextRun = null;
      updateData.jobId = null;
      if (status === ScheduledMessageStatus.CANCELLED) {
        updateData.cancelledAt = new Date();
      }
    }
  }

  await removeScheduledMessageJob(schedule);

  const updated = await prisma.scheduledMessage.update({
    where: { id: scheduleId },
    data: updateData
  });

  if (status === ScheduledMessageStatus.ACTIVE && nextRun) {
    await registerScheduledMessageJob(updated);
  }

  return prisma.scheduledMessage.findUnique({
    where: { id: updated.id },
    include: {
      logs: {
        orderBy: { runAt: 'desc' },
        take: 10
      },
      user: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
};

export const cancelScheduledMessage = async (
  scheduleId: string,
  userId: string,
  allowAdminOverride = false,
  reason?: string
) => {
  const schedule = await prisma.scheduledMessage.findUnique({ where: { id: scheduleId } });
  if (!schedule) {
    throw new Error('Agendamento nao encontrado.');
  }

  if (schedule.userId !== userId && !allowAdminOverride) {
    throw new Error('Sem permissao para cancelar este agendamento.');
  }

  await removeScheduledMessageJob(schedule);

  return prisma.scheduledMessage.update({
    where: { id: scheduleId },
    data: {
      status: ScheduledMessageStatus.CANCELLED,
      cancelledAt: new Date(),
      nextRunAt: null,
      jobId: null,
      cancelReason: reason ?? schedule.cancelReason
    },
    include: {
      logs: {
        orderBy: { runAt: 'desc' },
        take: 10
      },
      user: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
};

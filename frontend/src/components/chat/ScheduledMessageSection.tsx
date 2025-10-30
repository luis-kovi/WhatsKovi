'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import {
  Calendar,
  Clock3,
  Plus,
  Edit2,
  PauseCircle,
  PlayCircle,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  History
} from 'lucide-react';
import { useScheduledMessageStore } from '@/store/scheduledMessageStore';
import type {
  ScheduledMessage,
  ScheduledMessageRecurrence,
  CreateScheduledMessageRequest,
  UpdateScheduledMessageRequest
} from '@/types/scheduledMessages';

const STATUS_LABELS: Record<ScheduledMessage['status'], string> = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  COMPLETED: 'Concluido',
  CANCELLED: 'Cancelado'
};

const STATUS_STYLES: Record<ScheduledMessage['status'], string> = {
  ACTIVE: 'bg-green-50 text-green-700 border border-green-200',
  PAUSED: 'bg-amber-50 text-amber-700 border border-amber-200',
  COMPLETED: 'bg-gray-100 text-gray-600 border border-gray-200',
  CANCELLED: 'bg-red-50 text-red-600 border border-red-200'
};

const RECURRENCE_OPTIONS: { value: ScheduledMessageRecurrence; label: string; description: string }[] = [
  { value: 'NONE', label: 'Envio unico', description: 'Envia apenas na data selecionada' },
  { value: 'DAILY', label: 'Diario', description: 'Repete todos os dias no mesmo horario' },
  { value: 'WEEKLY', label: 'Semanal', description: 'Repete nos dias da semana escolhidos' },
  { value: 'MONTHLY', label: 'Mensal', description: 'Repete no dia escolhido de cada mes' }
];

const WEEKDAY_OPTIONS = [
  { code: 'MON', label: 'Segunda', short: 'S' },
  { code: 'TUE', label: 'Terca', short: 'T' },
  { code: 'WED', label: 'Quarta', short: 'Q' },
  { code: 'THU', label: 'Quinta', short: 'Q' },
  { code: 'FRI', label: 'Sexta', short: 'S' },
  { code: 'SAT', label: 'Sabado', short: 'S' },
  { code: 'SUN', label: 'Domingo', short: 'D' }
] as const;

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '-';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(iso));
  } catch {
    return '-';
  }
};

const formatRecurrenceSummary = (schedule: ScheduledMessage) => {
  switch (schedule.recurrence) {
    case 'DAILY':
      return 'Diario';
    case 'WEEKLY':
      if (!schedule.weekdays || schedule.weekdays.length === 0) return 'Semanal';
      return `Semanal (${schedule.weekdays.join(', ')})`;
    case 'MONTHLY':
      return `Mensal (dia ${schedule.dayOfMonth ?? new Date(schedule.scheduledFor).getDate()})`;
    default:
      return 'Envio unico';
  }
};

type ScheduleModalResult = {
  body: string;
  scheduledFor: string;
  recurrence: ScheduledMessageRecurrence;
  weekdays: string[];
  dayOfMonth: number | null;
  timezone: string;
};

type ScheduleModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialSchedule?: ScheduledMessage | null;
  onClose: () => void;
  onSubmit: (payload: ScheduleModalResult) => Promise<void>;
};

const buildInitialDate = (schedule?: ScheduledMessage | null) => {
  if (schedule?.nextRunAt) {
    return new Date(schedule.nextRunAt);
  }
  if (schedule?.scheduledFor) {
    return new Date(schedule.scheduledFor);
  }
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  now.setSeconds(0, 0);
  return now;
};

const toUtcIso = (date: Date, time: string) => {
  const [hourStr, minuteStr] = time.split(':');
  const hours = Number.parseInt(hourStr ?? '0', 10);
  const minutes = Number.parseInt(minuteStr ?? '0', 10);
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0)
  ).toISOString();
};

const ScheduleModal = ({ open, mode, initialSchedule, onClose, onSubmit }: ScheduleModalProps) => {
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC', []);

  const initialDate = useMemo(() => buildInitialDate(initialSchedule), [initialSchedule]);
  const [body, setBody] = useState(initialSchedule?.body ?? '');
  const [recurrence, setRecurrence] = useState<ScheduledMessageRecurrence>(
    initialSchedule?.recurrence ?? 'NONE'
  );
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [activeMonth, setActiveMonth] = useState(startOfMonth(initialDate));
  const [time, setTime] = useState(format(initialDate, 'HH:mm'));
  const [weekdays, setWeekdays] = useState<string[]>(initialSchedule?.weekdays ?? []);
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(initialSchedule?.dayOfMonth ?? null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const nextDate = buildInitialDate(initialSchedule);
      setBody(initialSchedule?.body ?? '');
      setRecurrence(initialSchedule?.recurrence ?? 'NONE');
      setSelectedDate(nextDate);
      setActiveMonth(startOfMonth(nextDate));
      setTime(format(nextDate, 'HH:mm'));
      setWeekdays(initialSchedule?.weekdays ?? []);
      setDayOfMonth(initialSchedule?.dayOfMonth ?? null);
      setSubmitting(false);
    }
  }, [open, initialSchedule]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(activeMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(activeMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [activeMonth]);

  const toggleWeekday = (code: string) => {
    setWeekdays((current) => {
      if (current.includes(code)) {
        return current.filter((item) => item !== code);
      }
      return [...current, code];
    });
  };

  const handleConfirm = async () => {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      toast.error('Informe o conteudo da mensagem.');
      return;
    }

    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      toast.error('Informe um horario valido.');
      return;
    }

    if (recurrence === 'WEEKLY' && weekdays.length === 0) {
      toast.error('Selecione pelo menos um dia da semana.');
      return;
    }

    const referenceDate = new Date(selectedDate);
    referenceDate.setHours(0, 0, 0, 0);

    const iso = toUtcIso(referenceDate, time);

    const payload: ScheduleModalResult = {
      body: trimmedBody,
      scheduledFor: iso,
      recurrence,
      weekdays: recurrence === 'WEEKLY' ? weekdays : [],
      dayOfMonth: recurrence === 'MONTHLY' ? (dayOfMonth ?? referenceDate.getDate()) : null,
      timezone
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      setSubmitting(false);
      onClose();
    } catch (error) {
      setSubmitting(false);
      console.error('Erro ao salvar agendamento:', error);
      toast.error('Nao foi possivel salvar o agendamento.');
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'create' ? 'Agendar nova mensagem' : 'Editar agendamento'}
            </h3>
            <p className="text-sm text-gray-500">
              Escolha data, horario e recorrencia para enviar mensagens automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </button>
        </header>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
          <section className="space-y-4">
            <div className="rounded-3xl border border-gray-200 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800">Calendario</h4>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveMonth((prev) => addMonths(prev, -1))}
                    className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {format(activeMonth, 'MMMM yyyy')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveMonth((prev) => addMonths(prev, 1))}
                    className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-gray-400">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const inMonth = isSameMonth(day, activeMonth);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => {
                        const next = new Date(day);
                        next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
                        setSelectedDate(next);
                      }}
                      className={`h-10 w-full rounded-full text-sm transition ${
                        isSelected
                          ? 'bg-primary text-white shadow-md shadow-primary/40'
                          : inMonth
                          ? 'text-gray-700 hover:bg-gray-100'
                          : 'text-gray-300 hover:bg-gray-100/50'
                      }`}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 p-4">
              <label className="text-xs font-semibold uppercase text-gray-500">Horario</label>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              <label className="mt-4 block text-xs font-semibold uppercase text-gray-500">
                Conteudo da mensagem
              </label>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={5}
                className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Digite a mensagem que sera enviada automaticamente..."
              />

              <p className="mt-3 text-[11px] text-gray-400">
                A mensagem sera enviada via conexao WhatsApp configurada para o ticket. Evite dados sensiveis.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-3xl border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-800">Recorrencia</h4>
              <div className="mt-3 space-y-2">
                {RECURRENCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRecurrence(option.value)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm transition ${
                      recurrence === option.value
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    <span className="font-semibold">{option.label}</span>
                    <span className="text-xs text-gray-400">{option.description}</span>
                  </button>
                ))}
              </div>

              {recurrence === 'WEEKLY' && (
                <div className="mt-4 space-y-2">
                  <span className="text-xs font-semibold uppercase text-gray-500">Dias da semana</span>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((weekday) => {
                      const active = weekdays.includes(weekday.code);
                      return (
                        <button
                          key={weekday.code}
                          type="button"
                          onClick={() => toggleWeekday(weekday.code)}
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${
                            active
                              ? 'bg-primary text-white shadow-primary/40'
                              : 'border border-gray-200 text-gray-600 hover:border-primary/40 hover:text-primary'
                          }`}
                        >
                          {weekday.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {recurrence === 'MONTHLY' && (
                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase text-gray-500">
                    Dia do mes (1 a 28)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={dayOfMonth ?? selectedDate.getDate()}
                    onChange={(event) => {
                      const value = Number.parseInt(event.target.value, 10);
                      if (Number.isNaN(value)) {
                        setDayOfMonth(null);
                        return;
                      }
                      setDayOfMonth(Math.min(Math.max(value, 1), 28));
                    }}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-4 text-xs text-primary">
              <p className="font-semibold">Resumo</p>
              <ul className="mt-2 space-y-1 text-primary/80">
                <li>
                  • Proxima execucao prevista para{' '}
                  <strong>
                    {format(selectedDate, 'dd/MM/yyyy')} às {time}
                  </strong>
                </li>
                <li>• Fuso horario detectado: {timezone}</li>
                <li>
                  • Recorrencia:{' '}
                  {RECURRENCE_OPTIONS.find((option) => option.value === recurrence)?.label ?? 'Unica'}
                </li>
              </ul>
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            disabled={submitting}
          >
            {submitting ? 'Salvando...' : mode === 'create' ? 'Agendar' : 'Salvar alterações'}
          </button>
        </footer>
      </div>
    </div>
  );
};

type ScheduledMessageSectionProps = {
  ticketId: string;
  contactName: string;
};

const ScheduledMessageSection = ({ ticketId, contactName }: ScheduledMessageSectionProps) => {
  const {
    itemsByTicket,
    loadingByTicket,
    errorByTicket,
    fetchScheduledMessages,
    createScheduledMessage,
    updateScheduledMessage,
    cancelScheduledMessage
  } = useScheduledMessageStore((state) => ({
    itemsByTicket: state.itemsByTicket,
    loadingByTicket: state.loadingByTicket,
    errorByTicket: state.errorByTicket,
    fetchScheduledMessages: state.fetchScheduledMessages,
    createScheduledMessage: state.createScheduledMessage,
    updateScheduledMessage: state.updateScheduledMessage,
    cancelScheduledMessage: state.cancelScheduledMessage
  }));

  const schedules = itemsByTicket[ticketId] ?? [];
  const loading = loadingByTicket[ticketId] ?? false;
  const error = errorByTicket[ticketId];

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledMessage | null>(null);

  useEffect(() => {
    fetchScheduledMessages(ticketId, { force: true }).catch(() => undefined);
  }, [ticketId, fetchScheduledMessages]);

  const handleCreate = async (payload: ScheduleModalResult) => {
    const request: CreateScheduledMessageRequest = {
      ...payload,
      isPrivate: false,
      type: 'TEXT'
    };
    await createScheduledMessage(ticketId, request);
    toast.success('Mensagem agendada com sucesso.');
  };

  const handleEdit = async (scheduleId: string, payload: ScheduleModalResult) => {
    const request: UpdateScheduledMessageRequest = {
      ...payload,
      type: editing?.type ?? 'TEXT',
      isPrivate: editing?.isPrivate ?? false
    };
    await updateScheduledMessage(ticketId, scheduleId, request);
    toast.success('Agendamento atualizado.');
  };

  const handlePauseResume = async (schedule: ScheduledMessage) => {
    const nextStatus = schedule.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    await updateScheduledMessage(ticketId, schedule.id, { status: nextStatus });
    toast.success(nextStatus === 'ACTIVE' ? 'Agendamento retomado.' : 'Agendamento pausado.');
  };

  const handleCancel = async (schedule: ScheduledMessage) => {
    const confirm = window.confirm('Deseja cancelar este agendamento? Esta operacao nao pode ser desfeita.');
    if (!confirm) return;
    await cancelScheduledMessage(ticketId, schedule.id);
    toast.success('Agendamento cancelado.');
  };

  const handleRefresh = async () => {
    await fetchScheduledMessages(ticketId, { force: true });
    toast.success('Lista de agendamentos atualizada.');
  };

  const openCreateModal = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEditModal = (schedule: ScheduledMessage) => {
    setEditing(schedule);
    setModalOpen(true);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Mensagens agendadas</h3>
          <p className="text-xs text-gray-500">
            Automatize envios para {contactName}. Controle recorrencias e acompanhe execucoes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            title="Atualizar lista"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nova mensagem
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="animate-pulse rounded-2xl border border-gray-100 bg-gray-50 p-4"
            >
              <div className="h-4 w-32 rounded-full bg-gray-200" />
              <div className="mt-3 h-3 w-full rounded-full bg-gray-200" />
              <div className="mt-2 h-3 w-1/2 rounded-full bg-gray-200" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : schedules.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
          Nenhuma mensagem agendada ate o momento. Utilize o botao &ldquo;Nova mensagem&rdquo; para definir envios
          programados para este contato.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {schedules.map((schedule) => (
            <article
              key={schedule.id}
              className="rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:border-primary/40 hover:bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[schedule.status]}`}>
                  <Calendar className="h-3 w-3" />
                  {STATUS_LABELS[schedule.status]}
                </span>
                <div className="flex items-center gap-2">
                  {schedule.status !== 'CANCELLED' && schedule.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => handlePauseResume(schedule)}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:border-primary/40 hover:text-primary"
                    >
                      {schedule.status === 'PAUSED' ? (
                        <>
                          <PlayCircle className="h-3 w-3" />
                          Retomar
                        </>
                      ) : (
                        <>
                          <PauseCircle className="h-3 w-3" />
                          Pausar
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditModal(schedule)}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:border-primary/40 hover:text-primary"
                  >
                    <Edit2 className="h-3 w-3" />
                    Editar
                  </button>
                  {schedule.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => handleCancel(schedule)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:border-red-400/40 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-800">{schedule.body}</p>

              <div className="mt-3 grid gap-2 text-xs text-gray-500 md:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-3 w-3" />
                  <span>
                    Proximo envio:{' '}
                    <strong className="text-gray-800">{formatDateTime(schedule.nextRunAt)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <History className="h-3 w-3" />
                  <span>
                    Ultima execucao:{' '}
                    <strong className="text-gray-800">
                      {schedule.lastRunAt ? formatDateTime(schedule.lastRunAt) : '-'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>{formatRecurrenceSummary(schedule)}</span>
                </div>
              </div>

              {schedule.logs && schedule.logs.length > 0 && (
                <div className="mt-3 space-y-2 rounded-2xl border border-gray-200 bg-white p-3">
                  <span className="text-[11px] font-semibold uppercase text-gray-500">
                    Historico de execucoes
                  </span>
                  <ul className="space-y-2">
                    {schedule.logs.slice(0, 3).map((log) => (
                      <li key={log.id} className="flex items-center gap-2 text-xs">
                        {log.status === 'SUCCESS' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="text-gray-600">
                          {formatDateTime(log.runAt)} -{' '}
                          {log.status === 'SUCCESS'
                            ? 'Enviado com sucesso'
                            : log.error ?? 'Falha ao enviar'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <ScheduleModal
        open={modalOpen}
        mode={editing ? 'edit' : 'create'}
        initialSchedule={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={async (payload) => {
          if (editing) {
            await handleEdit(editing.id, payload);
          } else {
            await handleCreate(payload);
          }
        }}
      />
    </div>
  );
};

export default ScheduledMessageSection;

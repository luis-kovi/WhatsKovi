export type ScheduledMessageRecurrence = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type ScheduledMessageStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';

export type ScheduledMessageLogStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export type ScheduledMessageLog = {
  id: string;
  messageId?: string | null;
  status: ScheduledMessageLogStatus;
  error?: string | null;
  runAt: string;
};

export type ScheduledMessageUserSummary = {
  id: string;
  name: string;
};

export type ScheduledMessage = {
  id: string;
  ticketId: string;
  userId: string;
  body: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'NOTE';
  mediaUrl?: string | null;
  isPrivate: boolean;
  recurrence: ScheduledMessageRecurrence;
  weekdays: string[];
  dayOfMonth?: number | null;
  timezone: string;
  status: ScheduledMessageStatus;
  scheduledFor: string;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  jobId?: string | null;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  logs: ScheduledMessageLog[];
  user?: ScheduledMessageUserSummary | null;
};

export type CreateScheduledMessageRequest = {
  body: string;
  type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'NOTE';
  isPrivate?: boolean;
  mediaUrl?: string | null;
  recurrence?: ScheduledMessageRecurrence;
  weekdays?: string[];
  dayOfMonth?: number | null;
  timezone?: string;
  scheduledFor: string;
};

export type UpdateScheduledMessageRequest = Partial<CreateScheduledMessageRequest> & {
  status?: ScheduledMessageStatus;
  cancelReason?: string | null;
};

import { NotificationChannel, NotificationType, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { notificationQueue } from './notificationQueue';
import { EmailTemplateKey, TemplateContext } from './emailService';
import { isPushConfigured } from './pushService';

type DispatchInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Prisma.JsonValue;
  metadata?: Prisma.JsonValue;
  email?: {
    template: EmailTemplateKey;
    context: TemplateContext;
  };
  push?: {
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
  };
};

type SubscriptionPayload = {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  userAgent?: string;
};

const defaultPreferences = {
  notifyNewTicket: true,
  notifyTicketMessage: true,
  notifyTransfer: true,
  pushEnabled: false,
  emailEnabled: false,
  soundEnabled: true,
  soundTheme: 'classic' as const,
  smtpSecure: true
};

const shouldNotifyByType = (
  type: NotificationType,
  preference: { notifyNewTicket: boolean; notifyTicketMessage: boolean; notifyTransfer: boolean }
) => {
  switch (type) {
    case 'NEW_TICKET':
      return preference.notifyNewTicket;
    case 'TICKET_MESSAGE':
      return preference.notifyTicketMessage;
    case 'TICKET_TRANSFER':
      return preference.notifyTransfer;
    default:
      return true;
  }
};

const canSendEmail = (userPreference: {
  emailEnabled: boolean;
  smtpHost?: string | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
}) => {
  if (!userPreference.emailEnabled) return false;

  const hasUserConfig =
    !!userPreference.smtpHost && !!userPreference.smtpUser && !!userPreference.smtpPassword;

  if (hasUserConfig) {
    return true;
  }

  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
};

export const ensureNotificationPreference = async (userId: string) => {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      ...defaultPreferences
    }
  });
};

export const getNotificationPreference = async (userId: string) => {
  const preference = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (preference) {
    return preference;
  }
  return ensureNotificationPreference(userId);
};

export const updateNotificationPreference = async (
  userId: string,
  data: Partial<Prisma.NotificationPreferenceUpdateInput>
) => {
  await ensureNotificationPreference(userId);

  const updated = await prisma.notificationPreference.update({
    where: { userId },
    data
  });

  return updated;
};

export const registerPushSubscription = async (userId: string, payload: SubscriptionPayload) => {
  await prisma.notificationSubscription.upsert({
    where: { endpoint: payload.endpoint },
    update: {
      auth: payload.keys.auth,
      p256dh: payload.keys.p256dh,
      userId,
      userAgent: payload.userAgent ?? null
    },
    create: {
      userId,
      endpoint: payload.endpoint,
      auth: payload.keys.auth,
      p256dh: payload.keys.p256dh,
      userAgent: payload.userAgent ?? null
    }
  });

  return true;
};

export const unregisterPushSubscription = async (endpoint: string) => {
  await prisma.notificationSubscription.deleteMany({
    where: { endpoint }
  });
};

export const listNotifications = async (userId: string, limit = 20) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
};

export const countUnreadNotifications = async (userId: string) => {
  return prisma.notification.count({
    where: { userId, readAt: null }
  });
};

export const markNotificationsAsRead = async (userId: string, notificationIds: string[]) => {
  if (notificationIds.length === 0) {
    return { updated: 0 };
  }

  const now = new Date();
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      id: { in: notificationIds }
    },
    data: { readAt: now }
  });

  if (result.count > 0) {
    notificationQueue.add(
      'broadcast-read',
      { userId, ids: notificationIds },
      {
        jobId: `read:${userId}:${now.getTime()}`,
        removeOnComplete: true,
        removeOnFail: true
      }
    );
  }

  return { updated: result.count };
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const now = new Date();
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: now }
  });

  if (result.count > 0) {
    notificationQueue.add(
      'broadcast-read',
      { userId, ids: 'ALL' },
      {
        jobId: `read:all:${userId}:${now.getTime()}`,
        removeOnComplete: true,
        removeOnFail: true
      }
    );
  }

  return { updated: result.count };
};

export const dispatchNotification = async (input: DispatchInput) => {
  const preference = await getNotificationPreference(input.userId);

  if (!shouldNotifyByType(input.type, preference)) {
    return null;
  }

  const channels: NotificationChannel[] = ['IN_APP'];

  if (preference.pushEnabled && isPushConfigured()) {
    channels.push('PUSH');
  }

  if (canSendEmail(preference)) {
    channels.push('EMAIL');
  }

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: (input.data ?? undefined) as Prisma.InputJsonValue | undefined,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      channels
    }
  });

  const pushPayload =
    channels.includes('PUSH') && input.push
      ? {
          title: input.push.title ?? input.title,
          body: input.push.body ?? input.body,
          data: input.push.data ?? {}
        }
      : undefined;

  const emailPayload =
    channels.includes('EMAIL') && input.email
      ? {
          template: input.email.template,
          context: input.email.context
        }
      : undefined;

  await notificationQueue.add(
    'deliver',
    {
      notificationId: notification.id,
      userId: input.userId,
      channels,
      push: pushPayload,
      email: emailPayload
    },
    {
      removeOnComplete: true,
      removeOnFail: true
    }
  );

  return notification;
};

import Queue from 'bull';
import { Server } from 'socket.io';
import prisma from '../config/database';
import { NotificationChannel } from '@prisma/client';
import { EmailTemplateKey, TemplateContext, sendNotificationEmail } from './emailService';
import { sendPushNotification } from './pushService';

type DeliverJobData = {
  notificationId: string;
  userId: string;
  channels: NotificationChannel[];
  push?: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  };
  email?: {
    template: EmailTemplateKey;
    context: TemplateContext;
  };
};

type BroadcastReadJobData = {
  userId: string;
  ids?: string[] | 'ALL';
};

const queueName = 'notification:dispatch';
const connection = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const notificationQueue = new Queue(queueName, connection);

let ioInstance: Server | null = null;

export const registerNotificationSocketServer = (server: Server) => {
  ioInstance = server;
};

notificationQueue.process('deliver', async (job) => {
  const { notificationId, userId, channels, push, email } = job.data as DeliverJobData;

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          notificationPreference: true
        }
      }
    }
  });

  if (!notification || !notification.user) {
    return;
  }

  let unreadCount: number | null = null;

  if (ioInstance) {
    unreadCount = await prisma.notification.count({
      where: { userId, readAt: null }
    });
  }

  if (channels.includes('IN_APP') && ioInstance) {
    ioInstance.to(userId).emit('notification:new', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
      data: notification.data,
      channels: notification.channels,
      unreadCount
    });
  }

  if (channels.includes('PUSH') && push) {
    await sendPushNotification(userId, {
      title: push.title,
      body: push.body,
      data: push.data
    });
  }

  if (channels.includes('EMAIL') && email && notification.user.email) {
    await sendNotificationEmail(
      notification.user.email,
      email.template,
      {
        ...email.context,
        dashboardUrl: email.context.dashboardUrl ?? process.env.FRONTEND_URL
      },
      notification.user.notificationPreference
    );
  }
});

notificationQueue.process('broadcast-read', async (job) => {
  const { userId, ids } = job.data as BroadcastReadJobData;

  if (ioInstance) {
    const unreadCount = await prisma.notification.count({
      where: { userId, readAt: null }
    });

    if (ids === 'ALL' || !ids) {
      ioInstance.to(userId).emit('notification:read-all', { unreadCount });
    } else {
      ioInstance.to(userId).emit('notification:read', { unreadCount, ids });
    }
  }
});

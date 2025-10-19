import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  countUnreadNotifications,
  dispatchNotification,
  getNotificationPreference,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationsAsRead,
  registerPushSubscription,
  unregisterPushSubscription,
  updateNotificationPreference
} from '../services/notificationService';
import { NotificationType } from '@prisma/client';

const sanitizeBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return undefined;
};

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const limitParam = req.query.limit ? Number(req.query.limit) : 20;
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 20;

    const notifications = await listNotifications(req.user!.id, limit);
    const unreadCount = await countUnreadNotifications(req.user!.id);

    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar notificacoes' });
  }
};

export const getNotificationStats = async (req: AuthRequest, res: Response) => {
  try {
    const unreadCount = await countUnreadNotifications(req.user!.id);
    return res.json({ unreadCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao obter contagem de notificacoes' });
  }
};

export const markNotificationListAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const ids = Array.isArray(req.body.ids) ? (req.body.ids as string[]) : [];
    const { updated } = await markNotificationsAsRead(req.user!.id, ids);
    const unreadCount = await countUnreadNotifications(req.user!.id);

    return res.json({ success: true, updated, unreadCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao marcar notificacoes como lidas' });
  }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { updated } = await markAllNotificationsAsRead(req.user!.id);
    const unreadCount = await countUnreadNotifications(req.user!.id);

    return res.json({ success: true, updated, unreadCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao marcar notificacoes' });
  }
};

export const getNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const preference = await getNotificationPreference(req.user!.id);
    return res.json(preference);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar preferencias' });
  }
};

export const updateNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body as Record<string, unknown>;

    const data: Record<string, unknown> = {};

    if (typeof payload.soundTheme === 'string') {
      data.soundTheme = payload.soundTheme;
    }

    const booleanFields: Array<keyof typeof payload> = [
      'notifyNewTicket',
      'notifyTicketMessage',
      'notifyTransfer',
      'pushEnabled',
      'emailEnabled',
      'soundEnabled',
      'smtpSecure'
    ];

    booleanFields.forEach((field) => {
      const value = sanitizeBoolean(payload[field]);
      if (typeof value === 'boolean') {
        data[field] = value;
      }
    });

    if (payload.smtpHost === null) {
      data.smtpHost = null;
    } else if (typeof payload.smtpHost === 'string') {
      data.smtpHost = payload.smtpHost.trim() || null;
    }

    if (payload.smtpPort === null) {
      data.smtpPort = null;
    } else if (typeof payload.smtpPort === 'number') {
      data.smtpPort = payload.smtpPort;
    } else if (typeof payload.smtpPort === 'string') {
      const port = Number(payload.smtpPort);
      if (Number.isInteger(port)) {
        data.smtpPort = port;
      }
    }

    if (payload.smtpUser === null) {
      data.smtpUser = null;
    } else if (typeof payload.smtpUser === 'string') {
      data.smtpUser = payload.smtpUser.trim() || null;
    }

    if (payload.smtpPassword === null) {
      data.smtpPassword = null;
    } else if (typeof payload.smtpPassword === 'string') {
      data.smtpPassword = payload.smtpPassword.trim() || null;
    }

    if (payload.smtpFrom === null) {
      data.smtpFrom = null;
    } else if (typeof payload.smtpFrom === 'string') {
      data.smtpFrom = payload.smtpFrom.trim() || null;
    }

    const updated = await updateNotificationPreference(req.user!.id, data);
    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar preferencias' });
  }
};

export const subscribeToPush = async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body as {
      endpoint?: string;
      keys?: { auth?: string; p256dh?: string };
      userAgent?: string;
    };

    if (!payload.endpoint || !payload.keys?.auth || !payload.keys?.p256dh) {
      return res.status(400).json({ error: 'Assinatura push invalida' });
    }

    await registerPushSubscription(req.user!.id, {
      endpoint: payload.endpoint,
      keys: {
        auth: payload.keys.auth,
        p256dh: payload.keys.p256dh
      },
      userAgent: payload.userAgent
    });

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao registrar assinatura push' });
  }
};

export const unsubscribeFromPush = async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body as { endpoint?: string };

    if (!payload.endpoint) {
      return res.status(400).json({ error: 'Endpoint obrigatorio' });
    }

    await unregisterPushSubscription(payload.endpoint);
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao remover assinatura push' });
  }
};

export const triggerTestNotification = async (req: AuthRequest, res: Response) => {
  try {
    const notification = await dispatchNotification({
      userId: req.user!.id,
      type: NotificationType.NEW_TICKET,
      title: 'Notificação de teste',
      body: 'Tudo configurado! Este é um alerta de teste.',
      data: {
        reason: 'test'
      },
      push: {
        body: 'Tudo configurado! Este é um alerta de teste.'
      },
      email: {
        template: 'new-ticket',
        context: {
          ticketId: 'teste',
          contactName: req.user?.email ?? 'Usuario',
          queueName: 'Teste',
          messagePreview: 'Esta é apenas uma mensagem de teste.'
        }
      }
    });

    return res.json({ success: true, notification });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao disparar notificacao teste' });
  }
};

import api from './api';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  channels: string[];
  createdAt: string;
  readAt?: string | null;
};

export type NotificationPreferences = {
  notifyNewTicket: boolean;
  notifyTicketMessage: boolean;
  notifyTransfer: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
  soundTheme: string;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFrom?: string | null;
  smtpSecure: boolean;
};

export const fetchNotifications = async (limit = 20) => {
  const response = await api.get<{ notifications: NotificationItem[]; unreadCount: number }>(
    `/notifications`,
    { params: { limit } }
  );
  return response.data;
};

export const fetchNotificationStats = async () => {
  const response = await api.get<{ unreadCount: number }>('/notifications/unread-count');
  return response.data;
};

export const markNotificationsRead = async (ids: string[]) => {
  const response = await api.post<{ success: boolean; updated: number; unreadCount: number }>(
    '/notifications/mark-read',
    { ids }
  );
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.post<{ success: boolean; updated: number; unreadCount: number }>(
    '/notifications/mark-all-read'
  );
  return response.data;
};

export const getNotificationPreferences = async () => {
  const response = await api.get<NotificationPreferences>('/notifications/preferences');
  return response.data;
};

export const updateNotificationPreferences = async (payload: Partial<NotificationPreferences>) => {
  const response = await api.put<NotificationPreferences>('/notifications/preferences', payload);
  return response.data;
};

export const registerPushSubscription = async (subscription: PushSubscription) => {
  const json = subscription.toJSON();
  const response = await api.post<{ success: boolean }>('/notifications/subscribe', {
    endpoint: subscription.endpoint,
    keys: {
      auth: json.keys?.auth,
      p256dh: json.keys?.p256dh
    },
    userAgent: navigator.userAgent
  });
  return response.data;
};

export const unregisterPushSubscription = async (endpoint: string) => {
  const response = await api.post<{ success: boolean }>('/notifications/unsubscribe', {
    endpoint
  });
  return response.data;
};

export const triggerTestNotification = async () => {
  const response = await api.post<{ success: boolean }>('/notifications/test');
  return response.data;
};

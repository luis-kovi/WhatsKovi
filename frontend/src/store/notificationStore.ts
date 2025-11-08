import { create } from 'zustand';
import {
  fetchNotifications,
  getNotificationPreferences,
  markAllNotificationsRead,
  markNotificationsRead,
  NotificationItem,
  NotificationPreferences,
  registerPushSubscription,
  triggerTestNotification,
  unregisterPushSubscription,
  updateNotificationPreferences
} from '@/services/notification';
import { getSocket } from '@/services/socket';

type NotificationState = {
  notifications: NotificationItem[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  loading: boolean;
  initializing: boolean;
  pushSupported: boolean;
  pushConfigured: boolean;
  lastError?: string;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  savePreferences: (values: Partial<NotificationPreferences>) => Promise<void>;
  markAsRead: (ids: string[]) => Promise<void>;
  markAll: () => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  togglePush: (enabled: boolean) => Promise<boolean>;
  playSound: () => void;
  sendTestNotification: () => Promise<void>;
};

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || '';

const toUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Data = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64Data);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

const SERVICE_WORKER_URL = '/notification-sw.js';

const ensureServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  if (serviceWorkerRegistration) {
    return serviceWorkerRegistration;
  }

  try {
    const existingRegistration = await navigator.serviceWorker.getRegistration('/');
    if (
      existingRegistration &&
      existingRegistration.active &&
      existingRegistration.active.scriptURL.includes(SERVICE_WORKER_URL)
    ) {
      serviceWorkerRegistration = existingRegistration;
      return existingRegistration;
    }

    serviceWorkerRegistration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' });
    return serviceWorkerRegistration;
  } catch (error) {
    console.error('[Notifications] service worker registration failed', error);
    return null;
  }
};

type AudioContextConstructor = typeof AudioContext;

const getAudioContextConstructor = (): AudioContextConstructor | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (typeof window.AudioContext !== 'undefined') {
    return window.AudioContext;
  }

  const legacy = (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  return legacy ?? null;
};

const playThemeSound = (theme: string) => {
  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) {
    return;
  }

  const ctx = new AudioContextCtor();
  const now = ctx.currentTime;

  const patterns: Record<string, Array<{ frequency: number; duration: number; gain: number }>> = {
    classic: [
      { frequency: 880, duration: 0.18, gain: 0.2 },
      { frequency: 660, duration: 0.18, gain: 0.16 }
    ],
    soft: [
      { frequency: 520, duration: 0.28, gain: 0.14 },
      { frequency: 440, duration: 0.22, gain: 0.12 }
    ],
    bright: [
      { frequency: 1200, duration: 0.12, gain: 0.2 },
      { frequency: 1500, duration: 0.1, gain: 0.2 },
      { frequency: 900, duration: 0.14, gain: 0.18 }
    ]
  };

  const sequence = patterns[theme] ?? patterns.classic;

  sequence.reduce((startTime, step) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.frequency.value = step.frequency;
    oscillator.type = 'triangle';
    gainNode.gain.value = step.gain;

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + step.duration);

    return startTime + step.duration + 0.05;
  }, now);
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  preferences: null,
  loading: false,
  initializing: false,
  pushSupported: typeof window !== 'undefined' && 'Notification' in window,
  pushConfigured: Boolean(VAPID_PUBLIC_KEY),
  lastError: undefined,
  init: async () => {
    if (get().initializing) return;

    set({ initializing: true });
    try {
      await Promise.all([get().refresh(), get().fetchPreferences()]);

      const socket = getSocket();
      if (socket) {
        socket.off('notification:new');
        socket.off('notification:init');
        socket.off('notification:read');
        socket.off('notification:read-all');

        socket.on('notification:init', ({ unreadCount }: { unreadCount: number }) => {
          set({ unreadCount });
        });

        socket.on(
          'notification:new',
          (payload: NotificationItem & { unreadCount?: number | null }) => {
            set((state) => {
              const existing = state.notifications.filter((item) => item.id !== payload.id);
              const updatedList = [payload, ...existing].slice(0, 50);
              return {
                notifications: updatedList,
                unreadCount:
                  typeof payload.unreadCount === 'number'
                    ? payload.unreadCount
                    : state.unreadCount + 1
              };
            });

            const { preferences } = get();
            if (preferences?.soundEnabled) {
              playThemeSound(preferences.soundTheme);
            }
          }
        );

        socket.on(
          'notification:read',
          ({ unreadCount, ids }: { unreadCount: number; ids?: string[] }) => {
            set((state) => ({
              unreadCount,
              notifications: state.notifications.map((item) =>
                ids && ids.includes(item.id) ? { ...item, readAt: new Date().toISOString() } : item
              )
            }));
          }
        );

        socket.on('notification:read-all', ({ unreadCount }: { unreadCount: number }) => {
          set((state) => ({
            unreadCount,
            notifications: state.notifications.map((item) =>
              item.readAt ? item : { ...item, readAt: new Date().toISOString() }
            )
          }));
        });
      }
    } catch (error) {
      console.error('[Notifications] init failed', error);
      set({ lastError: 'Falha ao carregar notificacoes' });
    } finally {
      set({ initializing: false });
    }
  },
  refresh: async () => {
    set({ loading: true });
    try {
      const data = await fetchNotifications();
      set({
        notifications: data.notifications,
        unreadCount: data.unreadCount,
        lastError: undefined
      });
    } catch (error) {
      console.error('[Notifications] refresh failed', error);
      set({ lastError: 'Erro ao carregar notificacoes' });
    } finally {
      set({ loading: false });
    }
  },
  fetchPreferences: async () => {
    try {
      const preferences = await getNotificationPreferences();
      set({ preferences, lastError: undefined });
    } catch (error) {
      console.error('[Notifications] preferences fetch failed', error);
      set({ lastError: 'Erro ao carregar preferencias de notificacao' });
    }
  },
  savePreferences: async (values: Partial<NotificationPreferences>) => {
    const previous = get().preferences;
    if (!previous) {
      await get().fetchPreferences();
    }

    const optimistic = { ...(get().preferences ?? {}), ...values } as NotificationPreferences;
    set({ preferences: optimistic });

    try {
      const updated = await updateNotificationPreferences(values);
      set({ preferences: updated, lastError: undefined });
    } catch (error) {
      console.error('[Notifications] preferences save failed', error);
      set({ preferences: previous ?? null, lastError: 'Erro ao atualizar preferencias' });
      throw error;
    }
  },
  markAsRead: async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const response = await markNotificationsRead(ids);
      set((state) => ({
        notifications: state.notifications.map((item) =>
          ids.includes(item.id) ? { ...item, readAt: new Date().toISOString() } : item
        ),
        unreadCount: response.unreadCount,
        lastError: undefined
      }));
    } catch (error) {
      console.error('[Notifications] mark as read failed', error);
      set({ lastError: 'Erro ao marcar notificacoes como lidas' });
    }
  },
  markAll: async () => {
    try {
      const response = await markAllNotificationsRead();
      set((state) => ({
        notifications: state.notifications.map((item) =>
          item.readAt ? item : { ...item, readAt: new Date().toISOString() }
        ),
        unreadCount: response.unreadCount,
        lastError: undefined
      }));
    } catch (error) {
      console.error('[Notifications] mark all failed', error);
      set({ lastError: 'Erro ao marcar notificacoes' });
    }
  },
  requestPushPermission: async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },
  togglePush: async (enabled: boolean) => {
    if (!get().pushSupported || !get().pushConfigured) {
      set({ lastError: 'Push notifications não suportadas neste navegador' });
      return false;
    }

    if (enabled) {
      const granted = await get().requestPushPermission();
      if (!granted) {
        set({ lastError: 'Permissão de notificação não concedida' });
        return false;
      }

      const registration = await ensureServiceWorker();
      if (!registration) {
        set({ lastError: 'Service Worker indisponível' });
        return false;
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      await registerPushSubscription(subscription);
      await get().savePreferences({ pushEnabled: true });
      return true;
    }

    const registration = await ensureServiceWorker();
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unregisterPushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
    }

    await get().savePreferences({ pushEnabled: false });
    return true;
  },
  playSound: () => {
    const preferences = get().preferences;
    if (!preferences?.soundEnabled) return;
    playThemeSound(preferences.soundTheme);
  },
  sendTestNotification: async () => {
    await triggerTestNotification();
  }
}));

export const useNotificationState = () => useNotificationStore((state) => state);

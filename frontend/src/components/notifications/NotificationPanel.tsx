'use client';

import { useMemo } from 'react';
import { BellRing, CheckCheck, Loader2, Mail, MessageSquare, Ticket } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';

const iconByType: Record<string, JSX.Element> = {
  NEW_TICKET: <Ticket className="h-4 w-4" />,
  TICKET_MESSAGE: <MessageSquare className="h-4 w-4" />,
  TICKET_TRANSFER: <BellRing className="h-4 w-4" />
};

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d atrás`;
  }
  if (hours > 0) {
    return `${hours}h atrás`;
  }
  if (minutes > 0) {
    return `${minutes}min atrás`;
  }
  return 'Agora mesmo';
};

type NotificationPanelProps = {
  onClose: () => void;
};

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    loading,
    markAll,
    markAsRead,
    refresh,
    preferences,
    pushSupported,
    pushConfigured,
    togglePush,
    savePreferences,
    sendTestNotification
  } = useNotificationStore((state) => state);

  const unreadIds = useMemo(
    () => notifications.filter((item) => !item.readAt).map((item) => item.id),
    [notifications]
  );

  const handleMarkAll = async () => {
    await markAll();
  };

  const handleToggleSound = async () => {
    await savePreferences({ soundEnabled: !preferences?.soundEnabled });
  };

  const handleTogglePush = async () => {
    await togglePush(!preferences?.pushEnabled);
  };

  const handleChangeSoundTheme = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    await savePreferences({ soundTheme: event.target.value });
  };

  const handleTestNotification = async () => {
    await sendTestNotification();
  };

  return (
    <div className="w-[360px] rounded-2xl border border-gray-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Notificações</p>
          <p className="text-xs text-gray-500">
            {unreadCount} alerta{unreadCount === 1 ? '' : 's'} não lido{unreadCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
            title="Atualizar"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
          </button>
          <button
            onClick={handleMarkAll}
            disabled={unreadIds.length === 0}
            className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300"
            title="Marcar todas como lidas"
          >
            <CheckCheck className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="max-h-80 overflow-y-auto px-2 py-2">
        {notifications.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gray-50 p-6 text-center">
            <BellRing className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">Sem notificações por aqui!</p>
            <p className="text-xs text-gray-500">
              Assim que algo novo acontecer você verá os alertas neste painel.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((notification) => {
              const isUnread = !notification.readAt;
              const icon = iconByType[notification.type] ?? (
                <BellRing className="h-4 w-4 text-primary" />
              );

              return (
                <li
                  key={notification.id}
                  className={`rounded-xl border px-3 py-3 transition ${
                    isUnread
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-transparent bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
                        isUnread ? 'bg-primary/15 text-primary' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                      <p className="text-xs text-gray-600">{notification.body}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-400">
                        <span>{formatRelativeTime(notification.createdAt)}</span>
                        {notification.channels.includes('EMAIL') && (
                          <span className="inline-flex items-center gap-1 text-gray-400">
                            <Mail className="h-3 w-3" /> e-mail
                          </span>
                        )}
                      </div>
                    </div>
                    {isUnread && (
                      <button
                        onClick={() => markAsRead([notification.id])}
                        className="rounded-full bg-gray-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-gray-700"
                      >
                        Ok
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="space-y-3 border-t border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-700">Sons</p>
            <p className="text-[11px] text-gray-500">Alertas audíveis para novos eventos</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={preferences?.soundTheme ?? 'classic'}
              onChange={handleChangeSoundTheme}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="classic">Clássico</option>
              <option value="soft">Suave</option>
              <option value="bright">Intenso</option>
            </select>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={preferences?.soundEnabled ?? true}
                onChange={handleToggleSound}
              />
              <div className="peer flex h-5 w-9 items-center rounded-full bg-gray-300 transition peer-checked:bg-primary">
                <span className="h-4 w-4 translate-x-1 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
              </div>
            </label>
          </div>
        </div>

        {pushSupported && pushConfigured && (
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-gray-800">Push no navegador</span>
              <span>
                {preferences?.pushEnabled
                  ? 'Alertas em tempo real ativos'
                  : 'Permita notificações no navegador'}
              </span>
            </div>
            <button
              onClick={handleTogglePush}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                preferences?.pushEnabled
                  ? 'bg-primary text-white'
                  : 'border border-primary text-primary hover:bg-primary/10'
              }`}
            >
              {preferences?.pushEnabled ? 'Desativar' : 'Ativar'}
            </button>
          </div>
        )}

        <button
          onClick={handleTestNotification}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2 text-xs font-semibold text-gray-600 transition hover:border-primary hover:text-primary"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Enviar notificação de teste
        </button>

        <button
          onClick={onClose}
          className="w-full rounded-lg border border-gray-200 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:border-gray-300"
        >
          Fechar
        </button>
      </footer>
    </div>
  );
}

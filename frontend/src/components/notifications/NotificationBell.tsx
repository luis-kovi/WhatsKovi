'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import NotificationPanel from './NotificationPanel';
import { useNotificationStore } from '@/store/notificationStore';

const useClickOutside = (handler: () => void) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
    };
  }, [handler]);

  return ref;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { unreadCount, init } = useNotificationStore((state) => ({
    unreadCount: state.unreadCount,
    init: state.init
  }));

  useEffect(() => {
    init().catch(() => undefined);
  }, [init]);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const containerRef = useClickOutside(() => setOpen(false));

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition ${
          open
            ? 'border-primary bg-primary text-white shadow-lg'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
        }`}
        aria-label="Abrir central de notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-[1.1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3">
          <NotificationPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

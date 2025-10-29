'use client';

import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  MessageSquare,
  Users,
  Settings,
  LogOut,
  BarChart3,
  UserCog,
  Search,
  Bot,
  Smile,
  Workflow
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import NotificationBell from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useI18n } from '@/providers/I18nProvider';

type NavItem = {
  key: string;
  icon: LucideIcon;
  href: string;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { key: 'nav.attendance', icon: MessageSquare, href: '/dashboard' },
  { key: 'nav.search', icon: Search, href: '/dashboard/search' },
  { key: 'nav.contacts', icon: Users, href: '/dashboard/contacts' },
  { key: 'nav.users', icon: UserCog, href: '/dashboard/users', adminOnly: true },
  { key: 'nav.chatbot', icon: Bot, href: '/dashboard/chatbot', adminOnly: true },
  { key: 'nav.automations', icon: Workflow, href: '/dashboard/automations', adminOnly: true },
  { key: 'nav.reports', icon: BarChart3, href: '/dashboard/reports', adminOnly: true },
  { key: 'nav.satisfaction', icon: Smile, href: '/dashboard/satisfaction', adminOnly: true },
  { key: 'nav.settings', icon: Settings, href: '/dashboard/settings', adminOnly: true }
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { t } = useI18n();

  const handleNavigate = (href: string) => {
    if (pathname !== href) {
      router.push(href);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'ADMIN');

  return (
    <aside className="flex h-screen w-20 flex-col items-center border-r border-gray-200 bg-white px-3 py-6 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white shadow-md shadow-primary/30">
        WK
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const label = t(item.key);

          return (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className={`flex h-12 w-12 items-center justify-center rounded-xl transition ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
              }`}
              title={label}
              aria-label={label}
            >
              <Icon size={24} />
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-3 pb-4">
        <NotificationBell />
        <ThemeToggle />
        <div className="mt-1 text-center">
          <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600 font-semibold dark:bg-slate-800 dark:text-slate-200">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="mx-auto -mt-2 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-slate-900" />
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 flex h-12 w-12 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50 dark:hover:bg-red-500/10"
          title={t('nav.logout')}
          aria-label={t('nav.logout')}
        >
          <LogOut size={24} />
        </button>
      </div>
    </aside>
  );
}

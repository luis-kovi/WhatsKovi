'use client';

import { useEffect, useState } from 'react';
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
  Workflow,
  Megaphone,
  ChevronLeft,
  ChevronRight
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

const SIDEBAR_STORAGE_KEY = 'dashboard.sidebar.collapsed';

const NAV_ITEMS: NavItem[] = [
  { key: 'nav.attendance', icon: MessageSquare, href: '/dashboard' },
  { key: 'nav.search', icon: Search, href: '/dashboard/search' },
  { key: 'nav.contacts', icon: Users, href: '/dashboard/contacts' },
  { key: 'nav.users', icon: UserCog, href: '/dashboard/users', adminOnly: true },
  { key: 'nav.chatbot', icon: Bot, href: '/dashboard/chatbot', adminOnly: true },
  { key: 'nav.automations', icon: Workflow, href: '/dashboard/automations', adminOnly: true },
  { key: 'nav.campaigns', icon: Megaphone, href: '/dashboard/campaigns', adminOnly: true },
  { key: 'nav.reports', icon: BarChart3, href: '/dashboard/reports', adminOnly: true },
  { key: 'nav.satisfaction', icon: Smile, href: '/dashboard/satisfaction', adminOnly: true },
  { key: 'nav.settings', icon: Settings, href: '/dashboard/settings', adminOnly: true }
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setCollapsed(stored === 'true');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? 'true' : 'false');
  }, [collapsed]);

  const toggleCollapsed = () => {
    setCollapsed((previous) => !previous);
  };

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
    <aside
      className={`flex h-screen flex-col border-r border-gray-200 bg-white py-6 transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 ${
        collapsed ? 'w-20 items-center px-3' : 'w-64 px-5'
      }`}
    >
      <div
        className={`flex w-full ${collapsed ? 'flex-col items-center gap-4' : 'items-center justify-between'}`}
      >
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white shadow-md shadow-primary/30">
            WK
          </div>
          {!collapsed && <span className="text-lg font-semibold text-gray-800 dark:text-slate-100">WhatsKovi</span>}
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          className={`rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${
            collapsed ? '' : 'self-end'
          }`}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className={`mt-8 flex flex-1 flex-col gap-2 ${collapsed ? 'items-center' : ''}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const label = t(item.key);

          const buttonClasses = `flex items-center rounded-xl transition ${
            collapsed ? 'h-11 w-11 justify-center' : 'w-full justify-start gap-3 px-3 py-2'
          } ${
            isActive
              ? 'bg-primary text-white shadow-lg shadow-primary/30'
              : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
          }`;

          return (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className={buttonClasses}
              title={collapsed ? label : undefined}
              aria-label={label}
            >
              <Icon size={20} />
              {!collapsed && <span className="text-sm font-medium text-gray-700 dark:text-slate-200">{label}</span>}
            </button>
          );
        })}
      </nav>

      <div className={`flex flex-col gap-3 pb-4 ${collapsed ? 'items-center' : 'items-stretch'}`}>
        <div
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'justify-between rounded-xl border border-gray-200 px-3 py-2 dark:border-slate-700'
          }`}
        >
          <NotificationBell />
          {!collapsed && <span className="text-[11px] font-semibold text-gray-500">Alertas</span>}
        </div>
        <div
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'justify-between rounded-xl border border-gray-200 px-3 py-2 dark:border-slate-700'
          }`}
        >
          <ThemeToggle />
          {!collapsed && <span className="text-[11px] font-semibold text-gray-500">Tema</span>}
        </div>
        <div
          className={`mt-1 flex ${collapsed ? 'flex-col items-center' : 'items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 dark:border-slate-700'}`}
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600 font-semibold dark:bg-slate-800 dark:text-slate-200">
            {(user?.name?.charAt(0)?.toUpperCase() ?? '?')}
            <span className="absolute -bottom-1 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-slate-900" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{user?.name}</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-400">Online</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 rounded-xl text-red-600 transition hover:bg-red-50 dark:hover:bg-red-500/10 ${
            collapsed ? 'h-11 w-11 justify-center' : 'justify-center px-3 py-2'
          }`}
          title={t('nav.logout')}
          aria-label={t('nav.logout')}
        >
          <LogOut size={20} />
          {!collapsed && <span className="text-sm font-semibold">Sair</span>}
        </button>
      </div>
    </aside>
  );
}

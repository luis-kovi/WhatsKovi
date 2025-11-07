'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  MessageSquare,
  Users,
  Settings,
  LogOut,
  BarChart3,
  Search,
  Bot,
  Smile,
  Workflow,
  Megaphone
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
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      if (typeof window === 'undefined') return;
      setIsCompact(window.innerHeight < 900);
    };
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

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
  const sidebarPadding = isCompact ? 'py-4' : 'py-6';
  const brandGapClass = isCompact ? 'gap-4' : 'gap-6';
  const navMarginClass = isCompact ? 'mt-6' : 'mt-10';
  const navGapClass = isCompact ? 'gap-2' : 'gap-3';
  const buttonBaseClasses = isCompact ? 'h-10 w-10 rounded-lg' : 'h-11 w-11 rounded-xl';
  const footerGapClass = isCompact ? 'gap-2' : 'gap-3';
  const profileSizeClass = isCompact ? 'h-10 w-10' : 'h-11 w-11';

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen w-20 flex-col items-center border-r border-gray-200 bg-white ${sidebarPadding} transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900`}
    >
      <div className={`flex flex-col items-center ${brandGapClass}`}>
        <div className="group relative flex h-12 w-12 items-center justify-center">
          <Image
            src="/brand/icone.png"
            alt="WhatsKovi"
            width={88}
            height={88}
            quality={100}
            className="h-12 w-12 rounded-2xl object-contain"
            priority
          />
          <div className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-700">
            WhatsKovi
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-slate-700" />
          </div>
        </div>
      </div>

      <nav className={`${navMarginClass} flex flex-1 flex-col items-center ${navGapClass}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const label = t(item.key);

          return (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className={`group relative flex items-center justify-center ${buttonBaseClasses} transition-all ${
                isActive
                  ? 'bg-gradient-to-br from-primary to-secondary text-white scale-105'
                  : 'text-gray-600 hover:bg-gray-100 hover:scale-105 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
              aria-label={label}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              <div className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-700">
                {label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-slate-700" />
              </div>
            </button>
          );
        })}
      </nav>

      <div className={`flex flex-col items-center ${footerGapClass}`}>
        <div className="group relative">
          <div
            className={`flex items-center justify-center ${buttonBaseClasses} transition-all hover:bg-gray-100 dark:hover:bg-slate-800`}
          >
            <NotificationBell />
          </div>
          <div className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-700">
            Notificacoes
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-slate-700" />
          </div>
        </div>

        <div className="group relative">
          <div
            className={`flex items-center justify-center ${buttonBaseClasses} transition-all hover:bg-gray-100 dark:hover:bg-slate-800`}
          >
            <ThemeToggle />
          </div>
          <div className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-700">
            Tema
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-slate-700" />
          </div>
        </div>

        <div className="group relative mt-2">
          <div
            className={`relative flex ${profileSizeClass} items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 font-semibold text-gray-700 transition-transform hover:scale-105 dark:from-slate-700 dark:to-slate-800 dark:text-slate-200`}
          >
            {(user?.name?.charAt(0)?.toUpperCase() ?? '?')}
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500 dark:border-slate-900" />
          </div>
          <div className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-700">
            <div className="font-semibold">{user?.name}</div>
            <div className="text-xs text-gray-300">Online</div>
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-slate-700" />
          </div>
        </div>

        <button
          onClick={handleLogout}
          className={`group relative mt-2 flex items-center justify-center ${buttonBaseClasses} text-red-600 transition-all hover:bg-red-50 hover:scale-105 dark:hover:bg-red-500/10`}
          aria-label={t('nav.logout')}
        >
          <LogOut size={18} strokeWidth={1.9} />
          <div className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-700">
            Sair
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-slate-700" />
          </div>
        </button>
      </div>
    </aside>
  );
}

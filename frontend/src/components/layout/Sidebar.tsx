'use client';

import { useAuthStore } from '@/store/authStore';
import { MessageSquare, Users, Settings, LogOut, BarChart3 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const baseNav = [
  {
    label: 'Atendimentos',
    icon: MessageSquare,
    href: '/dashboard'
  }
];

const adminNav = [
  {
    label: 'Usuarios',
    icon: Users,
    href: '/dashboard/users'
  },
  {
    label: 'Relatorios',
    icon: BarChart3,
    href: '/dashboard/reports'
  },
  {
    label: 'Configuracoes',
    icon: Settings,
    href: '/dashboard/settings'
  }
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleNavigate = (href: string) => {
    if (pathname !== href) {
      router.push(href);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navItems = user?.role === 'ADMIN' ? [...baseNav, ...adminNav] : baseNav;

  return (
    <div className="flex w-20 flex-col items-center border-r border-gray-200 bg-white py-6">
      <div className="mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
          WK
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className={`flex h-12 w-12 items-center justify-center rounded-xl transition ${
                isActive
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={item.label}
            >
              <Icon size={24} />
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600 font-semibold">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="mx-auto -mt-2 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
        </div>

        <button
          onClick={handleLogout}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50"
          title="Sair"
        >
          <LogOut size={24} />
        </button>
      </div>
    </div>
  );
}

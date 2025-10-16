'use client';

import { useAuthStore } from '@/store/authStore';
import { MessageSquare, Users, Settings, LogOut, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6">
      <div className="mb-8">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">
          WK
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-4">
        <button
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 transition"
          title="Atendimentos"
        >
          <MessageSquare size={24} />
        </button>

        {user?.role === 'ADMIN' && (
          <>
            <button
              className="w-12 h-12 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 transition"
              title="Usuários"
            >
              <Users size={24} />
            </button>

            <button
              className="w-12 h-12 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 transition"
              title="Relatórios"
            >
              <BarChart3 size={24} />
            </button>

            <button
              className="w-12 h-12 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 transition"
              title="Configurações"
            >
              <Settings size={24} />
            </button>
          </>
        )}
      </nav>

      <div className="mt-auto">
        <div className="mb-4 text-center">
          <div className="w-10 h-10 bg-gray-200 rounded-full mx-auto mb-1 flex items-center justify-center text-gray-600 font-semibold">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="w-3 h-3 bg-green-500 rounded-full mx-auto -mt-2 border-2 border-white"></div>
        </div>

        <button
          onClick={handleLogout}
          className="w-12 h-12 flex items-center justify-center rounded-xl text-red-600 hover:bg-red-50 transition"
          title="Sair"
        >
          <LogOut size={24} />
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loadUser } = useAuthStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      await loadUser();
      setInitializing(false);
    };

    void initialize();
  }, [loadUser]);

  useEffect(() => {
    if (initializing) return;
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [initializing, isAuthenticated, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}

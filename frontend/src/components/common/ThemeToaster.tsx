'use client';

import { Toaster } from 'react-hot-toast';
import { useMemo } from 'react';
import { useTheme } from '@/providers/ThemeProvider';

export function ThemeToaster() {
  const { resolvedTheme } = useTheme();

  const toastStyle = useMemo(() => {
    if (resolvedTheme === 'dark') {
      return {
        background: '#0f172a',
        color: '#e2e8f0',
        border: '1px solid #1e293b',
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.45)'
      };
    }

    return {
      background: '#ffffff',
      color: '#111827',
      border: '1px solid #e5e7eb',
      boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)'
    };
  }, [resolvedTheme]);

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          ...toastStyle,
          transition: 'all 0.3s ease'
        }
      }}
    />
  );
}

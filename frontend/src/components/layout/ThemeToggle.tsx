'use client';

import { useEffect, useRef, useState } from 'react';
import { Monitor, Moon, Sun, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';

type ThemeOption = {
  id: 'light' | 'dark' | 'system';
  label: string;
  description: string;
  icon: LucideIcon;
};

const OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    label: 'Modo claro',
    description: 'Visual ideal para ambientes iluminados.',
    icon: Sun
  },
  {
    id: 'dark',
    label: 'Modo escuro',
    description: 'Menos brilho para trabalhar à noite.',
    icon: Moon
  },
  {
    id: 'system',
    label: 'Automático',
    description: 'Segue a preferência do seu sistema.',
    icon: Monitor
  }
];

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const ActiveIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onDoubleClick={() => toggleTheme()}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-primary/60 dark:hover:text-primary"
        aria-label="Alterar modo de cor"
      >
        <ActiveIcon size={18} />
      </button>

      {open && (
        <div className="absolute left-full top-0 z-20 ml-3 w-64 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl transition-all dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
            Aparência
          </p>
          <div className="space-y-2">
            {OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.id;
              const showResolved = option.id === resolvedTheme && theme === 'system';

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setTheme(option.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition ${
                    isActive || showResolved
                      ? 'border-primary/60 bg-primary/5 text-primary dark:border-primary/50 dark:bg-primary/10'
                      : 'border-transparent bg-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span
                    className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full ${
                      isActive || showResolved
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">{option.label}</span>
                      {(isActive || showResolved) && <Check size={16} className="text-primary" />}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-slate-400">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { ThemeToaster } from '@/components/common/ThemeToaster'

const inter = Inter({ subsets: ['latin'] })

const themeScript = `(() => {
  const storageKey = 'whatskovi:theme';
  try {
    const stored = window.localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = stored === 'light' || stored === 'dark' ? stored : prefersDark ? 'dark' : 'light';
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
  } catch (error) {
    const fallback = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(fallback);
    root.style.colorScheme = fallback;
  }
})();`;

export const metadata: Metadata = {
  title: 'WhatsKovi - Gestão de Atendimentos',
  description: 'Sistema de gestão de atendimentos via WhatsApp',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-gray-50 text-gray-900 antialiased transition-colors duration-300 ease-in-out dark:bg-slate-950 dark:text-slate-100`}
      >
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          {children}
          <ThemeToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

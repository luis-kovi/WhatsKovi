import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { I18nProvider } from '@/providers/I18nProvider'
import { ThemeToaster } from '@/components/common/ThemeToaster'
import { AnalyticsLoader } from '@/components/analytics/AnalyticsLoader'

const inter = Inter({ subsets: ['latin'] })

const themeScript = `(() => {
  const storageKey = 'whatskovi:theme';
  const brandingKey = 'whatskovi:branding';

  const hexToRgb = (hex) => {
    if (typeof hex !== 'string') return null;
    const normalized = hex.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return \`\${r} \${g} \${b}\`;
  };

  const applyBranding = (branding) => {
    if (!branding || typeof branding !== 'object') return;
    const root = document.documentElement;
    const primary = hexToRgb(branding.brandColor);
    const accent = hexToRgb(branding.accentColor || branding.brandColor);
    if (primary) {
      root.style.setProperty('--color-primary', primary);
    }
    if (accent) {
      root.style.setProperty('--color-secondary', accent);
      root.style.setProperty('--color-accent', accent);
    }
  };

  try {
    const stored = window.localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = stored === 'light' || stored === 'dark' ? stored : prefersDark ? 'dark' : 'light';
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.style.colorScheme = resolved;

    const storedBranding = window.localStorage.getItem(brandingKey);
    if (storedBranding) {
      applyBranding(JSON.parse(storedBranding));
    }
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
  icons: {
    icon: '/brand/favicon.png'
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-gray-50 text-gray-900 antialiased transition-colors duration-300 ease-in-out dark:bg-slate-950 dark:text-slate-100`}
      >
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AnalyticsLoader />
        <I18nProvider>
          <ThemeProvider>
            {children}
            <ThemeToaster />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}

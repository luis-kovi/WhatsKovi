'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { dictionaries, type LanguageCode } from '@/i18n/dictionaries';

type TranslationParams = Record<string, string | number>;

type I18nContextValue = {
  language: LanguageCode;
  supportedLanguages: LanguageCode[];
  setLanguage: (language: LanguageCode, options?: { persist?: boolean }) => void;
  setSupportedLanguages: (languages: string[]) => void;
  t: (key: string, params?: TranslationParams) => string;
};

const DEFAULT_LANGUAGE: LanguageCode = 'pt-BR';
const LANGUAGE_STORAGE_KEY = 'whatskovi:language';
const KNOWN_LANGUAGES = Object.keys(dictionaries) as LanguageCode[];

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const normalizeLanguage = (language: string | null | undefined): LanguageCode => {
  if (!language) return DEFAULT_LANGUAGE;
  return KNOWN_LANGUAGES.includes(language as LanguageCode)
    ? (language as LanguageCode)
    : DEFAULT_LANGUAGE;
};

const resolveTranslation = (language: LanguageCode, key: string): string | undefined => {
  const segments = key.split('.');
  let current: unknown = dictionaries[language];
  for (const segment of segments) {
    if (typeof current !== 'object' || current === null || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'string' ? current : undefined;
};

const interpolate = (template: string, params?: TranslationParams) => {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, token) => {
    const value = params[token];
    return value !== undefined ? String(value) : '';
  });
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [supportedLanguages, setSupported] = useState<LanguageCode[]>(KNOWN_LANGUAGES);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored) {
      setLanguageState(normalizeLanguage(stored));
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const setLanguage = useCallback(
    (nextLanguage: LanguageCode, options?: { persist?: boolean }) => {
      const normalized = normalizeLanguage(nextLanguage);
      setLanguageState(normalized);
      if (typeof window !== 'undefined' && options?.persist !== false) {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
      }
    },
    []
  );

  const setSupportedLanguages = useCallback((languages: string[]) => {
    const filtered = languages
      .map((value) => normalizeLanguage(value))
      .filter((value, index, self) => self.indexOf(value) === index);
    setSupported(filtered.length > 0 ? filtered : KNOWN_LANGUAGES);
  }, []);

  const translate = useCallback(
    (key: string, params?: TranslationParams) => {
      const primary = resolveTranslation(language, key);
      if (primary) {
        return interpolate(primary, params);
      }
      const fallback = resolveTranslation(DEFAULT_LANGUAGE, key);
      if (fallback) {
        return interpolate(fallback, params);
      }
      return params?.defaultValue ? String(params.defaultValue) : key;
    },
    [language]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      supportedLanguages,
      setLanguage,
      setSupportedLanguages,
      t: translate
    }),
    [language, supportedLanguages, setLanguage, setSupportedLanguages, translate]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

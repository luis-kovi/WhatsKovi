import { create } from 'zustand';
import {
  fetchAdvancedSettings,
  persistGeneralSettings,
  persistServiceSettings,
  persistNotificationSettings,
  uploadBrandLogo,
  removeBrandLogo
} from '@/services/settings';
import type { GeneralSettings, ServiceSettings, NotificationSettings } from '@/types/settings';

type SettingsState = {
  general: GeneralSettings | null;
  service: ServiceSettings | null;
  notifications: NotificationSettings | null;
  loading: boolean;
  initialized: boolean;
  error?: string;
  savingGeneral: boolean;
  savingService: boolean;
  savingNotifications: boolean;
  fetch: () => Promise<void>;
  saveGeneral: (payload: GeneralSettings) => Promise<GeneralSettings | null>;
  saveService: (payload: ServiceSettings) => Promise<ServiceSettings | null>;
  saveNotifications: (payload: NotificationSettings) => Promise<NotificationSettings | null>;
  uploadLogo: (file: File) => Promise<boolean>;
  removeLogo: () => Promise<boolean>;
};

const DEFAULT_PRIMARY_RGB = '255 53 90';
const DEFAULT_ACCENT_RGB = '124 58 237';

const hexToRgbTuple = (hex: string): string | null => {
  if (typeof hex !== 'string') return null;
  const normalized = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
};

const applyBranding = (general: GeneralSettings | null) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const primaryRgb = general ? hexToRgbTuple(general.brandColor) ?? DEFAULT_PRIMARY_RGB : DEFAULT_PRIMARY_RGB;
  const accentRgb = general ? hexToRgbTuple(general.accentColor) ?? DEFAULT_ACCENT_RGB : DEFAULT_ACCENT_RGB;
  root.style.setProperty('--color-primary', primaryRgb);
  root.style.setProperty('--color-secondary', accentRgb);
  root.style.setProperty('--color-accent', accentRgb);
  if (typeof window !== 'undefined') {
    if (general?.logoUrl) {
      window.localStorage.setItem(
        'whatskovi:branding',
        JSON.stringify({
          brandColor: general.brandColor,
          accentColor: general.accentColor,
          logoUrl: general.logoUrl
        })
      );
    } else {
      window.localStorage.removeItem('whatskovi:branding');
    }
  }
};

const normalizeServiceSettings = (service: ServiceSettings | null): ServiceSettings | null => {
  if (!service) return null;
  return {
    ...service,
    aiEnabled: service.aiEnabled ?? false,
    aiRoutingEnabled: service.aiRoutingEnabled ?? false,
    aiProvider: service.aiProvider ?? 'OPENAI',
    aiModel: service.aiModel ?? null,
    aiConfidenceThreshold: service.aiConfidenceThreshold ?? 0.6,
    aiFallbackQueueId: service.aiFallbackQueueId ?? null,
    aiGeminiApiKey: service.aiGeminiApiKey ?? null,
    aiOpenAiApiKey: service.aiOpenAiApiKey ?? null
  };
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  general: null,
  service: null,
  notifications: null,
  loading: false,
  initialized: false,
  error: undefined,
  savingGeneral: false,
  savingService: false,
  savingNotifications: false,

  fetch: async () => {
    set({ loading: true, error: undefined });
    try {
      const data = await fetchAdvancedSettings();
      applyBranding(data.general);
      set({
        general: data.general,
        service: normalizeServiceSettings(data.service),
        notifications: {
          ...data.notifications,
          smtpHost: data.notifications.smtpHost ?? null,
          smtpPort: data.notifications.smtpPort ?? null,
          smtpUser: data.notifications.smtpUser ?? null,
          smtpPassword: data.notifications.smtpPassword ?? null,
          smtpFrom: data.notifications.smtpFrom ?? null
        },
        loading: false,
        initialized: true,
        error: undefined
      });
    } catch (error) {
      console.error('[Settings] failed to fetch advanced settings', error);
      set({ loading: false, initialized: true, error: 'Erro ao carregar configuracoes' });
    }
  },

  saveGeneral: async (payload) => {
    set({ savingGeneral: true, error: undefined });
    try {
      const updated = await persistGeneralSettings({
        companyName: payload.companyName,
        brandColor: payload.brandColor,
        accentColor: payload.accentColor,
        language: payload.language,
        supportedLanguages: payload.supportedLanguages,
        timezone: payload.timezone,
        dateFormat: payload.dateFormat
      });
      const general: GeneralSettings = {
        ...updated,
        supportedLanguages: payload.supportedLanguages ?? updated.supportedLanguages ?? [],
        logoUrl: payload.logoUrl ?? updated.logoUrl ?? null
      };
      applyBranding(general);
      set({ general, savingGeneral: false });
      return general;
    } catch (error) {
      console.error('[Settings] failed to save general settings', error);
      set({ savingGeneral: false, error: 'Erro ao salvar configuracoes gerais' });
      return null;
    }
  },

  saveService: async (payload) => {
    set({ savingService: true, error: undefined });
    try {
      const updated = await persistServiceSettings(payload);
      const service = normalizeServiceSettings(updated);
      set({ service, savingService: false });
      return service;
    } catch (error) {
      console.error('[Settings] failed to save service settings', error);
      set({ savingService: false, error: 'Erro ao salvar configuracoes de atendimento' });
      return null;
    }
  },

  saveNotifications: async (payload) => {
    set({ savingNotifications: true, error: undefined });
    try {
      const updated = await persistNotificationSettings(payload);
      set({
        notifications: {
          ...updated,
          smtpHost: updated.smtpHost ?? null,
          smtpPort: updated.smtpPort ?? null,
          smtpUser: updated.smtpUser ?? null,
          smtpPassword: updated.smtpPassword ?? null,
          smtpFrom: updated.smtpFrom ?? null
        },
        savingNotifications: false
      });
      return updated;
    } catch (error) {
      console.error('[Settings] failed to save notification settings', error);
      set({ savingNotifications: false, error: 'Erro ao salvar configuracoes de notificacoes' });
      return null;
    }
  },

  uploadLogo: async (file: File) => {
    const current = get().general;
    if (!current) {
      return false;
    }
    try {
      const logoUrl = await uploadBrandLogo(file);
      const updated = { ...current, logoUrl };
      set({ general: updated });
      applyBranding(updated);
      return true;
    } catch (error) {
      console.error('[Settings] failed to upload logo', error);
      set({ error: 'Erro ao enviar logo' });
      return false;
    }
  },

  removeLogo: async () => {
    const current = get().general;
    if (!current) {
      return false;
    }
    try {
      const logoUrl = await removeBrandLogo();
      const updated = { ...current, logoUrl };
      set({ general: updated });
      applyBranding(updated);
      return true;
    } catch (error) {
      console.error('[Settings] failed to remove logo', error);
      set({ error: 'Erro ao remover logo' });
      return false;
    }
  }
}));

export const getSettingsState = () => useSettingsStore.getState();

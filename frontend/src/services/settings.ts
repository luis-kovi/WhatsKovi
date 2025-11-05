import api from './api';
import type {
  AdvancedSettings,
  GeneralSettings,
  ServiceSettings,
  NotificationSettings
} from '@/types/settings';

export const fetchAdvancedSettings = async (): Promise<AdvancedSettings> => {
  const response = await api.get<AdvancedSettings>('/settings/advanced');
  return response.data;
};

export const persistGeneralSettings = async (payload: {
  companyName: string;
  brandColor: string;
  accentColor: string;
  language: string;
  supportedLanguages?: string[];
  timezone: string;
  dateFormat: string;
}) => {
  const response = await api.put<GeneralSettings>('/settings/advanced/general', payload);
  return response.data;
};

export const persistServiceSettings = async (payload: ServiceSettings) => {
  const response = await api.put<ServiceSettings>('/settings/advanced/service', {
    ...payload,
    aiModel: payload.aiModel ?? null,
    aiConfidenceThreshold: payload.aiConfidenceThreshold ?? null,
    aiFallbackQueueId: payload.aiFallbackQueueId ?? null,
    aiGeminiApiKey: payload.aiGeminiApiKey ?? null,
    aiOpenAiApiKey: payload.aiOpenAiApiKey ?? null
  });
  return response.data;
};

export const persistNotificationSettings = async (payload: NotificationSettings) => {
  const response = await api.put<NotificationSettings>('/settings/advanced/notifications', {
    ...payload,
    smtpPort: payload.smtpPort ?? null,
    smtpHost: payload.smtpHost ?? null,
    smtpUser: payload.smtpUser ?? null,
    smtpPassword: payload.smtpPassword ?? null,
    smtpFrom: payload.smtpFrom ?? null
  });
  return response.data;
};

export const uploadBrandLogo = async (file: File) => {
  const formData = new FormData();
  formData.append('logo', file);
  const response = await api.post<{ logoUrl: string | null }>('/settings/advanced/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data.logoUrl ?? null;
};

export const removeBrandLogo = async () => {
  const response = await api.delete<{ logoUrl: string | null }>('/settings/advanced/logo');
  return response.data.logoUrl ?? null;
};

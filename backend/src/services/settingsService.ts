import fs from 'fs/promises';
import path from 'path';
import prisma from '../config/database';
import { AdvancedSettings } from '@prisma/client';

export type GeneralSettingsPayload = {
  companyName: string;
  brandColor: string;
  accentColor: string;
  language: string;
  supportedLanguages?: string[];
  timezone: string;
  dateFormat: string;
};

export type ServiceSettingsPayload = {
  inactivityMinutes: number;
  autoCloseHours: number;
  autoCloseMessage: string;
  globalTicketLimit: number;
  perAgentTicketLimit: number;
  soundEnabled: boolean;
  satisfactionSurveyEnabled: boolean;
  aiEnabled: boolean;
  aiRoutingEnabled: boolean;
  aiProvider: 'OPENAI' | 'GEMINI' | 'HYBRID';
  aiModel?: string | null;
  aiConfidenceThreshold?: number | null;
  aiFallbackQueueId?: string | null;
  aiGeminiApiKey?: string | null;
  aiOpenAiApiKey?: string | null;
};

export type NotificationSettingsPayload = {
  notifyNewTicket: boolean;
  notifyTicketMessage: boolean;
  notifyTransfer: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
  soundTheme: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFrom: string | null;
  smtpSecure: boolean;
};

export type AdvancedSettingsResponse = {
  general: {
    companyName: string;
    brandColor: string;
    accentColor: string;
    language: string;
    supportedLanguages: string[];
    timezone: string;
    dateFormat: string;
    logoUrl: string | null;
  };
  service: ServiceSettingsPayload;
  notifications: NotificationSettingsPayload;
};

const SUPPORTED_LANG_FALLBACK = ['pt-BR', 'en-US', 'es-ES'];
const ALLOWED_DATE_FORMATS = ['dd/MM/yyyy HH:mm', 'MM/dd/yyyy hh:mm a', 'yyyy-MM-dd HH:mm'];
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;

const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');
const BRANDING_DIR = path.join(UPLOAD_ROOT, 'branding');

const toAbsoluteUploadPath = (key: string) => path.join(UPLOAD_ROOT, ...key.replace(/\\/g, '/').split('/'));

const DEFAULT_SETTINGS: Omit<AdvancedSettings, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'> = {
  companyName: 'WhatsKovi Atendimento',
  brandColor: '#FF355A',
  accentColor: '#7C3AED',
  language: 'pt-BR',
  supportedLanguages: SUPPORTED_LANG_FALLBACK,
  timezone: 'America/Sao_Paulo',
  dateFormat: 'dd/MM/yyyy HH:mm',
  logoUrl: null,
  logoStorageKey: null,
  inactivityMinutes: 15,
  autoCloseHours: 12,
  autoCloseMessage:
    'Encerramos este atendimento apos um periodo sem respostas. Caso precise de ajuda novamente, estamos por aqui!',
  globalTicketLimit: 400,
  perAgentTicketLimit: 25,
  soundEnabled: true,
  satisfactionSurveyEnabled: true,
  aiEnabled: false,
  aiRoutingEnabled: false,
  aiProvider: 'OPENAI',
  aiModel: 'gpt-4o-mini',
  aiConfidenceThreshold: 0.6,
  aiFallbackQueueId: null,
  aiGeminiApiKey: null,
  aiOpenAiApiKey: null,
  notifyNewTicket: true,
  notifyTicketMessage: true,
  notifyTransfer: true,
  pushEnabled: false,
  emailEnabled: false,
  soundTheme: 'classic',
  smtpHost: null,
  smtpPort: null,
  smtpUser: null,
  smtpPassword: null,
  smtpFrom: null,
  smtpSecure: true,
  updatedById: null
};

const ensureBrandingDir = async () => {
  try {
    await fs.mkdir(BRANDING_DIR, { recursive: true });
  } catch (error) {
    console.error('[Settings] Failed to ensure branding directory', error);
    throw error;
  }
};

const ensureSettings = async (): Promise<AdvancedSettings> => {
  const existing = await prisma.advancedSettings.findFirst();
  if (existing) return existing;

  const created = await prisma.advancedSettings.create({
    data: DEFAULT_SETTINGS
  });
  return created;
};

const normalizeColor = (input: string, fallback: string) => {
  const value = input.trim();
  if (!HEX_COLOR_REGEX.test(value)) {
    return fallback;
  }
  return `#${value.slice(1).toUpperCase()}`;
};

const normalizeLanguage = (input: string) => {
  if (typeof input !== 'string' || !input.trim()) {
    return DEFAULT_SETTINGS.language;
  }
  return input.trim();
};

const normalizeSupportedLanguages = (values: string[] | undefined) => {
  if (!values || values.length === 0) {
    return SUPPORTED_LANG_FALLBACK;
  }
  const sanitized = values
    .map((value) => value.trim())
    .filter((value, index, self) => value && self.indexOf(value) === index);
  return sanitized.length > 0 ? sanitized : SUPPORTED_LANG_FALLBACK;
};

const normalizeDateFormat = (value: string, fallback: string) => {
  if (ALLOWED_DATE_FORMATS.includes(value)) {
    return value;
  }
  return fallback;
};

const normalizeInt = (value: number, fallback: number, min = 1, max?: number) => {
  if (Number.isFinite(value)) {
    const parsed = Math.trunc(value);
    if (parsed >= min && (typeof max === 'undefined' || parsed <= max)) {
      return parsed;
    }
  }
  return fallback;
};

const mapToResponse = (settings: AdvancedSettings): AdvancedSettingsResponse => ({
  general: {
    companyName: settings.companyName,
    brandColor: settings.brandColor,
    accentColor: settings.accentColor,
    language: settings.language,
    supportedLanguages: settings.supportedLanguages,
    timezone: settings.timezone,
    dateFormat: settings.dateFormat,
    logoUrl: settings.logoUrl
  },
  service: {
    inactivityMinutes: settings.inactivityMinutes,
    autoCloseHours: settings.autoCloseHours,
    autoCloseMessage: settings.autoCloseMessage,
    globalTicketLimit: settings.globalTicketLimit,
    perAgentTicketLimit: settings.perAgentTicketLimit,
    soundEnabled: settings.soundEnabled,
    satisfactionSurveyEnabled: settings.satisfactionSurveyEnabled,
    aiEnabled: settings.aiEnabled,
    aiRoutingEnabled: settings.aiRoutingEnabled,
    aiProvider: settings.aiProvider as ServiceSettingsPayload['aiProvider'],
    aiModel: settings.aiModel ?? null,
    aiConfidenceThreshold: settings.aiConfidenceThreshold ?? 0.6,
    aiFallbackQueueId: settings.aiFallbackQueueId ?? null,
    aiGeminiApiKey: settings.aiGeminiApiKey ?? null,
    aiOpenAiApiKey: settings.aiOpenAiApiKey ?? null
  },
  notifications: {
    notifyNewTicket: settings.notifyNewTicket,
    notifyTicketMessage: settings.notifyTicketMessage,
    notifyTransfer: settings.notifyTransfer,
    pushEnabled: settings.pushEnabled,
    emailEnabled: settings.emailEnabled,
    soundEnabled: settings.soundEnabled,
    soundTheme: settings.soundTheme as NotificationSettingsPayload['soundTheme'],
    smtpHost: settings.smtpHost ?? null,
    smtpPort: settings.smtpPort ?? null,
    smtpUser: settings.smtpUser ?? null,
    smtpPassword: settings.smtpPassword ?? null,
    smtpFrom: settings.smtpFrom ?? null,
    smtpSecure: settings.smtpSecure
  }
});

export const getAdvancedSettings = async (): Promise<AdvancedSettingsResponse> => {
  const settings = await ensureSettings();
  return mapToResponse(settings);
};

export const updateGeneralSettings = async (
  payload: GeneralSettingsPayload,
  userId?: string
): Promise<AdvancedSettingsResponse['general']> => {
  const current = await ensureSettings();

  const companyName = typeof payload.companyName === 'string' && payload.companyName.trim()
    ? payload.companyName.trim().slice(0, 120)
    : current.companyName;

  const brandColor = normalizeColor(payload.brandColor ?? current.brandColor, current.brandColor);
  const accentColor = normalizeColor(payload.accentColor ?? current.accentColor, current.accentColor);
  const language = normalizeLanguage(payload.language ?? current.language);
  const supportedLanguages = normalizeSupportedLanguages(payload.supportedLanguages);
  const timezone = typeof payload.timezone === 'string' && payload.timezone.trim()
    ? payload.timezone.trim()
    : current.timezone;
  const dateFormat = normalizeDateFormat(payload.dateFormat ?? current.dateFormat, current.dateFormat);

  const updated = await prisma.advancedSettings.update({
    where: { id: current.id },
    data: {
      companyName,
      brandColor,
      accentColor,
      language,
      supportedLanguages,
      timezone,
      dateFormat,
      updatedById: userId ?? null
    }
  });

  return mapToResponse(updated).general;
};

export const updateServiceSettings = async (
  payload: ServiceSettingsPayload,
  userId?: string
): Promise<AdvancedSettingsResponse['service']> => {
  const current = await ensureSettings();

  const inactivityMinutes = normalizeInt(payload.inactivityMinutes, current.inactivityMinutes, 1, 1440);
  const autoCloseHours = normalizeInt(payload.autoCloseHours, current.autoCloseHours, 1, 168);
  const autoCloseMessage =
    typeof payload.autoCloseMessage === 'string' && payload.autoCloseMessage.trim()
      ? payload.autoCloseMessage.trim().slice(0, 500)
      : current.autoCloseMessage;
  const globalTicketLimit = normalizeInt(payload.globalTicketLimit, current.globalTicketLimit, 1);
  const perAgentTicketLimit = normalizeInt(payload.perAgentTicketLimit, current.perAgentTicketLimit, 1);
  const aiProvider: ServiceSettingsPayload['aiProvider'] =
    payload.aiProvider && ['OPENAI', 'GEMINI', 'HYBRID'].includes(payload.aiProvider)
      ? payload.aiProvider
      : (current.aiProvider as ServiceSettingsPayload['aiProvider']) ?? 'OPENAI';
  const aiModel =
    payload.aiModel === null
      ? null
      : typeof payload.aiModel === 'string'
        ? payload.aiModel.trim().slice(0, 120) || null
        : current.aiModel;
  const aiConfidenceThreshold =
    typeof payload.aiConfidenceThreshold === 'number' && Number.isFinite(payload.aiConfidenceThreshold)
      ? Math.min(Math.max(payload.aiConfidenceThreshold, 0.05), 0.99)
      : current.aiConfidenceThreshold ?? 0.6;
  const aiFallbackQueueId =
    payload.aiFallbackQueueId === null
      ? null
      : typeof payload.aiFallbackQueueId === 'string'
        ? payload.aiFallbackQueueId.trim() || null
        : current.aiFallbackQueueId;
  const normalizedGemini =
    payload.aiGeminiApiKey === null
      ? null
      : typeof payload.aiGeminiApiKey === 'string'
        ? payload.aiGeminiApiKey.trim()
        : undefined;
  const normalizedOpenAi =
    payload.aiOpenAiApiKey === null
      ? null
      : typeof payload.aiOpenAiApiKey === 'string'
        ? payload.aiOpenAiApiKey.trim()
        : undefined;

  const updated = await prisma.advancedSettings.update({
    where: { id: current.id },
    data: {
      inactivityMinutes,
      autoCloseHours,
      autoCloseMessage,
      globalTicketLimit,
      perAgentTicketLimit,
      soundEnabled: Boolean(payload.soundEnabled),
      satisfactionSurveyEnabled: Boolean(payload.satisfactionSurveyEnabled),
      aiEnabled: Boolean(payload.aiEnabled),
      aiRoutingEnabled: Boolean(payload.aiRoutingEnabled),
      aiProvider,
      aiModel,
      aiConfidenceThreshold,
      aiFallbackQueueId,
      ...(normalizedGemini !== undefined
        ? { aiGeminiApiKey: normalizedGemini && normalizedGemini.length > 0 ? normalizedGemini : null }
        : {}),
      ...(normalizedOpenAi !== undefined
        ? { aiOpenAiApiKey: normalizedOpenAi && normalizedOpenAi.length > 0 ? normalizedOpenAi : null }
        : {}),
      updatedById: userId ?? null
    }
  });

  return mapToResponse(updated).service;
};

const normalizeStringOrNull = (value: string | null | undefined) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const updateNotificationSettings = async (
  payload: NotificationSettingsPayload,
  userId?: string
): Promise<AdvancedSettingsResponse['notifications']> => {
  const current = await ensureSettings();

  const soundTheme =
    payload.soundTheme && ['classic', 'soft', 'bright'].includes(payload.soundTheme)
      ? payload.soundTheme
      : current.soundTheme;

  const smtpPort =
    typeof payload.smtpPort === 'number' && Number.isInteger(payload.smtpPort) && payload.smtpPort > 0
      ? payload.smtpPort
      : payload.smtpPort === null
        ? null
        : current.smtpPort;

  const updated = await prisma.advancedSettings.update({
    where: { id: current.id },
    data: {
      notifyNewTicket: Boolean(payload.notifyNewTicket),
      notifyTicketMessage: Boolean(payload.notifyTicketMessage),
      notifyTransfer: Boolean(payload.notifyTransfer),
      pushEnabled: Boolean(payload.pushEnabled),
      emailEnabled: Boolean(payload.emailEnabled),
      soundEnabled: Boolean(payload.soundEnabled),
      soundTheme,
      smtpHost: normalizeStringOrNull(payload.smtpHost),
      smtpPort,
      smtpUser: normalizeStringOrNull(payload.smtpUser),
      smtpPassword: normalizeStringOrNull(payload.smtpPassword),
      smtpFrom: normalizeStringOrNull(payload.smtpFrom),
      smtpSecure: Boolean(payload.smtpSecure),
      updatedById: userId ?? null
    }
  });

  return mapToResponse(updated).notifications;
};

export const updateBrandingLogo = async (
  storageKey: string | null,
  userId?: string
): Promise<string | null> => {
  const current = await ensureSettings();
  const data: { logoUrl: string | null; logoStorageKey: string | null; updatedById: string | null } = {
    logoUrl: storageKey ? `/uploads/${storageKey}` : null,
    logoStorageKey: storageKey,
    updatedById: userId ?? null
  };

  const previousKey = current.logoStorageKey;

  const updated = await prisma.advancedSettings.update({
    where: { id: current.id },
    data
  });

  if (previousKey && previousKey !== storageKey) {
    const previousPath = toAbsoluteUploadPath(previousKey);
    fs.unlink(previousPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') {
        console.warn('[Settings] Failed to remove previous logo', error);
      }
    });
  }

  return updated.logoUrl;
};

export const persistBrandingLogo = async (
  filePath: string,
  filename: string,
  userId?: string
): Promise<string | null> => {
  await ensureBrandingDir();

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageKey = path.posix.join('branding', safeName);
  const targetPath = path.join(UPLOAD_ROOT, 'branding', safeName);

  try {
    await fs.rename(filePath, targetPath);
  } catch (error) {
    console.error('[Settings] Failed to move branding logo', error);
    throw error;
  }

  return updateBrandingLogo(storageKey, userId);
};

export const ensureAdvancedSettingsRecord = ensureSettings;

import { Response } from 'express';
import fs from 'fs/promises';
import { AuthRequest } from '../middleware/auth';
import {
  getAdvancedSettings,
  updateGeneralSettings,
  updateServiceSettings,
  updateNotificationSettings,
  persistBrandingLogo,
  updateBrandingLogo,
  GeneralSettingsPayload,
  ServiceSettingsPayload,
  NotificationSettingsPayload
} from '../services/settingsService';

const ensureArrayOfStrings = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
    .filter((item) => item.trim().length > 0);
};

export const getAdvancedSettingsHandler = async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await getAdvancedSettings();
    return res.json(settings);
  } catch (error) {
    console.error('[Settings] Failed to load advanced settings', error);
    return res.status(500).json({ error: 'Erro ao carregar configuracoes' });
  }
};

export const updateGeneralSettingsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as Partial<GeneralSettingsPayload> & { supportedLanguages?: unknown };
    const payload: GeneralSettingsPayload = {
      companyName: typeof body.companyName === 'string' ? body.companyName : '',
      brandColor: typeof body.brandColor === 'string' ? body.brandColor : '',
      accentColor: typeof body.accentColor === 'string' ? body.accentColor : '',
      language: typeof body.language === 'string' ? body.language : '',
      supportedLanguages: ensureArrayOfStrings(body.supportedLanguages),
      timezone: typeof body.timezone === 'string' ? body.timezone : '',
      dateFormat: typeof body.dateFormat === 'string' ? body.dateFormat : ''
    };

    const updated = await updateGeneralSettings(payload, req.user?.id);
    return res.json(updated);
  } catch (error) {
    console.error('[Settings] Failed to update general settings', error);
    return res.status(500).json({ error: 'Erro ao atualizar configuracoes gerais' });
  }
};

export const updateServiceSettingsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as Partial<ServiceSettingsPayload>;
    const payload: ServiceSettingsPayload = {
      inactivityMinutes: Number(body.inactivityMinutes ?? 0),
      autoCloseHours: Number(body.autoCloseHours ?? 0),
      autoCloseMessage: typeof body.autoCloseMessage === 'string' ? body.autoCloseMessage : '',
      globalTicketLimit: Number(body.globalTicketLimit ?? 0),
      perAgentTicketLimit: Number(body.perAgentTicketLimit ?? 0),
      soundEnabled: Boolean(body.soundEnabled),
      satisfactionSurveyEnabled: Boolean(body.satisfactionSurveyEnabled)
    };

    const updated = await updateServiceSettings(payload, req.user?.id);
    return res.json(updated);
  } catch (error) {
    console.error('[Settings] Failed to update service settings', error);
    return res.status(500).json({ error: 'Erro ao atualizar configuracoes de atendimento' });
  }
};

export const updateNotificationSettingsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as Partial<NotificationSettingsPayload>;
    const payload: NotificationSettingsPayload = {
      notifyNewTicket: Boolean(body.notifyNewTicket),
      notifyTicketMessage: Boolean(body.notifyTicketMessage),
      notifyTransfer: Boolean(body.notifyTransfer),
      pushEnabled: Boolean(body.pushEnabled),
      emailEnabled: Boolean(body.emailEnabled),
      soundEnabled: Boolean(body.soundEnabled),
      soundTheme: typeof body.soundTheme === 'string' ? body.soundTheme : '',
      smtpHost: body.smtpHost === null ? null : typeof body.smtpHost === 'string' ? body.smtpHost : null,
      smtpPort:
        body.smtpPort === null
          ? null
          : typeof body.smtpPort === 'number'
            ? body.smtpPort
            : typeof body.smtpPort === 'string'
              ? Number(body.smtpPort)
              : null,
      smtpUser: body.smtpUser === null ? null : typeof body.smtpUser === 'string' ? body.smtpUser : null,
      smtpPassword:
        body.smtpPassword === null ? null : typeof body.smtpPassword === 'string' ? body.smtpPassword : null,
      smtpFrom: body.smtpFrom === null ? null : typeof body.smtpFrom === 'string' ? body.smtpFrom : null,
      smtpSecure: typeof body.smtpSecure === 'boolean' ? body.smtpSecure : true
    };

    const updated = await updateNotificationSettings(payload, req.user?.id);
    return res.json(updated);
  } catch (error) {
    console.error('[Settings] Failed to update notification settings', error);
    return res.status(500).json({ error: 'Erro ao atualizar configuracoes de notificacoes' });
  }
};

export const uploadBrandingLogoHandler = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Arquivo de logo obrigatorio' });
    }

    const logoUrl = await persistBrandingLogo(file.path, file.filename, req.user?.id);
    return res.json({ logoUrl });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path).catch(() => {});
    }
    console.error('[Settings] Failed to process logo upload', error);
    return res.status(500).json({ error: 'Erro ao processar upload de logo' });
  }
};

export const removeBrandingLogoHandler = async (req: AuthRequest, res: Response) => {
  try {
    const logoUrl = await updateBrandingLogo(null, req.user?.id);
    return res.json({ logoUrl });
  } catch (error) {
    console.error('[Settings] Failed to remove logo', error);
    return res.status(500).json({ error: 'Erro ao remover logo' });
  }
};

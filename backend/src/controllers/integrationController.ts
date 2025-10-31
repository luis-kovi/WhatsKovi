import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getIntegrationSettings,
  listIntegrationLogs,
  updateIntegrationSettings,
  resolveAnalyticsMeasurementId
} from '../services/integrationService';

const parseBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'on', 'yes'].includes(value.toLowerCase());
  }
  return false;
};

const parseOptionalString = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
};

const parseNullableString = (value: unknown) => {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  return value;
};

const parseSmsProvider = (value: unknown): 'TWILIO' | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return null;
  const upper = value.trim().toUpperCase();
  return upper === 'TWILIO' ? 'TWILIO' : null;
};

export const getIntegrationSettingsHandler = async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await getIntegrationSettings();
    return res.json(settings);
  } catch (error) {
    console.error('[Integration] Failed to load integration settings', error);
    return res.status(500).json({ error: 'Erro ao carregar configuracoes de integracoes' });
  }
};

export const updateIntegrationSettingsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body as Record<string, unknown>;

    const updated = await updateIntegrationSettings(
      {
        measurementId: typeof payload.measurementId === 'string' ? payload.measurementId : undefined,
        zapierEnabled:
          payload.zapierEnabled !== undefined ? parseBoolean(payload.zapierEnabled) : undefined,
        zapierWebhookUrl: parseNullableString(payload.zapierWebhookUrl),
        zapierAuthToken: parseOptionalString(payload.zapierAuthToken),
        n8nEnabled: payload.n8nEnabled !== undefined ? parseBoolean(payload.n8nEnabled) : undefined,
        n8nWebhookUrl: parseNullableString(payload.n8nWebhookUrl),
        n8nAuthToken: parseOptionalString(payload.n8nAuthToken),
        emailChannelEnabled:
          payload.emailChannelEnabled !== undefined ? parseBoolean(payload.emailChannelEnabled) : undefined,
        smsChannelEnabled:
          payload.smsChannelEnabled !== undefined ? parseBoolean(payload.smsChannelEnabled) : undefined,
        smsProvider: payload.smsProvider !== undefined ? parseSmsProvider(payload.smsProvider) : undefined,
        smsFromNumber: parseOptionalString(payload.smsFromNumber),
        smsAccountSid: parseOptionalString(payload.smsAccountSid),
        smsAuthToken: parseOptionalString(payload.smsAuthToken)
      },
      req.user?.id
    );

    return res.json(updated);
  } catch (error) {
    console.error('[Integration] Failed to update integration settings', error);
    return res.status(500).json({ error: 'Erro ao salvar configuracoes de integracoes' });
  }
};

export const listIntegrationLogsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const limit =
      typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined;
    const logs = await listIntegrationLogs(Number.isFinite(limit) ? limit : undefined);
    return res.json({ logs });
  } catch (error) {
    console.error('[Integration] Failed to list integration logs', error);
    return res.status(500).json({ error: 'Erro ao carregar logs de integracao' });
  }
};

export const getPublicAnalyticsConfigHandler = async (_req: Request, res: Response) => {
  try {
    const measurementId = await resolveAnalyticsMeasurementId();
    return res.json({ measurementId });
  } catch (error) {
    console.error('[Integration] Failed to resolve analytics configuration', error);
    return res.status(500).json({ error: 'Erro ao carregar configuracao de analytics' });
  }
};

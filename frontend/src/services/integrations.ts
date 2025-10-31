import api from './api';
import type { IntegrationSettingsData, IntegrationLogEntry } from '@/types/integrations';
import type { IntegrationSettingsFormValues } from '@/types/integrations';

type UpdatePayload = {
  measurementId?: string | null;
  zapierEnabled?: boolean;
  zapierWebhookUrl?: string | null;
  zapierAuthToken?: string | null;
  n8nEnabled?: boolean;
  n8nWebhookUrl?: string | null;
  n8nAuthToken?: string | null;
  emailChannelEnabled?: boolean;
  smsChannelEnabled?: boolean;
  smsProvider?: 'TWILIO' | null;
  smsFromNumber?: string | null;
  smsAccountSid?: string | null;
  smsAuthToken?: string | null;
};

export const fetchIntegrationSettings = async (): Promise<IntegrationSettingsData> => {
  const response = await api.get<IntegrationSettingsData>('/settings/integrations');
  return response.data;
};

export const fetchIntegrationLogs = async (): Promise<IntegrationLogEntry[]> => {
  const response = await api.get<{ logs: IntegrationLogEntry[] }>('/settings/integrations/logs');
  return response.data.logs;
};

export const persistIntegrationSettings = async (values: IntegrationSettingsFormValues) => {
  const payload: UpdatePayload = {
    measurementId: values.measurementId || null,
    zapierEnabled: values.zapierEnabled,
    zapierWebhookUrl: values.zapierWebhookUrl || null,
    zapierAuthToken: values.zapierAuthToken || null,
    n8nEnabled: values.n8nEnabled,
    n8nWebhookUrl: values.n8nWebhookUrl || null,
    n8nAuthToken: values.n8nAuthToken || null,
    emailChannelEnabled: values.emailChannelEnabled,
    smsChannelEnabled: values.smsChannelEnabled,
    smsProvider: values.smsProvider ? values.smsProvider : null,
    smsFromNumber: values.smsFromNumber || null,
    smsAccountSid: values.smsAccountSid || null,
    smsAuthToken: values.smsAuthToken || null
  };

  const response = await api.put<IntegrationSettingsData>('/settings/integrations', payload);
  return response.data;
};

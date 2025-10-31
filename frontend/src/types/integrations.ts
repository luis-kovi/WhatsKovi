export type IntegrationSettingsData = {
  analytics: {
    measurementId: string | null;
  };
  zapier: {
    enabled: boolean;
    webhookUrl: string | null;
    hasAuthToken: boolean;
    authTokenPreview: string | null;
  };
  n8n: {
    enabled: boolean;
    webhookUrl: string | null;
    hasAuthToken: boolean;
    authTokenPreview: string | null;
  };
  multichannel: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    smsProvider: string | null;
    smsFromNumber: string | null;
  };
  logs: IntegrationLogEntry[];
};

export type PublicAnalyticsConfig = {
  measurementId: string | null;
};

export type IntegrationLogEntry = {
  id: string;
  provider: string;
  eventType: string;
  status: string;
  statusCode: number | null;
  createdAt: string;
  error: string | null;
};

export type IntegrationSettingsFormValues = {
  measurementId: string;
  zapierEnabled: boolean;
  zapierWebhookUrl: string;
  zapierAuthToken: string;
  n8nEnabled: boolean;
  n8nWebhookUrl: string;
  n8nAuthToken: string;
  emailChannelEnabled: boolean;
  smsChannelEnabled: boolean;
  smsProvider: 'TWILIO' | '';
  smsFromNumber: string;
  smsAccountSid: string;
  smsAuthToken: string;
};

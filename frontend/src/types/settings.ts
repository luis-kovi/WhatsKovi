export type GeneralSettings = {
  companyName: string;
  brandColor: string;
  accentColor: string;
  language: string;
  supportedLanguages: string[];
  timezone: string;
  dateFormat: string;
  logoUrl: string | null;
};

export type ServiceSettings = {
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

export type NotificationSettings = {
  notifyNewTicket: boolean;
  notifyTicketMessage: boolean;
  notifyTransfer: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
  soundTheme: 'classic' | 'soft' | 'bright';
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFrom: string | null;
  smtpSecure: boolean;
};

export type AdvancedSettings = {
  general: GeneralSettings;
  service: ServiceSettings;
  notifications: NotificationSettings;
};

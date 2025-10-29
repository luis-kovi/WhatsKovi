'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import GeneralSettingsForm, { GeneralSettingsValues } from '@/components/settings/GeneralSettingsForm';
import ServiceSettingsForm, { ServiceSettingsValues } from '@/components/settings/ServiceSettingsForm';
import NotificationSettingsForm, {
  NotificationSettingsValues
} from '@/components/settings/NotificationSettingsForm';
import IntegrationSettings from '@/components/settings/IntegrationSettings';
import WhatsAppConnectionsSection from '@/components/settings/WhatsAppConnectionsSection';
import QueueSettingsSection from '@/components/settings/QueueSettingsSection';
import TagSettingsSection from '@/components/settings/TagSettingsSection';
import { QuickReplySettingsSection } from '@/components/settings/QuickReplySettingsSection';
import { useAuthStore } from '@/store/authStore';
import { useMetadataStore } from '@/store/metadataStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useI18n } from '@/providers/I18nProvider';
import type { LanguageCode } from '@/i18n/dictionaries';
import { useRouter } from 'next/navigation';

type WebhookConfig = {
  id: string;
  event: string;
  url: string;
  status: 'active' | 'paused';
};

type ApiLog = {
  id: string;
  method: string;
  path: string;
  status: number;
  timestamp: string;
};

const DEFAULT_SERVICE_SETTINGS: ServiceSettingsValues = {
  inactivityMinutes: 15,
  autoCloseHours: 12,
  autoCloseMessage:
    'Encerramos este atendimento após um período sem respostas. Caso precise de ajuda novamente, estamos por aqui!',
  globalTicketLimit: 400,
  perAgentTicketLimit: 25,
  soundEnabled: true,
  satisfactionSurveyEnabled: true
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsValues = {
  notifyNewTicket: true,
  notifyTicketMessage: true,
  notifyTransfer: true,
  pushEnabled: false,
  emailEnabled: false,
  soundEnabled: true,
  soundTheme: 'classic',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  smtpFrom: '',
  smtpSecure: true
};

export default function SettingsPage() {
  const router = useRouter();
  const { t, setLanguage, setSupportedLanguages } = useI18n();
  const { isAuthenticated, loadUser } = useAuthStore();
  const queues = useMetadataStore((state) => state.queues);
  const tags = useMetadataStore((state) => state.tags);
  const fetchQueues = useMetadataStore((state) => state.fetchQueues);
  const fetchTags = useMetadataStore((state) => state.fetchTags);
  const createQueue = useMetadataStore((state) => state.createQueue);
  const updateQueue = useMetadataStore((state) => state.updateQueue);
  const deleteQueue = useMetadataStore((state) => state.deleteQueue);
  const createTag = useMetadataStore((state) => state.createTag);
  const updateTag = useMetadataStore((state) => state.updateTag);
  const deleteTag = useMetadataStore((state) => state.deleteTag);
  const {
    general,
    service,
    notifications,
    loading,
    initialized,
    savingGeneral,
    savingService,
    savingNotifications,
    fetch: fetchSettings,
    saveGeneral,
    saveService,
    saveNotifications,
    uploadLogo,
    removeLogo
  } = useSettingsStore((state) => ({
    general: state.general,
    service: state.service,
    notifications: state.notifications,
    loading: state.loading,
    initialized: state.initialized,
    savingGeneral: state.savingGeneral,
    savingService: state.savingService,
    savingNotifications: state.savingNotifications,
    fetch: state.fetch,
    saveGeneral: state.saveGeneral,
    saveService: state.saveService,
    saveNotifications: state.saveNotifications,
    uploadLogo: state.uploadLogo,
    removeLogo: state.removeLogo
  }));

  const [generalSettings, setGeneralSettings] = useState<GeneralSettingsValues | null>(null);
  const [serviceSettings, setServiceSettings] =
    useState<ServiceSettingsValues | null>(DEFAULT_SERVICE_SETTINGS);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsValues | null>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [supportedLanguagesState, setSupportedLanguagesState] = useState<string[]>([]);
  const [apiToken, setApiToken] = useState('');
  const [webhooks] = useState<WebhookConfig[]>([
    {
      id: 'wh-001',
      event: 'Novo ticket',
      url: 'https://hooks.seusistema.com/whatskovi/new-ticket',
      status: 'active'
    },
    {
      id: 'wh-002',
      event: 'Ticket fechado',
      url: 'https://hooks.seusistema.com/whatskovi/ticket-closed',
      status: 'active'
    },
    {
      id: 'wh-003',
      event: 'Nova mensagem',
      url: 'https://hooks.seusistema.com/whatskovi/new-message',
      status: 'paused'
    }
  ]);
  const [logs] = useState<ApiLog[]>([
    { id: 'log-1', method: 'POST', path: '/api/webhooks/new-ticket', status: 200, timestamp: '17/10/2025 12:31' },
    { id: 'log-2', method: 'GET', path: '/api/tickets?status=open', status: 200, timestamp: '17/10/2025 12:29' },
    { id: 'log-3', method: 'POST', path: '/api/messages', status: 201, timestamp: '17/10/2025 12:25' },
    { id: 'log-4', method: 'POST', path: '/api/webhooks/new-message', status: 401, timestamp: '17/10/2025 12:21' }
  ]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchQueues();
    fetchTags();
    if (!initialized) {
      fetchSettings();
    }
  }, [isAuthenticated, fetchQueues, fetchTags, fetchSettings, initialized]);

  useEffect(() => {
    if (!general) return;
    setGeneralSettings({
      companyName: general.companyName,
      brandColor: general.brandColor,
      accentColor: general.accentColor,
      language: general.language,
      timezone: general.timezone,
      dateFormat: general.dateFormat,
      logoUrl: general.logoUrl
    });
    setSupportedLanguagesState(general.supportedLanguages);
    setSupportedLanguages(general.supportedLanguages);
    setLanguage(general.language as LanguageCode, { persist: false });
  }, [general, setLanguage, setSupportedLanguages]);

  useEffect(() => {
    if (!service) return;
    setServiceSettings({
      inactivityMinutes: service.inactivityMinutes,
      autoCloseHours: service.autoCloseHours,
      autoCloseMessage: service.autoCloseMessage,
      globalTicketLimit: service.globalTicketLimit,
      perAgentTicketLimit: service.perAgentTicketLimit,
      soundEnabled: service.soundEnabled,
      satisfactionSurveyEnabled: service.satisfactionSurveyEnabled
    });
  }, [service]);

  useEffect(() => {
    if (!notifications) return;
    setNotificationSettings({
      notifyNewTicket: notifications.notifyNewTicket,
      notifyTicketMessage: notifications.notifyTicketMessage,
      notifyTransfer: notifications.notifyTransfer,
      pushEnabled: notifications.pushEnabled,
      emailEnabled: notifications.emailEnabled,
      soundEnabled: notifications.soundEnabled,
      soundTheme: notifications.soundTheme as NotificationSettingsValues['soundTheme'],
      smtpHost: notifications.smtpHost ?? '',
      smtpPort: notifications.smtpPort ?? '',
      smtpUser: notifications.smtpUser ?? '',
      smtpPassword: notifications.smtpPassword ?? '',
      smtpFrom: notifications.smtpFrom ?? '',
      smtpSecure: notifications.smtpSecure
    });
  }, [notifications]);

  const ready = useMemo(
    () =>
      isAuthenticated &&
      !loading &&
      Boolean(generalSettings && serviceSettings && notificationSettings),
    [isAuthenticated, loading, generalSettings, serviceSettings, notificationSettings]
  );

  const handleGeneralChange = <Key extends keyof GeneralSettingsValues>(
    key: Key,
    value: GeneralSettingsValues[Key]
  ) => {
    setGeneralSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleServiceChange = <Key extends keyof ServiceSettingsValues>(
    key: Key,
    value: ServiceSettingsValues[Key]
  ) => {
    setServiceSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleNotificationChange = <Key extends keyof NotificationSettingsValues>(
    key: Key,
    value: NotificationSettingsValues[Key]
  ) => {
    setNotificationSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleGeneralSave = async () => {
    if (!generalSettings) return;

    const result = await saveGeneral({
      ...generalSettings,
      supportedLanguages: supportedLanguagesState
    });

    if (result) {
      toast.success(t('settings.toasts.generalSaved'));
      setLanguage(result.language as LanguageCode, { persist: false });
      setSupportedLanguagesState(result.supportedLanguages);
      setSupportedLanguages(result.supportedLanguages);
    } else {
      toast.error(t('settings.toasts.errorGeneric'));
    }
  };

  const handleServiceSave = async () => {
    if (!serviceSettings) return;
    const result = await saveService(serviceSettings);
    if (result) {
      toast.success(t('settings.toasts.serviceSaved'));
    } else {
      toast.error(t('settings.toasts.errorGeneric'));
    }
  };

  const handleNotificationSave = async () => {
    if (!notificationSettings) return;

    const payload = {
      notifyNewTicket: notificationSettings.notifyNewTicket,
      notifyTicketMessage: notificationSettings.notifyTicketMessage,
      notifyTransfer: notificationSettings.notifyTransfer,
      pushEnabled: notificationSettings.pushEnabled,
      emailEnabled: notificationSettings.emailEnabled,
      soundEnabled: notificationSettings.soundEnabled,
      soundTheme: notificationSettings.soundTheme,
      smtpHost: notificationSettings.smtpHost.trim() || null,
      smtpPort:
        notificationSettings.smtpPort === '' ? null : Number(notificationSettings.smtpPort),
      smtpUser: notificationSettings.smtpUser.trim() || null,
      smtpPassword: notificationSettings.smtpPassword.trim() || null,
      smtpFrom: notificationSettings.smtpFrom.trim() || null,
      smtpSecure: notificationSettings.smtpSecure
    };

    const result = await saveNotifications(payload);
    if (result) {
      toast.success(t('settings.toasts.notificationsSaved'));
    } else {
      toast.error(t('settings.toasts.errorGeneric'));
    }
  };

  const handleLogoUpload = async (file: File) => {
    const success = await uploadLogo(file);
    if (success) {
      toast.success(t('settings.toasts.logoUploaded'));
    } else {
      toast.error(t('settings.toasts.errorGeneric'));
    }
  };

  const handleRemoveLogo = async () => {
    const success = await removeLogo();
    if (success) {
      toast.success(t('settings.toasts.logoRemoved'));
    } else {
      toast.error(t('settings.toasts.errorGeneric'));
    }
  };

  const handleCreateQueue = async (payload: {
    name: string;
    color?: string;
    description?: string;
    greetingMessage?: string;
    outOfHoursMessage?: string;
    priority?: number;
    userIds?: string[];
  }) => {
    await createQueue(payload);
  };

  const handleUpdateQueue = async (
    id: string,
    payload: {
      name?: string;
      color?: string;
      description?: string;
      greetingMessage?: string;
      outOfHoursMessage?: string;
      priority?: number;
    }
  ) => {
    await updateQueue(id, payload);
  };

  const handleDeleteQueue = async (id: string) => {
    await deleteQueue(id);
  };

  const handleCreateTag = async (payload: { name: string; color?: string; keywords?: string[] }) => {
    await createTag(payload);
  };

  const handleUpdateTag = async (
    id: string,
    payload: { name?: string; color?: string; keywords?: string[] }
  ) => {
    await updateTag(id, payload);
  };

  const handleDeleteTag = async (id: string) => {
    await deleteTag(id);
  };

  const handleGenerateToken = () => {
    const randomPart =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? (crypto.randomUUID() as string).replace(/-/g, '')
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    const token = randomPart.padEnd(32, 'x').slice(0, 32);
    setApiToken(token);
    toast.success(t('settings.integration.tokenGenerated'));
  };

  if (!ready || !generalSettings || !serviceSettings || !notificationSettings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 transition-colors duration-300 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-8 px-8 py-10">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
              <p className="text-sm text-gray-500">{t('settings.subtitle')}</p>
            </div>
            <div className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
              {t('settings.adminOnly')}
            </div>
          </header>

          <GeneralSettingsForm
            values={generalSettings}
            supportedLanguages={supportedLanguagesState}
            onChange={handleGeneralChange}
            onUploadLogo={handleLogoUpload}
            onRemoveLogo={generalSettings.logoUrl ? handleRemoveLogo : undefined}
            onSave={handleGeneralSave}
            saving={savingGeneral}
          />

          <ServiceSettingsForm
            values={serviceSettings}
            onChange={handleServiceChange}
            onSave={handleServiceSave}
            saving={savingService}
          />

          <NotificationSettingsForm
            values={notificationSettings}
            onChange={handleNotificationChange}
            onSave={handleNotificationSave}
            saving={savingNotifications}
          />

          <WhatsAppConnectionsSection />

          <QueueSettingsSection
            queues={queues}
            onCreateQueue={handleCreateQueue}
            onUpdateQueue={handleUpdateQueue}
            onDeleteQueue={handleDeleteQueue}
          />

          <TagSettingsSection
            tags={tags}
            onCreateTag={handleCreateTag}
            onUpdateTag={handleUpdateTag}
            onDeleteTag={handleDeleteTag}
          />

          <QuickReplySettingsSection />

          <IntegrationSettings
            token={apiToken}
            onGenerateToken={handleGenerateToken}
            webhooks={webhooks}
            logs={logs}
          />
        </div>
      </div>
    </div>
  );
}

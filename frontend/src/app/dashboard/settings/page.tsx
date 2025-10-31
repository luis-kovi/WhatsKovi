'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import GeneralSettingsForm, { GeneralSettingsValues } from '@/components/settings/GeneralSettingsForm';
import ServiceSettingsForm, { ServiceSettingsValues } from '@/components/settings/ServiceSettingsForm';
import NotificationSettingsForm, {
  NotificationSettingsValues
} from '@/components/settings/NotificationSettingsForm';
import { IntegrationSettings } from '@/components/settings/IntegrationSettings';
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
import {
  fetchIntegrationLogs,
  fetchIntegrationSettings,
  persistIntegrationSettings
} from '@/services/integrations';
import type { IntegrationLogEntry, IntegrationSettingsFormValues } from '@/types/integrations';

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
  const [integrationValues, setIntegrationValues] = useState<IntegrationSettingsFormValues | null>(null);
  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLogEntry[]>([]);
  const [loadingIntegration, setLoadingIntegration] = useState(true);
  const [savingIntegration, setSavingIntegration] = useState(false);

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

  useEffect(() => {
    const loadIntegration = async () => {
      setLoadingIntegration(true);
      try {
        const data = await fetchIntegrationSettings();
        setIntegrationValues({
          measurementId: data.analytics.measurementId ?? '',
          zapierEnabled: data.zapier.enabled,
          zapierWebhookUrl: data.zapier.webhookUrl ?? '',
          zapierAuthToken: '',
          n8nEnabled: data.n8n.enabled,
          n8nWebhookUrl: data.n8n.webhookUrl ?? '',
          n8nAuthToken: '',
          emailChannelEnabled: data.multichannel.emailEnabled,
          smsChannelEnabled: data.multichannel.smsEnabled,
          smsProvider: data.multichannel.smsProvider === 'TWILIO' ? 'TWILIO' : '',
          smsFromNumber: data.multichannel.smsFromNumber ?? '',
          smsAccountSid: '',
          smsAuthToken: ''
        });
        setIntegrationLogs(data.logs);
      } catch (error) {
        console.error('[Settings] failed to load integration settings', error);
        toast.error('Não foi possível carregar as integrações');
      } finally {
        setLoadingIntegration(false);
      }
    };

    loadIntegration();
  }, []);

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

  const handleIntegrationSave = async (values: IntegrationSettingsFormValues) => {
    setSavingIntegration(true);
    try {
      const updated = await persistIntegrationSettings(values);
      setIntegrationValues({
        measurementId: updated.analytics.measurementId ?? '',
        zapierEnabled: updated.zapier.enabled,
        zapierWebhookUrl: updated.zapier.webhookUrl ?? '',
        zapierAuthToken: '',
        n8nEnabled: updated.n8n.enabled,
        n8nWebhookUrl: updated.n8n.webhookUrl ?? '',
        n8nAuthToken: '',
        emailChannelEnabled: updated.multichannel.emailEnabled,
        smsChannelEnabled: updated.multichannel.smsEnabled,
        smsProvider: updated.multichannel.smsProvider === 'TWILIO' ? 'TWILIO' : '',
        smsFromNumber: updated.multichannel.smsFromNumber ?? '',
        smsAccountSid: '',
        smsAuthToken: ''
      });
      setIntegrationLogs(updated.logs);
      toast.success('Integrações atualizadas com sucesso');
    } catch (error) {
      console.error('[Settings] failed to persist integration settings', error);
      toast.error('Não foi possível salvar as integrações');
    } finally {
      setSavingIntegration(false);
    }
  };

  const handleRefreshIntegrationLogs = async () => {
    try {
      const refreshed = await fetchIntegrationLogs();
      setIntegrationLogs(refreshed);
      toast.success('Logs atualizados');
    } catch (error) {
      console.error('[Settings] failed to refresh integration logs', error);
      toast.error('Não foi possível atualizar os logs');
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
            initialValues={integrationValues}
            loading={loadingIntegration}
            saving={savingIntegration}
            logs={integrationLogs}
            onSave={handleIntegrationSave}
            onRefreshLogs={handleRefreshIntegrationLogs}
          />
        </div>
      </div>
    </div>
  );
}

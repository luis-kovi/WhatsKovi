'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
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
import UserFilters from '@/components/users/UserFilters';
import UserTable from '@/components/users/UserTable';
import UserFormModal, { UserFormValues } from '@/components/users/UserFormModal';
import UserDeleteModal from '@/components/users/UserDeleteModal';
import { useAuthStore } from '@/store/authStore';
import { useMetadataStore } from '@/store/metadataStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore, User, UserRole, UserStatus } from '@/store/userStore';
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
  satisfactionSurveyEnabled: true,
  aiEnabled: false,
  aiRoutingEnabled: true,
  aiProvider: 'OPENAI',
  aiModel: 'gpt-4o-mini',
  aiConfidenceThreshold: 0.65,
  aiFallbackQueueId: '',
  aiGeminiApiKey: '',
  aiOpenAiApiKey: ''
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

type RoleFilter = 'ALL' | UserRole;
type StatusFilter = 'ALL' | UserStatus;
type SettingsTab =
  | 'general'
  | 'service'
  | 'notifications'
  | 'whatsapp'
  | 'integrations'
  | 'users';

type ApiErrorResponse = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const apiError = error as ApiErrorResponse;
    const responseMessage = apiError.response?.data?.error;
    if (responseMessage) {
      return responseMessage;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export default function SettingsPage() {
  const router = useRouter();
  const { t, setLanguage, setSupportedLanguages } = useI18n();
  const { isAuthenticated, loadUser, user: currentUser } = useAuthStore();
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
  const users = useUserStore((state) => state.users);
  const usersLoading = useUserStore((state) => state.loading);
  const userError = useUserStore((state) => state.error);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const createUser = useUserStore((state) => state.createUser);
  const updateUser = useUserStore((state) => state.updateUser);
  const removeUser = useUserStore((state) => state.deleteUser);
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
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [usersInitialized, setUsersInitialized] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (activeTab === 'users' && !isAdmin) {
      setActiveTab('general');
    }
  }, [activeTab, isAdmin]);

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
    if (activeTab !== 'users') return;
    if (!isAuthenticated || !isAdmin || !currentUser) return;
    if (usersInitialized) return;

    const loadUsers = async () => {
      try {
        await fetchUsers();
      } catch (error) {
        toast.error(getErrorMessage(error, 'Erro ao carregar usuarios.'));
      } finally {
        setUsersInitialized(true);
      }
    };

    loadUsers();
  }, [activeTab, currentUser, fetchUsers, isAdmin, isAuthenticated, usersInitialized]);

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
      satisfactionSurveyEnabled: service.satisfactionSurveyEnabled,
      aiEnabled: service.aiEnabled ?? false,
      aiRoutingEnabled: service.aiRoutingEnabled ?? false,
      aiProvider: service.aiProvider ?? 'OPENAI',
      aiModel: service.aiModel ?? '',
      aiConfidenceThreshold: service.aiConfidenceThreshold ?? 0.65,
      aiFallbackQueueId: service.aiFallbackQueueId ?? '',
      aiGeminiApiKey: service.aiGeminiApiKey ?? '',
      aiOpenAiApiKey: service.aiOpenAiApiKey ?? ''
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

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users
      .filter((user) => (roleFilter === 'ALL' ? true : user.role === roleFilter))
      .filter((user) => (statusFilter === 'ALL' ? true : user.status === statusFilter))
      .filter((user) => {
        if (!normalizedSearch) return true;
        return (
          user.name.toLowerCase().includes(normalizedSearch) ||
          user.email.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [users, roleFilter, statusFilter, search]);

  const tabOptions = useMemo(() => {
    const base: Array<{ id: SettingsTab; label: string }> = [
      { id: 'general', label: 'Gerais' },
      { id: 'service', label: 'Atendimento' },
      { id: 'notifications', label: 'Notificações' },
      { id: 'whatsapp', label: 'WhatsApp' },
      { id: 'integrations', label: 'Integrações' }
    ];

    if (isAdmin) {
      base.push({ id: 'users', label: 'Usuários' });
    }

    return base;
  }, [isAdmin]);

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
    const payload = {
      ...serviceSettings,
      aiModel: serviceSettings.aiModel.trim() || null,
      aiConfidenceThreshold: Math.min(
        Math.max(serviceSettings.aiConfidenceThreshold ?? 0.65, 0.3),
        1
      ),
      aiFallbackQueueId: serviceSettings.aiFallbackQueueId || null,
      aiGeminiApiKey: serviceSettings.aiGeminiApiKey.trim() || null,
      aiOpenAiApiKey: serviceSettings.aiOpenAiApiKey.trim() || null
    };
    const result = await saveService(payload);
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

  const handleOpenCreateUser = () => {
    setFormMode('create');
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setFormMode('edit');
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleCloseUserForm = () => {
    setFormOpen(false);
    setFormSubmitting(false);
  };

  const handleUserFormSubmit = async (values: UserFormValues) => {
    setFormSubmitting(true);
    try {
      if (formMode === 'create') {
        await createUser({
          name: values.name,
          email: values.email,
          password: values.password || '',
          role: values.role,
          maxTickets: values.maxTickets
        });
        toast.success('Usuario cadastrado com sucesso.');
      } else if (formMode === 'edit' && editingUser) {
        await updateUser(editingUser.id, {
          name: values.name,
          email: values.email,
          role: values.role,
          status: values.status,
          maxTickets: values.maxTickets,
          password: values.password
        });
        toast.success('Usuario atualizado.');
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Nao foi possivel salvar o usuario.'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleRefreshUsers = async () => {
    try {
      await fetchUsers();
      toast.success('Lista atualizada.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Falha ao atualizar a lista.'));
    }
  };

  const handleOpenDeleteUser = (user: User) => {
    setDeletingUser(user);
    setDeleteOpen(true);
  };

  const handleCancelDeleteUser = () => {
    setDeleteOpen(false);
    setDeletingUser(null);
    setDeleteSubmitting(false);
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleteSubmitting(true);
    try {
      await removeUser(deletingUser.id);
      toast.success('Usuario removido.');
      handleCancelDeleteUser();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Nao foi possivel remover o usuario.'));
      setDeleteSubmitting(false);
    }
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
      <div className="ml-20 flex-1 overflow-y-auto">
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

          <div className="rounded-2xl bg-white/80 p-1 shadow-sm dark:bg-slate-900/70">
            <div className="flex flex-wrap gap-2">
              {tabOptions.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    activeTab === tab.id
                      ? 'bg-primary text-white shadow'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            {activeTab === 'general' && (
              <GeneralSettingsForm
                values={generalSettings}
                supportedLanguages={supportedLanguagesState}
                onChange={handleGeneralChange}
                onUploadLogo={handleLogoUpload}
                onRemoveLogo={generalSettings.logoUrl ? handleRemoveLogo : undefined}
                onSave={handleGeneralSave}
                saving={savingGeneral}
              />
            )}

            {activeTab === 'service' && (
              <div className="space-y-8">
                <ServiceSettingsForm
                  values={serviceSettings}
                  queues={queues}
                  onChange={handleServiceChange}
                  onSave={handleServiceSave}
                  saving={savingService}
                />

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
              </div>
            )}

            {activeTab === 'notifications' && (
              <NotificationSettingsForm
                values={notificationSettings}
                onChange={handleNotificationChange}
                onSave={handleNotificationSave}
                saving={savingNotifications}
              />
            )}

            {activeTab === 'whatsapp' && <WhatsAppConnectionsSection />}

            {activeTab === 'integrations' && (
              <IntegrationSettings
                initialValues={integrationValues}
                loading={loadingIntegration}
                saving={savingIntegration}
                logs={integrationLogs}
                onSave={handleIntegrationSave}
                onRefreshLogs={handleRefreshIntegrationLogs}
              />
            )}

            {activeTab === 'users' && isAdmin && (
              <div>
                <UserFilters
                  search={search}
                  role={roleFilter}
                  status={statusFilter}
                  onSearch={setSearch}
                  onRoleChange={(value) => setRoleFilter(value as RoleFilter)}
                  onStatusChange={(value) => setStatusFilter(value as StatusFilter)}
                  onCreate={handleOpenCreateUser}
                  onRefresh={handleRefreshUsers}
                  refreshing={usersLoading}
                />

                <div className="mt-6 space-y-4">
                  {userError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {userError}
                    </div>
                  )}

                  <div className={usersLoading ? 'pointer-events-none opacity-60' : ''}>
                    <UserTable
                      users={filteredUsers}
                      onEdit={handleOpenEditUser}
                      onDelete={handleOpenDeleteUser}
                    />
                  </div>

                  {usersLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Atualizando lista de usuarios...
                    </div>
                  )}
                </div>

                <UserFormModal
                  open={formOpen}
                  mode={formMode}
                  initialData={formMode === 'edit' ? editingUser ?? undefined : undefined}
                  submitting={formSubmitting}
                  onClose={handleCloseUserForm}
                  onSubmit={handleUserFormSubmit}
                />

                <UserDeleteModal
                  open={deleteOpen}
                  user={deletingUser}
                  submitting={deleteSubmitting}
                  onCancel={handleCancelDeleteUser}
                  onConfirm={handleConfirmDeleteUser}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

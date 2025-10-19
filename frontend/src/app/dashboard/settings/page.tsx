'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import GeneralSettingsForm, { GeneralSettingsValues } from '@/components/settings/GeneralSettingsForm';
import ServiceSettingsForm, { ServiceSettingsValues } from '@/components/settings/ServiceSettingsForm';
import NotificationSettingsForm, { NotificationSettingsValues } from '@/components/settings/NotificationSettingsForm';
import IntegrationSettings from '@/components/settings/IntegrationSettings';
import WhatsAppConnectionsSection from '@/components/settings/WhatsAppConnectionsSection';
import QueueSettingsSection from '@/components/settings/QueueSettingsSection';
import TagSettingsSection from '@/components/settings/TagSettingsSection';
import { QuickReplySettingsSection } from '@/components/settings/QuickReplySettingsSection';
import { useAuthStore } from '@/store/authStore';
import { useMetadataStore } from '@/store/metadataStore';
import { useNotificationStore } from '@/store/notificationStore';
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

const initialGeneral: GeneralSettingsValues = {
  companyName: 'WhatsKovi Atendimento',
  brandColor: '#FF355A',
  accentColor: '#7C3AED',
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  dateFormat: 'dd/MM/yyyy HH:mm',
  logoUrl: null
};

export default function SettingsPage() {
  const router = useRouter();
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
    preferences: notificationPreferences,
    savePreferences: saveNotificationPreferences,
    togglePush,
    fetchPreferences: fetchNotificationPreferences
  } = useNotificationStore((state) => ({
    preferences: state.preferences,
    savePreferences: state.savePreferences,
    togglePush: state.togglePush,
    fetchPreferences: state.fetchPreferences
  }));

  const [generalSettings, setGeneralSettings] = useState<GeneralSettingsValues>(initialGeneral);
  const [serviceSettings, setServiceSettings] = useState<ServiceSettingsValues>({
    inactivityMinutes: 15,
    autoCloseHours: 12,
    autoCloseMessage:
      'Encerramos este atendimento apos um periodo sem respostas. Caso precise de ajuda novamente, estamos por aqui!',
    globalTicketLimit: 400,
    perAgentTicketLimit: 25,
    soundEnabled: true,
    satisfactionSurveyEnabled: true
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsValues>({
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
  });
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

  const [generalSaving, setGeneralSaving] = useState(false);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [logoObjectUrl, setLogoObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    fetchNotificationPreferences();
  }, [fetchNotificationPreferences]);

  useEffect(() => {
    if (!notificationPreferences) {
      return;
    }

    setNotificationSettings({
      notifyNewTicket: notificationPreferences.notifyNewTicket,
      notifyTicketMessage: notificationPreferences.notifyTicketMessage,
      notifyTransfer: notificationPreferences.notifyTransfer,
      pushEnabled: notificationPreferences.pushEnabled,
      emailEnabled: notificationPreferences.emailEnabled,
      soundEnabled: notificationPreferences.soundEnabled,
      soundTheme: (notificationPreferences.soundTheme as NotificationSettingsValues['soundTheme']) ?? 'classic',
      smtpHost: notificationPreferences.smtpHost ?? '',
      smtpPort: notificationPreferences.smtpPort ?? 587,
      smtpUser: notificationPreferences.smtpUser ?? '',
      smtpPassword: notificationPreferences.smtpPassword ?? '',
      smtpFrom: notificationPreferences.smtpFrom ?? '',
      smtpSecure: notificationPreferences.smtpSecure
    });
  }, [notificationPreferences]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchQueues();
    fetchTags();
  }, [isAuthenticated, fetchQueues, fetchTags]);

  useEffect(() => {
    return () => {
      if (logoObjectUrl) {
        URL.revokeObjectURL(logoObjectUrl);
      }
    };
  }, [logoObjectUrl]);

  const ready = useMemo(() => isAuthenticated, [isAuthenticated]);

  const handleGeneralChange = <Key extends keyof GeneralSettingsValues>(
    key: Key,
    value: GeneralSettingsValues[Key]
  ) => {
    setGeneralSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleServiceChange = <Key extends keyof ServiceSettingsValues>(
    key: Key,
    value: ServiceSettingsValues[Key]
  ) => {
    setServiceSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleNotificationChange = <Key extends keyof NotificationSettingsValues>(
    key: Key,
    value: NotificationSettingsValues[Key]
  ) => {
    setNotificationSettings((prev) => ({ ...prev, [key]: value }));
  };

  const simulateSave = async (setLoading: (value: boolean) => void, message: string) => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneralSave = () =>
    simulateSave(setGeneralSaving, 'Configuracoes gerais atualizadas com sucesso.');

  const handleServiceSave = () =>
    simulateSave(setServiceSaving, 'Regras de atendimento salvas.');

  const handleNotificationSave = async () => {
    setNotificationSaving(true);
    try {
      if (notificationPreferences?.pushEnabled !== notificationSettings.pushEnabled) {
        const toggled = await togglePush(notificationSettings.pushEnabled);
        if (!toggled) {
          setNotificationSettings((prev) => ({
            ...prev,
            pushEnabled: notificationPreferences?.pushEnabled ?? false
          }));
          throw new Error('PUSH_TOGGLE_FAILED');
        }
      }

      await saveNotificationPreferences({
        notifyNewTicket: notificationSettings.notifyNewTicket,
        notifyTicketMessage: notificationSettings.notifyTicketMessage,
        notifyTransfer: notificationSettings.notifyTransfer,
        emailEnabled: notificationSettings.emailEnabled,
        soundEnabled: notificationSettings.soundEnabled,
        soundTheme: notificationSettings.soundTheme,
        smtpHost: notificationSettings.smtpHost.trim() || null,
        smtpPort: notificationSettings.smtpPort,
        smtpUser: notificationSettings.smtpUser.trim() || null,
        smtpPassword: notificationSettings.smtpPassword.trim() || null,
        smtpFrom: notificationSettings.smtpFrom.trim() || null,
        smtpSecure: notificationSettings.smtpSecure
      });

      toast.success('Preferências de notificações salvas.');
    } catch (error) {
      if (error instanceof Error && error.message === 'PUSH_TOGGLE_FAILED') {
        toast.error('Não foi possível atualizar as notificações push.');
      } else {
        toast.error('Erro ao salvar preferências de notificações.');
      }
    } finally {
      setNotificationSaving(false);
    }
  };

  const handleCreateQueue = async (payload: {
    name: string;
    color?: string;
    description?: string;
    greetingMessage?: string;
    outOfHoursMessage?: string;
    priority?: number;
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

  const handleLogoUpload = (file: File) => {
    if (logoObjectUrl) {
      URL.revokeObjectURL(logoObjectUrl);
    }
    const url = URL.createObjectURL(file);
    setLogoObjectUrl(url);
    setGeneralSettings((prev) => ({ ...prev, logoUrl: url }));
    toast.success('Logo carregado com sucesso.');
  };

  const handleGenerateToken = () => {
    const randomPart =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? (crypto.randomUUID() as string).replace(/-/g, '')
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    const token = randomPart.padEnd(32, 'x').slice(0, 32);
    setApiToken(token);
    toast.success('Novo token de acesso gerado.');
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-8 px-8 py-10">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuracoes do sistema</h1>
              <p className="text-sm text-gray-500">
                Ajuste branding, SLA, notificacoes e integracoes globais da plataforma.
              </p>
            </div>
            <div className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
              Somente administradores podem alterar estas configuracoes
            </div>
          </header>

          <GeneralSettingsForm
            values={generalSettings}
            onChange={handleGeneralChange}
            onUploadLogo={handleLogoUpload}
            onSave={handleGeneralSave}
            saving={generalSaving}
          />

          <ServiceSettingsForm
            values={serviceSettings}
            onChange={handleServiceChange}
            onSave={handleServiceSave}
            saving={serviceSaving}
          />

          <NotificationSettingsForm
            values={notificationSettings}
            onChange={handleNotificationChange}
            onSave={handleNotificationSave}
            saving={notificationSaving}
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

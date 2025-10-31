'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { IntegrationSettingsFormValues, IntegrationLogEntry } from '@/types/integrations';

type IntegrationSettingsProps = {
  initialValues: IntegrationSettingsFormValues | null;
  loading: boolean;
  saving: boolean;
  logs: IntegrationLogEntry[];
  onSave: (values: IntegrationSettingsFormValues) => Promise<void>;
  onRefreshLogs: () => Promise<void>;
};

const DEFAULT_VALUES: IntegrationSettingsFormValues = {
  measurementId: '',
  zapierEnabled: false,
  zapierWebhookUrl: '',
  zapierAuthToken: '',
  n8nEnabled: false,
  n8nWebhookUrl: '',
  n8nAuthToken: '',
  emailChannelEnabled: false,
  smsChannelEnabled: false,
  smsProvider: '',
  smsFromNumber: '',
  smsAccountSid: '',
  smsAuthToken: ''
};

const formatDateTime = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export function IntegrationSettings({
  initialValues,
  loading,
  saving,
  logs,
  onSave,
  onRefreshLogs
}: IntegrationSettingsProps) {
  const [formValues, setFormValues] = useState<IntegrationSettingsFormValues>(DEFAULT_VALUES);
  const [showN8nToken, setShowN8nToken] = useState(false);
  const [showZapierToken, setShowZapierToken] = useState(false);
  const [showSmsToken, setShowSmsToken] = useState(false);

  useEffect(() => {
    if (initialValues) {
      setFormValues(initialValues);
    } else {
      setFormValues(DEFAULT_VALUES);
    }
  }, [initialValues]);

  const handleChange = <Key extends keyof IntegrationSettingsFormValues>(
    key: Key,
    value: IntegrationSettingsFormValues[Key]
  ) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const disabledSmsConfig = useMemo(
    () => !formValues.smsChannelEnabled || !formValues.smsProvider,
    [formValues.smsChannelEnabled, formValues.smsProvider]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSave(formValues);
  };

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Integrações</h2>
          <p className="text-sm text-gray-500">
            Configure provedores para relatórios, automações e canais adicionais de atendimento.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6 rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Analytics</h3>
                <p className="text-xs text-gray-500">
                  Conecte o Google Analytics para acompanhar o engajamento do portal público.
                </p>
                <label className="mt-4 block text-xs font-semibold uppercase text-gray-500">Measurement ID</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="G-XXXXXXXXXX"
                  value={formValues.measurementId}
                  onChange={(event) => handleChange('measurementId', event.target.value)}
                />
              </div>

              <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Zapier</h4>
                    <p className="text-xs text-gray-500">Dispare automações no Zapier ao criar tickets ou mensagens.</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={formValues.zapierEnabled}
                      onChange={(event) => handleChange('zapierEnabled', event.target.checked)}
                    />
                    <div className="h-5 w-9 rounded-full bg-gray-300 transition peer-checked:bg-primary" />
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
                  </label>
                </div>
                <div className="space-y-2 text-xs text-gray-600">
                  <label className="block font-semibold text-gray-700">Webhook URL</label>
                  <input
                    type="url"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="https://hooks.zapier.com/..."
                    value={formValues.zapierWebhookUrl}
                    onChange={(event) => handleChange('zapierWebhookUrl', event.target.value)}
                    disabled={!formValues.zapierEnabled}
                  />
                  <label className="mt-3 block font-semibold text-gray-700">Token (opcional)</label>
                  <div className="relative">
                    <input
                      type={showZapierToken ? 'text' : 'password'}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Informe um token Bearer"
                      value={formValues.zapierAuthToken}
                      onChange={(event) => handleChange('zapierAuthToken', event.target.value)}
                      disabled={!formValues.zapierEnabled}
                    />
                    <button
                      type="button"
                      onClick={() => setShowZapierToken((prev) => !prev)}
                      className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-primary transition hover:text-primary/80"
                    >
                      {showZapierToken ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">n8n</h4>
                    <p className="text-xs text-gray-500">
                      Use fluxos avançados no n8n integrando tickets e mensagens do WhatsKovi.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={formValues.n8nEnabled}
                      onChange={(event) => handleChange('n8nEnabled', event.target.checked)}
                    />
                    <div className="h-5 w-9 rounded-full bg-gray-300 transition peer-checked:bg-primary" />
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
                  </label>
                </div>
                <div className="space-y-2 text-xs text-gray-600">
                  <label className="block font-semibold text-gray-700">Webhook URL</label>
                  <input
                    type="url"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="https://n8n.seuservidor.com/webhook/..."
                    value={formValues.n8nWebhookUrl}
                    onChange={(event) => handleChange('n8nWebhookUrl', event.target.value)}
                    disabled={!formValues.n8nEnabled}
                  />
                  <label className="mt-3 block font-semibold text-gray-700">Token (opcional)</label>
                  <div className="relative">
                    <input
                      type={showN8nToken ? 'text' : 'password'}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Token de autenticação"
                      value={formValues.n8nAuthToken}
                      onChange={(event) => handleChange('n8nAuthToken', event.target.value)}
                      disabled={!formValues.n8nEnabled}
                    />
                    <button
                      type="button"
                      onClick={() => setShowN8nToken((prev) => !prev)}
                      className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-primary transition hover:text-primary/80"
                    >
                      {showN8nToken ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Canal: E-mail</h3>
                    <p className="text-xs text-gray-500">
                      Permita o envio manual de mensagens por e-mail nas conversas.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={formValues.emailChannelEnabled}
                      onChange={(event) => handleChange('emailChannelEnabled', event.target.checked)}
                    />
                    <div className="h-5 w-9 rounded-full bg-gray-300 transition peer-checked:bg-primary" />
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Os parâmetros SMTP são configurados na aba &quot;Notificações&quot;. Certifique-se de definir remetente
                  e credenciais.
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Canal: SMS</h3>
                    <p className="text-xs text-gray-500">
                      Utilize provedores externos (Twilio) para disparar mensagens SMS diretamente pelo WhatsKovi.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={formValues.smsChannelEnabled}
                      onChange={(event) => handleChange('smsChannelEnabled', event.target.checked)}
                    />
                    <div className="h-5 w-9 rounded-full bg-gray-300 transition peer-checked:bg-primary" />
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
                  </label>
                </div>

                <label className="block text-xs font-semibold uppercase text-gray-500">Provedor</label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={formValues.smsProvider}
                  onChange={(event) =>
                    handleChange('smsProvider', event.target.value ? (event.target.value as 'TWILIO') : '')
                  }
                  disabled={!formValues.smsChannelEnabled}
                >
                  <option value="">Selecione um provedor</option>
                  <option value="TWILIO">Twilio</option>
                </select>

                <label className="block text-xs font-semibold uppercase text-gray-500">Remetente (From)</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="+1xxxxxxxxxx"
                  value={formValues.smsFromNumber}
                  onChange={(event) => handleChange('smsFromNumber', event.target.value)}
                  disabled={disabledSmsConfig}
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500">Account SID</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="ACxxxxxxxxxxxxxxxxxxxx"
                      value={formValues.smsAccountSid}
                      onChange={(event) => handleChange('smsAccountSid', event.target.value)}
                      disabled={disabledSmsConfig}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500">Auth Token</label>
                    <div className="relative">
                      <input
                        type={showSmsToken ? 'text' : 'password'}
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="Token de autenticação"
                        value={formValues.smsAuthToken}
                        onChange={(event) => handleChange('smsAuthToken', event.target.value)}
                        disabled={disabledSmsConfig}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmsToken((prev) => !prev)}
                        className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-primary transition hover:text-primary/80"
                      >
                        {showSmsToken ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500">
                  Os dados são utilizados apenas para enviar mensagens SMS através da API Twilio.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onRefreshLogs}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-primary/40 hover:text-primary"
              disabled={saving}
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar logs
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar integrações
            </button>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Logs recentes</h3>
            <p className="text-xs text-gray-500">Histórico das últimas notificações enviadas aos provedores externos.</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {logs.length === 0 ? (
            <p className="text-xs text-gray-500">Ainda não há logs registrados.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-xs text-gray-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-gray-800">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] uppercase text-primary">
                      {log.provider}
                    </span>
                    <span>{log.eventType}</span>
                  </div>
                  <div className="text-[11px] text-gray-400">{formatDateTime(log.createdAt)}</div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                      log.status === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {log.status}
                  </span>
                  {log.statusCode !== null && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                      HTTP {log.statusCode}
                    </span>
                  )}
                  {log.error && <span className="text-[11px] text-red-500">{log.error}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

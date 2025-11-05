'use client';

import { useMemo, useState } from 'react';
import Toggle from './Toggle';
import { useI18n } from '@/providers/I18nProvider';
import type { Queue } from '@/store/metadataStore';

export type ServiceSettingsValues = {
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
  aiModel: string;
  aiConfidenceThreshold: number;
  aiFallbackQueueId: string;
  aiGeminiApiKey: string;
  aiOpenAiApiKey: string;
};

type ServiceSettingsFormProps = {
  values: ServiceSettingsValues;
  queues?: Queue[];
  onChange: <Key extends keyof ServiceSettingsValues>(key: Key, value: ServiceSettingsValues[Key]) => void;
  onSave: () => void;
  saving: boolean;
};

export default function ServiceSettingsForm({
  values,
  queues,
  onChange,
  onSave,
  saving
}: ServiceSettingsFormProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showGeminiToken, setShowGeminiToken] = useState(false);
  const [showOpenAiToken, setShowOpenAiToken] = useState(false);
  const { t } = useI18n();

  const fallbackQueueName = useMemo(() => {
    if (!queues || !values.aiFallbackQueueId) return null;
    return queues.find((queue) => queue.id === values.aiFallbackQueueId)?.name ?? null;
  }, [queues, values.aiFallbackQueueId]);

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('settings.service.title')}</h2>
          <p className="text-sm text-gray-500">{t('settings.service.description')}</p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
        >
          {saving ? '…' : t('settings.service.action.save')}
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              {t('settings.service.inactivity.label')}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={values.inactivityMinutes}
                  onChange={(event) => onChange('inactivityMinutes', Number(event.target.value))}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="text-xs text-gray-500">min</span>
              </div>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              {t('settings.service.autoClose.label')}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={values.autoCloseHours}
                  onChange={(event) => onChange('autoCloseHours', Number(event.target.value))}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="text-xs text-gray-500">h</span>
              </div>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            {t('settings.service.autoCloseMessage.label')}
            <textarea
              value={values.autoCloseMessage}
              onChange={(event) => onChange('autoCloseMessage', event.target.value)}
              rows={4}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={t('settings.service.autoCloseMessage.placeholder')}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              {t('settings.service.globalLimit.label')}
              <input
                type="number"
                min={1}
                value={values.globalTicketLimit}
                onChange={(event) => onChange('globalTicketLimit', Number(event.target.value))}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              {t('settings.service.agentLimit.label')}
              <input
                type="number"
                min={1}
                value={values.perAgentTicketLimit}
                onChange={(event) => onChange('perAgentTicketLimit', Number(event.target.value))}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <Toggle
            label={t('settings.service.sound.label')}
            description={t('settings.service.sound.description')}
            checked={values.soundEnabled}
            onChange={(checked) => onChange('soundEnabled', checked)}
          />
          <Toggle
            label={t('settings.service.survey.label')}
            description={t('settings.service.survey.description')}
            checked={values.satisfactionSurveyEnabled}
            onChange={(checked) => onChange('satisfactionSurveyEnabled', checked)}
          />

          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-800">{t('settings.service.preview.title')}</p>
            <p className="mt-1 text-xs text-gray-500">{t('settings.service.preview.description')}</p>
            <button
              onClick={() => setShowPreview((prev) => !prev)}
              className="mt-3 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              {showPreview ? t('settings.service.preview.hide') : t('settings.service.preview.show')}
            </button>

            {showPreview && (
              <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-gray-700">
                <p className="mb-2 font-semibold text-primary">{t('settings.service.preview.messageTitle')}</p>
                <p>{values.autoCloseMessage || t('settings.service.preview.empty')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">IA de Atendimento</p>
            <h3 className="text-sm font-semibold text-gray-900">Orquestrador com Gemini e ChatGPT</h3>
            <p className="text-xs text-gray-500">
              Ative a IA para classificar conversas automaticamente e direcionar clientes para a fila correta.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Toggle
              label="Ativar IA"
              description="Permite que o chatbot utilize modelos generativos."
              checked={values.aiEnabled}
              onChange={(checked) => onChange('aiEnabled', checked)}
            />
            <Toggle
              label="Roteamento inteligente"
              description="Direciona conversas automaticamente para filas ou canais."
              checked={values.aiRoutingEnabled}
              onChange={(checked) => onChange('aiRoutingEnabled', checked)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            Provedor
            <select
              value={values.aiProvider}
              onChange={(event) => onChange('aiProvider', event.target.value as ServiceSettingsValues['aiProvider'])}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={!values.aiEnabled}
            >
              <option value="OPENAI">ChatGPT (OpenAI)</option>
              <option value="GEMINI">Gemini (Google)</option>
              <option value="HYBRID">Hibrido</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            Modelo preferencial
            <input
              type="text"
              value={values.aiModel}
              disabled={!values.aiEnabled}
              onChange={(event) => onChange('aiModel', event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100 disabled:text-gray-400"
              placeholder={values.aiProvider === 'GEMINI' ? 'gemini-1.5-flash' : 'gpt-4o-mini'}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            Precisao minima
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <input
                type="range"
                min={0.4}
                max={0.95}
                step={0.05}
                value={values.aiConfidenceThreshold}
                disabled={!values.aiEnabled}
                onChange={(event) => onChange('aiConfidenceThreshold', Number(event.target.value))}
                className="h-2 flex-1 cursor-pointer accent-primary"
              />
              <span className="text-xs font-semibold text-gray-700">
                {Math.round(values.aiConfidenceThreshold * 100)}%
              </span>
            </div>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            Fila de fallback
            <select
              value={values.aiFallbackQueueId}
              disabled={!values.aiRoutingEnabled}
              onChange={(event) => onChange('aiFallbackQueueId', event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">{fallbackQueueName ? `Atual: ${fallbackQueueName}` : 'Selecione uma fila'}</option>
              {queues?.map((queue) => (
                <option key={queue.id} value={queue.id}>
                  {queue.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            Token ChatGPT
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
              <input
                type={showOpenAiToken ? 'text' : 'password'}
                value={values.aiOpenAiApiKey}
                disabled={!values.aiEnabled || (values.aiProvider === 'GEMINI')}
                onChange={(event) => onChange('aiOpenAiApiKey', event.target.value)}
                className="flex-1 text-sm text-gray-700 focus:outline-none"
                placeholder="sk-..."
              />
              <button
                type="button"
                onClick={() => setShowOpenAiToken((prev) => !prev)}
                className="text-xs font-semibold text-primary"
              >
                {showOpenAiToken ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            Token Gemini
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
              <input
                type={showGeminiToken ? 'text' : 'password'}
                value={values.aiGeminiApiKey}
                disabled={!values.aiEnabled || (values.aiProvider === 'OPENAI')}
                onChange={(event) => onChange('aiGeminiApiKey', event.target.value)}
                className="flex-1 text-sm text-gray-700 focus:outline-none"
                placeholder="AIza..."
              />
              <button
                type="button"
                onClick={() => setShowGeminiToken((prev) => !prev)}
                className="text-xs font-semibold text-primary"
              >
                {showGeminiToken ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </label>
        </div>

        <p className="rounded-lg border border-primary/20 bg-white/70 px-3 py-2 text-[11px] text-primary">
          Os tokens sao armazenados de forma segura e utilizados apenas para requisoes de IA durante o
          roteamento e conversas do chatbot.
        </p>
      </div>
    </section>
  );
}

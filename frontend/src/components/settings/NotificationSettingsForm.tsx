'use client';

import Toggle from './Toggle';
import { useI18n } from '@/providers/I18nProvider';

export type NotificationSettingsValues = {
  notifyNewTicket: boolean;
  notifyTicketMessage: boolean;
  notifyTransfer: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
  soundTheme: 'classic' | 'soft' | 'bright';
  smtpHost: string;
  smtpPort: number | '';
  smtpUser: string;
  smtpPassword: string;
  smtpFrom: string;
  smtpSecure: boolean;
};

type NotificationSettingsFormProps = {
  values: NotificationSettingsValues;
  onChange: <Key extends keyof NotificationSettingsValues>(
    key: Key,
    value: NotificationSettingsValues[Key]
  ) => void;
  onSave: () => void;
  saving: boolean;
};

export default function NotificationSettingsForm({
  values,
  onChange,
  onSave,
  saving
}: NotificationSettingsFormProps) {
  const { t } = useI18n();

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('settings.notifications.title')}</h2>
          <p className="text-sm text-gray-500">{t('settings.notifications.description')}</p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
        >
          {saving ? '…' : t('settings.notifications.action.save')}
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <p className="text-xs font-semibold uppercase text-gray-500">
            {t('settings.notifications.alerts.title')}
          </p>
          <Toggle
            label={t('settings.notifications.alerts.newTicket.label')}
            description={t('settings.notifications.alerts.newTicket.description')}
            checked={values.notifyNewTicket}
            onChange={(checked) => onChange('notifyNewTicket', checked)}
          />
          <Toggle
            label={t('settings.notifications.alerts.message.label')}
            description={t('settings.notifications.alerts.message.description')}
            checked={values.notifyTicketMessage}
            onChange={(checked) => onChange('notifyTicketMessage', checked)}
          />
          <Toggle
            label={t('settings.notifications.alerts.transfer.label')}
            description={t('settings.notifications.alerts.transfer.description')}
            checked={values.notifyTransfer}
            onChange={(checked) => onChange('notifyTransfer', checked)}
          />

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {t('settings.notifications.sound.title')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('settings.notifications.sound.description')}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                {t('settings.notifications.sound.enable')}
                <input
                  type="checkbox"
                  checked={values.soundEnabled}
                  onChange={(event) => onChange('soundEnabled', event.target.checked)}
                />
              </label>
            </div>
            <select
              value={values.soundTheme}
              onChange={(event) =>
                onChange('soundTheme', event.target.value as NotificationSettingsValues['soundTheme'])
              }
              disabled={!values.soundEnabled}
              className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
            >
              <option value="classic">{t('settings.notifications.sound.classic')}</option>
              <option value="soft">{t('settings.notifications.sound.soft')}</option>
              <option value="bright">{t('settings.notifications.sound.bright')}</option>
            </select>
          </div>

          <Toggle
            label={t('settings.notifications.push.label')}
            description={t('settings.notifications.push.description')}
            checked={values.pushEnabled}
            onChange={(checked) => onChange('pushEnabled', checked)}
          />
          <Toggle
            label={t('settings.notifications.email.label')}
            description={t('settings.notifications.email.description')}
            checked={values.emailEnabled}
            onChange={(checked) => onChange('emailEnabled', checked)}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <p className="text-xs font-semibold uppercase text-gray-500">
            {t('settings.notifications.smtp.title')}
          </p>
          <p className="text-xs text-gray-500">{t('settings.notifications.smtp.description')}</p>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            {t('settings.notifications.smtp.host')}
            <input
              type="text"
              value={values.smtpHost}
              onChange={(event) => onChange('smtpHost', event.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="smtp.example.com"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              {t('settings.notifications.smtp.port')}
              <input
                type="number"
                min={1}
                value={values.smtpPort}
                onChange={(event) =>
                  onChange('smtpPort', event.target.value === '' ? '' : Number(event.target.value))
                }
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              {t('settings.notifications.smtp.user')}
              <input
                type="text"
                value={values.smtpUser}
                onChange={(event) => onChange('smtpUser', event.target.value)}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="user@example.com"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            {t('settings.notifications.smtp.password')}
            <input
              type="password"
              value={values.smtpPassword}
              onChange={(event) => onChange('smtpPassword', event.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            {t('settings.notifications.smtp.from')}
            <input
              type="email"
              value={values.smtpFrom}
              onChange={(event) => onChange('smtpFrom', event.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="support@example.com"
            />
          </label>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-500">
            <label className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">
                {t('settings.notifications.smtp.secure')}
              </span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={values.smtpSecure}
                  onChange={(event) => onChange('smtpSecure', event.target.checked)}
                />
                <div className="peer flex h-5 w-9 items-center rounded-full bg-gray-300 transition peer-checked:bg-primary">
                  <span className="h-4 w-4 translate-x-1 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
                </div>
              </label>
            </label>
            <p className="mt-2 text-xs">
              {t('settings.notifications.smtp.secureHelp')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


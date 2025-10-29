'use client';

import Image from 'next/image';
import { ChangeEvent } from 'react';
import { Palette, UploadCloud, Trash2 } from 'lucide-react';
import { useI18n } from '@/providers/I18nProvider';

export type GeneralSettingsValues = {
  companyName: string;
  brandColor: string;
  accentColor: string;
  language: string;
  timezone: string;
  dateFormat: string;
  logoUrl: string | null;
};

type GeneralSettingsFormProps = {
  values: GeneralSettingsValues;
  supportedLanguages: string[];
  onChange: <Key extends keyof GeneralSettingsValues>(key: Key, value: GeneralSettingsValues[Key]) => void;
  onUploadLogo: (file: File) => void;
  onRemoveLogo?: () => void;
  onSave: () => void;
  saving: boolean;
};

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'America/São Paulo (GMT-3)' },
  { value: 'America/Manaus', label: 'America/Manaus (GMT-4)' },
  { value: 'Europe/Lisbon', label: 'Europe/Lisbon (GMT+0)' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid (GMT+1)' }
];

const DATE_FORMATS = [
  { value: 'dd/MM/yyyy HH:mm', label: 'DD/MM/AAAA HH:mm' },
  { value: 'MM/dd/yyyy hh:mm a', label: 'MM/DD/AAAA hh:mm AM/PM' },
  { value: 'yyyy-MM-dd HH:mm', label: 'AAAA-MM-DD HH:mm' }
];

export default function GeneralSettingsForm({
  values,
  supportedLanguages,
  onChange,
  onUploadLogo,
  onRemoveLogo,
  onSave,
  saving
}: GeneralSettingsFormProps) {
  const { t, supportedLanguages: contextLanguages } = useI18n();

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUploadLogo(file);
    }
  };

  const languageList = supportedLanguages.length > 0 ? supportedLanguages : contextLanguages;
  const normalizedLanguages = languageList.includes(values.language)
    ? languageList
    : [...languageList, values.language];
  const languageOptions = normalizedLanguages.map((code) => ({
    value: code,
    label: t(`languages.${code}`, { defaultValue: code })
  }));

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('settings.general.title')}</h2>
          <p className="text-sm text-gray-500">{t('settings.general.description')}</p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
        >
          {saving ? '…' : t('settings.general.action.save')}
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            {t('settings.general.companyName.label')}
            <input
              type="text"
              value={values.companyName}
              onChange={(event) => onChange('companyName', event.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={t('settings.general.companyName.placeholder')}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs font-semibold uppercase text-gray-500">
              {t('settings.general.brandColor.label')}
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={values.brandColor}
                  onChange={(event) => onChange('brandColor', event.target.value)}
                  className="h-12 w-12 cursor-pointer rounded-md border border-gray-200 bg-white"
                />
                <input
                  type="text"
                  value={values.brandColor}
                  onChange={(event) => onChange('brandColor', event.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs font-semibold uppercase text-gray-500">
              {t('settings.general.accentColor.label')}
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={values.accentColor}
                  onChange={(event) => onChange('accentColor', event.target.value)}
                  className="h-12 w-12 cursor-pointer rounded-md border border-gray-200 bg-white"
                />
                <input
                  type="text"
                  value={values.accentColor}
                  onChange={(event) => onChange('accentColor', event.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              {t('settings.general.language.label')}
              <select
                value={values.language}
                onChange={(event) => onChange('language', event.target.value)}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              {t('settings.general.timezone.label')}
              <select
                value={values.timezone}
                onChange={(event) => onChange('timezone', event.target.value)}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {TIMEZONES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              {t('settings.general.dateFormat.label')}
              <select
                value={values.dateFormat}
                onChange={(event) => onChange('dateFormat', event.target.value)}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {DATE_FORMATS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <p className="text-xs font-semibold uppercase text-gray-500">{t('settings.general.identity.title')}</p>
          <p className="mt-1 text-xs text-gray-500">{t('settings.general.identity.description')}</p>

          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 transition hover:border-primary/50 hover:text-primary">
            <UploadCloud className="h-6 w-6" />
            <span className="font-semibold">{t('settings.general.identity.upload')}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </label>

          {values.logoUrl && (
            <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  {t('settings.general.identity.preview')}
                </p>
                {onRemoveLogo && (
                  <button
                    type="button"
                    onClick={onRemoveLogo}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                    {t('settings.general.identity.remove')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <Image
                    src={values.logoUrl}
                    alt={t('settings.general.identity.preview')}
                    fill
                    className="object-contain p-1"
                    sizes="56px"
                    unoptimized
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{values.companyName}</p>
                  <p className="text-xs text-gray-500">
                    {t('settings.general.brandColor.label')} {values.brandColor}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
              <Palette className="h-4 w-4" />
              {t('settings.general.identity.theme')}
            </p>
            <div className="mt-3 space-y-3 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: values.brandColor }}
                />
                <span className="font-semibold text-gray-700">{t('settings.general.identity.previewPrimary')}</span>
                {values.brandColor}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: values.accentColor }}
                />
                <span className="font-semibold text-gray-700">{t('settings.general.identity.previewAccent')}</span>
                {values.accentColor}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


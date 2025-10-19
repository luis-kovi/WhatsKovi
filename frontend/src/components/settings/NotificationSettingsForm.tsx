'use client';

import Toggle from './Toggle';

export type NotificationSettingsValues = {
  notifyNewTicket: boolean;
  notifyTicketMessage: boolean;
  notifyTransfer: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
  soundTheme: 'classic' | 'soft' | 'bright';
  smtpHost: string;
  smtpPort: number;
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
  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Notificações</h2>
          <p className="text-sm text-gray-500">
            Configure alertas em tempo real, push no navegador e envio por e-mail (SMTP).
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
        >
          {saving ? 'Salvando...' : 'Salvar preferências'}
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <p className="text-xs font-semibold uppercase text-gray-500">Alertas do sistema</p>
          <Toggle
            label="Novo ticket na fila"
            description="Avisar sempre que um ticket for criado ou cair na fila monitorada."
            checked={values.notifyNewTicket}
            onChange={(checked) => onChange('notifyNewTicket', checked)}
          />
          <Toggle
            label="Nova mensagem do cliente"
            description="Receber alerta quando o cliente responder enquanto o ticket estiver aberto."
            checked={values.notifyTicketMessage}
            onChange={(checked) => onChange('notifyTicketMessage', checked)}
          />
          <Toggle
            label="Ticket transferido para mim"
            description="Ser notificado quando um ticket for transferido para sua fila ou usuário."
            checked={values.notifyTransfer}
            onChange={(checked) => onChange('notifyTransfer', checked)}
          />

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Som dos alertas</p>
                <p className="text-xs text-gray-500">
                  Escolha o tom do aviso ao chegar uma nova notificação.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                Ativar
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
              <option value="classic">Clássico vibrante</option>
              <option value="soft">Suave e discreto</option>
              <option value="bright">Intenso e curto</option>
            </select>
          </div>

          <Toggle
            label="Notificações push no navegador"
            description="Receber alertas mesmo com a aba minimizada (requer consentimento do navegador)."
            checked={values.pushEnabled}
            onChange={(checked) => onChange('pushEnabled', checked)}
          />
          <Toggle
            label="Envio por e-mail"
            description="Encaminhar alertas críticos para o e-mail configurado abaixo."
            checked={values.emailEnabled}
            onChange={(checked) => onChange('emailEnabled', checked)}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <p className="text-xs font-semibold uppercase text-gray-500">Configuração SMTP</p>
          <p className="text-xs text-gray-500">
            Utilize um servidor SMTP próprio para disparo de notificações importantes (ex: ticket inativo, falha na conexão WhatsApp).
          </p>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            Host
            <input
              type="text"
              value={values.smtpHost}
              onChange={(event) => onChange('smtpHost', event.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="smtp.seudominio.com"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              Porta
              <input
                type="number"
                min={1}
                value={values.smtpPort}
                onChange={(event) => onChange('smtpPort', Number(event.target.value))}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              Usuário
              <input
                type="text"
                value={values.smtpUser}
                onChange={(event) => onChange('smtpUser', event.target.value)}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="usuario@seudominio.com"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            Senha
            <input
              type="password"
              value={values.smtpPassword}
              onChange={(event) => onChange('smtpPassword', event.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Senha do SMTP"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            Remetente padrão (from)
            <input
              type="email"
              value={values.smtpFrom}
              onChange={(event) => onChange('smtpFrom', event.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="atendimento@seudominio.com"
            />
          </label>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-500">
            <label className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">Conexão segura (SSL/TLS)</span>
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
              Use SSL/TLS para conexões seguras (recomendado 465 para SSL, 587 para STARTTLS).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

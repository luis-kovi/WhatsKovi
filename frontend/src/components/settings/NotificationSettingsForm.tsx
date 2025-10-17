'use client';

import Toggle from './Toggle';

export type NotificationSettingsValues = {
  notifyNewTicket: boolean;
  notifyTicketMessage: boolean;
  notifyTransfer: boolean;
  notifyPush: boolean;
  notifyEmail: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpFrom: string;
  smtpSecure: boolean;
};

type NotificationSettingsFormProps = {
  values: NotificationSettingsValues;
  onChange: <Key extends keyof NotificationSettingsValues>(key: Key, value: NotificationSettingsValues[Key]) => void;
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
            Configure alertas em tempo real, notificações push e envio por e-mail (SMTP).
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
        >
          {saving ? 'Salvando...' : 'Salvar notificações'}
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <Toggle
            label="Novo ticket na fila"
            description="Receber alertas sempre que um novo ticket for criado ou cair na fila monitorada."
            checked={values.notifyNewTicket}
            onChange={(checked) => onChange('notifyNewTicket', checked)}
          />
          <Toggle
            label="Mensagem em ticket aberto"
            description="Notificar quando o cliente responder enquanto o ticket está em atendimento."
            checked={values.notifyTicketMessage}
            onChange={(checked) => onChange('notifyTicketMessage', checked)}
          />
          <Toggle
            label="Ticket transferido para mim"
            description="Aviso imediato quando um ticket for transferido para sua fila ou usuário."
            checked={values.notifyTransfer}
            onChange={(checked) => onChange('notifyTransfer', checked)}
          />
          <Toggle
            label="Notificações push no navegador"
            description="Enviar alertas push mesmo quando a aba estiver minimizada (necessário consentimento do usuário)."
            checked={values.notifyPush}
            onChange={(checked) => onChange('notifyPush', checked)}
          />
          <Toggle
            label="Envio por e-mail"
            description="Enviar notificações críticas via e-mail utilizando integração SMTP."
            checked={values.notifyEmail}
            onChange={(checked) => onChange('notifyEmail', checked)}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <p className="text-xs font-semibold uppercase text-gray-500">Configuração SMTP</p>
          <p className="text-xs text-gray-500">
            Utilize servidor SMTP próprio para disparos importantes (ex: ticket inativo, falha na conexão WhatsApp).
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
            <label className="flex items-center justify-between gap-3">
              <span className="font-semibold text-gray-700">Conexão segura (SSL/TLS)</span>
              <span
                className={`inline-flex h-6 w-11 items-center rounded-full transition ${
                  values.smtpSecure ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`ml-1 inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    values.smtpSecure ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
              <input
                type="checkbox"
                checked={values.smtpSecure}
                onChange={(event) => onChange('smtpSecure', event.target.checked)}
                className="hidden"
              />
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


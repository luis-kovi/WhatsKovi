'use client';

import { useState } from 'react';
import Toggle from './Toggle';

export type ServiceSettingsValues = {
  inactivityMinutes: number;
  autoCloseHours: number;
  autoCloseMessage: string;
  globalTicketLimit: number;
  perAgentTicketLimit: number;
  soundEnabled: boolean;
  satisfactionSurveyEnabled: boolean;
};

type ServiceSettingsFormProps = {
  values: ServiceSettingsValues;
  onChange: <Key extends keyof ServiceSettingsValues>(key: Key, value: ServiceSettingsValues[Key]) => void;
  onSave: () => void;
  saving: boolean;
};

export default function ServiceSettingsForm({ values, onChange, onSave, saving }: ServiceSettingsFormProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Configurações de atendimento</h2>
          <p className="text-sm text-gray-500">
            Defina regras globais para tempos de inatividade, limites de tickets e mensagens automáticas.
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
        >
          {saving ? 'Salvando...' : 'Salvar regras'}
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              Ticket considerado inativo após
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
              Fechamento automático após
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={values.autoCloseHours}
                  onChange={(event) => onChange('autoCloseHours', Number(event.target.value))}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="text-xs text-gray-500">horas</span>
              </div>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            Mensagem de encerramento automático
            <textarea
              value={values.autoCloseMessage}
              onChange={(event) => onChange('autoCloseMessage', event.target.value)}
              rows={4}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Ex: Encerramos este atendimento após um período sem respostas. Caso precise de ajuda novamente, basta nos enviar uma nova mensagem."
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              Limite global de tickets
              <input
                type="number"
                min={1}
                value={values.globalTicketLimit}
                onChange={(event) => onChange('globalTicketLimit', Number(event.target.value))}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              Limite por atendente
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
            label="Ativar notificações sonoras"
            description="Alertas para novos tickets, mensagens recebidas e transferências."
            checked={values.soundEnabled}
            onChange={(checked) => onChange('soundEnabled', checked)}
          />
          <Toggle
            label="Enviar pesquisa de satisfação automaticamente"
            description="Dispara formulário NPS ao finalizar cada atendimento."
            checked={values.satisfactionSurveyEnabled}
            onChange={(checked) => onChange('satisfactionSurveyEnabled', checked)}
          />

          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-800">Pré-visualização</p>
            <p className="mt-1 text-xs text-gray-500">Simule a mensagem de encerramento que será enviada aos clientes.</p>
            <button
              onClick={() => setShowPreview((prev) => !prev)}
              className="mt-3 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              {showPreview ? 'Esconder prévia' : 'Visualizar mensagem'}
            </button>

            {showPreview && (
              <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-gray-700">
                <p className="mb-2 font-semibold text-primary">Mensagem automática enviada ao cliente:</p>
                <p>{values.autoCloseMessage || 'Nenhuma mensagem configurada.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}


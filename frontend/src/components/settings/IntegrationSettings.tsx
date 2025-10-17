'use client';

import { useMemo } from 'react';
import { Copy, Globe2, Link, Plus, ShieldCheck } from 'lucide-react';

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

type IntegrationSettingsProps = {
  token: string;
  onGenerateToken: () => void;
  webhooks: WebhookConfig[];
  logs: ApiLog[];
};

const getStatusBadge = (status: WebhookConfig['status']) =>
  status === 'active'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-amber-100 text-amber-700 border-amber-200';

export default function IntegrationSettings({ token, onGenerateToken, webhooks, logs }: IntegrationSettingsProps) {
  const maskedToken = useMemo(() => {
    if (!token) return '';
    return `${token.slice(0, 6)}••••••${token.slice(-4)}`;
  }, [token]);

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Integrações e API</h2>
          <p className="text-sm text-gray-500">
            Configure webhooks, gere tokens de acesso e acompanhe logs das requisições REST.
          </p>
        </div>
        <button
          onClick={onGenerateToken}
          className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          <ShieldCheck className="h-4 w-4" />
          Gerar novo token
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Token de acesso</p>
            <p className="mt-1 text-xs text-gray-500">
              Utilize este token para autenticar requisições externas na API REST do WhatsKovi.
            </p>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
              <code className="flex-1 truncate text-xs text-gray-700">{maskedToken || 'Nenhum token gerado ainda'}</code>
              {token && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(token)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Webhooks configurados</p>
            <p className="mt-1 text-xs text-gray-500">Dispare eventos para CRMs, BI ou automações personalizadas.</p>
            <div className="mt-3 space-y-3">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Link className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-gray-800">{webhook.event}</span>
                    </div>
                    <span className={`rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${getStatusBadge(webhook.status)}`}>
                      {webhook.status === 'active' ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-xs text-gray-500">{webhook.url}</p>
                </div>
              ))}
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white py-3 text-xs font-semibold text-gray-600 transition hover:border-primary/40 hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                Adicionar novo webhook
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Documentação API</p>
            <p className="mt-1 text-xs text-gray-500">
              Acesse a coleção com endpoints para tickets, contatos, usuários e webhooks.
            </p>
            <a
              href="https://developers.whatskovi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
            >
              <Globe2 className="h-4 w-4" />
              Abrir documentação
            </a>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Logs recentes</p>
            <p className="mt-1 text-xs text-gray-500">Últimas requisições realizadas utilizando a API pública.</p>
            <div className="mt-3 space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-gray-800">{log.method}</span>
                    <span className="text-[11px] text-gray-400">{log.timestamp}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="truncate text-[11px] text-gray-500">{log.path}</span>
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                        log.status < 400 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { AutomationRule, AutomationRunSummary } from '@/types/automation';

interface AutomationTestModalProps {
  open: boolean;
  rule?: AutomationRule | null;
  submitting?: boolean;
  result?: AutomationRunSummary | null;
  onClose: () => void;
  onSubmit: (input: { ticketId: string; messageId?: string }) => Promise<void>;
}

export default function AutomationTestModal({
  open,
  rule,
  submitting,
  result,
  onClose,
  onSubmit
}: AutomationTestModalProps) {
  const [ticketId, setTicketId] = useState('');
  const [messageId, setMessageId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTicketId('');
    setMessageId('');
    setError(null);
  }, [open, rule?.id]);

  if (!open || !rule) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ticketId.trim()) {
      setError('Informe um ticket para executar o teste.');
      return;
    }
    setError(null);
    await onSubmit({ ticketId: ticketId.trim(), messageId: messageId.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50">Testar automacao</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Avalie como a regra <span className="font-semibold">{rule.name}</span> reagiria a um ticket real.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Ticket</label>
              <input
                value={ticketId}
                onChange={(event) => setTicketId(event.target.value)}
                placeholder="ID do ticket"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Mensagem (opcional)</label>
              <input
                value={messageId}
                onChange={(event) => setMessageId(event.target.value)}
                placeholder="ID da mensagem"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Resultado</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Trigger avaliado: <span className="font-semibold">{result.trigger}</span>
              </p>
              <div className="mt-3 space-y-3">
                {result.results.map((item) => (
                  <div
                    key={item.ruleId}
                    className="rounded-xl border border-primary/20 bg-white p-3 text-sm shadow-sm dark:border-primary/30 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 dark:text-slate-100">
                        Acao executada? {item.actions.some((action) => action.status === 'performed') ? 'Sim' : 'Nao'}
                      </span>
                      {item.error && (
                        <span className="text-xs font-semibold text-red-500">Erro: {item.error}</span>
                      )}
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-slate-300">
                      {item.actions.map((action, index) => (
                        <li key={`${action.type}-${index}`}>
                          {action.type} → {action.status}
                          {action.details ? ` (${action.details})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/70"
              disabled={submitting}
            >
              Fechar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50"
              disabled={submitting}
            >
              {submitting ? 'Executando...' : 'Executar teste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { ChatbotTestResult } from '@/types/chatbot';
import { Play, RefreshCcw } from 'lucide-react';

interface FlowTesterProps {
  flowId?: string;
  disabled?: boolean;
  testing: boolean;
  result?: ChatbotTestResult | null;
  onRun: (messages: string[]) => Promise<void>;
  onReset: () => void;
}

export function FlowTester({ flowId, disabled, testing, result, onRun, onReset }: FlowTesterProps) {
  const [script, setScript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!flowId) {
      setError('Selecione um fluxo para executar o teste.');
      return;
    }

    const messages = script
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (messages.length === 0) {
      setError('Adicione pelo menos uma mensagem para iniciar o teste.');
      return;
    }

    setError(null);
    try {
      await onRun(messages);
    } catch {
      setError('Erro ao executar o teste. Tente novamente.');
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white/70 p-6 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Teste do Fluxo</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Simule uma conversa inserindo mensagens linha a linha.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setScript('');
              onReset();
              setError(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
          >
            <RefreshCcw size={14} />
            Limpar
          </button>
          <button
            type="button"
            disabled={disabled || testing}
            onClick={handleRun}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/40"
          >
            <Play size={14} />
            {testing ? 'Testando...' : 'Executar'}
          </button>
        </div>
      </div>

      <textarea
        value={script}
        onChange={(event) => setScript(event.target.value)}
        placeholder={`Exemplo:
Quero falar com suporte
Saldo da minha conta
Transferir para agente`}
        className="h-32 w-full rounded-xl border border-gray-200 bg-white/80 p-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      />

      {error && <p className="text-sm text-rose-500">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Transcricao simulada
          </p>
          <div className="space-y-2">
            {result.transcript.map((entry, index) => (
              <div
                key={`${entry.from}-${index}`}
                className={`max-w-full rounded-xl px-3 py-2 ${
                  entry.from === 'BOT'
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/90'
                    : 'bg-white text-gray-700 shadow-sm dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide">
                  {entry.from === 'BOT' ? 'Bot' : 'Contato'}
                </p>
                <p className="text-sm">{entry.message}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-white/70 p-3 text-xs text-gray-600 dark:bg-slate-950/30 dark:text-slate-300">
            <p className="font-semibold text-gray-700 dark:text-slate-200">Dados coletados</p>
            {Object.keys(result.state.collectedData).length === 0 ? (
              <p>Nenhuma informacao coletada.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {Object.entries(result.state.collectedData).map(([key, value]) => (
                  <li key={key}>
                    <span className="font-semibold text-gray-700 dark:text-slate-200">{key}: </span>
                    <span>{value}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-gray-500 dark:text-slate-400">
              Status: {result.completed ? 'Fluxo concluido' : 'Em andamento'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FlowTester;

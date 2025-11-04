import { useMemo, useState } from 'react';
import { Loader2, PlusCircle, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import type {
  ChatbotAiConfig,
  ChatbotAiMessage,
  ChatbotAiRoutingRequest,
  ChatbotAiRoutingResult
} from '@/types/chatbot';
import type { Queue } from '@/store/metadataStore';

type AiOrchestratorPanelProps = {
  aiConfig?: ChatbotAiConfig | null;
  aiSuggestion?: ChatbotAiRoutingResult | null;
  aiLoading: boolean;
  aiAnalyzing: boolean;
  queues: Queue[];
  onRefresh: () => Promise<void> | void;
  onAnalyze: (payload: ChatbotAiRoutingRequest) => Promise<void>;
  onReset: () => void;
};

const channelOptions = [
  { label: 'WhatsApp', value: 'WHATSAPP' },
  { label: 'Instagram', value: 'INSTAGRAM' },
  { label: 'Facebook', value: 'FACEBOOK' },
  { label: 'E-mail', value: 'EMAIL' },
  { label: 'Site', value: 'WEB' }
];

const roleOptions: Array<{ label: string; value: ChatbotAiMessage['role'] }> = [
  { label: 'Cliente', value: 'CONTACT' },
  { label: 'Bot', value: 'BOT' },
  { label: 'Sistema', value: 'SYSTEM' }
];

const defaultTranscript: ChatbotAiMessage[] = [
  { role: 'CONTACT', content: 'Preciso falar com alguem sobre um problema na minha fatura.' },
  { role: 'BOT', content: 'Claro! Pode me informar qual e a natureza do problema?' }
];

export function AiOrchestratorPanel({
  aiConfig,
  aiSuggestion,
  aiLoading,
  aiAnalyzing,
  queues,
  onRefresh,
  onAnalyze,
  onReset
}: AiOrchestratorPanelProps) {
  const [messages, setMessages] = useState<ChatbotAiMessage[]>(defaultTranscript);
  const [channel, setChannel] = useState<string>('WHATSAPP');
  const [desiredOutcome, setDesiredOutcome] =
    useState<ChatbotAiRoutingRequest['desiredOutcome']>('ROUTE');
  const [localError, setLocalError] = useState<string | null>(null);

  const fallbackQueueName = useMemo(() => {
    if (!aiConfig?.fallbackQueueId) return null;
    const queue = queues.find((item) => item.id === aiConfig.fallbackQueueId);
    return queue?.name ?? 'Fila padrao';
  }, [aiConfig?.fallbackQueueId, queues]);

  const handleMessageRoleChange = (index: number, role: ChatbotAiMessage['role']) => {
    setMessages((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], role };
      return clone;
    });
  };

  const handleMessageContentChange = (index: number, content: string) => {
    setMessages((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], content };
      return clone;
    });
  };

  const handleAddMessage = (role: ChatbotAiMessage['role']) => {
    setMessages((prev) => [...prev, { role, content: '' }]);
  };

  const handleRemoveMessage = (index: number) => {
    setMessages((prev) => prev.filter((_, messageIndex) => messageIndex !== index));
  };

  const handleReset = () => {
    setMessages(defaultTranscript);
    setChannel('WHATSAPP');
    setDesiredOutcome('ROUTE');
    setLocalError(null);
    onReset();
  };

  const handleAnalyze = async () => {
    setLocalError(null);
    const transcript = messages
      .map((message) => ({ ...message, content: message.content.trim() }))
      .filter((message) => message.content.length > 0);

    if (transcript.length === 0) {
      setLocalError('Adicione mensagens para que o orquestrador analise o contexto.');
      return;
    }

    await onAnalyze({
      transcript,
      channel,
      desiredOutcome
    });
  };

  return (
    <aside className="flex h-fit min-h-[480px] flex-col gap-6 rounded-3xl border border-gray-200/80 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-4 w-4" />
            IA de Atendimento
          </p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Orquestrador inteligente
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Simule conversas e verifique como a IA direciona clientes para filas e canais.
          </p>
        </div>
        <button
          onClick={() => onRefresh()}
          title="Recarregar configuracao de IA"
          className="rounded-full border border-primary/40 bg-primary/10 p-2 text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
          disabled={aiLoading || aiAnalyzing}
        >
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </header>

      <section className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
              Provedor ativo
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {aiConfig?.enabled ? aiConfig.provider : 'IA desabilitada'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
              Modelo padrao
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {aiConfig?.defaultModel ?? 'N/A'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
            <p className="font-semibold">Precisao alvo</p>
            <p>{Math.round((aiConfig?.confidenceThreshold ?? 0.6) * 100)}%</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-900/40 dark:text-blue-200">
            <p className="font-semibold">Fallback</p>
            <p>{fallbackQueueName ?? 'Sem fila padrao'}</p>
          </div>
          <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-xs text-purple-700 dark:border-purple-900 dark:bg-purple-900/40 dark:text-purple-200">
            <p className="font-semibold">Ultima sintonia</p>
            <p>{aiConfig?.lastTrainedAt ? new Date(aiConfig.lastTrainedAt).toLocaleString() : 'Nunca'}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
            Canal
            <select
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {channelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
            Objetivo
            <select
              value={desiredOutcome}
              onChange={(event) =>
                setDesiredOutcome(event.target.value as ChatbotAiRoutingRequest['desiredOutcome'])
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="ROUTE">Roteamento</option>
              <option value="TRIAGE">Triagem</option>
              <option value="SUGGESTION">Sugestao</option>
            </select>
          </label>
        </div>

        <div className="space-y-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className="rounded-2xl border border-gray-200 bg-white/90 p-3 shadow-sm transition hover:border-primary/50 dark:border-slate-800 dark:bg-slate-900/80"
            >
              <div className="flex items-center justify-between gap-3">
                <select
                  value={message.role}
                  onChange={(event) =>
                    handleMessageRoleChange(index, event.target.value as ChatbotAiMessage['role'])
                  }
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleRemoveMessage(index)}
                  className="rounded-full border border-transparent p-1 text-gray-400 transition hover:border-red-200 hover:text-red-500"
                  title="Remover mensagem"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={message.content}
                onChange={(event) => handleMessageContentChange(index, event.target.value)}
                rows={3}
                className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                placeholder="Digite a mensagem..."
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {roleOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleAddMessage(option.value)}
              className="inline-flex items-center gap-2 rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:border-primary hover:text-primary"
            >
              <PlusCircle className="h-4 w-4" />
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {localError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {localError}
        </p>
      )}

      <footer className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleAnalyze}
          disabled={aiAnalyzing}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
        >
          {aiAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Simular IA
            </>
          )}
        </button>
        <button
          onClick={handleReset}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Limpar
        </button>
      </footer>

      {aiSuggestion && (
        <section className="space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-primary-900 dark:border-primary/40 dark:bg-primary/10 dark:text-primary/90">
          <header className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                Resultado da IA
              </p>
              <p className="text-base font-semibold">Conf. {Math.round(aiSuggestion.confidence * 100)}%</p>
            </div>
            <span className="rounded-full border border-primary/40 bg-white/70 px-3 py-1 text-xs font-semibold text-primary">
              {aiSuggestion.model}
            </span>
          </header>

          <div className="space-y-2 text-sm text-primary/90">
            <p>
              <strong>Fila:</strong>{' '}
              {aiSuggestion.queue?.name ?? 'Nao definido'}
            </p>
            <p>
              <strong>Canal:</strong> {aiSuggestion.channel ?? 'Original'}
            </p>
            {aiSuggestion.summary && (
              <p>
                <strong>Resumo:</strong> {aiSuggestion.summary}
              </p>
            )}
            {aiSuggestion.reasons.length > 0 && (
              <div>
                <strong>Motivos:</strong>
                <ul className="ml-4 list-disc space-y-1">
                  {aiSuggestion.reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiSuggestion.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {aiSuggestion.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {aiSuggestion.escalationRecommended && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                Escalonamento recomendado
              </div>
            )}
            {aiSuggestion.followUp && (
              <p>
                <strong>Acao sugerida:</strong> {aiSuggestion.followUp}
              </p>
            )}
          </div>
          <p className="text-[11px] text-primary/70">
            Processado em {new Date(aiSuggestion.createdAt).toLocaleString()}.
          </p>
        </section>
      )}
    </aside>
  );
}

export default AiOrchestratorPanel;

import { Bot, Play, PlusCircle, Power } from 'lucide-react';
import { ChatbotFlowSummary } from '@/types/chatbot';

interface FlowListProps {
  flows: ChatbotFlowSummary[];
  selectedId?: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onToggleActive: (flow: ChatbotFlowSummary) => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  inactive: 'bg-slate-200/40 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  primary: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
};

export function FlowList({ flows, selectedId, loading, onSelect, onCreate, onToggleActive }: FlowListProps) {
  return (
    <div className="flex h-full w-80 flex-col border-r border-gray-200 bg-white/70 backdrop-blur-md transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-100">Fluxos do Bot</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {loading ? 'Atualizando...' : `${flows.length} fluxo${flows.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
        >
          <PlusCircle size={16} />
          Novo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {flows.length === 0 && (
          <div className="mt-12 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
            Nenhum fluxo configurado ainda.
            <br />
            Clique em <span className="font-semibold text-primary">Novo</span> para iniciar.
          </div>
        )}

        <div className="space-y-3">
          {flows.map((flow) => {
            const isSelected = flow.id === selectedId;

            return (
              <button
                key={flow.id}
                type="button"
                onClick={() => onSelect(flow.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm shadow-primary/10'
                    : 'border-gray-200 bg-white hover:border-primary/40 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-primary/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{flow.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-slate-400">
                      {flow.description ?? 'Sem descricao'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleActive(flow);
                      }}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                        flow.isActive
                          ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-300'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                      title={flow.isActive ? 'Desativar fluxo' : 'Ativar fluxo'}
                    >
                      <Power size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${statusColors[flow.isActive ? 'active' : 'inactive']}`}
                  >
                    <Play size={12} />
                    {flow.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                  {flow.isPrimary && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${statusColors.primary}`}>
                      Fluxo Principal
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-200/60 px-2 py-1 font-medium text-gray-600 dark:bg-slate-800 dark:text-slate-400">
                    Sessoes: {flow.stats.totalSessions}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-200/60 px-2 py-1 font-medium text-gray-600 dark:bg-slate-800 dark:text-slate-400">
                    Conclusoes: {flow.stats.completedSessions}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FlowList;

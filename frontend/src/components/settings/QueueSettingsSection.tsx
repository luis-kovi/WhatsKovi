'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Queue } from '@/store/metadataStore';

type QueueSettingsSectionProps = {
  queues: Queue[];
  onCreateQueue: (payload: {
    name: string;
    color?: string;
    description?: string;
    greetingMessage?: string;
    outOfHoursMessage?: string;
    priority?: number;
  }) => Promise<void>;
  onUpdateQueue: (id: string, payload: {
    name?: string;
    color?: string;
    description?: string;
    greetingMessage?: string;
    outOfHoursMessage?: string;
    priority?: number;
  }) => Promise<void>;
  onDeleteQueue: (id: string) => Promise<void>;
};

const defaultFormValues = {
  name: '',
  color: '#FF355A',
  description: '',
  greetingMessage: '',
  outOfHoursMessage: '',
  priority: 0
};

export default function QueueSettingsSection({
  queues,
  onCreateQueue,
  onUpdateQueue,
  onDeleteQueue
}: QueueSettingsSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState({ ...defaultFormValues });
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const resetForm = () => {
    setFormValues({ ...defaultFormValues });
    setEditingQueueId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formValues.name.trim()) {
      toast.error('Informe o nome da fila.');
      return;
    }

    setSubmitting(true);
    const payload = {
      name: formValues.name.trim(),
      color: formValues.color,
      description: formValues.description.trim() || undefined,
      greetingMessage: formValues.greetingMessage.trim() || undefined,
      outOfHoursMessage: formValues.outOfHoursMessage.trim() || undefined,
      priority: formValues.priority
    };

    try {
      if (editingQueueId) {
        await onUpdateQueue(editingQueueId, payload);
        toast.success('Fila atualizada com sucesso.');
      } else {
        await onCreateQueue(payload);
        toast.success('Fila criada com sucesso.');
      }
      resetForm();
      setFormOpen(false);
    } catch (error) {
      console.error('Erro ao salvar fila:', error);
      toast.error('Nao foi possivel salvar a fila.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    setFormOpen(false);
  };
  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Filas de atendimento</h2>
          <p className="text-sm text-gray-500">
            Visualize e organize as filas que recebem tickets automaticamente, incluindo prioridades e cores.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (formOpen) {
              handleCancel();
            } else {
              resetForm();
              setFormOpen(true);
            }
          }}
          className="rounded-lg border border-primary px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          {formOpen ? 'Cancelar' : 'Nova fila'}
        </button>
      </header>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              Nome da fila
              <input
                value={formValues.name}
                onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Ex: Suporte nivel 2"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              Cor identificadora
              <input
                type="color"
                value={formValues.color}
                onChange={(event) => setFormValues((prev) => ({ ...prev, color: event.target.value }))}
                className="h-12 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
              />
            </label>
          </div>
          <label className="mt-4 flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            Descricao
            <textarea
              value={formValues.description}
              onChange={(event) => setFormValues((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Resumo sobre o objetivo da fila e quando deve ser utilizada."
            />
          </label>
          <label className="mt-4 flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            Prioridade
            <input
              type="number"
              value={formValues.priority}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, priority: Number(event.target.value) || 0 }))
              }
              className="mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="mt-4 flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            Mensagem de saudacao
            <textarea
              value={formValues.greetingMessage}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, greetingMessage: event.target.value }))
              }
              rows={2}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Mensagem enviada automaticamente ao iniciar um atendimento."
            />
          </label>
          <label className="mt-4 flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
            Mensagem fora do horario
            <textarea
              value={formValues.outOfHoursMessage}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, outOfHoursMessage: event.target.value }))
              }
              rows={2}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Mensagem enviada quando a fila estiver fora do horario de atendimento."
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              {submitting ? 'Salvando...' : editingQueueId ? 'Salvar alteracoes' : 'Criar fila'}
            </button>
          </div>
        </form>
      )}

      {queues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
          Nenhuma fila cadastrada. Crie filas para segmentar atendimentos por area ou prioridade.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {queues.map((queue) => (
            <article key={queue.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="h-6 w-6 rounded-full border border-gray-200"
                    style={{ background: queue.color }}
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">{queue.name}</h3>
                    <p className="text-xs text-gray-500">Prioridade #{queue.priority}</p>
                  </div>
                </div>
              </header>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <p>{queue.description || 'Fila sem descricao cadastrada.'}</p>
                {queue.greetingMessage && (
                  <p>
                    <span className="font-semibold text-gray-700">Saudacao:</span> {queue.greetingMessage}
                  </p>
                )}
                {queue.outOfHoursMessage && (
                  <p>
                    <span className="font-semibold text-gray-700">Fora de horario:</span>{' '}
                    {queue.outOfHoursMessage}
                  </p>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormValues({
                      name: queue.name,
                      color: queue.color,
                      description: queue.description || '',
                      greetingMessage: queue.greetingMessage || '',
                      outOfHoursMessage: queue.outOfHoursMessage || '',
                      priority: queue.priority ?? 0
                    });
                    setEditingQueueId(queue.id);
                    setFormOpen(true);
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const confirmed = window.confirm('Deseja remover esta fila?');
                    if (!confirmed) return;
                    try {
                      await onDeleteQueue(queue.id);
                      if (editingQueueId === queue.id) {
                        resetForm();
                        setFormOpen(false);
                      }
                      toast.success('Fila removida.');
                    } catch (error) {
                      console.error('Erro ao remover fila:', error);
                      toast.error('Nao foi possivel remover a fila.');
                    }
                  }}
                  className="rounded-lg border border-red-500 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Remover
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

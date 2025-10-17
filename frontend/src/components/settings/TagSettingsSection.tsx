'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Tag } from '@/store/metadataStore';

type TagSettingsSectionProps = {
  tags: Tag[];
  onCreateTag: (payload: { name: string; color?: string }) => Promise<void>;
  onUpdateTag: (id: string, payload: { name?: string; color?: string }) => Promise<void>;
  onDeleteTag: (id: string) => Promise<void>;
};

export default function TagSettingsSection({
  tags,
  onCreateTag,
  onUpdateTag,
  onDeleteTag
}: TagSettingsSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState({ name: '', color: '#FF355A' });
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formValues.name.trim()) {
      toast.error('Informe o nome da tag.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingTagId) {
        await onUpdateTag(editingTagId, {
          name: formValues.name.trim(),
          color: formValues.color
        });
        toast.success('Tag atualizada com sucesso.');
      } else {
        await onCreateTag({ name: formValues.name.trim(), color: formValues.color });
        toast.success('Tag criada com sucesso.');
      }

      setFormValues({ name: '', color: '#FF355A' });
      setEditingTagId(null);
      setFormOpen(false);
    } catch (error) {
      console.error('Erro ao salvar tag:', error);
      toast.error('Nao foi possivel salvar a tag.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormOpen(false);
    setEditingTagId(null);
    setFormValues({ name: '', color: '#FF355A' });
  };

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tags de atendimento</h2>
          <p className="text-sm text-gray-500">
            Utilize tags para categorizar tickets e gerar relatorios segmentados por tema ou urgencia.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (formOpen && editingTagId) {
              handleCancel();
            } else {
              setFormOpen((prev) => !prev);
            }
          }}
          className="rounded-lg border border-primary px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          {formOpen ? 'Cancelar' : 'Nova tag'}
        </button>
      </header>

      {formOpen && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              Nome da tag
              <input
                value={formValues.name}
                onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Ex: prioridade"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
              Cor
              <input
                type="color"
                value={formValues.color}
                onChange={(event) => setFormValues((prev) => ({ ...prev, color: event.target.value }))}
                className="h-12 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
              />
            </label>
          </div>
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
              {submitting ? 'Salvando...' : editingTagId ? 'Salvar alteracoes' : 'Criar tag'}
            </button>
          </div>
        </form>
      )}

      {tags.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
          Nenhuma tag cadastrada. Crie tags para identificar assuntos frequentes e facilitar a triagem dos tickets.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tags.map((tag) => (
            <article
              key={tag.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-6 w-6 rounded-full border border-gray-200"
                  style={{ background: tag.color }}
                />
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">#{tag.name}</h3>
                  <p className="text-xs text-gray-500">{tag.color}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormValues({ name: tag.name, color: tag.color });
                    setEditingTagId(tag.id);
                    setFormOpen(true);
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const confirmed = window.confirm('Deseja remover esta tag?');
                    if (!confirmed) return;
                    try {
                      await onDeleteTag(tag.id);
                      if (editingTagId === tag.id) {
                        handleCancel();
                      }
                      toast.success('Tag removida.');
                    } catch (error) {
                      console.error('Erro ao remover tag:', error);
                      toast.error('Nao foi possivel remover a tag.');
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


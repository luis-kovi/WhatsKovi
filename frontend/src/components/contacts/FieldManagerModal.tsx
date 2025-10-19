import { FormEvent, useState } from 'react';
import type { ContactFieldDefinition, ContactFieldType } from '@/store/contactStore';

const FIELD_TYPES: { label: string; value: ContactFieldType }[] = [
  { label: 'Texto', value: 'TEXT' },
  { label: 'Número', value: 'NUMBER' },
  { label: 'Data', value: 'DATE' },
  { label: 'Booleano', value: 'BOOLEAN' },
  { label: 'Seleção única', value: 'SELECT' },
  { label: 'Seleção múltipla', value: 'MULTI_SELECT' }
];

type FieldManagerModalProps = {
  open: boolean;
  fields: ContactFieldDefinition[];
  creating: boolean;
  onClose: () => void;
  onCreate: (payload: { name: string; key?: string; type: ContactFieldType; description?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export default function FieldManagerModal({ open, fields, creating, onClose, onCreate, onDelete }: FieldManagerModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ContactFieldType>('TEXT');
  const [description, setDescription] = useState('');

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    await onCreate({ name: name.trim(), type, description: description.trim() || undefined });
    setName('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Gerenciar campos personalizados</h2>
            <p className="text-xs text-gray-500">Adicione ou remova campos extras exibidos no perfil do contato.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            type="button"
          >
            Fechar
          </button>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs font-semibold text-gray-600">
              Nome do campo
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Empresa"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold text-gray-600">
              Tipo
              <select
                value={type}
                onChange={(event) => setType(event.target.value as ContactFieldType)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {FIELD_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-2 text-xs font-semibold text-gray-600">
            Descrição (opcional)
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Dica exibida ao editar o campo"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-40"
            >
              {creating ? 'Adicionando...' : 'Adicionar campo'}
            </button>
          </div>
        </form>

        <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Campo</th>
                <th className="px-4 py-2 text-left">Chave</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {fields.map((field) => (
                <tr key={field.id}>
                  <td className="px-4 py-2 text-gray-700">{field.name}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{field.key}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{field.type}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(field.id)}
                      className="text-xs font-semibold text-red-500 transition hover:text-red-600"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {fields.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-xs text-gray-500" colSpan={4}>
                    Nenhum campo personalizado cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

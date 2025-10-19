import { ChangeEvent, FormEvent, useState } from 'react';

type ContactImportModalProps = {
  open: boolean;
  importing: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
};

export default function ContactImportModal({ open, importing, onClose, onImport }: ContactImportModalProps) {
  const [file, setFile] = useState<File | null>(null);

  if (!open) return null;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected ?? null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    await onImport(file);
    setFile(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-gray-900">Importar contatos via CSV</h2>
        <p className="mt-1 text-sm text-gray-500">
          O arquivo deve conter as colunas <strong>name</strong> e <strong>phoneNumber</strong>. Colunas adicionais serão analisadas como campos personalizados (ex.: <code>field:empresa</code>).
        </p>

        <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-gray-700">
          Arquivo CSV
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setFile(null);
              onClose();
            }}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            disabled={importing}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!file || importing}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {importing ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </form>
    </div>
  );
}

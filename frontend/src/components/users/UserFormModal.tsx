'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { User, UserRole, UserStatus } from '@/store/userStore';

export type UserFormValues = {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status?: UserStatus;
  maxTickets: number;
};

type UserFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<User>;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => Promise<void> | void;
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'AGENT', label: 'Agente' }
];

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'AWAY', label: 'Ausente' },
  { value: 'OFFLINE', label: 'Offline' }
];

const DEFAULT_VALUES: UserFormValues = {
  name: '',
  email: '',
  role: 'AGENT',
  status: 'OFFLINE',
  maxTickets: 3
};

export default function UserFormModal({ open, mode, initialData, submitting, onClose, onSubmit }: UserFormModalProps) {
  const [formValues, setFormValues] = useState<UserFormValues>(DEFAULT_VALUES);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && initialData) {
      setFormValues({
        name: initialData.name ?? '',
        email: initialData.email ?? '',
        role: initialData.role ?? 'AGENT',
        status: initialData.status ?? 'OFFLINE',
        maxTickets: initialData.maxTickets ?? 3
      });
    } else {
      setFormValues(DEFAULT_VALUES);
      setConfirmPassword('');
    }
    setError(null);
  }, [open, mode, initialData]);

  if (!open) {
    return null;
  }

  const handleChange = (field: keyof UserFormValues, value: string) => {
    if (field === 'maxTickets') {
      const parsed = Number(value.replace(/\D/g, ''));
      setFormValues((prev) => ({ ...prev, maxTickets: Number.isNaN(parsed) ? 0 : parsed }));
      return;
    }

    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === 'create' && !formValues.password) {
      setError('Informe uma senha para o novo usuario.');
      return;
    }

    if (mode === 'create' && (!confirmPassword || confirmPassword !== formValues.password)) {
      setError('As senhas informadas nao conferem.');
      return;
    }

    if (formValues.maxTickets <= 0) {
      setError('Defina ao menos 1 ticket simultaneo.');
      return;
    }

    await onSubmit({
      ...formValues,
      password: formValues.password || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'create' ? 'Cadastrar novo usuario' : 'Editar usuario'}
            </h3>
            <p className="text-sm text-gray-500">
              {mode === 'create'
                ? 'Informe os dados para liberar o acesso do colaborador.'
                : 'Atualize permissoes e limites de atendimento.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Nome completo</label>
              <input
                type="text"
                value={formValues.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder="Maria Santos"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Email corporativo</label>
              <input
                type="email"
                value={formValues.email}
                onChange={(event) => handleChange('email', event.target.value)}
                placeholder="maria@empresa.com"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
          </div>

          <div className={`grid gap-3 ${mode === 'edit' ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Perfil</label>
              <select
                value={formValues.role}
                onChange={(event) => handleChange('role', event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {mode === 'edit' && (
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Status</label>
                <select
                  value={formValues.status}
                  onChange={(event) => handleChange('status', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Limite de tickets simultaneos</label>
              <input
                type="number"
                min={1}
                value={formValues.maxTickets}
                onChange={(event) => handleChange('maxTickets', event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="mt-1 text-xs text-gray-400">
                Controla quantos atendimentos o usuario pode assumir ao mesmo tempo.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">
                {mode === 'create' ? 'Senha temporaria' : 'Nova senha (opcional)'}
              </label>
              <input
                type="password"
                value={formValues.password || ''}
                onChange={(event) => handleChange('password', event.target.value)}
                placeholder="********"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                {...(mode === 'create' ? { required: true } : {})}
              />
              {mode === 'edit' ? (
                <p className="mt-1 text-xs text-gray-400">Preencha apenas se desejar atualizar a senha.</p>
              ) : (
                <p className="mt-1 text-xs text-gray-400">Compartilhe temporariamente e recomende a troca no primeiro acesso.</p>
              )}
            </div>
          </div>

          {mode === 'create' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Confirmar senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repita a senha"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
              disabled={submitting}
            >
              {submitting ? 'Salvando...' : mode === 'create' ? 'Criar usuario' : 'Salvar alteracoes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

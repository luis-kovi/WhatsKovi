'use client';

import { FormEvent, useState } from 'react';
import { Filter, Plus, RefreshCw, Search } from 'lucide-react';

type UserFiltersProps = {
  search: string;
  role: string;
  status: string;
  onSearch: (value: string) => void;
  onRoleChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCreate: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
};

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'Todos os perfis' },
  { value: 'ADMIN', label: 'Administradores' },
  { value: 'SUPERVISOR', label: 'Supervisores' },
  { value: 'AGENT', label: 'Agentes' }
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'AWAY', label: 'Ausentes' },
  { value: 'OFFLINE', label: 'Offline' }
];

export default function UserFilters({
  search,
  role,
  status,
  onSearch,
  onRoleChange,
  onStatusChange,
  onCreate,
  onRefresh,
  refreshing
}: UserFiltersProps) {
  const [searchValue, setSearchValue] = useState(search);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(searchValue.trim());
  };

  const handleResetSearch = () => {
    setSearchValue('');
    onSearch('');
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Equipe</h2>
          <p className="text-sm text-gray-500">
            Acompanhe usuarios cadastrados, defina limites de atendimento e niveis de acesso.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Novo usuario
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
        <form onSubmit={handleSubmit} className="relative flex">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Buscar por nome ou email"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-24 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {searchValue.length > 0 && (
            <button
              type="button"
              onClick={handleResetSearch}
              className="absolute right-16 top-1/2 h-8 -translate-y-1/2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
            >
              Limpar
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 top-1/2 flex h-8 -translate-y-1/2 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition hover:bg-primary/90"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtrar
          </button>
        </form>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Perfil</label>
          <select
            value={role}
            onChange={(event) => onRoleChange(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Status</label>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}


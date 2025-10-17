'use client';

import { Edit3, Mail, Trash2 } from 'lucide-react';
import { User } from '@/store/userStore';

type UserTableProps = {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
};

const ROLE_LABEL: Record<User['role'], string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  AGENT: 'Agente'
};

const STATUS_LABEL: Record<User['status'], string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  AWAY: 'Ausente'
};

const STATUS_BADGE: Record<User['status'], string> = {
  ONLINE: 'bg-green-100 text-green-700 border border-green-200',
  OFFLINE: 'bg-gray-100 text-gray-600 border border-gray-200',
  AWAY: 'bg-amber-100 text-amber-700 border border-amber-200'
};

const ROLE_BADGE: Record<User['role'], string> = {
  ADMIN: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  SUPERVISOR: 'bg-teal-100 text-teal-700 border border-teal-200',
  AGENT: 'bg-blue-100 text-blue-700 border border-blue-200'
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

export default function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-gray-500">
        Nenhum usuario encontrado.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Usuario
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Perfil
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Limite Tickets
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Desde
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
              Acoes
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50/80 transition">
              <td className="whitespace-nowrap px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="flex items-center gap-1 text-xs text-gray-500">
                      <Mail className="h-3.5 w-3.5" />
                      {user.email}
                    </p>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${ROLE_BADGE[user.role]}`}>
                  {ROLE_LABEL[user.role]}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[user.status]}`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {STATUS_LABEL[user.status]}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-700">
                {user.maxTickets}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {user.createdAt ? dateFormatter.format(new Date(user.createdAt)) : '---'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onEdit(user)}
                    className="inline-flex items-center gap-2 rounded-lg border border-transparent px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/10"
                  >
                    <Edit3 className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(user)}
                    className="inline-flex items-center gap-2 rounded-lg border border-transparent px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


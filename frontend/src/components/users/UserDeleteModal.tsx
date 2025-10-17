'use client';

import { AlertTriangle, X } from 'lucide-react';
import { User } from '@/store/userStore';

type UserDeleteModalProps = {
  open: boolean;
  user?: User | null;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function UserDeleteModal({ open, user, submitting, onCancel, onConfirm }: UserDeleteModalProps) {
  if (!open || !user) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Remover usuario</h3>
              <p className="text-sm text-gray-500">Esta acao nao pode ser desfeita.</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-gray-600">
            Tem certeza de que deseja remover o usuario{' '}
            <span className="font-semibold text-gray-900">{user.name}</span>? Ele perdera o acesso ao sistema e nao
            podera receber novos atendimentos.
          </p>

          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
            Confirme apenas se o usuario nao fizer mais parte da equipe ou se o acesso estiver comprometido.
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm()}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
            disabled={submitting}
          >
            {submitting ? 'Removendo...' : 'Sim, remover'}
          </button>
        </div>
      </div>
    </div>
  );
}


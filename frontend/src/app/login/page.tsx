'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { LogIn } from 'lucide-react';

const pillars = ['Operações unificadas', 'Bots com IA', 'Métricas em tempo real'];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const getErrorMessage = (error: unknown) => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const apiError = error as { response?: { data?: { error?: string } } };
      if (apiError.response?.data?.error) {
        return apiError.response.data.error;
      }
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Erro ao fazer login';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-100 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.1),_transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(14,165,233,0.18),_transparent_45%)]" />

      <div className="relative mx-auto flex min-h-[80vh] max-w-5xl items-center rounded-[32px] border border-slate-200/70 bg-white/95 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid w-full grid-cols-1 gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-between border-b border-slate-100/70 px-8 py-10 text-slate-900 lg:border-b-0 lg:border-r">
            <div className="space-y-6">
              <Image
                src="/brand/login_logo.png"
                alt="WhatsKovi"
                width={240}
                height={90}
                priority
                className="h-auto w-44 object-contain"
              />
              <p className="text-2xl font-light text-slate-700">
                Hub minimalista para monitorar canais, bots e squads com total visibilidade.
              </p>
            </div>
            <div className="mt-8 space-y-3">
              {pillars.map((text) => (
                <div key={text} className="flex items-center gap-3 text-sm font-medium text-slate-500">
                  <span className="h-1.5 w-12 rounded-full bg-gradient-to-r from-primary to-cyan-400" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="px-8 py-10">
            <div className="mb-8 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Login</p>
              <h1 className="text-3xl font-semibold text-slate-900">Acesse sua conta</h1>
              <p className="text-sm text-slate-500">Continue de onde parou com os fluxos WhatsKovi.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm text-slate-500">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="voce@empresa.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-500">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <>
                    <span>Entrar</span>
                    <LogIn size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-400">
              Precisa de acesso? Fale com o administrador da sua empresa.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

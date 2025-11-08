'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { LogIn, ShieldCheck, Sparkles, BarChart3 } from 'lucide-react';

const highlights = [
  {
    icon: ShieldCheck,
    title: 'Segurança avançada',
    description: 'Criptografia ponta a ponta e auditoria contínua.'
  },
  {
    icon: BarChart3,
    title: 'Insights acionáveis',
    description: 'Visão holística de canais, bots e atendentes.'
  },
  {
    icon: Sparkles,
    title: 'Automação inteligente',
    description: 'Fluxos com IA para acelerar cada atendimento.'
  }
];

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.25),_transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(6,182,212,0.25),_transparent_40%)]" />
      <div className="absolute inset-y-0 left-1/2 hidden w-px bg-white/10 lg:block" />

      <div className="relative z-10 grid w-full max-w-6xl grid-cols-1 gap-8 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-3xl lg:grid-cols-2 lg:p-10">
        <div className="space-y-10">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-medium tracking-wide text-white/80 backdrop-blur">
              Nova geração de atendimento omnichannel
            </div>
            <Image
              src="/brand/login_logo.png"
              alt="WhatsKovi"
              width={320}
              height={120}
              priority
              className="h-auto w-60 object-contain drop-shadow-[0_10px_40px_rgba(14,165,233,0.35)]"
            />
            <p className="text-lg text-white/80">
              O cockpit definitivo para times que conectam atendimento humano, automações e inteligência
              artificial em um único lugar.
            </p>
          </div>

          <div className="space-y-4">
            {highlights.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="rounded-2xl bg-gradient-to-br from-primary/70 to-cyan-400/50 p-3 text-white">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-base font-semibold">{title}</p>
                  <p className="text-sm text-white/70">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-white/60">Status</p>
            <p className="mt-2 text-3xl font-semibold">99.98% uptime</p>
            <p className="text-sm text-white/70">Monitoramento ativo e suporte 24/7 para operações críticas.</p>
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-[28px] border border-white/10 bg-white/95 p-8 text-slate-900 shadow-xl backdrop-blur">
          <div className="mb-8 space-y-2 text-center lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Área restrita</p>
            <h1 className="text-3xl font-semibold text-slate-900">Entrar no painel</h1>
            <p className="text-sm text-slate-500">
              Use suas credenciais corporativas para acessar o ecossistema WhatsKovi.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">Email corporativo</label>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-0 bg-transparent px-0 py-1 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  placeholder="voce@empresa.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">Senha</label>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-0 bg-transparent px-0 py-1 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary via-cyan-500 to-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <>
                  <span>Entrar</span>
                  <LogIn size={18} className="transition group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">
            Precisa de acesso? Contate o administrador da sua empresa.
          </div>
        </div>
      </div>
    </div>
  );
}

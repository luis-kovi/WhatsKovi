'use client';

import { useEffect, useMemo, useState } from 'react';

type SurveyStatusResponse = {
  status: string;
  rating: number | null;
  comment: string | null;
  respondedAt: string | null;
  contactName: string;
  agentName: string | null;
  queueName: string | null;
  brand: string;
};

const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(
  /\/api$/,
  ''
);

const buildSurveyUrl = (token: string) => `${apiBase}/survey/${token}`;

const ratingScale = Array.from({ length: 11 }, (_, index) => index);

export default function PublicSurveyPage({ params }: { params: { token: string } }) {
  const [survey, setSurvey] = useState<SurveyStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = params.token;
  const link = useMemo(() => buildSurveyUrl(token), [token]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(link);

        if (!response.ok) {
          if (response.status === 410) {
            throw new Error('Esta pesquisa expirou.');
          }
          if (response.status === 404) {
            throw new Error('Nao encontramos esta pesquisa.');
          }
          throw new Error('Nao foi possivel carregar a pesquisa.');
        }

        const data = (await response.json()) as SurveyStatusResponse;
        if (!cancelled) {
          setSurvey(data);
          if (data.status === 'RESPONDED') {
            setScore(data.rating ?? null);
          }
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Nao foi possivel carregar a pesquisa.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [link]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (score === null) {
      setError('Selecione uma nota de 0 a 10 antes de enviar.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(link, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: score, comment })
      });

      if (!response.ok) {
        const message =
          response.status === 409
            ? 'Esta pesquisa ja foi respondida.'
            : 'Nao foi possivel registrar sua resposta. Tente novamente.';
        throw new Error(message);
      }

      const data = (await response.json()) as { rating: number; comment: string | null };
      setSurvey((prev) =>
        prev
          ? {
              ...prev,
              status: 'RESPONDED',
              rating: data.rating,
              comment: data.comment,
              respondedAt: new Date().toISOString()
            }
          : prev
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao enviar resposta.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">
        <div className="max-w-sm space-y-3">
          <h1 className="text-2xl font-bold">Ops, algo deu errado</h1>
          <p className="text-sm text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return null;
  }

  const alreadyResponded = survey.status === 'RESPONDED';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <header className="mb-6 space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary/80">
            Pesquisa de satisfacao
          </p>
          <h1 className="text-2xl font-semibold text-white">{survey.brand}</h1>
          <p className="text-sm text-slate-300">
            Olá {survey.contactName.split(' ')[0]}, conte para nos como foi o atendimento.
          </p>
        </header>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <section>
            <p className="text-sm font-medium text-slate-200">
              Em uma escala de 0 a 10, qual a chance de recomendar nosso atendimento?
            </p>
            <div className="mt-3 grid grid-cols-11 gap-2">
              {ratingScale.map((value) => {
                const isSelected = score === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScore(value)}
                    disabled={alreadyResponded}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      isSelected
                        ? 'bg-primary text-white shadow-lg shadow-primary/40'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Deixe um comentario (opcional)
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                disabled={alreadyResponded}
                rows={4}
                maxLength={480}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed"
                placeholder="Conte rapidamente como foi sua experiencia. O que podemos melhorar?"
              />
            </label>
          </section>

          {alreadyResponded ? (
            <div className="rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-4 py-3 text-sm text-emerald-200">
              <p className="font-semibold">Obrigado! Sua resposta ja foi registrada.</p>
              {survey.comment && <p className="mt-1 text-emerald-100">{survey.comment}</p>}
            </div>
          ) : (
            <button
              type="submit"
              disabled={score === null || submitting}
              className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              {submitting ? 'Enviando...' : 'Enviar avaliacao'}
            </button>
          )}
        </form>

        <footer className="mt-6 text-center text-[11px] text-slate-400">
          <p>
            Atendimento realizado {survey.queueName ? `pela fila ${survey.queueName}` : 'sem fila definida'}
            {survey.agentName ? ` • atendente ${survey.agentName}` : ''}
          </p>
        </footer>
      </div>
    </div>
  );
}


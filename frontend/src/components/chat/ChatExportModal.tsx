'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Download,
  FileText,
  FileJson,
  FileType,
  Loader2,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  RefreshCcw
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '@/services/api';

type ExportFormatOption = 'pdf' | 'txt' | 'json';

type ExportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

type ExportPreviewMessage = {
  id: string;
  createdAt: string;
  author: string;
  snippet: string;
  isPrivate?: boolean;
  hasMedia?: boolean;
};

type ExportJob = {
  id: string;
  ticketId: string;
  format: 'PDF' | 'TXT' | 'JSON';
  status: ExportStatus;
  fileName?: string | null;
  fileSize?: number | null;
  createdAt: string;
  updatedAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  expiresAt?: string | null;
  preview?: {
    summary?: Record<string, unknown>;
    sample?: Array<{
      id: string;
      createdAt: string;
      author: string;
      snippet: string;
      isPrivate?: boolean;
      hasMedia?: boolean;
    }>;
  } | null;
  error?: string | null;
  downloadUrl?: string | null;
  requestedBy?: { id: string; name: string } | null;
};

type Props = {
  ticketId: string;
  open: boolean;
  onClose: () => void;
  initialPreview: ExportPreviewMessage[];
  contactName: string;
};

const formatLabels: Record<ExportFormatOption, string> = {
  pdf: 'PDF (com formatação)',
  txt: 'TXT (texto simples)',
  json: 'JSON (estrutura de dados)'
};

const formatDescriptions: Record<ExportFormatOption, string> = {
  pdf: 'Ideal para compartilhar com clientes e gerar relatórios oficiais.',
  txt: 'Conteúdo puro para análises rápidas ou importação em ferramentas simples.',
  json: 'Indicado para integrações e processamento automatizado.'
};

const iconForFormat: Record<ExportFormatOption, LucideIcon> = {
  pdf: FileType,
  txt: FileText,
  json: FileJson
};

const statusLabel: Record<ExportStatus, string> = {
  PENDING: 'Fila de processamento',
  PROCESSING: 'Gerando arquivo',
  COMPLETED: 'Concluído',
  FAILED: 'Falhou'
};

const statusColor: Record<ExportStatus, string> = {
  PENDING: 'text-amber-500',
  PROCESSING: 'text-blue-500',
  COMPLETED: 'text-emerald-600',
  FAILED: 'text-red-600'
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
};

const formatBytes = (size?: number | null) => {
  if (!size || size <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let current = size;
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }
  return `${current.toFixed(current >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const sanitizeDownloadPath = (downloadUrl?: string | null) => {
  if (!downloadUrl) return null;
  return downloadUrl.replace(/^\/api/, '');
};

export function ChatExportModal({ ticketId, open, onClose, initialPreview, contactName }: Props) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormatOption>('pdf');
  const [job, setJob] = useState<ExportJob | null>(null);
  const [history, setHistory] = useState<ExportJob[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoDownloadedJobId, setAutoDownloadedJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const response = await api.get(`/tickets/${ticketId}/export/jobs`);
      const items = Array.isArray(response.data?.items) ? (response.data.items as ExportJob[]) : [];
      setHistory(items);
    } catch (error) {
      console.error('Erro ao carregar histórico de exportações:', error);
      toast.error('Não foi possível carregar o histórico de exportações.');
    } finally {
      setLoadingHistory(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (open) {
      void loadHistory();
    } else {
      setJob(null);
      setAutoDownloadedJobId(null);
      setErrorMessage(null);
    }
  }, [open, loadHistory]);

  const handleRequestExport = useCallback(async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await api.post(`/tickets/${ticketId}/export`, {
        format: selectedFormat.toUpperCase()
      });
      const createdJob = response.data?.job as ExportJob | undefined;
      if (!createdJob) {
        throw new Error('Resposta inesperada ao solicitar exportação');
      }
      setJob(createdJob);
      setAutoDownloadedJobId(null);
      toast.success('Exportação solicitada. Estamos preparando o arquivo.');
    } catch (error) {
      console.error('Erro ao solicitar exportação:', error);
      setErrorMessage('Não foi possível solicitar a exportação. Tente novamente.');
      toast.error('Falha ao solicitar exportação.');
    } finally {
      setSubmitting(false);
    }
  }, [ticketId, selectedFormat]);

  const refreshJob = useCallback(
    async (jobId: string) => {
      try {
        const response = await api.get(`/exports/${jobId}`);
        const updatedJob = response.data?.job as ExportJob | undefined;
        if (updatedJob) {
          setJob(updatedJob);
        }
      } catch (error) {
        console.error('Erro ao atualizar exportação:', error);
      }
    },
    []
  );

  useEffect(() => {
    if (!job) return undefined;
    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      return undefined;
    }

    const interval = setTimeout(() => {
      void refreshJob(job.id);
    }, 2500);

    return () => clearTimeout(interval);
  }, [job, refreshJob]);

  const handleDownloadJob = useCallback(
    async (target: ExportJob) => {
      const downloadPath = sanitizeDownloadPath(target.downloadUrl);
      if (!downloadPath) {
        toast.error('Arquivo ainda não está disponível para download.');
        return;
      }

      try {
        const response = await api.get(downloadPath, { responseType: 'blob' });
        const blob = new Blob([response.data], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = target.fileName ?? `ticket-${target.ticketId}-export.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Download iniciado.');
      } catch (error) {
        console.error('Erro ao baixar exportação:', error);
        toast.error('Não foi possível baixar o arquivo. Tente novamente.');
      }
    },
    []
  );

  useEffect(() => {
    if (!job || job.status !== 'COMPLETED' || !job.downloadUrl) return;
    if (autoDownloadedJobId === job.id) return;

    void handleDownloadJob(job);
    setAutoDownloadedJobId(job.id);
    void loadHistory();
  }, [job, autoDownloadedJobId, handleDownloadJob, loadHistory]);

  useEffect(() => {
    if (job?.status === 'FAILED') {
      void loadHistory();
    }
  }, [job?.status, loadHistory]);

  const previewMessages = useMemo<ExportPreviewMessage[]>(() => {
    if (job?.preview?.sample && job.preview.sample.length > 0) {
      return job.preview.sample.map((item) => ({
        id: item.id,
        author: item.author,
        createdAt: item.createdAt,
        snippet: item.snippet,
        isPrivate: item.isPrivate,
        hasMedia: item.hasMedia
      }));
    }
    return initialPreview;
  }, [job?.preview, initialPreview]);

  const previewSummary = useMemo(() => {
    const summary = job?.preview?.summary;
    if (!summary) return null;
    return {
      contact: summary.contact as { name?: string; phoneNumber?: string } | undefined,
      messageCount: summary.messageCount as number | undefined,
      tags: Array.isArray(summary.tags) ? (summary.tags as string[]) : []
    };
  }, [job?.preview]);

  const isProcessing = job?.status === 'PENDING' || job?.status === 'PROCESSING';

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-8 py-6">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Exportar conversa</p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">Ticket de {contactName}</h2>
            <p className="text-sm text-gray-500">
              Gere um relatório completo da conversa em diferentes formatos. Arquivos incluem as mídias trocadas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fechar modal de exportação"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-6 border-b border-gray-100 px-8 py-6 lg:grid-cols-[2fr_3fr]">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileType size={16} className="text-primary" />
              Escolha o formato
            </h3>

            <div className="space-y-3">
              {(Object.keys(formatLabels) as ExportFormatOption[]).map((option) => {
                const Icon = iconForFormat[option];
                const active = selectedFormat === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedFormat(option)}
                    disabled={isProcessing}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'
                    } ${isProcessing ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div
                      className={`mt-1 flex h-8 w-8 items-center justify-center rounded-xl ${
                        active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{formatLabels[option]}</p>
                      <p className="text-xs text-gray-500">{formatDescriptions[option]}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-semibold text-gray-700">Pré-visualização rápida</p>
              <p className="mt-2 text-xs text-gray-500">
                Revise abaixo os últimos trechos da conversa antes de exportar. O arquivo final incluirá todas as
                mensagens, notas internas, anexos e metadados do ticket.
              </p>
            </div>

            {errorMessage && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{errorMessage}</p>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={handleRequestExport}
                disabled={submitting || isProcessing}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {submitting ? 'Solicitando...' : isProcessing ? 'Processando...' : 'Iniciar exportação'}
              </button>

              <button
                type="button"
                onClick={() => void loadHistory()}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                <RefreshCcw size={14} />
                Atualizar histórico
              </button>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">Status da exportação</h4>
                {job ? (
                  <span className={`flex items-center gap-1 text-xs font-semibold ${statusColor[job.status]}`}>
                    <Clock size={14} />
                    {statusLabel[job.status]}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Nenhuma exportação em andamento</span>
                )}
              </div>

              {job ? (
                <div className="space-y-3 text-sm text-gray-600">
                  <p>
                    <span className="font-semibold text-gray-700">Formato:</span> {job.format}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">Solicitado em:</span> {formatDate(job.createdAt)}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">Concluído em:</span>{' '}
                    {job.completedAt ? formatDate(job.completedAt) : '—'}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">Tamanho:</span> {formatBytes(job.fileSize ?? null)}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">Expira em:</span>{' '}
                    {job.expiresAt ? formatDate(job.expiresAt) : '7 dias após conclusão'}
                  </p>
                  {job.status === 'FAILED' && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                      <AlertCircle className="mt-0.5 h-4 w-4" />
                      <div>
                        <p className="font-semibold">Falha na geração</p>
                        <p className="text-xs">{job.error ?? 'Tente gerar novamente em instantes.'}</p>
                      </div>
                    </div>
                  )}
                  {job.status === 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => void handleDownloadJob(job)}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <CheckCircle2 size={14} />
                      Baixar novamente
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Selecione um formato e solicite a exportação para acompanhar o status aqui.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Pré-visualização</h4>
              {previewSummary && (
                <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="rounded-full bg-gray-100 px-3 py-1">Mensagens: {previewSummary.messageCount ?? '—'}</span>
                  {previewSummary.contact?.phoneNumber && (
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      Telefone: {previewSummary.contact.phoneNumber}
                    </span>
                  )}
                  {previewSummary.tags && previewSummary.tags.length > 0 && (
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      Tags: {previewSummary.tags.join(', ')}
                    </span>
                  )}
                </div>
              )}

              {previewMessages.length === 0 ? (
                <p className="text-sm text-gray-400">Ainda não há mensagens suficientes para pré-visualização.</p>
              ) : (
                <ul className="space-y-3">
                  {previewMessages.map((message) => (
                    <li key={message.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{message.author}</span>
                        <span>{formatDate(message.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">
                        {message.snippet.trim().length > 0 ? message.snippet : '(mensagem sem texto)'}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400">
                        {message.isPrivate && <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-700">Interna</span>}
                        {message.hasMedia && <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700">Anexo</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <section className="px-8 py-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <History size={16} className="text-primary" />
            Exportações anteriores
          </div>

          <div className="max-h-48 overflow-y-auto rounded-2xl border border-gray-200 bg-white">
            {loadingHistory ? (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Carregando histórico...
              </div>
            ) : history.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500">
                Nenhuma exportação disponível ainda. As solicitações recentes aparecerão aqui.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {history.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-gray-600">
                    <div className="min-w-[120px] font-semibold text-gray-700">{item.format}</div>
                    <div className="flex flex-col text-xs text-gray-500">
                      <span>Solicitado: {formatDate(item.createdAt)}</span>
                      <span>Status: <span className={statusColor[item.status]}>{statusLabel[item.status]}</span></span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-gray-400">{formatBytes(item.fileSize ?? null)}</span>
                      {item.status === 'COMPLETED' && item.downloadUrl ? (
                        <button
                          type="button"
                          onClick={() => void handleDownloadJob(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                        >
                          <Download size={14} />
                          Baixar
                        </button>
                      ) : item.status === 'FAILED' ? (
                        <span className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">Falhou</span>
                      ) : (
                        <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-500">Em processamento</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

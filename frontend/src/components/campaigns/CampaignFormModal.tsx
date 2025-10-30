'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, ArrowLeft, ArrowRight, Users, Hash, Calendar, MessageCircle } from 'lucide-react';
import type { ContactSegment, ContactSummary } from '@/store/contactStore';
import type { Queue, WhatsAppConnection } from '@/store/metadataStore';
import type { CreateMessageCampaignRequest } from '@/types/campaigns';

const STEP_TITLES = ['Informações básicas', 'Destinatários', 'Mensagem'];

const getStepIcon = (step: number) => {
  switch (step) {
    case 0:
      return <Hash className="h-4 w-4" />;
    case 1:
      return <Users className="h-4 w-4" />;
    default:
      return <MessageCircle className="h-4 w-4" />;
  }
};

type Props = {
  open: boolean;
  submitting?: boolean;
  segments: ContactSegment[];
  contacts: ContactSummary[];
  queues: Queue[];
  connections: WhatsAppConnection[];
  onClose: () => void;
  onSubmit: (payload: CreateMessageCampaignRequest) => Promise<void>;
};

type FormState = {
  name: string;
  description: string;
  whatsappId: string;
  queueId: string;
  rateLimitPerMinute: number;
  scheduledForOption: 'now' | 'schedule';
  scheduledFor: string;
  segmentIds: string[];
  contactIds: string[];
  body: string;
  mediaUrl: string;
};

const initialState: FormState = {
  name: '',
  description: '',
  whatsappId: '',
  queueId: '',
  rateLimitPerMinute: 60,
  scheduledForOption: 'now',
  scheduledFor: '',
  segmentIds: [],
  contactIds: [],
  body:
    'Olá {{nome}}, tudo bem?\n\nAqui é a equipe da WhatsKovi. Estamos entrando em contato para compartilhar nossa nova campanha.',
  mediaUrl: ''
};

const formatRecipientSummary = (count: number, label: string) =>
  `${count} ${count === 1 ? label : `${label}s`}`;

export default function CampaignFormModal({
  open,
  submitting,
  segments,
  contacts,
  queues,
  connections,
  onClose,
  onSubmit
}: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [contactSearch, setContactSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setStep(0);
      setForm(initialState);
      setContactSearch('');
    }
  }, [open]);

  const filteredContacts = useMemo(() => {
    if (!contactSearch) {
      return contacts;
    }
    const term = contactSearch.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(term) || contact.phoneNumber.toLowerCase().includes(term)
    );
  }, [contacts, contactSearch]);

  const isNextDisabled = useMemo(() => {
    if (step === 0) {
      return !form.name.trim() || !form.whatsappId;
    }
    if (step === 1) {
      return form.segmentIds.length === 0 && form.contactIds.length === 0;
    }
    return form.body.trim().length === 0;
  }, [step, form]);

  const handleToggleSegment = (segmentId: string) => {
    setForm((current) => {
      const exists = current.segmentIds.includes(segmentId);
      return {
        ...current,
        segmentIds: exists
          ? current.segmentIds.filter((id) => id !== segmentId)
          : [...current.segmentIds, segmentId]
      };
    });
  };

  const handleToggleContact = (contactId: string) => {
    setForm((current) => {
      const exists = current.contactIds.includes(contactId);
      return {
        ...current,
        contactIds: exists
          ? current.contactIds.filter((id) => id !== contactId)
          : [...current.contactIds, contactId]
      };
    });
  };

  const handleSubmit = async () => {
    const payload: CreateMessageCampaignRequest = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      body: form.body,
      mediaUrl: form.mediaUrl.trim() || undefined,
      whatsappId: form.whatsappId,
      queueId: form.queueId || undefined,
      contactIds: form.contactIds.length ? form.contactIds : undefined,
      segmentIds: form.segmentIds.length ? form.segmentIds : undefined,
      rateLimitPerMinute: form.rateLimitPerMinute,
      scheduledFor:
        form.scheduledForOption === 'schedule' && form.scheduledFor
          ? new Date(form.scheduledFor).toISOString()
          : undefined
    };

    await onSubmit(payload);
    setForm(initialState);
    setStep(0);
  };

  if (!open) {
    return null;
  }

  const selectedSegments = segments.filter((segment) => form.segmentIds.includes(segment.id));
  const selectedContacts = contacts.filter((contact) => form.contactIds.includes(contact.id));

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Nome da campanha</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Campanha de boas-vindas"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Descrição (opcional)</label>
            <textarea
              className="mt-1 h-20 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Notas internas sobre a campanha"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Conexão WhatsApp *</label>
            <select
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={form.whatsappId}
              onChange={(event) => setForm((current) => ({ ...current, whatsappId: event.target.value }))}
            >
              <option value="">Selecione uma conexão</option>
              {connections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name} {connection.phoneNumber ? `(${connection.phoneNumber})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Fila (opcional)</label>
            <select
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={form.queueId}
              onChange={(event) => setForm((current) => ({ ...current, queueId: event.target.value }))}
            >
              <option value="">Sem fila</option>
              {queues.map((queue) => (
                <option key={queue.id} value={queue.id}>
                  {queue.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Limite por minuto</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={form.rateLimitPerMinute}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  rateLimitPerMinute: Number(event.target.value) || 1
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Agendamento</label>
            <div className="mt-2 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="radio"
                  className="h-4 w-4 border-gray-300 text-primary focus:ring-primary/40"
                  checked={form.scheduledForOption === 'now'}
                  onChange={() => setForm((current) => ({ ...current, scheduledForOption: 'now' }))}
                />
                Enviar imediatamente
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="radio"
                  className="h-4 w-4 border-gray-300 text-primary focus:ring-primary/40"
                  checked={form.scheduledForOption === 'schedule'}
                  onChange={() => setForm((current) => ({ ...current, scheduledForOption: 'schedule' }))}
                />
                Programar data
              </label>
            </div>
            {form.scheduledForOption === 'schedule' && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <input
                  type="datetime-local"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={form.scheduledFor}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, scheduledFor: event.target.value }))
                  }
                />
              </div>
            )}
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Segmentos cadastrados</h3>
            <p className="text-xs text-gray-500">
              Combine segmentos e contatos específicos para personalizar o público da campanha.
            </p>
            <div className="mt-4 space-y-2">
              {segments.map((segment) => {
                const selected = form.segmentIds.includes(segment.id);
                return (
                  <button
                    key={segment.id}
                    type="button"
                    onClick={() => handleToggleSegment(segment.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      selected ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{segment.name}</span>
                      {segment.isFavorite && <span className="text-xs text-amber-500">Favorito</span>}
                    </div>
                    {segment.description && (
                      <p className="mt-1 text-xs text-gray-500">{segment.description}</p>
                    )}
                  </button>
                );
              })}
              {segments.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                  Nenhum segmento cadastrado ainda.
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Buscar contatos</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Nome ou telefone"
                value={contactSearch}
                onChange={(event) => setContactSearch(event.target.value)}
              />
            </div>
            <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200">
              <div className="max-h-64 overflow-y-auto px-3 py-2">
                {filteredContacts.map((contact) => {
                  const selected = form.contactIds.includes(contact.id);
                  return (
                    <label
                      key={contact.id}
                      className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm transition hover:bg-gray-50 ${
                        selected ? 'bg-primary/5 text-primary' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{contact.name}</span>
                        <span className="text-xs text-gray-500">{contact.phoneNumber}</span>
                      </div>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40"
                        checked={selected}
                        onChange={() => handleToggleContact(contact.id)}
                      />
                    </label>
                  );
                })}
                {filteredContacts.length === 0 && (
                  <p className="py-6 text-center text-sm text-gray-500">Nenhum contato encontrado.</p>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
              <p className="font-semibold text-gray-700">Resumo</p>
              <p>
                {formatRecipientSummary(selectedSegments.length, 'segmento')} selecionado(s) e{' '}
                {formatRecipientSummary(selectedContacts.length, 'contato')} manual(is).
              </p>
              <p className="mt-1 text-gray-500">
                Os destinatários serão calculados no envio considerando contatos bloqueados ou duplicados.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">Mensagem da campanha</label>
          <textarea
            className="mt-2 h-48 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={form.body}
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
          />
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase text-gray-500">URL de mídia (opcional)</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="https://"
              value={form.mediaUrl}
              onChange={(event) => setForm((current) => ({ ...current, mediaUrl: event.target.value }))}
            />
          </div>
        </div>
        <div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Preview da mensagem</h3>
            <p className="text-xs text-gray-500">
              Veja como o contato visualizará a mensagem. Utilize placeholders como {'{{nome}}'}.
            </p>
            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">Maria Silva</p>
              <p className="mt-2 whitespace-pre-wrap">{form.body}</p>
              {form.mediaUrl && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-600">
                  📎 Anexo configurado
                </p>
              )}
            </div>
            <div className="mt-4 space-y-1 text-xs text-gray-500">
              <p>
                <span className="font-medium text-gray-700">Destinatários:</span>{' '}
                {formatRecipientSummary(selectedSegments.length, 'segmento')} /{' '}
                {formatRecipientSummary(selectedContacts.length, 'contato')}
              </p>
              <p>
                <span className="font-medium text-gray-700">Envio:</span>{' '}
                {form.scheduledForOption === 'schedule' && form.scheduledFor
                  ? new Date(form.scheduledFor).toLocaleString('pt-BR')
                  : 'Imediato'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 py-10">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">Nova campanha</p>
            <h2 className="text-lg font-semibold text-gray-900">Dispare campanhas personalizadas via WhatsApp</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            {STEP_TITLES.map((title, index) => (
              <div key={title} className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    index === step
                      ? 'bg-primary text-white'
                      : index < step
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {getStepIcon(index)}
                </span>
                <span className={index === step ? 'text-gray-900' : 'text-gray-500'}>{title}</span>
                {index < STEP_TITLES.length - 1 && <span className="text-gray-300">/</span>}
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-gray-400">
            Etapa {step + 1} de {STEP_TITLES.length}
          </span>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">{renderStep()}</div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={() => (step === 0 ? onClose() : setStep((current) => Math.max(0, current - 1)))}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            {step === 0 ? (
              <>Cancelar</>
            ) : (
              <>
                <ArrowLeft className="h-4 w-4" /> Voltar
              </>
            )}
          </button>
          {step < STEP_TITLES.length - 1 ? (
            <button
              type="button"
              disabled={isNextDisabled}
              onClick={() => setStep((current) => Math.min(STEP_TITLES.length - 1, current + 1))}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Avançar
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isNextDisabled || submitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {submitting ? 'Criando...' : 'Criar campanha'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

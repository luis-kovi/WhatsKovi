import axios from 'axios';
import prisma from '../config/database';
import {
  ChatbotAiConfig,
  ChatbotAiMessage,
  ChatbotAiModel,
  ChatbotAiProvider,
  ChatbotAiRoutingRequest,
  ChatbotAiRoutingResult
} from '../types/chatbot';
import { ensureAdvancedSettingsRecord } from './settingsService';

type QueueRecord = {
  id: string;
  name: string;
  description: string | null;
  priority: number;
};

type RoutingDraft = {
  queue: { id: string; name: string } | null;
  channel: string | null;
  confidence: number;
  reasons: string[];
  tags: string[];
  summary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  followUp?: string | null;
  escalationRecommended?: boolean;
  model: string;
};

const MODEL_REGISTRY: Record<ChatbotAiProvider, ChatbotAiModel[]> = {
  OPENAI: [
    {
      name: 'gpt-4o-mini',
      provider: 'OPENAI',
      description: 'Modelo otimizado para atendimento em tempo real.'
    },
    {
      name: 'gpt-4o',
      provider: 'OPENAI',
      description: 'Modelo completo com maior capacidade.'
    },
    {
      name: 'gpt-3.5-turbo',
      provider: 'OPENAI',
      description: 'Modelo legado com baixo custo.'
    }
  ],
  GEMINI: [
    {
      name: 'gemini-1.5-flash',
      provider: 'GEMINI',
      description: 'Modelo responsivo, indicado para chatbots.'
    },
    {
      name: 'gemini-1.5-pro',
      provider: 'GEMINI',
      description: 'Modelo completo, maior contexto e qualidade.'
    },
    {
      name: 'gemini-pro',
      provider: 'GEMINI',
      description: 'Modelo estavel para uso geral.'
    }
  ],
  HYBRID: []
};

MODEL_REGISTRY.HYBRID = [...MODEL_REGISTRY.OPENAI, ...MODEL_REGISTRY.GEMINI];

const DEFAULT_MODEL_BY_PROVIDER: Record<ChatbotAiProvider, string> = {
  OPENAI: MODEL_REGISTRY.OPENAI[0].name,
  GEMINI: MODEL_REGISTRY.GEMINI[0].name,
  HYBRID: MODEL_REGISTRY.HYBRID[0]?.name ?? MODEL_REGISTRY.OPENAI[0].name
};

const NEGATIVE_KEYWORDS = [
  'cancel',
  'reclama',
  'problema',
  'erro',
  'pessimo',
  'horrivel',
  'nao funciona',
  'demora',
  'insatisfeit',
  'ruim'
];

const POSITIVE_KEYWORDS = ['obrigad', 'obrigado', 'perfeito', 'otimo', 'excelente', 'maravilhos', 'adorei'];

const CATEGORY_KEYWORDS: Record<
  string,
  {
    match: string[];
    hints: string[];
  }
> = {
  financeiro: {
    match: ['boleto', 'fatura', 'pagamento', 'cobranca', 'financeiro', 'nota', 'preco', 'valor', 'pix'],
    hints: ['finan', 'cobr', 'pag', 'bole', 'fatur', 'nota']
  },
  suporte_tecnico: {
    match: ['erro', 'bug', 'nao consigo', 'travando', 'lento', 'falha', 'ajuda', 'suporte', 'offline'],
    hints: ['suporte', 'tecn', 'infra', 'help', 'suprte']
  },
  atendimento: {
    match: ['atendimento', 'acompanhar', 'status', 'duvida', 'informacao', 'poderia ajudar'],
    hints: ['atendimento', 'cliente', 'geral', 'central', 'suporte']
  },
  reclamacao: {
    match: ['reclama', 'pessimo', 'nao gostei', 'vou cancelar', 'vou processar', 'parar de usar'],
    hints: ['ouvid', 'reclam', 'qualidade', 'correcao']
  },
  elogio: {
    match: ['parabens', 'gostei', 'excelente', 'perfeito', 'incrivel'],
    hints: ['elogio', 'sucesso', 'satisfacao']
  },
  geral: {
    match: [],
    hints: []
  }
};

const GEMINI_API_BASE_URL =
  process.env.GEMINI_API_BASE_URL?.replace(/\/$/, '') || 'https://generativelanguage.googleapis.com/v1beta';
const OPENAI_API_BASE_URL =
  process.env.OPENAI_API_BASE_URL?.replace(/\/$/, '') || 'https://api.openai.com/v1';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const toPromptTranscript = (messages: ChatbotAiMessage[]) =>
  messages
    .map((entry) => {
      const role =
        entry.role === 'BOT'
          ? 'Bot'
          : entry.role === 'SYSTEM'
            ? 'Sistema'
            : 'Cliente';
      return `[${role}] ${entry.content.trim()}`;
    })
    .join('\n');

const determineSentiment = (text: string): 'positive' | 'neutral' | 'negative' => {
  const normalized = normalize(text);
  const negativeHits = NEGATIVE_KEYWORDS.filter((word) => normalized.includes(word)).length;
  const positiveHits = POSITIVE_KEYWORDS.filter((word) => normalized.includes(word)).length;

  if (negativeHits > positiveHits) return 'negative';
  if (positiveHits > negativeHits) return 'positive';
  return 'neutral';
};

const detectCategory = (text: string) => {
  const normalized = normalize(text);
  let bestCategory = 'geral';
  let bestScore = 0;
  const matchedKeywords: string[] = [];

  for (const [category, config] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of config.match) {
      if (normalized.includes(keyword)) {
        score += 1;
        matchedKeywords.push(keyword);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  const confidence = Math.max(0.35, Math.min(0.5 + bestScore * 0.1, 0.85));

  return {
    category: bestCategory,
    score: bestScore,
    confidence,
    keywords: Array.from(new Set(matchedKeywords))
  };
};

const findQueueByHint = (category: string, queues: QueueRecord[]): { id: string; name: string } | null => {
  const hints = CATEGORY_KEYWORDS[category]?.hints ?? [];
  if (queues.length === 0) {
    return null;
  }

  const scored = queues
    .map((queue) => {
      const normalizedName = normalize(queue.name);
      const normalizedDescription = queue.description ? normalize(queue.description) : '';
      const score =
        hints.reduce((acc, hint) => {
          if (normalizedName.includes(hint) || normalizedDescription.includes(hint)) {
            return acc + 1;
          }
          return acc;
        }, 0) + queue.priority;
      return { queue, score };
    })
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.score && scored[0].score > 0) {
    return { id: scored[0].queue.id, name: scored[0].queue.name };
  }

  return null;
};

const summarizeTranscript = (transcript: ChatbotAiMessage[]): string | undefined => {
  const lastContact = [...transcript].reverse().find((message) => message.role === 'CONTACT');
  if (!lastContact?.content) {
    return undefined;
  }
  const trimmed = lastContact.content.trim().replace(/\s+/g, ' ');
  return trimmed.length > 200 ? `${trimmed.slice(0, 197)}...` : trimmed;
};

const ensureAvailableModels = (provider: ChatbotAiProvider): ChatbotAiModel[] => {
  if (provider === 'HYBRID') {
    return MODEL_REGISTRY.HYBRID;
  }
  return MODEL_REGISTRY[provider] ?? MODEL_REGISTRY.OPENAI;
};

const parseAiResponse = (raw: string) => {
  if (!raw) return null;
  let content = raw.trim();
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock) {
    content = codeBlock[1].trim();
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
};

const callOpenAiRouter = async (params: {
  apiKey: string;
  model: string;
  prompt: string;
  temperature: number;
  topP: number;
}) => {
  const response = await axios.post(
    `${OPENAI_API_BASE_URL}/chat/completions`,
    {
      model: params.model,
      temperature: params.temperature,
      top_p: params.topP,
      messages: [
        {
          role: 'system',
          content:
            'Você é um orquestrador de atendimento. Analise a conversa e retorne APENAS um JSON com a decisão de roteamento.'
        },
        {
          role: 'user',
          content: params.prompt
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  );

  const content: string | undefined = response.data?.choices?.[0]?.message?.content;
  return content ? parseAiResponse(content) : null;
};

const callGeminiRouter = async (params: {
  apiKey: string;
  model: string;
  prompt: string;
  temperature: number;
  topP: number;
}) => {
  const response = await axios.post(
    `${GEMINI_API_BASE_URL}/models/${params.model}:generateContent?key=${encodeURIComponent(params.apiKey)}`,
    {
      contents: [
        {
          role: 'user',
          parts: [{ text: params.prompt }]
        }
      ],
      generationConfig: {
        temperature: params.temperature,
        topP: params.topP,
        maxOutputTokens: 512
      }
    },
    {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  );

  const content: string | undefined =
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

  return content ? parseAiResponse(content) : null;
};

const buildPrompt = (
  transcript: ChatbotAiMessage[],
  queues: QueueRecord[],
  payload: ChatbotAiRoutingRequest
) => {
  const queueLines =
    queues.length === 0
      ? 'Nenhuma fila cadastrada.'
      : queues.map((queue) => `- ${queue.id}: ${queue.name}`).join('\n');

  const conversation = toPromptTranscript(transcript);
  const channel = payload.channel ?? 'WHATSAPP';

  return [
    'Analise a conversa e defina a melhor fila de atendimento.',
    'Responda APENAS com um JSON no formato:',
    '{',
    '  "queueId": string | null,',
    '  "queueName": string | null,',
    '  "channel": string | null,',
    '  "confidence": number entre 0 e 1,',
    '  "reasons": string[],',
    '  "tags": string[],',
    '  "summary": string,',
    '  "followUp": string | null,',
    '  "escalationRecommended": boolean',
    '}',
    '',
    'Filas disponíveis:',
    queueLines,
    '',
    `Transcrição (${channel}):`,
    conversation
  ].join('\n');
};

const buildHeuristicDecision = (
  transcript: ChatbotAiMessage[],
  queues: QueueRecord[],
  fallbackQueueId?: string | null
): RoutingDraft => {
  const summary = summarizeTranscript(transcript);
  const combined = transcript.map((item) => item.content).join(' ');
  const sentiment = determineSentiment(combined);
  const category = detectCategory(combined);
  const selectedQueue =
    findQueueByHint(category.category, queues) ??
    (fallbackQueueId ? queues.find((queue) => queue.id === fallbackQueueId) ?? null : null);

  const reasons = [`Classificação heurística: ${category.category.replace('_', ' ')}.`];
  if (selectedQueue) {
    reasons.push(`Fila selecionada pela heurística: ${selectedQueue.name}.`);
  } else {
    reasons.push('Nenhuma fila correspondente encontrada, mantendo atendimento humano.');
  }

  return {
    queue: selectedQueue ? { id: selectedQueue.id, name: selectedQueue.name } : null,
    channel: null,
    confidence: category.confidence,
    reasons,
    tags: Array.from(new Set([category.category, ...category.keywords])),
    summary,
    sentiment,
    followUp: selectedQueue ? null : 'Encaminhar para agente disponível para triagem manual.',
    escalationRecommended: sentiment === 'negative',
    model: 'heuristic'
  };
};

const mapDecisionToResult = (
  decision: RoutingDraft,
  threshold: number,
  fallbackQueue: QueueRecord | null
): ChatbotAiRoutingResult => {
  let queue = decision.queue;
  const reasons = [...decision.reasons];
  let confidence = Math.max(0, Math.min(1, decision.confidence));

  if (confidence < threshold && fallbackQueue) {
    reasons.push(
      `Confiança (${confidence.toFixed(2)}) abaixo do limite configurado (${threshold.toFixed(2)}). Aplicando fila de fallback.`
    );
    queue = { id: fallbackQueue.id, name: fallbackQueue.name };
    confidence = Math.max(confidence, threshold - 0.05);
  }

  return {
    queue,
    channel: decision.channel ?? null,
    confidence,
    reasons,
    tags: Array.from(new Set(decision.tags)),
    sentiment: decision.sentiment ?? 'neutral',
    summary: decision.summary,
    model: decision.model,
    createdAt: new Date().toISOString(),
    followUp: decision.followUp ?? null,
    escalationRecommended: decision.escalationRecommended ?? false
  };
};

export const getChatbotAiConfig = async (): Promise<ChatbotAiConfig> => {
  const settings = await ensureAdvancedSettingsRecord();
  const provider = (settings.aiProvider as ChatbotAiProvider) ?? 'OPENAI';
  const defaultModel = settings.aiModel ?? DEFAULT_MODEL_BY_PROVIDER[provider];

  return {
    provider,
    temperature: 0.3,
    topP: 0.9,
    defaultModel,
    availableModels: ensureAvailableModels(provider),
    fallbackQueueId: settings.aiFallbackQueueId ?? null,
    fallbackChannel: null,
    lastTrainedAt: settings.updatedAt ? settings.updatedAt.toISOString() : null,
    enabled: settings.aiEnabled,
    confidenceThreshold: settings.aiConfidenceThreshold ?? 0.6
  };
};

export const updateChatbotAiConfig = async (
  input: Partial<ChatbotAiConfig> & { fallbackQueueId?: string | null },
  userId?: string
): Promise<ChatbotAiConfig> => {
  const current = await ensureAdvancedSettingsRecord();
  const provider = input.provider ?? (current.aiProvider as ChatbotAiProvider) ?? 'OPENAI';
  const defaultModel = input.defaultModel ?? current.aiModel ?? DEFAULT_MODEL_BY_PROVIDER[provider];
  const confidence =
    typeof input.confidenceThreshold === 'number'
      ? Math.min(Math.max(input.confidenceThreshold, 0.05), 0.99)
      : current.aiConfidenceThreshold ?? 0.6;

  await prisma.advancedSettings.update({
    where: { id: current.id },
    data: {
      aiProvider: provider,
      aiModel: defaultModel,
      aiConfidenceThreshold: confidence,
      aiFallbackQueueId:
        input.fallbackQueueId === undefined
          ? current.aiFallbackQueueId
          : input.fallbackQueueId || null,
      aiEnabled: input.enabled ?? current.aiEnabled,
      aiRoutingEnabled: input.enabled ?? current.aiRoutingEnabled,
      updatedById: userId ?? null
    }
  });

  return getChatbotAiConfig();
};

export const evaluateChatbotAiRouting = async (
  payload: ChatbotAiRoutingRequest
): Promise<ChatbotAiRoutingResult> => {
  const transcript = Array.isArray(payload.transcript) ? payload.transcript : [];
  if (transcript.length === 0) {
    throw new Error('Transcript obrigatorio para avaliacao de IA.');
  }

  const [settings, queues] = await Promise.all([
    ensureAdvancedSettingsRecord(),
    prisma.queue.findMany({
      select: { id: true, name: true, description: true, priority: true },
      orderBy: { priority: 'desc' }
    })
  ]);

  const fallbackQueue =
    settings.aiFallbackQueueId && queues.length > 0
      ? queues.find((queue) => queue.id === settings.aiFallbackQueueId) ?? queues[0]
      : queues[0] ?? null;

  const threshold = settings.aiConfidenceThreshold ?? 0.6;
  const prompt = buildPrompt(transcript, queues, payload);

  const shouldUseOpenAi = settings.aiEnabled && !!settings.aiOpenAiApiKey && settings.aiProvider !== 'GEMINI';
  const shouldUseGemini = settings.aiEnabled && !!settings.aiGeminiApiKey && settings.aiProvider !== 'OPENAI';

  const temperature = 0.3;
  const topP = 0.9;

  const attemptDecisions: RoutingDraft[] = [];

  if (shouldUseOpenAi) {
    try {
      const model = settings.aiModel ?? DEFAULT_MODEL_BY_PROVIDER.OPENAI;
      const response = await callOpenAiRouter({
        apiKey: settings.aiOpenAiApiKey!,
        model,
        prompt,
        temperature,
        topP
      });

      if (response) {
        const queueId = typeof response.queueId === 'string' ? response.queueId : undefined;
        const queueName = typeof response.queueName === 'string' ? response.queueName : undefined;
        const mappedQueue =
          (queueId && queues.find((queue) => queue.id === queueId)) ||
          (queueName &&
            queues.find((queue) => normalize(queue.name) === normalize(queueName)));

        attemptDecisions.push({
          queue: mappedQueue ? { id: mappedQueue.id, name: mappedQueue.name } : null,
          channel:
            typeof response.channel === 'string'
              ? response.channel
              : payload.channel ?? null,
          confidence:
            typeof response.confidence === 'number'
              ? Math.max(0, Math.min(1, response.confidence))
              : 0.55,
          reasons: Array.isArray(response.reasons)
            ? response.reasons.filter((item: unknown) => typeof item === 'string')
            : ['Decisão gerada via OpenAI.'],
          tags: Array.isArray(response.tags)
            ? response.tags.filter((item: unknown) => typeof item === 'string')
            : [],
          summary: typeof response.summary === 'string' ? response.summary : summarizeTranscript(transcript),
          sentiment: typeof response.sentiment === 'string' ? response.sentiment : determineSentiment(prompt),
          followUp: typeof response.followUp === 'string' ? response.followUp : null,
          escalationRecommended: Boolean(response.escalationRecommended),
          model: `openai:${model}`
        });
      }
    } catch (error) {
      console.error('[ChatbotAI] Falha ao consultar OpenAI para roteamento:', error);
    }
  }

  if (shouldUseGemini && attemptDecisions.length === 0) {
    try {
      const model = settings.aiModel ?? DEFAULT_MODEL_BY_PROVIDER.GEMINI;
      const response = await callGeminiRouter({
        apiKey: settings.aiGeminiApiKey!,
        model,
        prompt,
        temperature,
        topP
      });

      if (response) {
        const queueId = typeof response.queueId === 'string' ? response.queueId : undefined;
        const queueName = typeof response.queueName === 'string' ? response.queueName : undefined;
        const mappedQueue =
          (queueId && queues.find((queue) => queue.id === queueId)) ||
          (queueName &&
            queues.find((queue) => normalize(queue.name) === normalize(queueName)));

        attemptDecisions.push({
          queue: mappedQueue ? { id: mappedQueue.id, name: mappedQueue.name } : null,
          channel:
            typeof response.channel === 'string'
              ? response.channel
              : payload.channel ?? null,
          confidence:
            typeof response.confidence === 'number'
              ? Math.max(0, Math.min(1, response.confidence))
              : 0.55,
          reasons: Array.isArray(response.reasons)
            ? response.reasons.filter((item: unknown) => typeof item === 'string')
            : ['Decisão gerada via Gemini.'],
          tags: Array.isArray(response.tags)
            ? response.tags.filter((item: unknown) => typeof item === 'string')
            : [],
          summary: typeof response.summary === 'string' ? response.summary : summarizeTranscript(transcript),
          sentiment: typeof response.sentiment === 'string' ? response.sentiment : determineSentiment(prompt),
          followUp: typeof response.followUp === 'string' ? response.followUp : null,
          escalationRecommended: Boolean(response.escalationRecommended),
          model: `gemini:${model}`
        });
      }
    } catch (error) {
      console.error('[ChatbotAI] Falha ao consultar Gemini para roteamento:', error);
    }
  }

  const decision =
    attemptDecisions[0] ??
    buildHeuristicDecision(transcript, queues, settings.aiFallbackQueueId ?? fallbackQueue?.id);

  if (decision.tags.length === 0) {
    const heuristic = detectCategory(transcript.map((item) => item.content).join(' '));
    decision.tags.push(heuristic.category);
  }

  return mapDecisionToResult(decision, threshold, fallbackQueue);
};

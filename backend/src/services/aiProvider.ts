import axios from 'axios';
import { SentimentLabel } from '@prisma/client';
import {
  AiChatbotReply,
  AnalyzeMessageResult,
  ClassificationResult,
  DemandForecastPayload,
  DemandForecastSlice,
  ResponseSuggestion,
  SentimentAnalysis
} from '../types/ai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const OPENAI_BASE_URL = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const MAX_HISTORY_MESSAGES = Number(process.env.AI_HISTORY_LIMIT || 12);
const MAX_SUGGESTIONS = Number(process.env.AI_SUGGESTION_LIMIT || 3);

type OpenAiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const POSITIVE_WORDS = [
  'obrigado',
  'obrigada',
  'perfeito',
  'ótimo',
  'excelente',
  'funcionou',
  'resolveu',
  'agradeço',
  'obrigada',
  'bom',
  'melhor',
  'satisfeito',
  'feliz',
  'incrível'
];

const NEGATIVE_WORDS = [
  'problema',
  'erro',
  'bug',
  'não funciona',
  'ruim',
  'péssimo',
  'horrível',
  'triste',
  'cancelar',
  'insatisfeito',
  'demora',
  'reclamação',
  'insatisfeito'
];

type KeywordCategory = {
  category: string;
  keywords: string[];
  rationale: string;
};

const CLASSIFICATION_KEYWORDS: KeywordCategory[] = [
  {
    category: 'financeiro',
    rationale: 'Palavras relacionadas a cobranças, pagamentos ou valores.',
    keywords: [
      'boleto',
      'cobrança',
      'fatura',
      'pagamento',
      'valor',
      'plano',
      'preço',
      'preco',
      'pix',
      'nota',
      'nf',
      'financeiro'
    ]
  },
  {
    category: 'suporte_tecnico',
    rationale: 'Solicitação de ajuda técnica ou report de erro.',
    keywords: [
      'erro',
      'bug',
      'travando',
      'inacessível',
      'não consigo',
      'nao consigo',
      'suporte',
      'ajuda',
      'problema',
      'falha',
      'lento'
    ]
  },
  {
    category: 'atendimento',
    rationale: 'Pedidos gerais de atendimento, dúvidas e status.',
    keywords: [
      'acompanhar',
      'andamento',
      'status',
      'atendimento',
      'poderia ajudar',
      'duvida',
      'dúvida',
      'informação'
    ]
  },
  {
    category: 'elogio',
    rationale: 'Palavras positivas indicando elogios ou agradecimentos.',
    keywords: ['agrade', 'parabéns', 'obrigad', 'ótimo', 'excelente', 'gostei', 'incrível']
  },
  {
    category: 'reclamacao',
    rationale: 'Reclamações diretas sobre serviço ou produto.',
    keywords: [
      'reclamação',
      'reclamacao',
      'péssimo',
      'pessimo',
      'horrível',
      'horrivel',
      'cancelar',
      'cancelamento',
      'vou processar',
      'não gostei',
      'nao gostei'
    ]
  }
];

const FRIENDLY_TEMPLATES = [
  'Olá {{nome}}, obrigado pela mensagem! {{conteudo}} Conte comigo para ajudar com o que for preciso.',
  '{{saudacao}} {{nome}}, compreendo sua solicitação. {{conteudo}} Vou acompanhar pessoalmente até resolvermos.',
  '{{saudacao}}! Agradeço por compartilhar. {{conteudo}} Fico à disposição para qualquer outra dúvida.'
];

const FORMAL_TEMPLATES = [
  'Prezado(a) {{nome}}, obrigado pelo contato. {{conteudo}} Permanecemos à disposição.',
  'Olá {{nome}}, recebemos sua solicitação. {{conteudo}} Manteremos você informado sobre os próximos passos.',
  '{{saudacao}} {{nome}}, estamos tratando do seu pedido. {{conteudo}} Caso necessite de algo adicional, é só avisar.'
];

const OBJECTIVE_TEMPLATES = [
  '{{saudacao}}, {{nome}}. {{conteudo}} Assim que tivermos novidades, retorno por aqui.',
  'Entendido, {{nome}}. {{conteudo}} Vamos avançar e lhe aviso na sequência.',
  '{{saudacao}}! {{conteudo}} Qualquer atualização, eu lhe informo imediatamente.'
];

const SUGGESTION_TEMPLATES: Record<
  string,
  { tone: ResponseSuggestion['tone']; build: (params: SuggestionContext) => ResponseSuggestion }
> = {
  financeiro: {
    tone: 'formal',
    build: ({ nome, resumo }) => ({
      tone: 'formal',
      text: `Olá ${nome ?? 'tudo bem'}! Entendi a necessidade sobre valores. ${resumo} Vou encaminhar seu pedido ao setor financeiro e retorno com a confirmação em seguida.`,
      confidence: 0.68,
      reason: 'Identificada solicitação com termos financeiros.',
      source: 'heuristic'
    })
  },
  suporte_tecnico: {
    tone: 'objective',
    build: ({ resumo }) => ({
      tone: 'objective',
      text: `Obrigado por avisar. ${resumo} Já iniciei a verificação técnica e retorno com uma solução ou passo a passo em breve.`,
      confidence: 0.7,
      reason: 'Mensagem contém palavras-chave de suporte técnico.',
      source: 'heuristic'
    })
  },
  atendimento: {
    tone: 'friendly',
    build: ({ nome, resumo }) => ({
      tone: 'friendly',
      text: `Olá ${nome ?? 'por aqui'}! ${resumo} Vou acompanhar seu atendimento de perto e lhe passo uma atualização ainda hoje.`,
      confidence: 0.62,
      reason: 'Pedido de acompanhamento ou atualização identificado.',
      source: 'heuristic'
    })
  },
  elogio: {
    tone: 'friendly',
    build: ({ nome }) => ({
      tone: 'friendly',
      text: `Muito obrigado pelo carinho, ${nome ?? 'fico muito feliz'}! Se eu puder ajudar com mais alguma coisa, é só me avisar.`,
      confidence: 0.55,
      reason: 'Elogio identificado.',
      source: 'heuristic'
    })
  },
  reclamacao: {
    tone: 'formal',
    build: ({ resumo }) => ({
      tone: 'formal',
      text: `Sinto muito pela experiência descrita. ${resumo} Vou priorizar sua demanda para resolvermos da melhor forma possível.`,
      confidence: 0.66,
      reason: 'Reclamação detectada na última mensagem.',
      source: 'heuristic'
    })
  }
};

type SuggestionContext = {
  nome?: string | null;
  resumo: string;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

const buildKeywordSet = (text: string) =>
  Array.from(
    new Set(
      text
        .split(/[^a-zA-ZÀ-ÿ0-9]+/)
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word.length > 3)
    )
  ).slice(0, 12);

const computeHeuristicSentiment = (text: string): SentimentAnalysis => {
  const normalized = normalize(text);
  let score = 0;

  for (const word of POSITIVE_WORDS) {
    if (normalized.includes(word)) score += 1;
  }

  for (const word of NEGATIVE_WORDS) {
    if (normalized.includes(word)) score -= 1;
  }

  // consider exclamation marks, question marks etc.
  score += Math.min(2, (text.match(/!+/g)?.length ?? 0) * 0.25);
  score -= Math.min(2, (text.match(/\?{2,}/g)?.length ?? 0) * 0.25);

  const label: SentimentLabel =
    score > 0.5 ? 'POSITIVE' : score < -0.5 ? 'NEGATIVE' : 'NEUTRAL';

  const confidence = Math.min(0.99, Math.abs(score) / 5 + 0.35);

  return {
    label,
    score: Number(Math.max(-1, Math.min(1, score / 5)).toFixed(2)),
    keywords: buildKeywordSet(text),
    metadata: {
      engine: 'heuristic',
      matches: {
        positive: POSITIVE_WORDS.filter((word) => normalized.includes(word)),
        negative: NEGATIVE_WORDS.filter((word) => normalized.includes(word))
      }
    }
  };
};

const tryParseJson = (input: string | null | undefined) => {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // try to find JSON substring
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
    return null;
  }
};

const callOpenAi = async (
  messages: OpenAiMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string | null> => {
  if (!OPENAI_API_KEY) {
    return null;
  }

  try {
    const response = await axios.post(
      `${OPENAI_BASE_URL.replace(/\/$/, '')}/chat/completions`,
      {
        model: OPENAI_MODEL,
        messages,
        temperature: options?.temperature ?? 0.4,
        max_tokens: options?.maxTokens ?? 400
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15_000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content.trim() : null;
  } catch (error) {
    console.warn('[AI] Falha ao chamar OpenAI:', error instanceof Error ? error.message : error);
    return null;
  }
};

type ConversationMessage = {
  author: 'contact' | 'agent' | 'system';
  body: string;
  createdAt: Date;
};

type ConversationContext = {
  contactName?: string | null;
  queue?: string | null;
  history: ConversationMessage[];
};

const buildConversationSummary = (history: ConversationMessage[]) => {
  const messages = history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((msg) => `[${msg.author}] ${msg.body.trim()}`)
    .join('\n');
  return messages;
};

const heuristicSuggestion = (category: string, nome?: string | null): ResponseSuggestion | null => {
  const template = SUGGESTION_TEMPLATES[category];
  if (!template) {
    return null;
  }

  const resumo = (() => {
    if (category === 'financeiro') {
      return 'Vou conferir as informações do seu plano e retornar com os valores atualizados.';
    }
    if (category === 'suporte_tecnico') {
      return 'Entendi o problema técnico e já estou validando aqui.';
    }
    if (category === 'elogio') {
      return 'Ficamos muito felizes em saber que teve uma boa experiência.';
    }
    if (category === 'reclamacao') {
      return 'Quero que saiba que levamos esse tipo de feedback muito a sério.';
    }
    return 'Recebi sua mensagem e vou prosseguir com os próximos passos.';
  })();

  return template.build({ nome, resumo });
};

const scoreCategory = (text: string): ClassificationResult => {
  const normalized = normalize(text);

  let bestMatch: { score: number; entry: KeywordCategory } | null = null;

  for (const entry of CLASSIFICATION_KEYWORDS) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (normalized.includes(keyword)) {
        score += 1;
      }
    }
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { score, entry };
    }
  }

  if (!bestMatch) {
    return {
      category: 'geral',
      confidence: 0.45,
      rationale: 'Nenhuma categoria com alta confiança, mantendo classificação geral.',
      keywords: []
    };
  }

  return {
    category: bestMatch.entry.category,
    confidence: Math.min(0.95, 0.5 + bestMatch.score * 0.1),
    rationale: bestMatch.entry.rationale,
    keywords: bestMatch.entry.keywords.filter((keyword) => normalized.includes(keyword))
  };
};

const buildTemplateSuggestion = (
  tone: 'friendly' | 'formal' | 'objective',
  nome: string | null | undefined,
  conteudo: string
): ResponseSuggestion => {
  const saudacao = 'Olá';
  const templateSet =
    tone === 'formal' ? FORMAL_TEMPLATES : tone === 'objective' ? OBJECTIVE_TEMPLATES : FRIENDLY_TEMPLATES;
  const template = templateSet[Math.floor(Math.random() * templateSet.length)];

  const text = template
    .replace('{{nome}}', nome ? nome.split(' ')[0] : '')
    .replace('{{conteudo}}', conteudo)
    .replace('{{saudacao}}', saudacao)
    .replace(/\s+/g, ' ')
    .trim();

  return {
    text,
    tone,
    confidence: 0.58,
    reason: 'Sugestão gerada por template padrão.',
    source: 'template'
  };
};

export const analyzeSentiment = async (text: string): Promise<SentimentAnalysis> => {
  const fallback = computeHeuristicSentiment(text);
  const summaryPrompt =
    'Resuma a mensagem do cliente em até 18 palavras, sem repetir o que foi dito literalmente.';

  const summary = (() => {
    if (text.length < 20) {
      return text.trim();
    }
    const segments = text.trim().split(/[.!?]/).filter((segment) => segment.trim().length > 0);
    if (segments.length === 0) {
      return text.trim();
    }
    const firstTwo = segments.slice(0, 2).join('. ');
    return firstTwo.trim();
  })();

  if (!OPENAI_API_KEY) {
    return {
      ...fallback,
      summary
    };
  }

  const prompt: OpenAiMessage[] = [
    {
      role: 'system',
      content:
        'Você é um analista de sentimentos. Retorne um JSON com as chaves label ("POSITIVE", "NEUTRAL" ou "NEGATIVE"), score (-1 a 1), summary (em português) e keywords (array).'
    },
    {
      role: 'user',
      content: `Mensagem: """${text}"""`
    }
  ];

  const response = await callOpenAi(prompt, { temperature: 0 });
  const parsed = tryParseJson(response);

  if (
    parsed &&
    typeof parsed.label === 'string' &&
    ['POSITIVE', 'NEGATIVE', 'NEUTRAL'].includes(parsed.label.toUpperCase())
  ) {
    const label = parsed.label.toUpperCase() as SentimentLabel;
    const score = typeof parsed.score === 'number' ? parsed.score : fallback.score;
    const keywords =
      Array.isArray(parsed.keywords) && parsed.keywords.every((kw: unknown) => typeof kw === 'string')
        ? (parsed.keywords as string[]).slice(0, 12)
        : fallback.keywords;
    return {
      label,
      score: Number(Math.max(-1, Math.min(1, score)).toFixed(2)),
      keywords,
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : summary,
      metadata: {
        engine: 'openai',
        promptVersion: '1'
      }
    };
  }

  return {
    ...fallback,
    summary
  };
};

export const classifyConversation = async (
  text: string,
  context?: ConversationContext
): Promise<ClassificationResult> => {
  const fallback = scoreCategory(text);

  if (!OPENAI_API_KEY) {
    return fallback;
  }

  const history = context ? buildConversationSummary(context.history) : '';
  const prompt: OpenAiMessage[] = [
    {
      role: 'system',
      content:
        'Você é um assistente que classifica atendimentos. Retorne JSON com { "category": string, "confidence": number (0-1), "rationale": string, "keywords": string[] }. Categorias válidas: financeiro, suporte_tecnico, atendimento, elogio, reclamacao, geral.'
    },
    {
      role: 'user',
      content: `Histórico (mais recente no final):\n${history}\n---\nMensagem atual:\n${text}\n`
    }
  ];

  const response = await callOpenAi(prompt, { temperature: 0.2 });
  const parsed = tryParseJson(response);

  if (
    parsed &&
    typeof parsed.category === 'string' &&
    typeof parsed.confidence === 'number' &&
    Array.isArray(parsed.keywords)
  ) {
    const category =
      ['financeiro', 'suporte_tecnico', 'atendimento', 'elogio', 'reclamacao', 'geral'].includes(
        parsed.category
      )
        ? parsed.category
        : fallback.category;
    return {
      category,
      confidence: Number(Math.max(0, Math.min(1, parsed.confidence)).toFixed(2)),
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale : fallback.rationale,
      keywords: parsed.keywords.filter((kw: unknown) => typeof kw === 'string').slice(0, 12)
    };
  }

  return fallback;
};

export const buildSuggestions = async (
  text: string,
  options: { nome?: string | null; context?: ConversationContext }
): Promise<ResponseSuggestion[]> => {
  const results: ResponseSuggestion[] = [];
  const fallbackCategory = scoreCategory(text);
  const heuristic = heuristicSuggestion(fallbackCategory.category, options.nome);
  if (heuristic) {
    results.push(heuristic);
  } else {
    results.push(
      buildTemplateSuggestion(
        'friendly',
        options.nome,
        'Recebi sua mensagem e já estou cuidando disso por aqui.'
      )
    );
  }

  if (!OPENAI_API_KEY) {
    return results.slice(0, MAX_SUGGESTIONS);
  }

  const historySnippet = options.context ? buildConversationSummary(options.context.history) : '';

  const prompt: OpenAiMessage[] = [
    {
      role: 'system',
      content:
        'Você gera sugestões de resposta para atendentes. Retorne um JSON com até 3 itens no formato { "text": string, "tone": "friendly"|"formal"|"objective", "confidence": number (0-1), "reason": string }.'
    },
    {
      role: 'user',
      content: `Histórico (mais recente no final):\n${historySnippet}\n---\nMensagem atual do cliente:\n${text}`
    }
  ];

  const response = await callOpenAi(prompt, { temperature: 0.7, maxTokens: 600 });
  const parsed = tryParseJson(response);

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (typeof item?.text === 'string') {
        results.push({
          text: item.text.trim(),
          tone:
            item.tone === 'formal' || item.tone === 'objective'
              ? item.tone
              : ('friendly' as ResponseSuggestion['tone']),
          confidence:
            typeof item.confidence === 'number'
              ? Number(Math.max(0.35, Math.min(0.99, item.confidence)).toFixed(2))
              : 0.74,
          reason: typeof item.reason === 'string' ? item.reason : 'Sugestão gerada por IA (OpenAI).',
          source: 'openai'
        });
      }
    }
  } else if (parsed && typeof parsed === 'object') {
    const maybeArray = (parsed as { suggestions?: unknown }).suggestions;
    if (Array.isArray(maybeArray)) {
      for (const item of maybeArray) {
        if (typeof item?.text === 'string') {
          results.push({
            text: item.text.trim(),
            tone:
              item.tone === 'formal' || item.tone === 'objective'
                ? item.tone
                : ('friendly' as ResponseSuggestion['tone']),
            confidence:
              typeof item.confidence === 'number'
                ? Number(Math.max(0.35, Math.min(0.99, item.confidence)).toFixed(2))
                : 0.74,
            reason: typeof item.reason === 'string' ? item.reason : 'Sugestão gerada por IA (OpenAI).',
            source: 'openai'
          });
        }
      }
    }
  }

  const unique = results
    .filter((item) => item.text.length > 0)
    .filter(
      (item, index, arr) =>
        arr.findIndex((candidate) => candidate.text.toLowerCase() === item.text.toLowerCase()) === index
    );

  return unique.slice(0, MAX_SUGGESTIONS);
};

export const generateChatbotReply = async (
  text: string,
  context: ConversationContext
): Promise<AiChatbotReply | null> => {
  const baselineContent =
    text.length > 140 ? `${text.slice(0, 140)}...` : text.trim().replace(/\s+/g, ' ');

  const fallback: AiChatbotReply = {
    message: `Olá ${context.contactName ?? ''}! Recebemos sua mensagem "${baselineContent}" e nossa equipe já está cuidando disso. Assim que tiver novidades, retorno por aqui.`,
    confidence: 0.48,
    tone: 'friendly',
    shouldReply: false,
    reason: 'Resposta automática padrão (modo assistente).'
  };

  if (!OPENAI_API_KEY) {
    return fallback;
  }

  const historySnippet = buildConversationSummary(context.history);
  const prompt: OpenAiMessage[] = [
    {
      role: 'system',
      content:
        'Você é um agente virtual que ajuda equipes de atendimento. Crie uma sugestão de resposta cordial e profissional em português brasileiro. Retorne JSON com { "message": string, "tone": "friendly"|"formal"|"objective", "confidence": number (0-1), "shouldReply": boolean, "reason": string }. Não repita respostas anteriores literalmente.'
    },
    {
      role: 'user',
      content: `Histórico:\n${historySnippet}\n---\nÚltima mensagem do cliente:\n${text}`
    }
  ];

  const response = await callOpenAi(prompt, { temperature: 0.6, maxTokens: 400 });
  const parsed = tryParseJson(response);

  if (
    parsed &&
    typeof parsed.message === 'string' &&
    parsed.message.trim().length > 0 &&
    typeof parsed.shouldReply === 'boolean'
  ) {
    return {
      message: parsed.message.trim(),
      tone:
        parsed.tone === 'formal' || parsed.tone === 'objective'
          ? parsed.tone
          : ('friendly' as AiChatbotReply['tone']),
      confidence:
        typeof parsed.confidence === 'number'
          ? Number(Math.max(0.35, Math.min(0.99, parsed.confidence)).toFixed(2))
          : 0.62,
      shouldReply: Boolean(parsed.shouldReply),
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'Sugestão gerada via OpenAI.'
    };
  }

  return fallback;
};

export const deriveDemandForecast = (
  history: Array<{ date: Date; count: number }>,
  horizonDays: number
): DemandForecastPayload => {
  const sortedHistory = [...history].sort((a, b) => a.date.getTime() - b.date.getTime());
  const weekdayStats: Record<
    number,
    { total: number; count: number; values: number[] }
  > = Object.create(null);

  let total = 0;
  for (const entry of sortedHistory) {
    total += entry.count;
    const weekday = entry.date.getDay();
    if (!weekdayStats[weekday]) {
      weekdayStats[weekday] = { total: 0, count: 0, values: [] };
    }
    weekdayStats[weekday].total += entry.count;
    weekdayStats[weekday].count += 1;
    weekdayStats[weekday].values.push(entry.count);
  }

  const baseline = sortedHistory.length > 0 ? total / sortedHistory.length : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const slices: DemandForecastSlice[] = [];
  let sum = 0;

  for (let i = 0; i < horizonDays; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + i + 1); // previsão começa a partir de amanhã
    const weekday = date.getDay();

    const stats = weekdayStats[weekday];
    const mean = stats && stats.count > 0 ? stats.total / stats.count : baseline;
    const values = stats ? stats.values : [];
    const variance =
      values.length > 1
        ? values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / (values.length - 1)
        : baseline / 3;
    const deviation = Math.sqrt(Math.max(0, variance));

    const trendWindow = sortedHistory.slice(-7);
    const recentAverage =
      trendWindow.length > 0 ? trendWindow.reduce((acc, entry) => acc + entry.count, 0) / trendWindow.length : mean;
    const trendFactor = recentAverage > 0 ? recentAverage / (baseline || 1) : 1;

    const expected = Math.max(0, Math.round(mean * trendFactor));
    const lowerBound = Math.max(0, Math.round(expected - deviation));
    const upperBound = Math.round(expected + deviation);

    sum += expected;

    slices.push({
      date: date.toISOString(),
      expected,
      lowerBound,
      upperBound
    });
  }

  return {
    horizonDays,
    totalExpected: sum,
    generatedAt: new Date().toISOString(),
    slices,
    baseline: Number(baseline.toFixed(2))
  };
};

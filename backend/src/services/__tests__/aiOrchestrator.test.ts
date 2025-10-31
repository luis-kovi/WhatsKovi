import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SentimentLabel } from '@prisma/client';
import type { AiChatbotReply, ResponseSuggestion } from '../../types/ai';

const prismaMock = {
  message: {
    findUnique: vi.fn(),
    findMany: vi.fn()
  },
  messageInsight: {
    upsert: vi.fn()
  },
  messageSuggestion: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn()
  },
  ticketClassification: {
    upsert: vi.fn()
  },
  ticket: {
    findUnique: vi.fn(),
    findMany: vi.fn()
  },
  demandForecast: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn()
  }
};

const emitMock = vi.fn();

const analyzeSentimentMock = vi.fn();
const buildSuggestionsMock = vi.fn();
const classifyConversationMock = vi.fn();
const deriveDemandForecastMock = vi.fn();
const generateChatbotReplyMock = vi.fn();

vi.mock('../../config/database', () => ({
  __esModule: true,
  default: prismaMock
}));

vi.mock('../../server', () => ({
  io: {
    emit: emitMock
  }
}));

vi.mock('../aiProvider', () => ({
  analyzeSentiment: analyzeSentimentMock,
  buildSuggestions: buildSuggestionsMock,
  classifyConversation: classifyConversationMock,
  deriveDemandForecast: deriveDemandForecastMock,
  generateChatbotReply: generateChatbotReplyMock
}));

let processMessageWithAi: typeof import('../aiOrchestrator')['processMessageWithAi'];

const importModule = async () => {
  const module = await import('../aiOrchestrator');
  processMessageWithAi = module.processMessageWithAi;
};

describe('processMessageWithAi', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.AI_CHATBOT_MODE = 'assist';
    process.env.AI_SENTIMENT_ENABLED = 'true';
    process.env.AI_SUGGESTIONS_ENABLED = 'true';
    process.env.AI_CLASSIFICATION_ENABLED = 'true';
    process.env.AI_DEBUG_LOGS = 'false';

    await importModule();
  });

  it('gera insights, sugestoes e sugestao de resposta para mensagens de clientes', async () => {
    const ticketId = 'ticket-1';
    const messageId = 'message-1';
    const now = new Date();

    const contactMessageBody = 'Ola, tive um problema com o pagamento do boleto.';

    prismaMock.message.findUnique.mockResolvedValue({
      id: messageId,
      body: contactMessageBody,
      isPrivate: false,
      ticket: {
        id: ticketId,
        contact: { name: 'Maria Silva', phoneNumber: '551199999999' },
        queue: { name: 'Financeiro' },
        whatsapp: { id: 'whatsapp-1' }
      },
      user: null
    });
    prismaMock.message.findMany.mockResolvedValue([
      {
        id: 'old-1',
        body: 'Bom dia! Estou com duvida.',
        createdAt: new Date(now.getTime() - 1000 * 60),
        userId: null,
        isPrivate: false
      },
      {
        id: 'old-2',
        body: 'Posso ajudar, poderia detalhar o problema?',
        createdAt: new Date(now.getTime() - 500),
        userId: 'agent-1',
        isPrivate: false
      }
    ]);

    const sentimentResult = {
      label: 'NEGATIVE' as SentimentLabel,
      score: -0.5,
      keywords: ['problema', 'pagamento'],
      summary: 'Cliente com dificuldade de pagamento',
      metadata: { engine: 'heuristic' }
    };
    analyzeSentimentMock.mockResolvedValue(sentimentResult);

    const suggestions: ResponseSuggestion[] = [
      {
        text: 'Verifiquei seu boleto e ja estou ajustando o pagamento para voce.',
        tone: 'friendly',
        confidence: 0.8,
        reason: 'Palavras-chave financeiras',
        source: 'heuristic'
      },
      {
        text: 'Podemos gerar um novo boleto com data atualizada, posso seguir?',
        tone: 'formal',
        confidence: 0.76,
        reason: 'Solicitacao financeira',
        source: 'openai'
      }
    ];
    buildSuggestionsMock.mockResolvedValue(suggestions);

    classifyConversationMock.mockResolvedValue({
      category: 'financeiro',
      confidence: 0.9,
      rationale: 'Cliente cita boleto/pagamento',
      keywords: ['boleto', 'pagamento']
    });

    const chatbotReply: AiChatbotReply = {
      message: 'Identifiquei o problema no boleto e ja estou cuidando disso. Retorno em instantes!',
      confidence: 0.7,
      tone: 'friendly',
      shouldReply: true,
      reason: 'Assistente financeiro'
    };
    generateChatbotReplyMock.mockResolvedValue(chatbotReply);

    prismaMock.messageInsight.upsert.mockResolvedValue(undefined);
    prismaMock.messageSuggestion.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.messageSuggestion.createMany.mockResolvedValue({ count: suggestions.length });
    prismaMock.ticketClassification.upsert.mockResolvedValue(undefined);

    const result = await processMessageWithAi({
      ticketId,
      messageId,
      actor: 'contact'
    });

    expect(result.autoReply).toEqual(chatbotReply);

    expect(prismaMock.messageInsight.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { messageId }
      })
    );

    expect(prismaMock.ticketClassification.upsert).toHaveBeenCalledWith({
      where: { ticketId },
      create: expect.objectContaining({
        category: 'financeiro'
      }),
      update: expect.objectContaining({
        category: 'financeiro'
      })
    });

    expect(prismaMock.messageSuggestion.createMany).toHaveBeenCalledWith({
      data: suggestions.map((suggestion) => ({
        messageId,
        ticketId,
        suggestion: suggestion.text,
        confidence: suggestion.confidence,
        source: suggestion.source ?? suggestion.tone
      }))
    });

    expect(emitMock).toHaveBeenCalledWith('ai:suggestions', expect.any(Object));

    expect(emitMock).toHaveBeenCalledWith(
      'ai:insights',
      expect.objectContaining({
        ticketId,
        sentiment: sentimentResult.label,
        classification: expect.objectContaining({ category: 'financeiro' })
      })
    );
  });

  it('ignora mensagens privadas quando skipPrivate esta habilitado', async () => {
    prismaMock.message.findUnique.mockResolvedValue({
      id: 'message-private',
      body: 'Nota interna.',
      isPrivate: true,
      ticket: {
        id: 'ticket-2',
        contact: { name: 'Teste', phoneNumber: '000' },
        queue: null,
        whatsapp: null
      },
      user: { id: 'agent', name: 'Agente' }
    });

    const response = await processMessageWithAi({
      ticketId: 'ticket-2',
      messageId: 'message-private',
      actor: 'agent',
      skipPrivate: true
    });

    expect(response).toEqual({});
    expect(prismaMock.messageInsight.upsert).not.toHaveBeenCalled();
    expect(prismaMock.messageSuggestion.createMany).not.toHaveBeenCalled();
    expect(emitMock).not.toHaveBeenCalled();
  });
});

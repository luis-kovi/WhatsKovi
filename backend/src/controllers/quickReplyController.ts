import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

type VariableDefinition = {
  key: string;
  label: string;
  description: string;
  example?: string;
  scope: 'contact' | 'agent' | 'queue' | 'ticket' | 'system';
};

const VARIABLE_DEFINITIONS: VariableDefinition[] = [
  {
    key: 'contact.name',
    label: 'Nome do contato',
    description: 'Nome completo do cliente vinculado ao ticket',
    example: 'Maria da Silva',
    scope: 'contact'
  },
  {
    key: 'contact.firstName',
    label: 'Primeiro nome do contato',
    description: 'Primeiro nome do cliente vinculado ao ticket',
    example: 'Maria',
    scope: 'contact'
  },
  {
    key: 'contact.phone',
    label: 'Telefone do contato',
    description: 'Numero de telefone do cliente',
    example: '(11) 98888-0000',
    scope: 'contact'
  },
  {
    key: 'contact.email',
    label: 'Email do contato',
    description: 'Email cadastrado do cliente',
    example: 'cliente@empresa.com',
    scope: 'contact'
  },
  {
    key: 'contact.notes',
    label: 'Anotacoes do contato',
    description: 'Notas internas armazenadas para o cliente',
    scope: 'contact'
  },
  {
    key: 'agent.name',
    label: 'Nome do agente',
    description: 'Nome completo do atendente autenticado',
    example: 'Joao Pereira',
    scope: 'agent'
  },
  {
    key: 'agent.firstName',
    label: 'Primeiro nome do agente',
    description: 'Primeiro nome do atendente autenticado',
    example: 'Joao',
    scope: 'agent'
  },
  {
    key: 'agent.email',
    label: 'Email do agente',
    description: 'Email do atendente autenticado',
    example: 'agente@whatskovi.com',
    scope: 'agent'
  },
  {
    key: 'queue.name',
    label: 'Nome da fila',
    description: 'Nome da fila atribuida ao ticket',
    example: 'Suporte N1',
    scope: 'queue'
  },
  {
    key: 'queue.greeting',
    label: 'Saudacao da fila',
    description: 'Mensagem de saudacao configurada para a fila',
    scope: 'queue'
  },
  {
    key: 'queue.description',
    label: 'Descricao da fila',
    description: 'Descricao breve da fila',
    scope: 'queue'
  },
  {
    key: 'ticket.id',
    label: 'ID do ticket',
    description: 'Identificador unico do atendimento',
    example: 'c5f4e34b-1a2b-4c5d-9e7f-1234567890ab',
    scope: 'ticket'
  },
  {
    key: 'ticket.status',
    label: 'Status do ticket',
    description: 'Status atual do atendimento',
    example: 'OPEN',
    scope: 'ticket'
  },
  {
    key: 'ticket.priority',
    label: 'Prioridade do ticket',
    description: 'Nivel de prioridade atual do atendimento',
    example: 'MEDIUM',
    scope: 'ticket'
  },
  {
    key: 'ticket.carPlate',
    label: 'Placa cadastrada',
    description: 'Placa do veiculo vinculada ao ticket (quando aplicavel)',
    scope: 'ticket'
  },
  {
    key: 'system.date',
    label: 'Data atual',
    description: 'Data corrente formatada em dd/MM/yyyy',
    example: '18/10/2025',
    scope: 'system'
  },
  {
    key: 'system.time',
    label: 'Hora atual',
    description: 'Hora corrente formatada em HH:mm',
    example: '14:30',
    scope: 'system'
  },
  {
    key: 'system.datetime',
    label: 'Data e hora atual',
    description: 'Data e hora correntes em formato legivel',
    example: '18/10/2025 14:30',
    scope: 'system'
  }
];

const VARIABLE_TOKEN_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g;

const toFirstName = (value?: string | null) => {
  if (!value) return '';
  const [first] = value.trim().split(/\s+/);
  return first ?? '';
};

type TicketWithRelations = Prisma.TicketGetPayload<{
  include: { contact: true; queue: true; user: true };
}>;

type UserSummary = Prisma.UserGetPayload<{
  select: { id: true; name: true; email: true };
}>;

interface PreviewSample {
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactNotes?: string;
  agentName?: string;
  queueName?: string;
  queueGreeting?: string;
  queueId?: string;
}

interface VariableContextOptions {
  ticketId?: string;
  userId?: string;
  sample?: PreviewSample;
}

interface VariableContextResult {
  values: Record<string, string>;
  queueId: string | null;
  ticket?: { id: string };
}

const buildVariableContext = async ({
  ticketId,
  userId,
  sample
}: VariableContextOptions): Promise<VariableContextResult> => {
  const values: Record<string, string> = {};
  let ticket: TicketWithRelations | null = null;

  if (ticketId) {
    ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { contact: true, queue: true, user: true }
    });

    if (!ticket) {
      const notFoundError = new Error('Ticket not found');
      (notFoundError as any).code = 'TICKET_NOT_FOUND';
      throw notFoundError;
    }
  }

  let agent: UserSummary | null = null;

  if (userId) {
    agent = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });
  }

  const fallback = sample ?? {};
  const contact = ticket?.contact;
  const queue = ticket?.queue;

  values['contact.name'] = contact?.name ?? fallback.contactName ?? '';
  values['contact.firstName'] = toFirstName(contact?.name ?? fallback.contactName);
  values['contact.phone'] = contact?.phoneNumber ?? fallback.contactPhone ?? '';
  values['contact.email'] = contact?.email ?? fallback.contactEmail ?? '';
  values['contact.notes'] = contact?.notes ?? fallback.contactNotes ?? '';

  values['agent.name'] = agent?.name ?? fallback.agentName ?? '';
  values['agent.firstName'] = toFirstName(agent?.name ?? fallback.agentName);
  values['agent.email'] = agent?.email ?? '';

  values['queue.name'] = queue?.name ?? fallback.queueName ?? '';
  values['queue.greeting'] = queue?.greetingMessage ?? fallback.queueGreeting ?? '';
  values['queue.description'] = queue?.description ?? '';

  values['ticket.id'] = ticket?.id ?? '';
  values['ticket.status'] = ticket?.status ?? '';
  values['ticket.priority'] = ticket?.priority ?? '';
  values['ticket.carPlate'] = ticket?.carPlate ?? '';
  values['ticket.createdAt'] = ticket ? ticket.createdAt.toISOString() : '';
  values['ticket.updatedAt'] = ticket ? ticket.updatedAt.toISOString() : '';

  const now = new Date();
  values['system.date'] = now.toLocaleDateString('pt-BR');
  values['system.time'] = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  values['system.datetime'] = `${values['system.date']} ${values['system.time']}`;

  return {
    values,
    queueId: queue?.id ?? fallback.queueId ?? null,
    ticket: ticket ? { id: ticket.id } : undefined
  };
};

const applyDynamicVariables = (template: string, values: Record<string, string>) => {
  const used = new Set<string>();
  const missing = new Set<string>();

  const rendered = template.replace(VARIABLE_TOKEN_REGEX, (_, expression: string) => {
    const [rawKey, rawFallback] = expression.split('|');
    const key = rawKey.trim();

    if (key.length === 0) {
      return '';
    }

    used.add(key);
    const value = values[key];

    if (value && value.length > 0) {
      return value;
    }

    if (rawFallback) {
      return rawFallback.trim();
    }

    missing.add(key);
    return '';
  });

  return {
    rendered,
    used: Array.from(used),
    missing: Array.from(missing)
  };
};

const hasAccessToQuickReply = (
  quickReply: { isGlobal: boolean; ownerId: string | null; queueId: string | null },
  userId?: string,
  queueId?: string | null,
  isAdmin?: boolean
) => {
  if (isAdmin) return true;
  if (quickReply.isGlobal) return true;
  if (quickReply.ownerId && quickReply.ownerId === userId) return true;
  if (quickReply.queueId && queueId && quickReply.queueId === queueId) return true;
  return false;
};

export const listQuickReplies = async (req: AuthRequest, res: Response) => {
  try {
    const { search, categoryId, queueId, scope } = req.query;
    const isAdmin = req.user?.role === 'ADMIN';
    const queueFilter =
      typeof queueId === 'string' && queueId.trim().length > 0 ? queueId.trim() : undefined;
    const filters: Prisma.QuickReplyWhereInput[] = [];

    if (typeof categoryId === 'string' && categoryId.trim().length > 0) {
      filters.push({ categoryId: categoryId.trim() });
    }

    if (typeof search === 'string' && search.trim().length > 0) {
      const term = search.trim();
      filters.push({
        OR: [
          { shortcut: { contains: term, mode: 'insensitive' } },
          { message: { contains: term, mode: 'insensitive' } }
        ]
      });
    }

    const scopeValue = typeof scope === 'string' ? scope : undefined;

    if (!isAdmin || scopeValue !== 'all') {
      const accessConditions: Prisma.QuickReplyWhereInput[] = [{ isGlobal: true }];

      if (req.user?.id) {
        accessConditions.push({ ownerId: req.user.id });
      }

      if (queueFilter) {
        accessConditions.push({ queueId: queueFilter });
      }

      filters.push({ OR: accessConditions });
    } else if (queueFilter) {
      filters.push({
        OR: [{ queueId: queueFilter }, { queueId: null }]
      });
    }

    const where: Prisma.QuickReplyWhereInput = filters.length > 0 ? { AND: filters } : {};

    const quickReplies = await prisma.quickReply.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        queue: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true, displayOrder: true } }
      },
      orderBy: [
        { category: { displayOrder: 'asc' } },
        { shortcut: 'asc' }
      ]
    });

    return res.json(quickReplies);
  } catch (error) {
    console.error('Erro ao listar respostas rapidas:', error);
    return res.status(500).json({ error: 'Erro ao listar respostas rapidas' });
  }
};

export const createQuickReply = async (req: AuthRequest, res: Response) => {
  try {
    const { shortcut, message, isGlobal = true, mediaUrl, ownerId, queueId, categoryId } =
      req.body ?? {};

    if (!shortcut || !message) {
      return res.status(400).json({ error: 'Atalho e mensagem sao obrigatorios' });
    }

    const trimmedShortcut = String(shortcut).trim();

    if (trimmedShortcut.length === 0) {
      return res.status(400).json({ error: 'Atalho invalido' });
    }

    const resolvedOwnerId = isGlobal ? null : ownerId ?? req.user?.id ?? null;

    if (!isGlobal && !resolvedOwnerId && !queueId) {
      return res.status(400).json({
        error: 'Defina um usuario responsavel ou uma fila para respostas nao globais'
      });
    }

    const quickReply = await prisma.quickReply.create({
      data: {
        shortcut: trimmedShortcut,
        message,
        isGlobal,
        mediaUrl: mediaUrl ?? null,
        ownerId: resolvedOwnerId,
        queueId: queueId ?? null,
        categoryId: categoryId ?? null
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        queue: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true, displayOrder: true } }
      }
    });

    return res.status(201).json(quickReply);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'Atalho ja cadastrado' });
    }
    console.error('Erro ao criar resposta rapida:', error);
    return res.status(500).json({ error: 'Erro ao criar resposta rapida' });
  }
};

export const updateQuickReply = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await prisma.quickReply.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Resposta rapida nao encontrada' });
    }

    const {
      shortcut,
      message,
      isGlobal,
      mediaUrl,
      ownerId,
      queueId,
      categoryId
    } = req.body ?? {};

    const nextIsGlobal = typeof isGlobal === 'boolean' ? isGlobal : existing.isGlobal;
    const resolvedOwnerId = nextIsGlobal
      ? null
      : typeof ownerId !== 'undefined'
        ? ownerId
        : existing.ownerId ?? req.user?.id ?? null;
    const resolvedQueueId =
      typeof queueId !== 'undefined' ? queueId : existing.queueId ?? null;
    const resolvedCategoryId =
      typeof categoryId !== 'undefined' ? categoryId : existing.categoryId ?? null;

    if (!nextIsGlobal && !resolvedOwnerId && !resolvedQueueId) {
      return res.status(400).json({
        error: 'Defina um usuario responsavel ou uma fila para respostas nao globais'
      });
    }

    const quickReply = await prisma.quickReply.update({
      where: { id },
      data: {
        shortcut: typeof shortcut === 'string' ? shortcut.trim() : undefined,
        message,
        isGlobal: nextIsGlobal,
        mediaUrl,
        ownerId: nextIsGlobal ? null : resolvedOwnerId,
        queueId: nextIsGlobal ? null : resolvedQueueId,
        categoryId: resolvedCategoryId
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        queue: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true, displayOrder: true } }
      }
    });

    return res.json(quickReply);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'Atalho ja cadastrado' });
    }
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Resposta rapida nao encontrada' });
    }
    console.error('Erro ao atualizar resposta rapida:', error);
    return res.status(500).json({ error: 'Erro ao atualizar resposta rapida' });
  }
};

export const deleteQuickReply = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.quickReply.delete({ where: { id } });

    return res.json({ message: 'Resposta rapida removida com sucesso' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Resposta rapida nao encontrada' });
    }
    console.error('Erro ao deletar resposta rapida:', error);
    return res.status(500).json({ error: 'Erro ao deletar resposta rapida' });
  }
};

export const renderQuickReply = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { ticketId, sample } = req.body ?? {};

  try {
    const quickReply = await prisma.quickReply.findUnique({
      where: { id },
      select: {
        id: true,
        shortcut: true,
        message: true,
        isGlobal: true,
        ownerId: true,
        queueId: true
      }
    });

    if (!quickReply) {
      return res.status(404).json({ error: 'Resposta rapida nao encontrada' });
    }

    let context: VariableContextResult;

    try {
      context = await buildVariableContext({
        ticketId,
        userId: req.user?.id,
        sample
      });
    } catch (error: any) {
      if (error?.code === 'TICKET_NOT_FOUND') {
        return res.status(404).json({ error: 'Ticket nao encontrado para gerar a resposta' });
      }
      throw error;
    }

    const canUse = hasAccessToQuickReply(
      quickReply,
      req.user?.id,
      context.queueId ?? sample?.queueId ?? quickReply.queueId,
      req.user?.role === 'ADMIN'
    );

    if (!canUse) {
      return res
        .status(403)
        .json({ error: 'Resposta rapida nao disponivel para este contexto' });
    }

    const { rendered, used, missing } = applyDynamicVariables(
      quickReply.message,
      context.values
    );

    return res.json({
      quickReplyId: quickReply.id,
      shortcut: quickReply.shortcut,
      renderedMessage: rendered,
      variables: {
        used,
        missing,
        available: VARIABLE_DEFINITIONS
      }
    });
  } catch (error) {
    console.error('Erro ao gerar preview da resposta rapida:', error);
    return res.status(500).json({ error: 'Erro ao gerar preview da resposta rapida' });
  }
};

export const registerQuickReplyUsage = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { ticketId } = req.body ?? {};

  if (!ticketId) {
    return res.status(400).json({ error: 'Ticket obrigatorio para registrar uso' });
  }

  try {
    const quickReply = await prisma.quickReply.findUnique({
      where: { id },
      select: {
        id: true,
        shortcut: true,
        message: true,
        isGlobal: true,
        ownerId: true,
        queueId: true
      }
    });

    if (!quickReply) {
      return res.status(404).json({ error: 'Resposta rapida nao encontrada' });
    }

    let context: VariableContextResult;

    try {
      context = await buildVariableContext({
        ticketId,
        userId: req.user?.id
      });
    } catch (error: any) {
      if (error?.code === 'TICKET_NOT_FOUND') {
        return res.status(404).json({ error: 'Ticket nao encontrado para registrar o uso' });
      }
      throw error;
    }

    const canUse = hasAccessToQuickReply(
      quickReply,
      req.user?.id,
      context.queueId ?? quickReply.queueId,
      req.user?.role === 'ADMIN'
    );

    if (!canUse) {
      return res
        .status(403)
        .json({ error: 'Resposta rapida nao disponivel para este ticket' });
    }

    const { rendered, used, missing } = applyDynamicVariables(
      quickReply.message,
      context.values
    );

    await prisma.$transaction([
      prisma.quickReply.update({
        where: { id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date()
        }
      }),
      prisma.quickReplyUsage.create({
        data: {
          quickReplyId: id,
          ticketId,
          userId: req.user?.id ?? null,
          queueId: context.queueId
        }
      })
    ]);

    return res.json({
      quickReplyId: quickReply.id,
      shortcut: quickReply.shortcut,
      renderedMessage: rendered,
      variables: {
        used,
        missing
      }
    });
  } catch (error) {
    console.error('Erro ao registrar uso de resposta rapida:', error);
    return res.status(500).json({ error: 'Erro ao registrar uso de resposta rapida' });
  }
};

export const listQuickReplyStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [totalQuickReplies, usageAggregate, categories, usageByCategory, topQuickReplies] =
      await Promise.all([
        prisma.quickReply.count(),
        prisma.quickReply.aggregate({ _sum: { usageCount: true } }),
        prisma.quickReplyCategory.findMany({
          orderBy: [
            { displayOrder: 'asc' },
            { name: 'asc' }
          ],
          select: { id: true, name: true, color: true, displayOrder: true }
        }),
        prisma.quickReply.groupBy({
          by: ['categoryId'],
          _sum: { usageCount: true },
          _count: { _all: true }
        }),
        prisma.quickReply.findMany({
          orderBy: { usageCount: 'desc' },
          take: 5,
          include: {
            category: { select: { id: true, name: true, color: true } }
          }
        })
      ]);

    const usageMap = new Map<
      string | null,
      { usageCount: number; quantity: number }
    >();

    usageByCategory.forEach((entry) => {
      usageMap.set(entry.categoryId ?? null, {
        usageCount: entry._sum.usageCount ?? 0,
        quantity: entry._count._all
      });
    });

    const categoryStats = categories.map((category) => {
      const stats = usageMap.get(category.id) ?? { usageCount: 0, quantity: 0 };
      return {
        id: category.id,
        name: category.name,
        color: category.color,
        displayOrder: category.displayOrder,
        quickReplies: stats.quantity,
        usageCount: stats.usageCount
      };
    });

    const uncategorized = usageMap.get(null) ?? { usageCount: 0, quantity: 0 };

    return res.json({
      totals: {
        quickReplies: totalQuickReplies,
        usage: usageAggregate._sum.usageCount ?? 0,
        categories: categories.length
      },
      categories: categoryStats,
      uncategorized: {
        quickReplies: uncategorized.quantity,
        usageCount: uncategorized.usageCount
      },
      topQuickReplies: topQuickReplies.map((reply) => ({
        id: reply.id,
        shortcut: reply.shortcut,
        message: reply.message,
        usageCount: reply.usageCount,
        category: reply.category
          ? {
              id: reply.category.id,
              name: reply.category.name,
              color: reply.category.color
            }
          : null
      }))
    });
  } catch (error) {
    console.error('Erro ao coletar estatisticas de respostas rapidas:', error);
    return res.status(500).json({ error: 'Erro ao coletar estatisticas' });
  }
};

export const listQuickReplyCategories = async (_req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.quickReplyCategory.findMany({
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ],
      include: { _count: { select: { quickReplies: true } } }
    });

    const uncategorized = await prisma.quickReply.count({
      where: { categoryId: null }
    });

    return res.json({
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        displayOrder: category.displayOrder,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        quickReplyCount: category._count.quickReplies
      })),
      uncategorized
    });
  } catch (error) {
    console.error('Erro ao listar categorias de respostas rapidas:', error);
    return res.status(500).json({ error: 'Erro ao listar categorias' });
  }
};

export const createQuickReplyCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, displayOrder } = req.body ?? {};

    if (!name || String(name).trim().length === 0) {
      return res.status(400).json({ error: 'Nome da categoria obrigatorio' });
    }

    const category = await prisma.quickReplyCategory.create({
      data: {
        name: String(name).trim(),
        color: color ?? '#2563EB',
        displayOrder: typeof displayOrder === 'number' ? displayOrder : 0
      }
    });

    return res.status(201).json(category);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'Ja existe uma categoria com este nome' });
    }
    console.error('Erro ao criar categoria de resposta rapida:', error);
    return res.status(500).json({ error: 'Erro ao criar categoria' });
  }
};

export const updateQuickReplyCategory = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const { name, color, displayOrder } = req.body ?? {};

    const category = await prisma.quickReplyCategory.update({
      where: { id },
      data: {
        name: typeof name === 'string' ? name.trim() : undefined,
        color,
        displayOrder: typeof displayOrder === 'number' ? displayOrder : undefined
      }
    });

    return res.json(category);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Categoria nao encontrada' });
    }
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'Ja existe uma categoria com este nome' });
    }
    console.error('Erro ao atualizar categoria de resposta rapida:', error);
    return res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
};

export const deleteQuickReplyCategory = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.quickReply.updateMany({
      where: { categoryId: id },
      data: { categoryId: null }
    });

    await prisma.quickReplyCategory.delete({ where: { id } });

    return res.json({ message: 'Categoria removida com sucesso' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Categoria nao encontrada' });
    }
    console.error('Erro ao remover categoria de resposta rapida:', error);
    return res.status(500).json({ error: 'Erro ao remover categoria' });
  }
};

export const listQuickReplyVariables = async (_req: AuthRequest, res: Response) => {
  return res.json(VARIABLE_DEFINITIONS);
};

import { AutomationTrigger } from '@prisma/client';
import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { io } from '../server';
import { ticketInclude } from '../utils/ticketInclude';
import {
  appendTagsToTicket,
  removeTagFromTicket,
  replaceTicketTags,
  loadTicketForResponse,
  InvalidTagError,
  validateTagIdentifiers
} from '../services/tagAutomation';
import { notifyNewTicketCreated, notifyTicketTransferred } from '../services/notificationTriggers';
import { emitTicketCreatedEvent } from '../services/integrationService';
import { triggerSurveyForTicket } from '../services/satisfactionSurveyService';
import { runAutomations } from '../services/automationService';

export const listTickets = async (req: AuthRequest, res: Response) => {
  try {
    const { status, queueId, userId, priority, tags, search, sort, limit } = req.query;
    const userRole = req.user!.role;
    const currentUserId = req.user!.id;

    const where: any = {};

    if (status) where.status = status;
    if (queueId) where.queueId = queueId;
    if (priority) where.priority = priority;

    if (userRole === 'AGENT') {
      where.userId = currentUserId;
    } else if (userId) {
      where.userId = userId;
    }

    if (tags) {
      const tagIds = Array.isArray(tags)
        ? tags
        : String(tags)
            .split(',')
            .map((tagId) => tagId.trim())
            .filter(Boolean);

      if (tagIds.length > 0) {
        where.tags = {
          some: {
            tagId: { in: tagIds }
          }
        };
      }
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { contact: { name: { contains: search, mode: 'insensitive' } } },
        { contact: { phoneNumber: { contains: search, mode: 'insensitive' } } },
        { messages: { some: { body: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    const orderBy: any[] = [];

    if (sort === 'unread') {
      orderBy.push({ unreadMessages: 'desc' });
    } else if (sort === 'priority') {
      orderBy.push({ priority: 'desc' });
    }

    orderBy.push({ lastMessageAt: 'desc' });

    const parsedLimit = limit ? Number(limit) : undefined;
    const take = parsedLimit && parsedLimit > 0 ? parsedLimit : undefined;

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        ...ticketInclude,
        messages: {
          where: { isPrivate: false },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy,
      take
    });

    return res.json(tickets);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar tickets' });
  }
};

export const getTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        ...ticketInclude,
        messages: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
            quotedMessage: {
              select: {
                id: true,
                body: true,
                type: true,
                mediaUrl: true,
                createdAt: true,
                user: { select: { id: true, name: true, avatar: true } }
              }
            },
            reactions: {
              include: {
                user: { select: { id: true, name: true, avatar: true } }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket nao encontrado' });
    }

    return res.json(ticket);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar ticket' });
  }
};

export const acceptTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        status: 'OPEN',
        userId,
        unreadMessages: 0
      },
      include: ticketInclude
    });

    io.emit('ticket:update', ticket);

    return res.json(ticket);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao aceitar ticket' });
  }
};

export const closeTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date()
      },
      include: ticketInclude
    });

    triggerSurveyForTicket(id, { autoSend: true }).catch((error) => {
      console.error('Erro ao acionar pesquisa de satisfacao:', error);
    });

    await runAutomations(AutomationTrigger.TICKET_STATUS_CHANGED, { ticketId: id });

    const updatedTicket =
      (await prisma.ticket.findUnique({
        where: { id },
        include: ticketInclude
      })) ?? ticket;

    io.emit('ticket:update', updatedTicket);

    return res.json(updatedTicket);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao fechar ticket' });
  }
};

export const reopenTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        status: 'OPEN',
        closedAt: null
      },
      include: ticketInclude
    });

    await runAutomations(AutomationTrigger.TICKET_STATUS_CHANGED, { ticketId: id });

    const updatedTicket =
      (await prisma.ticket.findUnique({
        where: { id },
        include: ticketInclude
      })) ?? ticket;

    io.emit('ticket:update', updatedTicket);

    return res.json(updatedTicket);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao reabrir ticket' });
  }
};

export const transferTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, queueId } = req.body;

    const data: any = {};
    if (userId) data.userId = userId;
    if (queueId) data.queueId = queueId;

    const ticket = await prisma.ticket.update({
      where: { id },
      data,
      include: ticketInclude
    });

    io.emit('ticket:update', ticket);
    const actor = req.user
      ? await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { id: true, name: true }
        })
      : null;
    await notifyTicketTransferred(ticket, actor);

    return res.json(ticket);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao transferir ticket' });
  }
};

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const normalizePhoneNumber = (value: string) => value.replace(/\D/g, '');

const isValidFullName = (value: string) => {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length < 2) {
    return false;
  }

  return parts.every((part) => part.length >= 2);
};

const formatFullName = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const isValidCarPlate = (value: string) => /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(value);

export const createManualTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumber, name, queueId, priority, tagIds, carPlate } = req.body as {
      phoneNumber?: string;
      name?: string;
      queueId?: string | null;
      priority?: string;
      tagIds?: string[];
      carPlate?: string;
    };

    const normalizedPhone = normalizePhoneNumber(phoneNumber || '');

    if (normalizedPhone.length < 10 || normalizedPhone.length > 14) {
      return res.status(400).json({ error: 'Numero de telefone invalido' });
    }

    if (!carPlate) {
      return res.status(400).json({ error: 'Placa do carro e obrigatoria' });
    }

    const formattedPlate = carPlate.toUpperCase();
    if (!isValidCarPlate(formattedPlate)) {
      return res.status(400).json({ error: 'Placa do carro invalida. Use o padrao ABC1D23.' });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Prioridade invalida' });
    }

    let contact = await prisma.contact.findUnique({
      where: { phoneNumber: normalizedPhone }
    });

    if (!contact) {
      if (!name || !isValidFullName(name)) {
        return res.status(400).json({ error: 'Nome completo invalido' });
      }

      contact = await prisma.contact.create({
        data: {
          name: formatFullName(name),
          phoneNumber: normalizedPhone
        }
      });
    }

    if (queueId) {
      const queue = await prisma.queue.findUnique({ where: { id: queueId } });
      if (!queue) {
        return res.status(400).json({ error: 'Fila nao encontrada' });
      }
    }

    const requestedTags = Array.isArray(tagIds)
      ? tagIds
          .filter((tagId): tagId is string => typeof tagId === 'string')
          .map((tagId) => tagId.trim())
          .filter(Boolean)
      : [];

    try {
      await validateTagIdentifiers(requestedTags);
    } catch (error) {
      if (error instanceof InvalidTagError) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    }

    const connection =
      (await prisma.whatsAppConnection.findFirst({ where: { isDefault: true } })) ||
      (await prisma.whatsAppConnection.findFirst());

    if (!connection) {
      return res.status(400).json({ error: 'Nenhuma conexao WhatsApp configurada' });
    }

    const ticket = await prisma.ticket.create({
      data: {
        contactId: contact.id,
        whatsappId: connection.id,
        status: 'PENDING',
        priority: (priority && VALID_PRIORITIES.includes(priority) ? priority : 'MEDIUM') as any,
        queueId: queueId || undefined,
        carPlate: formattedPlate
      }
    });

    if (requestedTags.length > 0) {
      await appendTagsToTicket(ticket.id, requestedTags);
    }

    await runAutomations(AutomationTrigger.TICKET_CREATED, { ticketId: ticket.id });

    const fullTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: {
        ...ticketInclude,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    });

    if (!fullTicket) {
      return res.status(500).json({ error: 'Erro ao carregar ticket criado' });
    }

    io.emit('ticket:new', fullTicket);
    await notifyNewTicketCreated(fullTicket, req.user?.id);

    emitTicketCreatedEvent(fullTicket.id).catch((error) => {
      console.warn('[Integration] Failed to emit ticket.created event (manual)', error);
    });
    return res.status(201).json(fullTicket);
  } catch (error) {
    console.error('Erro ao criar ticket manual:', error);
    return res.status(500).json({ error: 'Erro ao criar ticket' });
  }
};

export const updateTicketDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { priority, queueId, tagIds } = req.body as {
      priority?: string;
      queueId?: string | null;
      tagIds?: string[];
    };

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Prioridade invalida' });
    }

    const data: Record<string, unknown> = {};

    if (priority) data.priority = priority;
    if (queueId !== undefined) data.queueId = queueId;

    let tagsChanged = false;
    const dataChanged = Object.keys(data).length > 0;

    const ticket = await prisma.$transaction(async (tx) => {
      if (dataChanged) {
        await tx.ticket.update({
          where: { id },
          data
        });
      }

      if (Array.isArray(tagIds)) {
        const sanitizedTagIds = tagIds
          .filter((tagId): tagId is string => typeof tagId === 'string')
          .map((tagId) => tagId.trim())
          .filter(Boolean);

        const result = await replaceTicketTags(id, sanitizedTagIds, tx);
        tagsChanged = result.changed;
      }

      return tx.ticket.findUnique({
        where: { id },
        include: ticketInclude
      });
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket nao encontrado' });
    }

    if (dataChanged || tagsChanged) {
      io.emit('ticket:update', ticket);
    }

    return res.json(ticket);
  } catch (error) {
    if (error instanceof InvalidTagError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro ao atualizar ticket' });
  }
};

export const applyTicketTags = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tagIds } = req.body as { tagIds?: string[] };

    const sanitizedTagIds = Array.isArray(tagIds)
      ? tagIds
          .filter((tagId): tagId is string => typeof tagId === 'string')
          .map((tagId) => tagId.trim())
          .filter(Boolean)
      : [];

    if (sanitizedTagIds.length === 0) {
      return res.status(400).json({ error: 'Informe pelo menos uma tag' });
    }

    const ticketExists = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!ticketExists) {
      return res.status(404).json({ error: 'Ticket nao encontrado' });
    }

    const { changed } = await appendTagsToTicket(id, sanitizedTagIds);
    const ticket = await loadTicketForResponse(id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket nao encontrado' });
    }

    if (changed) {
      io.emit('ticket:update', ticket);
    }

    return res.json(ticket);
  } catch (error) {
    if (error instanceof InvalidTagError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro ao aplicar tags ao ticket' });
  }
};

export const removeTicketTag = async (req: AuthRequest, res: Response) => {
  try {
    const { id, tagId } = req.params;

    const ticketExists = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!ticketExists) {
      return res.status(404).json({ error: 'Ticket nao encontrado' });
    }

    const { changed } = await removeTagFromTicket(id, tagId);
    const ticket = await loadTicketForResponse(id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket nao encontrado' });
    }

    if (changed) {
      io.emit('ticket:update', ticket);
    }

    return res.json(ticket);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover tag do ticket' });
  }
};






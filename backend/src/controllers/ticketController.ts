import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { io } from '../server';

export const listTickets = async (req: AuthRequest, res: Response) => {
  try {
    const { status, queueId, userId } = req.query;
    const userRole = req.user!.role;
    const currentUserId = req.user!.id;

    const where: any = {};

    if (status) where.status = status;
    if (queueId) where.queueId = queueId;
    
    if (userRole === 'AGENT') {
      where.userId = currentUserId;
    } else if (userId) {
      where.userId = userId;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        contact: true,
        user: { select: { id: true, name: true, avatar: true } },
        queue: true,
        tags: { include: { tag: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { lastMessageAt: 'desc' }
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
        contact: true,
        user: { select: { id: true, name: true, avatar: true } },
        queue: true,
        tags: { include: { tag: true } },
        messages: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
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
      include: {
        contact: true,
        user: { select: { id: true, name: true, avatar: true } },
        queue: true
      }
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
      include: {
        contact: true,
        user: { select: { id: true, name: true, avatar: true } },
        queue: true
      }
    });

    io.emit('ticket:update', ticket);

    return res.json(ticket);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao fechar ticket' });
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
      include: {
        contact: true,
        user: { select: { id: true, name: true, avatar: true } },
        queue: true
      }
    });

    io.emit('ticket:update', ticket);

    return res.json(ticket);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao transferir ticket' });
  }
};

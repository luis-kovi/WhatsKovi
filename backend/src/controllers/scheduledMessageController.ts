import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  listScheduledMessages,
  createScheduledMessage,
  updateScheduledMessage,
  cancelScheduledMessage
} from '../services/scheduledMessageService';

export const listScheduledMessagesHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({ error: 'TicketId obrigatorio.' });
    }

    const schedules = await listScheduledMessages(ticketId);
    return res.json(schedules);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar agendamentos.';
    return res.status(500).json({ error: message });
  }
};

export const createScheduledMessageHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;
    if (!ticketId) {
      return res.status(400).json({ error: 'TicketId obrigatorio.' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Usuario nao autenticado.' });
    }

    const schedule = await createScheduledMessage(req.user.id, ticketId, req.body);
    return res.status(201).json(schedule);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar agendamento.';
    return res.status(400).json({ error: message });
  }
};

export const updateScheduledMessageHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario nao autenticado.' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Id obrigatorio.' });
    }

    const allowAdminOverride = req.user.role === 'ADMIN';
    const schedule = await updateScheduledMessage(id, req.user.id, req.body, allowAdminOverride);
    return res.json(schedule);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar agendamento.';
    const statusCode = message.includes('permissa') ? 403 : 400;
    return res.status(statusCode).json({ error: message });
  }
};

export const cancelScheduledMessageHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario nao autenticado.' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Id obrigatorio.' });
    }

    const allowAdminOverride = req.user.role === 'ADMIN';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;

    const cancelled = await cancelScheduledMessage(id, req.user.id, allowAdminOverride, reason);
    return res.json(cancelled);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao cancelar agendamento.';
    const statusCode = message.includes('permissa') ? 403 : 400;
    return res.status(statusCode).json({ error: message });
  }
};

import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendWhatsAppMessage } from '../services/whatsappService';
import { io } from '../server';

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId, body, type, mediaUrl, isPrivate } = req.body;
    const userId = req.user!.id;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { contact: true, whatsapp: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    const message = await prisma.message.create({
      data: {
        body,
        type: type || 'TEXT',
        mediaUrl,
        isPrivate: isPrivate || false,
        ticketId,
        userId,
        status: 'PENDING'
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { lastMessageAt: new Date() }
    });

    if (!isPrivate) {
      await sendWhatsAppMessage(ticket.whatsapp.id, ticket.contact.phoneNumber, body, mediaUrl);
      
      await prisma.message.update({
        where: { id: message.id },
        data: { status: 'SENT' }
      });
    }

    io.emit('message:new', { ...message, ticketId });

    return res.status(201).json(message);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
};

export const listMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;

    const messages = await prisma.message.findMany({
      where: { ticketId },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar mensagens' });
  }
};

import { Response } from 'express';
import path from 'path';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendWhatsAppMessage } from '../services/whatsappService';
import { io } from '../server';

const getMessageTypeFromFile = (mimetype?: string | null) => {
  if (!mimetype) return 'DOCUMENT';
  if (mimetype.startsWith('image/')) return 'IMAGE';
  if (mimetype.startsWith('video/')) return 'VIDEO';
  if (mimetype.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.body;
    const userId = req.user!.id;
    const isPrivate = req.body.isPrivate === 'true' || req.body.isPrivate === true;
    const providedType = req.body.type;
    const providedBody = req.body.body;

    if (!ticketId) {
      return res.status(400).json({ error: 'TicketId e obrigatorio' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { contact: true, whatsapp: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket nao encontrado' });
    }

    const hasFile = Boolean(req.file);
    const mediaUrl = hasFile ? `/uploads/${req.file!.filename}` : req.body.mediaUrl || null;
    const messageType = hasFile ? getMessageTypeFromFile(req.file?.mimetype) : providedType || 'TEXT';
    const messageBody =
      providedBody && providedBody.trim().length > 0
        ? providedBody
        : hasFile
        ? 'Arquivo enviado'
        : '';

    if (!messageBody && !hasFile) {
      return res.status(400).json({ error: 'Mensagem vazia' });
    }

    const message = await prisma.message.create({
      data: {
        body: messageBody,
        type: messageType,
        mediaUrl,
        isPrivate,
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
      data: {
        lastMessageAt: new Date(),
        ...(isPrivate ? {} : { unreadMessages: 0 })
      }
    });

    let finalMessage = message;

    if (!isPrivate && ticket.whatsapp) {
      const mediaPath = hasFile ? req.file?.path : undefined;

      await sendWhatsAppMessage(
        ticket.whatsapp.id,
        ticket.contact.phoneNumber,
        messageBody,
        mediaUrl,
        mediaPath ? path.resolve(mediaPath) : undefined
      );

      finalMessage = await prisma.message.update({
        where: { id: message.id },
        data: { status: 'SENT' },
        include: {
          user: { select: { id: true, name: true, avatar: true } }
        }
      });
    }

    io.emit('message:new', { ...finalMessage, ticketId });

    return res.status(201).json(finalMessage);
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

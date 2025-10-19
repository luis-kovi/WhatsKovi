import { Response } from "express";
import path from "path";
import fs from "fs/promises";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { sendWhatsAppMessage } from "../services/whatsappService";
import { applyAutomaticTagsToTicket } from "../services/tagAutomation";
import { io } from "../server";
import { MessageType } from "@prisma/client";

const getMessageTypeFromFile = (mimetype?: string | null): MessageType => {
  if (!mimetype) return MessageType.DOCUMENT;
  if (mimetype.startsWith("image/")) return MessageType.IMAGE;
  if (mimetype.startsWith("video/")) return MessageType.VIDEO;
  if (mimetype.startsWith("audio/")) return MessageType.AUDIO;
  return MessageType.DOCUMENT;
};

const isValidMessageType = (value?: string): value is MessageType =>
  !!value && (Object.values(MessageType) as string[]).includes(value);

const messageInclude = {
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
} as const;

const emitMessageUpdate = async (ticketId: string, messageId: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: messageInclude
  });

  if (!message) {
    return null;
  }

  const payload = { ...message, ticketId };
  io.emit("message:update", payload);
  return payload;
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId, quotedMsgId } = req.body as { ticketId?: string; quotedMsgId?: string };
    const userId = req.user!.id;
    const isPrivate = req.body.isPrivate === "true" || req.body.isPrivate === true;
    const providedType = req.body.type as string | undefined;
    const providedBody = req.body.body as string | undefined;

    if (!ticketId) {
      return res.status(400).json({ error: "TicketId e obrigatorio" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { contact: true, whatsapp: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket nao encontrado" });
    }

    if (quotedMsgId) {
      const quoted = await prisma.message.findUnique({ where: { id: quotedMsgId } });
      if (!quoted || quoted.ticketId !== ticketId) {
        return res.status(400).json({ error: "Mensagem citada invalida" });
      }
    }

    const hasFile = Boolean(req.file);
    const mediaUrl = hasFile ? `/uploads/${req.file!.filename}` : (req.body.mediaUrl as string | null) || null;
    const messageType: MessageType = hasFile
      ? getMessageTypeFromFile(req.file?.mimetype)
      : isValidMessageType(providedType)
      ? providedType
      : MessageType.TEXT;
    const messageBody =
      providedBody && providedBody.trim().length > 0
        ? providedBody
        : hasFile
        ? "Arquivo enviado"
        : "";

    if (!messageBody && !hasFile) {
      return res.status(400).json({ error: "Mensagem vazia" });
    }

    const message = await prisma.message.create({
      data: {
        body: messageBody,
        type: messageType,
        mediaUrl,
        isPrivate,
        ticketId,
        userId,
        status: "PENDING",
        quotedMsgId: quotedMsgId || undefined
      },
      include: messageInclude
    });

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        lastMessageAt: new Date(),
        ...(isPrivate ? {} : { unreadMessages: 0 })
      }
    });

    await prisma.contact.update({
      where: { id: ticket.contactId },
      data: { lastInteractionAt: new Date() }
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
        data: { status: "SENT" },
        include: messageInclude
      });
    }

    if (!isPrivate) {
      await applyAutomaticTagsToTicket(ticketId, finalMessage.body ?? "");
    }

    io.emit("message:new", { ...finalMessage, ticketId });

    return res.status(201).json(finalMessage);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
};

export const listMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;

    const messages = await prisma.message.findMany({
      where: { ticketId },
      include: messageInclude,
      orderBy: { createdAt: "asc" }
    });

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao listar mensagens" });
  }
};

export const updateMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { body, isPrivate } = req.body as { body?: string; isPrivate?: boolean };
    const requesterId = req.user!.id;
    const requesterRole = req.user!.role;

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) {
      return res.status(404).json({ error: "Mensagem nao encontrada" });
    }

    if (message.userId !== requesterId && requesterRole !== "ADMIN") {
      return res.status(403).json({ error: "Sem permissao para editar a mensagem" });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: {
        body: typeof body === "string" ? body : message.body,
        isPrivate: typeof isPrivate === "boolean" ? isPrivate : message.isPrivate,
        editedAt: new Date(),
        editedBy: requesterId
      },
      include: messageInclude
    });

    await emitMessageUpdate(message.ticketId, id);

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar mensagem" });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requesterId = req.user!.id;
    const requesterRole = req.user!.role;

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) {
      return res.status(404).json({ error: "Mensagem nao encontrada" });
    }

    if (message.userId !== requesterId && requesterRole !== "ADMIN") {
      return res.status(403).json({ error: "Sem permissao para remover a mensagem" });
    }

    if (message.mediaUrl) {
      const filePath = path.join(process.cwd(), "backend", message.mediaUrl);
      fs.unlink(filePath).catch(() => undefined);
    }

    await prisma.messageReaction.deleteMany({ where: { messageId: id } });
    await prisma.message.delete({ where: { id } });

    io.emit("message:delete", { messageId: id, ticketId: message.ticketId });

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao remover mensagem" });
  }
};

export const addReaction = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body as { emoji?: string };
    const userId = req.user!.id;

    if (!emoji || emoji.trim().length === 0) {
      return res.status(400).json({ error: "Emoji obrigatorio" });
    }

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) {
      return res.status(404).json({ error: "Mensagem nao encontrada" });
    }

    await prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId: id, userId, emoji } },
      update: {},
      create: { messageId: id, userId, emoji }
    });

    const updatedMessage = await emitMessageUpdate(message.ticketId, id);

    return res.json(updatedMessage ?? { success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao registrar reacao" });
  }
};

export const removeReaction = async (req: AuthRequest, res: Response) => {
  try {
    const { id, reactionId } = req.params;
    const userId = req.user!.id;

    const reaction = await prisma.messageReaction.findUnique({ where: { id: reactionId } });
    if (!reaction || reaction.messageId !== id) {
      return res.status(404).json({ error: "Reacao nao encontrada" });
    }

    if (reaction.userId !== userId) {
      return res.status(403).json({ error: "Sem permissao para remover a reacao" });
    }

    await prisma.messageReaction.delete({ where: { id: reactionId } });

    const message = await prisma.message.findUnique({ where: { id } });
    const updatedMessage = message ? await emitMessageUpdate(message.ticketId, id) : null;

    return res.json(updatedMessage ?? { success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao remover reacao" });
  }
};

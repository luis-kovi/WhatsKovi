import { Response } from "express";
import path from "path";
import fs from "fs/promises";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { reactToWhatsAppMessage, sendWhatsAppMessage } from "../services/whatsappService";
import { applyAutomaticTagsToTicket } from "../services/tagAutomation";
import { processMessageWithAi } from "../services/aiOrchestrator";
import { io } from "../server";
import { Prisma, MessageChannel, MessageStatus, MessageType } from "@prisma/client";
import {
  canSendEmailChannel,
  canSendSmsChannel,
  sendEmailChannelMessage,
  sendSmsChannelMessage
} from "../services/multiChannelService";
import { emitMessageEvent } from "../services/integrationService";

const getMessageTypeFromFile = (mimetype?: string | null): MessageType => {
  if (!mimetype) return MessageType.DOCUMENT;
  if (mimetype.startsWith("image/")) return MessageType.IMAGE;
  if (mimetype.startsWith("video/")) return MessageType.VIDEO;
  if (mimetype.startsWith("audio/")) return MessageType.AUDIO;
  return MessageType.DOCUMENT;
};

const isValidMessageType = (value?: string): value is MessageType =>
  !!value && (Object.values(MessageType) as string[]).includes(value);

const isValidMessageChannel = (value?: string): value is MessageChannel =>
  !!value && (Object.values(MessageChannel) as string[]).includes(value);

const messageInclude: Prisma.MessageInclude = {
  user: { select: { id: true, name: true, avatar: true } },
  quotedMessage: {
    select: {
      id: true,
      body: true,
      type: true,
      mediaUrl: true,
      createdAt: true,
      user: { select: { id: true, name: true, avatar: true } },
      deliveryMetadata: true
    }
  },
  reactions: {
    include: {
      user: { select: { id: true, name: true, avatar: true } }
    }
  }
};

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
    const { ticketId, quotedMsgId } = req.body as {
      ticketId?: string;
      quotedMsgId?: string;
      channel?: string;
    };
    const userId = req.user!.id;
    const isPrivate = req.body.isPrivate === "true" || req.body.isPrivate === true;
    const providedType = req.body.type as string | undefined;
    const providedBody = req.body.body as string | undefined;
    const providedChannel = req.body.channel as string | undefined;

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

    let quotedWhatsAppMessageId: string | undefined;
    if (quotedMsgId) {
      const quoted = await prisma.message.findUnique({ where: { id: quotedMsgId } });
      if (!quoted || quoted.ticketId !== ticketId) {
        return res.status(400).json({ error: "Mensagem citada invalida" });
      }
      // Permitir citar apenas mensagens recebidas do contato (canal WhatsApp e sem userId)
      if (quoted.channel !== MessageChannel.WHATSAPP || quoted.userId) {
        return res.status(400).json({ error: "Apenas mensagens recebidas podem ser citadas" });
      }
      const meta = (quoted.deliveryMetadata as any) || {};
      if (typeof meta.whatsappMessageId === 'string') {
        quotedWhatsAppMessageId = meta.whatsappMessageId;
      }
    }

    const hasFile = Boolean(req.file);
    const selectedChannel: MessageChannel = isPrivate
      ? MessageChannel.INTERNAL
      : isValidMessageChannel(providedChannel)
      ? providedChannel
      : MessageChannel.WHATSAPP;

    if (!isPrivate && selectedChannel === MessageChannel.INTERNAL) {
      return res.status(400).json({ error: "Canal interno permitido apenas para notas privadas" });
    }

    if (selectedChannel !== MessageChannel.WHATSAPP && hasFile) {
      return res.status(400).json({ error: "O canal selecionado nao suporta envio de anexos" });
    }

    if (selectedChannel === MessageChannel.WHATSAPP && !ticket.whatsapp) {
      return res.status(409).json({ error: "Conexao WhatsApp indisponivel para este ticket" });
    }

    if (selectedChannel === MessageChannel.EMAIL) {
      if (!ticket.contact.email) {
        return res.status(400).json({ error: "Contato nao possui email cadastrado" });
      }
      if (!(await canSendEmailChannel())) {
        return res.status(503).json({ error: "Envio por email nao configurado" });
      }
    }

    if (selectedChannel === MessageChannel.SMS) {
      if (!(await canSendSmsChannel())) {
        return res.status(503).json({ error: "Envio por SMS nao configurado" });
      }
    }

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

    const initialStatus =
      selectedChannel === MessageChannel.INTERNAL || isPrivate ? MessageStatus.SENT : MessageStatus.PENDING;

    const message = await prisma.message.create({
      data: {
        body: messageBody,
        type: messageType,
        channel: selectedChannel,
        status: initialStatus,
        mediaUrl,
        isPrivate,
        ticketId,
        userId,
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

    if (!isPrivate && selectedChannel !== MessageChannel.INTERNAL) {
      const deliveryMetadata: Prisma.JsonObject = {
        channel: selectedChannel
      };

      let waId: string | null = null;
      try {
        if (selectedChannel === MessageChannel.WHATSAPP) {
          const mediaPath = hasFile ? req.file?.path : undefined;

          waId = await sendWhatsAppMessage(
            ticket.whatsapp!.id,
            ticket.contact.phoneNumber,
            messageBody,
            mediaUrl,
            mediaPath ? path.resolve(mediaPath) : undefined,
            { quotedWhatsAppMessageId, mimeType: req.file?.mimetype ?? null }
          );
        } else if (selectedChannel === MessageChannel.EMAIL) {
          const subject = `Atendimento WhatsKovi - Ticket ${ticketId}`;
          const emailResult = await sendEmailChannelMessage({
            to: ticket.contact.email!,
            subject,
            text: messageBody,
            html: `<p>${messageBody.replace(/\n/g, "<br />")}</p>`
          });
          deliveryMetadata.provider = "smtp";
          deliveryMetadata.messageId = emailResult.messageId;
        } else if (selectedChannel === MessageChannel.SMS) {
          const smsResult = await sendSmsChannelMessage(ticket.contact.phoneNumber, messageBody);
          deliveryMetadata.provider = "twilio";
          deliveryMetadata.sid = smsResult.sid;
          deliveryMetadata.status = smsResult.status ?? null;
        }

        // Verificar se a mensagem ainda existe antes de atualizar
        const existingMessage = await prisma.message.findUnique({ where: { id: message.id } });
        if (existingMessage) {
          finalMessage = await prisma.message.update({
            where: { id: message.id },
            data: {
              status: MessageStatus.SENT,
              deliveryMetadata: {
                ...deliveryMetadata,
                ...(waId ? { whatsappMessageId: waId } : {})
              }
            },
            include: messageInclude
          });
        }
      } catch (error) {
        // Verificar se a mensagem ainda existe antes de marcar como falha
        const existingMessage = await prisma.message.findUnique({ where: { id: message.id } });
        if (existingMessage) {
          await prisma.message.update({
            where: { id: message.id },
            data: {
              status: MessageStatus.FAILED
            }
          });
        }

        if (req.file) {
          fs.unlink(req.file.path).catch(() => undefined);
        }

        console.error("[Messages] Falha ao enviar mensagem no canal selecionado", error);
        return res.status(502).json({ error: "Falha ao enviar mensagem pelo canal selecionado" });
      }
    }

    if (!isPrivate) {
      await applyAutomaticTagsToTicket(ticketId, finalMessage.body ?? "");
    }

    io.emit("message:new", { ...finalMessage, ticketId });

    if (!isPrivate) {
      emitMessageEvent(finalMessage.id, "OUTBOUND").catch((integrationError) => {
        console.warn("[Integration] Falha ao notificar integracoes sobre mensagem enviada", integrationError);
      });
    }

    if (!isPrivate && selectedChannel === MessageChannel.WHATSAPP) {
      processMessageWithAi({
        ticketId,
        messageId: finalMessage.id,
        actor: "agent",
        skipPrivate: true
      }).catch((error) => {
        console.warn("[AI] Falha ao processar mensagem de agente", error);
      });
    }

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

    // Se a mensagem veio do WhatsApp, propaga a reação para o WhatsApp também
    if (message.channel === MessageChannel.WHATSAPP && !message.userId) {
      const meta = (message.deliveryMetadata as any) || {};
      if (typeof meta.whatsappMessageId === 'string' && message.ticketId) {
        const ticket = await prisma.ticket.findUnique({ where: { id: message.ticketId }, select: { whatsappId: true } });
        if (ticket?.whatsappId) {
          // Ignora falha de reação no WhatsApp, mas continua persistindo localmente
          await reactToWhatsAppMessage(ticket.whatsappId, meta.whatsappMessageId, emoji).catch(() => undefined);
        }
      }
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

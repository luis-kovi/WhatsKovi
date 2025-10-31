import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import fs from 'fs';
import path from 'path';
import qrcode from 'qrcode';
import { AutomationTrigger, MessageChannel, MessageStatus } from '@prisma/client';
import prisma from '../config/database';
import { io } from '../server';
import { applyAutomaticTagsToTicket } from './tagAutomation';
import { notifyIncomingTicketMessage, notifyNewTicketCreated } from './notificationTriggers';
import { processIncomingMessageForChatbot } from './chatbotEngine';
import { runAutomations } from './automationService';
import { processMessageWithAi } from './aiOrchestrator';
import { emitMessageEvent, emitTicketCreatedEvent } from './integrationService';

interface WhatsAppClient {
  id: string;
  client: Client;
  status: string;
}

const clients: Map<string, WhatsAppClient> = new Map();
const AI_CHATBOT_MODE = (process.env.AI_CHATBOT_MODE || 'assist').toLowerCase();

const uploadsDir = path.resolve(__dirname, '../../uploads');

const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
};

const storeIncomingMedia = (data: string, mimetype?: string | null) => {
  ensureUploadsDir();
  const extension = mimetype ? `.${mimetype.split('/')[1] || 'bin'}` : '';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
  return { filename, url: `/uploads/${filename}`, absolutePath: filePath };
};

const ticketResponseInclude = {
  contact: true,
  user: { select: { id: true, name: true, avatar: true } },
  queue: true,
  tags: { include: { tag: true } },
  messages: {
    orderBy: { createdAt: 'desc' },
    take: 1
  }
} as const;

export const initializeWhatsApp = async (connectionId: string) => {
  try {
    const connection = await prisma.whatsAppConnection.findUnique({
      where: { id: connectionId }
    });

    if (!connection) {
      throw new Error('Conexao nao encontrada');
    }

    const executablePath =
      process.env.CHROMIUM_PATH ||
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      '/usr/bin/chromium-browser';

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: connectionId }),
      puppeteer: {
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote'
        ]
      }
    });

    client.on('qr', async (qr) => {
      const qrCodeData = await qrcode.toDataURL(qr);

      await prisma.whatsAppConnection.update({
        where: { id: connectionId },
        data: { qrCode: qrCodeData, status: 'CONNECTING' }
      });

      io.emit('whatsapp:qr', { connectionId, qrCode: qrCodeData });
    });

    client.on('ready', async () => {
      const info = client.info;

      await prisma.whatsAppConnection.update({
        where: { id: connectionId },
        data: {
          status: 'CONNECTED',
          phoneNumber: info.wid.user,
          qrCode: null
        }
      });

      io.emit('whatsapp:ready', { connectionId, phoneNumber: info.wid.user });
    });

    client.on('disconnected', async () => {
      await prisma.whatsAppConnection.update({
        where: { id: connectionId },
        data: { status: 'DISCONNECTED' }
      });

      clients.delete(connectionId);
      io.emit('whatsapp:disconnected', { connectionId });
    });

    client.on('message', async (msg) => {
      await handleIncomingMessage(connectionId, msg);
    });

    await client.initialize();

    clients.set(connectionId, {
      id: connectionId,
      client,
      status: 'INITIALIZING'
    });

    return client;
  } catch (error) {
    console.error('Erro ao inicializar WhatsApp:', error);
    try {
      await prisma.whatsAppConnection.update({
        where: { id: connectionId },
        data: { status: 'ERROR', qrCode: null }
      });
      io.emit('whatsapp:error', {
        connectionId,
        message: error instanceof Error ? error.message : 'Falha ao iniciar conexao'
      });
    } catch (updateError) {
      console.error('Erro ao atualizar status da conexao:', updateError);
    }
    throw error;
  }
};

const handleIncomingMessage = async (connectionId: string, msg: any) => {
  try {
    const phoneNumber = msg.from.replace('@c.us', '');

    let contact = await prisma.contact.findUnique({
      where: { phoneNumber }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          name: msg._data?.notifyName || phoneNumber,
          phoneNumber
        }
      });
    }

    let ticket = await prisma.ticket.findFirst({
      where: {
        contactId: contact.id,
        whatsappId: connectionId,
        status: { in: ['PENDING', 'OPEN'] }
      }
    });

    if (!ticket) {
      const createdTicket = await prisma.ticket.create({
        data: {
          contactId: contact.id,
          whatsappId: connectionId,
          status: 'PENDING',
          priority: 'MEDIUM'
        },
        include: {
          contact: true,
          queue: true
        }
      });

      ticket = await prisma.ticket.findUnique({
        where: { id: createdTicket.id },
        include: ticketResponseInclude
      });

      if (!ticket) {
        return;
      }

      await runAutomations(AutomationTrigger.TICKET_CREATED, { ticketId: ticket.id });

      ticket =
        (await prisma.ticket.findUnique({
          where: { id: ticket.id },
          include: ticketResponseInclude
        })) ?? ticket;

      io.emit('ticket:new', ticket);
      await notifyNewTicketCreated(ticket);
      emitTicketCreatedEvent(ticket.id).catch((error) => {
        console.warn('[Integration] Failed to emit ticket.created event', error);
      });
    } else {
      ticket =
        (await prisma.ticket.findUnique({
          where: { id: ticket.id },
          include: ticketResponseInclude
        })) ?? ticket;
    }

    let mediaUrl: string | undefined;

    if (msg.hasMedia) {
      const media = await msg.downloadMedia();
      if (media?.data) {
        const stored = storeIncomingMedia(media.data, media.mimetype);
        mediaUrl = stored.url;
      }
    }

    const prismaMessage = await prisma.message.create({
      data: {
        body: msg.body || (mediaUrl ? 'Arquivo recebido' : ''),
        type:
          msg.type === 'chat'
            ? 'TEXT'
            : msg.type === 'image'
            ? 'IMAGE'
            : msg.type === 'video'
            ? 'VIDEO'
            : msg.type === 'audio'
            ? 'AUDIO'
            : msg.type.toUpperCase(),
        mediaUrl,
        ticketId: ticket.id,
        channel: MessageChannel.WHATSAPP,
        status: MessageStatus.RECEIVED
      }
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        lastMessageAt: new Date(),
        unreadMessages: { increment: 1 }
      }
    });

    await applyAutomaticTagsToTicket(ticket.id, prismaMessage.body ?? '');

    await runAutomations(AutomationTrigger.MESSAGE_RECEIVED, {
      ticketId: ticket.id,
      messageId: prismaMessage.id
    });

    ticket =
      (await prisma.ticket.findUnique({
        where: { id: ticket.id },
        include: ticketResponseInclude
      })) ?? ticket;

    io.emit('message:new', { ...prismaMessage, ticketId: ticket.id });
    await notifyIncomingTicketMessage(ticket, prismaMessage.body ?? '', { actorId: null });
    emitMessageEvent(prismaMessage.id, 'INBOUND').catch((error) => {
      console.warn('[Integration] Failed to emit message.received event', error);
    });
    await processIncomingMessageForChatbot({ ticketId: ticket.id, messageId: prismaMessage.id });

    const aiOutcome = await processMessageWithAi({
      ticketId: ticket.id,
      messageId: prismaMessage.id,
      actor: 'contact',
      skipPrivate: true
    });

    if (aiOutcome.autoReply) {
      if (AI_CHATBOT_MODE === 'auto' && aiOutcome.autoReply.shouldReply) {
        try {
          const contact = await prisma.contact.findUnique({
            where: { id: ticket.contactId },
            select: { phoneNumber: true }
          });

          if (!contact?.phoneNumber) {
            console.warn('[AI] Telefone do contato indisponivel, resposta automatica nao enviada');
          } else {
            await sendWhatsAppMessage(ticket.whatsappId, contact.phoneNumber, aiOutcome.autoReply.message);

            const botMessage = await prisma.message.create({
              data: {
                ticketId: ticket.id,
                body: aiOutcome.autoReply.message,
                type: 'TEXT',
                status: MessageStatus.SENT,
                channel: MessageChannel.WHATSAPP,
                isPrivate: false
              }
            });

            await prisma.ticket.update({
              where: { id: ticket.id },
              data: { lastMessageAt: new Date() }
            });

            await prisma.contact.update({
              where: { id: ticket.contactId },
              data: { lastInteractionAt: new Date() }
            });

            io.emit('message:new', { ...botMessage, ticketId: ticket.id });
            emitMessageEvent(botMessage.id, 'OUTBOUND').catch((error) => {
              console.warn('[Integration] Failed to emit message.sent event (auto reply)', error);
            });
          }
        } catch (error) {
          console.error('[AI] Falha ao enviar resposta automática', error);
        }
      } else if (aiOutcome.autoReply.shouldReply) {
        io.emit('ai:chatbotSuggestion', {
          ticketId: ticket.id,
          messageId: prismaMessage.id,
          reply: aiOutcome.autoReply
        });
      }
    }
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
};

export const sendWhatsAppMessage = async (
  connectionId: string,
  phoneNumber: string,
  message: string,
  mediaUrl?: string | null,
  mediaPath?: string
) => {
  try {
    const clientData = clients.get(connectionId);

    if (!clientData) {
      throw new Error('Cliente WhatsApp nao encontrado');
    }

    const chatId = `${phoneNumber}@c.us`;

    if (mediaPath) {
      const media = MessageMedia.fromFilePath(mediaPath);
      await clientData.client.sendMessage(chatId, media, {
        caption: message
      });
    } else {
      await clientData.client.sendMessage(chatId, message);
    }

    return true;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
};

export const disconnectWhatsApp = async (connectionId: string) => {
  try {
    const clientData = clients.get(connectionId);

    if (clientData) {
      await clientData.client.destroy();
      clients.delete(connectionId);
    }

    await prisma.whatsAppConnection.update({
      where: { id: connectionId },
      data: { status: 'DISCONNECTED', qrCode: null }
    });

    return true;
  } catch (error) {
    console.error('Erro ao desconectar WhatsApp:', error);
    throw error;
  }
};

export const getClient = (connectionId: string) => {
  return clients.get(connectionId);
};

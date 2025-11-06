import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import qrcode from 'qrcode';
import { AutomationTrigger, MessageChannel, MessageStatus, TicketStatus } from '@prisma/client';
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

// Baixa uma URL para a pasta de uploads e retorna o caminho salvo
const downloadUrlToUploads = async (url: string) => {
  ensureUploadsDir();
  const res = await fetch(url).catch(() => null as any);
  if (!res || !res.ok) return null;
  const contentType = res.headers.get('content-type');
  const ext = contentType ? `.${(contentType.split('/')[1] || 'bin').split(';')[0]}` : '';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const filePath = path.join(uploadsDir, filename);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  return { filename, url: `/uploads/${filename}`, absolutePath: filePath } as const;
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

    // Sincroniza avatar do contato usando a foto de perfil do WhatsApp, quando disponivel
    try {
      const clientData = getClient(connectionId);
      const profileUrl = await clientData?.client.getProfilePicUrl(msg.from);
      if (profileUrl) {
        const saved = await downloadUrlToUploads(profileUrl).catch(() => null);
        if (saved && contact.avatar !== saved.url) {
          await prisma.contact.update({ where: { id: contact.id }, data: { avatar: saved.url } });
        }
      }
    } catch {
      // ignorar erros ao recuperar avatar
    }

    let ticket = await prisma.ticket.findFirst({
      where: {
        contactId: contact.id,
        whatsappId: connectionId,
        status: { in: [TicketStatus.BOT, TicketStatus.PENDING, TicketStatus.OPEN] }
      }
    });

    if (!ticket) {
      const createdTicket = await prisma.ticket.create({
        data: {
          contactId: contact.id,
          whatsappId: connectionId,
          status: TicketStatus.BOT,
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
      if (ticket.status !== TicketStatus.BOT) {
        await notifyNewTicketCreated(ticket);
      }
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

    const incomingType =
      msg.type === 'chat'
        ? 'TEXT'
        : msg.type === 'image'
        ? 'IMAGE'
        : msg.type === 'video'
        ? 'VIDEO'
        : msg.type === 'audio' || msg.type === 'ptt' || msg.type === 'voice'
        ? 'AUDIO'
        : msg.type === 'document'
        ? 'DOCUMENT'
        : 'TEXT';

    const prismaMessage = await prisma.message.create({
      data: {
        body: msg.body || (mediaUrl ? 'Arquivo recebido' : ''),
        type: incomingType as any,
        mediaUrl,
        ticketId: ticket.id,
        channel: MessageChannel.WHATSAPP,
        status: MessageStatus.RECEIVED,
        deliveryMetadata: {
          whatsappMessageId: msg.id?._serialized ?? null
        } as any
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

    // Atualiza lista de tickets (inclui avatar sincronizado do contato)
    io.emit('ticket:update', ticket);
    io.emit('message:new', { ...prismaMessage, ticketId: ticket.id });
    if (ticket.status !== TicketStatus.BOT) {
      await notifyIncomingTicketMessage(ticket, prismaMessage.body ?? '', { actorId: null });
    }
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
                isPrivate: false,
                deliveryMetadata: {
                  source: 'CHATBOT',
                  author: 'KOVINHO 🤖',
                  context: 'AUTO_REPLY'
                }
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
  mediaPath?: string,
  options?: { quotedWhatsAppMessageId?: string; mimeType?: string | null }
) => {
  try {
    const clientData = clients.get(connectionId);

    if (!clientData) {
      throw new Error('Cliente WhatsApp nao encontrado');
    }

    const chatId = `${phoneNumber}@c.us`;

    let sent: any;
    if (mediaPath) {
      let finalMediaPath = mediaPath;
      
      // Converter webm para ogg se for áudio
      if (options?.mimeType?.startsWith('audio/') && mediaPath.endsWith('.webm')) {
        const oggPath = mediaPath.replace('.webm', '.ogg');
        try {
          execSync(`ffmpeg -i "${mediaPath}" -c:a libopus -b:a 64k "${oggPath}"`, { stdio: 'ignore' });
          finalMediaPath = oggPath;
          // Remover arquivo webm original
          fs.unlinkSync(mediaPath);
        } catch (conversionError) {
          console.error('Erro ao converter audio:', conversionError);
          // Se falhar, tenta enviar o original mesmo
        }
      }
      
      const media = MessageMedia.fromFilePath(finalMediaPath);
      const extra: any = {};
      
      if (options?.mimeType?.startsWith('audio/')) {
        extra.sendAudioAsVoice = true;
      } else if (message) {
        extra.caption = message;
      }
      
      if (options?.quotedWhatsAppMessageId) {
        extra.quotedMessageId = options.quotedWhatsAppMessageId;
      }
      sent = await clientData.client.sendMessage(chatId, media, extra);
    } else {
      const extra: any = {};
      if (options?.quotedWhatsAppMessageId) {
        extra.quotedMessageId = options.quotedWhatsAppMessageId;
      }
      sent = await clientData.client.sendMessage(chatId, message, extra);
    }

    const waId: string | null = sent?.id?._serialized ?? null;
    return waId;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
};

export const reactToWhatsAppMessage = async (
  connectionId: string,
  whatsappMessageId: string,
  emoji: string
) => {
  try {
    const clientData = clients.get(connectionId);
    if (!clientData) throw new Error('Cliente WhatsApp nao encontrado');
    const target = await (clientData.client as any).getMessageById(whatsappMessageId);
    if (!target) throw new Error('Mensagem WhatsApp nao encontrada');
    await target.react(emoji);
    return true;
  } catch (error) {
    console.error('Erro ao reagir a mensagem no WhatsApp:', error);
    return false;
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

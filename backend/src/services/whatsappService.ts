import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import prisma from '../config/database';
import { io } from '../server';

interface WhatsAppClient {
  id: string;
  client: Client;
  status: string;
}

const clients: Map<string, WhatsAppClient> = new Map();

export const initializeWhatsApp = async (connectionId: string) => {
  try {
    const connection = await prisma.whatsAppConnection.findUnique({
      where: { id: connectionId }
    });

    if (!connection) {
      throw new Error('Conexão não encontrada');
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: connectionId }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
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
          name: msg._data.notifyName || phoneNumber,
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
      ticket = await prisma.ticket.create({
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

      io.emit('ticket:new', ticket);
    }

    const message = await prisma.message.create({
      data: {
        body: msg.body,
        type: msg.type === 'chat' ? 'TEXT' : msg.type.toUpperCase(),
        ticketId: ticket.id,
        status: 'RECEIVED'
      }
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        lastMessageAt: new Date(),
        unreadMessages: { increment: 1 }
      }
    });

    io.emit('message:new', { ...message, ticketId: ticket.id });
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
};

export const sendWhatsAppMessage = async (
  connectionId: string,
  phoneNumber: string,
  message: string,
  mediaUrl?: string
) => {
  try {
    const clientData = clients.get(connectionId);

    if (!clientData) {
      throw new Error('Cliente WhatsApp não encontrado');
    }

    const chatId = `${phoneNumber}@c.us`;
    
    if (mediaUrl) {
      await clientData.client.sendMessage(chatId, message, { media: mediaUrl });
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

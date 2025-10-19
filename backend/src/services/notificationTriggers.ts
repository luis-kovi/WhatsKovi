import { NotificationType } from '@prisma/client';
import prisma from '../config/database';
import { dispatchNotification } from './notificationService';

type BasicUser = {
  id: string;
  name?: string | null;
};

type TicketContext = {
  id: string;
  queueId?: string | null;
  userId?: string | null;
  contact?: {
    name?: string | null;
  } | null;
  queue?: {
    name?: string | null;
  } | null;
  user?: BasicUser | null;
};

const previewMessage = (body?: string | null, maxLength = 140) => {
  if (!body) return '';
  return body.length > maxLength ? `${body.slice(0, maxLength).trim()}...` : body;
};

const loadQueueMemberIds = async (queueId: string) => {
  const members = await prisma.queueUser.findMany({
    where: { queueId },
    select: { userId: true }
  });
  return members.map((member) => member.userId);
};

const loadAdminIds = async () => {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPERVISOR'] } },
    select: { id: true }
  });
  return admins.map((admin) => admin.id);
};

const dispatchToRecipients = async (
  recipientIds: Iterable<string>,
  payloadFactory: (userId: string) => Parameters<typeof dispatchNotification>[0]
) => {
  const uniqueIds = new Set(recipientIds);

  if (uniqueIds.size === 0) {
    return;
  }

  await Promise.all(
    Array.from(uniqueIds).map((userId) => dispatchNotification(payloadFactory(userId)))
  );
};

export const notifyNewTicketCreated = async (
  ticket: TicketContext,
  actorId?: string | null
) => {
  const recipients: string[] = [];

  if (ticket.queueId) {
    recipients.push(...(await loadQueueMemberIds(ticket.queueId)));
  } else {
    recipients.push(...(await loadAdminIds()));
  }

  if (ticket.userId) {
    recipients.push(ticket.userId);
  }

  if (actorId) {
    const filtered = recipients.filter((id) => id !== actorId);
    recipients.length = 0;
    recipients.push(...filtered);
  }

  await dispatchToRecipients(recipients, (userId) => ({
    userId,
    type: NotificationType.NEW_TICKET,
    title: `Novo ticket: ${ticket.contact?.name ?? 'Contato'}`,
    body: ticket.queue?.name
      ? `Ticket disponível na fila ${ticket.queue.name}.`
      : 'Novo ticket aguardando atendimento.',
    data: {
      ticketId: ticket.id,
      queueId: ticket.queueId ?? null,
      contactName: ticket.contact?.name ?? null
    },
    email: {
      template: 'new-ticket',
      context: {
        ticketId: ticket.id,
        contactName: ticket.contact?.name ?? undefined,
        queueName: ticket.queue?.name ?? undefined
      }
    },
    push: {
      title: 'Novo ticket disponível',
      body: ticket.contact?.name
        ? `${ticket.contact.name} aguardando atendimento`
        : 'Um contato abriu um novo ticket',
      data: {
        ticketId: ticket.id
      }
    }
  }));
};

export const notifyTicketTransferred = async (
  ticket: TicketContext,
  actor?: BasicUser | null
) => {
  if (!ticket.userId) {
    return;
  }

  if (actor && actor.id === ticket.userId) {
    return;
  }

  await dispatchNotification({
    userId: ticket.userId,
    type: NotificationType.TICKET_TRANSFER,
    title: 'Ticket transferido para você',
    body: ticket.contact?.name
      ? `${ticket.contact.name} agora está sob sua responsabilidade.`
      : 'Um ticket foi atribuído a você.',
    data: {
      ticketId: ticket.id,
      queueId: ticket.queueId ?? null
    },
    email: {
      template: 'ticket-transfer',
      context: {
        ticketId: ticket.id,
        contactName: ticket.contact?.name ?? undefined,
        queueName: ticket.queue?.name ?? undefined,
        actorName: actor?.name ?? undefined
      }
    },
    push: {
      title: 'Ticket transferido',
      body: ticket.contact?.name
        ? `${ticket.contact.name} foi transferido para você`
        : 'Um ticket foi transferido para você',
      data: {
        ticketId: ticket.id
      }
    }
  });
};

export const notifyIncomingTicketMessage = async (
  ticket: TicketContext,
  messageBody: string,
  options?: {
    actorId?: string | null;
  }
) => {
  const recipients: string[] = [];

  if (ticket.userId) {
    recipients.push(ticket.userId);
  } else if (ticket.queueId) {
    recipients.push(...(await loadQueueMemberIds(ticket.queueId)));
  } else {
    recipients.push(...(await loadAdminIds()));
  }

  const filteredRecipients = options?.actorId
    ? recipients.filter((id) => id !== options.actorId)
    : recipients;

  await dispatchToRecipients(filteredRecipients, (userId) => ({
    userId,
    type: NotificationType.TICKET_MESSAGE,
    title: ticket.contact?.name
      ? `Nova mensagem de ${ticket.contact.name}`
      : 'Nova mensagem recebida',
    body: previewMessage(messageBody),
    data: {
      ticketId: ticket.id,
      queueId: ticket.queueId ?? null
    },
    email: {
      template: 'ticket-message',
      context: {
        ticketId: ticket.id,
        contactName: ticket.contact?.name ?? undefined,
        messagePreview: previewMessage(messageBody)
      }
    },
    push: {
      title: ticket.contact?.name
        ? `${ticket.contact.name} enviou uma mensagem`
        : 'Mensagem recebida',
      body: previewMessage(messageBody),
      data: {
        ticketId: ticket.id
      }
    }
  }));
};

import { ChatbotSender, MessageChannel, MessageStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';
import {
  ChatbotFlowDefinition,
  ChatbotInputNode,
  ChatbotNode,
  ChatbotQuestionNode,
  ChatbotSchedule,
  ChatbotSessionHistoryItem,
  ChatbotSessionState
} from '../types/chatbot';
import { sendWhatsAppMessage } from './whatsappService';
import { io } from '../server';
import { ticketInclude } from '../utils/ticketInclude';
import { emitMessageEvent } from './integrationService';

type TicketChatbotContext = Prisma.TicketGetPayload<{
  include: {
    contact: true;
    whatsapp: true;
    queue: true;
    user: { select: { id: true; name: true; avatar: true } };
  };
}>;

type MessagePayload = Prisma.MessageGetPayload<{
  include: {
    user: { select: { id: true; name: true; avatar: true } };
    reactions: true;
    quotedMessage: {
      select: {
        id: true;
        body: true;
        type: true;
        mediaUrl: true;
        createdAt: true;
        user: { select: { id: true; name: true; avatar: true } };
      };
    };
  };
}>;

type FlowRunResult = {
  state: ChatbotSessionState;
  nextNodeId: string | null;
  completed: boolean;
  transferQueueId?: string | null;
  retryMessages: Array<{ nodeId: string; message: string }>;
  botMessages: Array<{ nodeId: string; message: string }>;
};

const dayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

const messageInclude = {
  user: { select: { id: true, name: true, avatar: true } },
  reactions: true,
  quotedMessage: {
    select: {
      id: true,
      body: true,
      type: true,
      mediaUrl: true,
      createdAt: true,
      user: { select: { id: true, name: true, avatar: true } }
    }
  }
} as const;

const ensureString = (value: unknown) => (typeof value === 'string' ? value : '');

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

export const parseFlowDefinition = (value: Prisma.JsonValue): ChatbotFlowDefinition => {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid chatbot flow definition');
  }

  const candidate = value as Record<string, unknown>;
  const nodes = Array.isArray(candidate.nodes) ? (candidate.nodes as ChatbotNode[]) : [];
  const entryNodeId = ensureString(candidate.entryNodeId);

  if (entryNodeId.length === 0) {
    throw new Error('Chatbot flow definition missing entryNodeId');
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  if (!nodeIds.has(entryNodeId)) {
    throw new Error('Chatbot flow definition entry node not found in nodes array');
  }

  return {
    entryNodeId,
    nodes,
    metadata: (candidate.metadata as Record<string, unknown> | undefined) ?? undefined,
    version: ensureString(candidate.version)
  };
};

const parseSchedule = (value: Prisma.JsonValue | null): ChatbotSchedule | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const schedule = value as Record<string, unknown>;
  const timezone = ensureString(schedule.timezone) || 'UTC';
  const windows = Array.isArray(schedule.windows) ? schedule.windows : [];

  return {
    enabled:
      typeof schedule.enabled === 'boolean' ? schedule.enabled : windows.length > 0 ? true : false,
    timezone,
    windows: windows
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const data = entry as Record<string, unknown>;
        const days = Array.isArray(data.days) ? data.days.filter((day) => typeof day === 'number') : [];
        const start = ensureString(data.start);
        const end = ensureString(data.end);

        if (days.length === 0 || start.length === 0 || end.length === 0) {
          return null;
        }

        return { days, start, end };
      })
      .filter((window): window is { days: number[]; start: string; end: string } => Boolean(window)),
    fallbackMessage: ensureString(schedule.fallbackMessage) || undefined
  };
};

const parseSessionState = (value: Prisma.JsonValue | null | undefined): ChatbotSessionState => {
  if (!value || typeof value !== 'object') {
    return {
      history: [],
      collectedData: {}
    };
  }

  const data = value as Record<string, unknown>;
  const history: ChatbotSessionHistoryItem[] = [];

  if (Array.isArray(data.history)) {
    for (const rawItem of data.history) {
      if (!rawItem || typeof rawItem !== 'object') {
        continue;
      }
      const item = rawItem as Record<string, unknown>;
      const nodeId = ensureString(item.nodeId);
      if (!nodeId) {
        continue;
      }
      history.push({
        nodeId,
        input: ensureString(item.input) || undefined,
        occurredAt: ensureString(item.occurredAt) || new Date().toISOString()
      });
    }
  }

  return {
    history,
    collectedData:
      data.collectedData && typeof data.collectedData === 'object'
        ? (data.collectedData as Record<string, string>)
        : {},
    waitingFor:
      data.waitingFor && typeof data.waitingFor === 'object'
        ? (() => {
            const waiting = data.waitingFor as Record<string, unknown>;
            const nodeId = ensureString(waiting.nodeId);
            const type = ensureString(waiting.type);
            if (!nodeId || !['question', 'input'].includes(type)) {
              return undefined;
            }
            return {
              nodeId,
              type: type as 'question' | 'input'
            };
          })()
        : undefined,
    completed: typeof data.completed === 'boolean' ? data.completed : undefined
  };
};

const convertHourToMinutes = (value: string) => {
  const [hour, minute] = value.split(':');
  const hours = Number.parseInt(hour ?? '0', 10);
  const minutes = Number.parseInt(minute ?? '0', 10);
  return hours * 60 + minutes;
};

const isWithinOperatingHours = (schedule: ChatbotSchedule | null, now = new Date()) => {
  if (!schedule || schedule.enabled === false || schedule.windows.length === 0) {
    return true;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: schedule.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short'
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? 'Sun';
  const hour = Number.parseInt(parts.find((part) => part.type === 'hour')?.value ?? '0', 10);
  const minute = Number.parseInt(parts.find((part) => part.type === 'minute')?.value ?? '0', 10);
  const totalMinutes = hour * 60 + minute;
  const dayNumber = dayMap[weekday] ?? 0;

  return schedule.windows.some((window) => {
    if (!window.days.includes(dayNumber)) {
      return false;
    }
    const startMinutes = convertHourToMinutes(window.start);
    const endMinutes = convertHourToMinutes(window.end);
    return totalMinutes >= startMinutes && totalMinutes <= endMinutes;
  });
};

const matchesKeywords = (keywords: string[], text: string) => {
  if (keywords.length === 0) {
    return false;
  }
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
};

const formatQuestionPrompt = (node: ChatbotQuestionNode) => {
  if (!Array.isArray(node.options) || node.options.length === 0) {
    return node.content;
  }

  const lines = node.options.map((option, index) => {
    const label = option.label ?? option.value;
    return `${index + 1}. ${label}`;
  });

  return `${node.content}\n${lines.join('\n')}`;
};

const validateInputNodeValue = (node: ChatbotInputNode, value: string) => {
  const trimmed = value.trim();
  const validation = node.validation;

  if (!trimmed) {
    return {
      ok: false,
      message: validation?.message ?? 'Preciso dessa informacao para continuar.'
    };
  }

  if (!validation) {
    return { ok: true };
  }

  if (typeof validation.minLength === 'number' && trimmed.length < validation.minLength) {
    return {
      ok: false,
      message:
        validation.message ?? `Informe um valor com pelo menos ${validation.minLength} caracteres.`
    };
  }

  if (typeof validation.maxLength === 'number' && trimmed.length > validation.maxLength) {
    return {
      ok: false,
      message:
        validation.message ?? `Informe um valor com no maximo ${validation.maxLength} caracteres.`
    };
  }

  switch (validation.type) {
    case 'number':
      if (!/^-?\\d+(?:[\\.,]\\d+)?$/.test(trimmed)) {
        return { ok: false, message: validation.message ?? 'Esse campo aceita apenas numeros.' };
      }
      break;
    case 'email':
      if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(trimmed)) {
        return { ok: false, message: validation.message ?? 'Informe um email valido.' };
      }
      break;
    case 'phone': {
      const numbers = trimmed.replace(/\\D/g, '');
      if (numbers.length < 10 || numbers.length > 14) {
        return {
          ok: false,
          message: validation.message ?? 'Informe um telefone valido com DDD.'
        };
      }
      break;
    }
    default:
      break;
  }

  if (validation.regex) {
    try {
      const regex = new RegExp(validation.regex);
      if (!regex.test(trimmed)) {
        return { ok: false, message: validation.message ?? 'Valor informado invalido.' };
      }
    } catch (error) {
      console.warn('[chatbot] Invalid regex on node', node.id, error);
    }
  }

  return { ok: true };
};

const cloneState = (state: ChatbotSessionState): ChatbotSessionState => ({
  history: [...state.history],
  collectedData: { ...state.collectedData },
  waitingFor: state.waitingFor ? { ...state.waitingFor } : undefined,
  completed: state.completed
});

const runFlow = (
  definition: ChatbotFlowDefinition,
  params: {
    state: ChatbotSessionState;
    currentNodeId: string | null;
    input?: string | null;
    consumeInput?: boolean;
    timestamp?: Date;
  }
): FlowRunResult => {
  const nodesMap = new Map(definition.nodes.map((node) => [node.id, node]));
  const timestamp = params.timestamp ?? new Date();

  const state = cloneState(params.state);
  const outputs: Array<{ nodeId: string; message: string }> = [];
  const retryMessages: Array<{ nodeId: string; message: string }> = [];

  let nextNodeId: string | null | undefined =
    params.currentNodeId ?? definition.entryNodeId ?? null;
  let completed = false;
  let transferQueueId: string | null | undefined;
  const input = params.input ?? '';
  const consumeInput = params.consumeInput !== false;

  const pushHistory = (nodeId: string, inputValue?: string) => {
    state.history.push({
      nodeId,
      input: inputValue,
      occurredAt: timestamp.toISOString()
    });
  };

  const resolveOptionMatch = (
    node: ChatbotQuestionNode,
    value: string
  ):
    | { nodeId: string; nextNode: string | null; storedValue?: string; capturedInput: string }
    | null => {
    const normalized = normalizeText(value);
    if (!normalized) {
      return null;
    }

    const options = node.options ?? [];

    for (let index = 0; index < options.length; index += 1) {
      const option = options[index];
      const optionValue = option.value ?? `option_${index + 1}`;
      const candidates = [
        option.value,
        option.label,
        ...(Array.isArray(option.keywords) ? option.keywords : []),
        String(index + 1)
      ]
        .filter(Boolean)
        .map((candidate) => normalizeText(String(candidate)));

      if (candidates.includes(normalized)) {
        return {
          nodeId: node.id,
          nextNode: option.next ?? node.next ?? null,
          storedValue: option.storeValue ?? optionValue,
          capturedInput: optionValue
        };
      }
    }

    if (node.allowFreeText) {
      return {
        nodeId: node.id,
        nextNode: node.defaultNext ?? node.next ?? null,
        storedValue: node.storeField ? value : undefined,
        capturedInput: value
      };
    }

    return null;
  };

  if (state.waitingFor && consumeInput) {
    const pendingNode = nodesMap.get(state.waitingFor.nodeId);

    if (!pendingNode) {
      state.waitingFor = undefined;
    } else if (state.waitingFor.type === 'question' && pendingNode.type === 'question') {
      const match = resolveOptionMatch(pendingNode, input);
      if (!match) {
        retryMessages.push({
          nodeId: pendingNode.id,
          message: pendingNode.retryMessage ?? 'Nao entendi. Pode escolher uma das opcoes disponiveis?'
        });
        nextNodeId = pendingNode.id;
        return {
          state,
          nextNodeId,
          completed: false,
          transferQueueId,
          retryMessages,
          botMessages: outputs
        };
      }

      if (pendingNode.storeField && match.storedValue !== undefined) {
        state.collectedData[pendingNode.storeField] = match.storedValue;
      }

      pushHistory(pendingNode.id, match.capturedInput);
      state.waitingFor = undefined;
      nextNodeId = match.nextNode;
    } else if (state.waitingFor.type === 'input' && pendingNode.type === 'input') {
      const validation = validateInputNodeValue(pendingNode, input);
      if (!validation.ok) {
        retryMessages.push({
          nodeId: pendingNode.id,
          message: validation.message ?? 'Nao entendi. Pode informar novamente?'
        });
        nextNodeId = pendingNode.id;
        return {
          state,
          nextNodeId,
          completed: false,
          transferQueueId,
          retryMessages,
          botMessages: outputs
        };
      }

      const storeKey = pendingNode.storeField ?? pendingNode.field;
      state.collectedData[storeKey] = input.trim();
      pushHistory(pendingNode.id, input.trim());
      state.waitingFor = undefined;
      nextNodeId = pendingNode.next ?? null;
    }
  }

  let safety = 0;
  let currentNodeId = nextNodeId ?? null;

  while (currentNodeId && safety < 50) {
    safety += 1;
    const node = nodesMap.get(currentNodeId);
    if (!node) {
      break;
    }

    switch (node.type) {
      case 'message': {
        const message = ensureString((node as any).content);
        if (message) {
          outputs.push({ nodeId: node.id, message });
          pushHistory(node.id);
        }
        currentNodeId = node.next ?? null;
        nextNodeId = node.next ?? null;
        break;
      }
      case 'question': {
        const prompt = formatQuestionPrompt(node as ChatbotQuestionNode);
        outputs.push({ nodeId: node.id, message: prompt });
        state.waitingFor = { nodeId: node.id, type: 'question' };
        nextNodeId = node.id;
        currentNodeId = null;
        break;
      }
      case 'input': {
        const prompt = ensureString((node as any).content);
        outputs.push({ nodeId: node.id, message: prompt });
        state.waitingFor = { nodeId: node.id, type: 'input' };
        nextNodeId = node.id;
        currentNodeId = null;
        break;
      }
      case 'transfer': {
        const message = ensureString((node as any).message);
        if (message) {
          outputs.push({ nodeId: node.id, message });
        }
        transferQueueId = (node as any).queueId ?? null;
        pushHistory(node.id);
        currentNodeId = node.next ?? null;
        nextNodeId = node.next ?? null;
        if (!currentNodeId) {
          completed = true;
          state.completed = true;
        }
        break;
      }
      case 'end': {
        const message = ensureString((node as any).content);
        if (message) {
          outputs.push({ nodeId: node.id, message });
        }
        pushHistory(node.id);
        completed = true;
        state.waitingFor = undefined;
        state.completed = true;
        nextNodeId = node.id;
        currentNodeId = null;
        break;
      }
      default: {
        currentNodeId = null;
        break;
      }
    }
  }

  return {
    state,
    nextNodeId: nextNodeId ?? null,
    completed,
    transferQueueId,
    retryMessages,
    botMessages: outputs
  };
};

const dispatchBotMessages = async (
  ticket: TicketChatbotContext,
  sessionId: string,
  messages: Array<{ nodeId: string; message: string }>
) => {
  if (messages.length === 0) {
    return;
  }

  const now = new Date();

  for (const entry of messages) {
    const content = entry.message.trim();
    if (!content) {
      continue;
    }

    let persisted: MessagePayload | null = null;
    try {
      persisted = await prisma.message.create({
        data: {
          body: content,
          type: 'TEXT',
          status: MessageStatus.SENT,
          channel: MessageChannel.WHATSAPP,
          ticketId: ticket.id
        },
        include: messageInclude
      });
    } catch (error) {
      console.error('[chatbot] Failed to persist bot message', error);
    }

    try {
      await prisma.chatbotInteraction.create({
        data: {
          sessionId,
          sender: ChatbotSender.BOT,
          nodeId: entry.nodeId,
          message: content
        }
      });
    } catch (error) {
      console.error('[chatbot] Failed to record bot interaction', error);
    }

    try {
      await sendWhatsAppMessage(ticket.whatsappId, ticket.contact.phoneNumber, content);
    } catch (error) {
      console.error('[chatbot] Failed to send WhatsApp message', error);
    }

    if (persisted) {
      io.emit('message:new', { ...persisted, ticketId: ticket.id });
      emitMessageEvent(persisted.id, 'OUTBOUND').catch((error) => {
        console.warn('[Integration] Failed to emit chatbot message event', error);
      });
    }
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { lastMessageAt: now }
  });

  await prisma.contact.update({
    where: { id: ticket.contactId },
    data: { lastInteractionAt: now }
  });
};

const sendOfflineMessage = async (ticket: TicketChatbotContext, message: string) => {
  const content = message.trim();
  if (!content) {
    return;
  }

  let persisted: MessagePayload | null = null;
  try {
    persisted = await prisma.message.create({
      data: {
        body: content,
        type: 'TEXT',
        status: MessageStatus.SENT,
        channel: MessageChannel.WHATSAPP,
        ticketId: ticket.id
      },
      include: messageInclude
    });
  } catch (error) {
    console.error('[chatbot] Failed to persist offline message', error);
  }

  try {
    await sendWhatsAppMessage(ticket.whatsappId, ticket.contact.phoneNumber, content);
  } catch (error) {
    console.error('[chatbot] Failed to send offline message', error);
  }

  if (persisted) {
    io.emit('message:new', { ...persisted, ticketId: ticket.id });
    emitMessageEvent(persisted.id, 'OUTBOUND').catch((error) => {
      console.warn('[Integration] Failed to emit offline chatbot message event', error);
    });
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { lastMessageAt: new Date() }
  });
};

const selectFlowForMessage = (
  flows: Array<
    Prisma.ChatbotFlowGetPayload<{
      include: { queue: true };
    }>
  >,
  messageBody: string
) => {
  const text = messageBody.trim();

  let fallbackFlow: typeof flows[number] | null = null;

  for (const flow of flows) {
    if (flow.triggerType === 'MANUAL') {
      continue;
    }

    if (flow.triggerType === 'DEFAULT') {
      fallbackFlow = flow;
      continue;
    }

    if (matchesKeywords(flow.keywords ?? [], text)) {
      return flow;
    }
  }

  return fallbackFlow;
};

const performTransfer = async (
  ticket: TicketChatbotContext,
  sessionId: string,
  queueIdFromNode?: string | null,
  fallbackQueueId?: string | null
) => {
  const targetQueueId = queueIdFromNode ?? fallbackQueueId ?? ticket.queueId ?? null;

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      queueId: targetQueueId ?? undefined,
      userId: null,
      status: ticket.status === 'CLOSED' ? 'OPEN' : ticket.status
    },
    include: ticketInclude
  });

  await prisma.chatbotSession.update({
    where: { id: sessionId },
    data: { transferredAt: new Date() }
  });

  io.emit('ticket:update', updatedTicket);
};

export const processIncomingMessageForChatbot = async (params: {
  ticketId: string;
  messageId: string;
}) => {
  try {
    const [ticket, message] = await Promise.all([
      prisma.ticket.findUnique({
        where: { id: params.ticketId },
        include: {
          contact: true,
          whatsapp: true,
          queue: true,
          user: { select: { id: true, name: true, avatar: true } }
        }
      }),
      prisma.message.findUnique({
        where: { id: params.messageId },
        select: { id: true, body: true, type: true }
      })
    ]);

    if (!ticket || !ticket.contact || !ticket.whatsapp || !message) {
      return;
    }

    if (ticket.userId) {
      return;
    }

    const messageBody = ensureString(message.body);
    let session = await prisma.chatbotSession.findFirst({
      where: {
        ticketId: ticket.id,
        completedAt: null
      },
      orderBy: { createdAt: 'desc' },
      include: { flow: true }
    });

    if (!session) {
      const flows = await prisma.chatbotFlow.findMany({
        where: { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        include: { queue: true }
      });

      if (flows.length === 0) {
        return;
      }

      const selectedFlow = selectFlowForMessage(flows, messageBody);

      if (!selectedFlow) {
        return;
      }

      const schedule = parseSchedule(selectedFlow.schedule);
      if (!isWithinOperatingHours(schedule, new Date())) {
        const offlineMessage =
          schedule?.fallbackMessage ??
          selectedFlow.offlineMessage ??
          'No momento estamos fora do nosso horario de atendimento. Assim que possivel, retornaremos o contato.';
        await sendOfflineMessage(ticket, offlineMessage);
        return;
      }

      const initialState: ChatbotSessionState = {
        history: [],
        collectedData: {}
      };
      const newSession = await prisma.chatbotSession.create({
        data: {
          flowId: selectedFlow.id,
          ticketId: ticket.id,
          contactId: ticket.contactId,
          currentNodeId: selectedFlow.entryNodeId,
          state: initialState as unknown as Prisma.InputJsonValue
        },
        include: { flow: true }
      });

      await prisma.chatbotInteraction.create({
        data: {
          sessionId: newSession.id,
          sender: ChatbotSender.CONTACT,
          message: messageBody,
          metadata: { messageId: message.id }
        }
      });

      const definition = parseFlowDefinition(newSession.flow.definition);
      const result = runFlow(definition, {
        state: initialState,
        currentNodeId: definition.entryNodeId,
        consumeInput: false
      });

      if (result.botMessages.length > 0) {
        await dispatchBotMessages(ticket, newSession.id, result.botMessages);
      }

      if (result.retryMessages.length > 0) {
        await dispatchBotMessages(ticket, newSession.id, result.retryMessages);
      }

      await prisma.chatbotSession.update({
        where: { id: newSession.id },
        data: {
          state: result.state as unknown as Prisma.InputJsonValue,
          currentNodeId: result.nextNodeId ?? newSession.currentNodeId,
          completedAt: result.completed ? new Date() : null
        }
      });

      if (result.transferQueueId !== undefined) {
        await performTransfer(ticket, newSession.id, result.transferQueueId, newSession.flow.transferQueueId);
      }

      return;
    }
    if (!session) {
      return;
    }
    await prisma.chatbotInteraction.create({
      data: {
        sessionId: session.id,
        sender: ChatbotSender.CONTACT,
        message: messageBody,
        metadata: { messageId: message.id }
      }
    });

    const definition = parseFlowDefinition(session.flow.definition);
    const state = parseSessionState(session.state);

    const result = runFlow(definition, {
      state,
      currentNodeId: session.currentNodeId,
      input: messageBody,
      consumeInput: true
    });

    if (result.botMessages.length > 0) {
      await dispatchBotMessages(ticket, session.id, result.botMessages);
    }

    if (result.retryMessages.length > 0) {
      await dispatchBotMessages(ticket, session.id, result.retryMessages);
      // if retry, do not progress state to avoid clearing waiting node
      result.state.waitingFor = state.waitingFor;
      result.nextNodeId = state.waitingFor?.nodeId ?? result.nextNodeId;
    }

    await prisma.chatbotSession.update({
      where: { id: session.id },
      data: {
        state: result.state as unknown as Prisma.InputJsonValue,
        currentNodeId: result.nextNodeId,
        completedAt: result.completed ? new Date() : session.completedAt,
        transferredAt: result.transferQueueId ? new Date() : session.transferredAt
      }
    });

    if (result.transferQueueId !== undefined) {
      await performTransfer(ticket, session.id, result.transferQueueId, session.flow.transferQueueId);
    }
  } catch (error) {
    console.error('[chatbot] Failed to process incoming message', error);
  }
};

export const simulateFlow = async (flowId: string, messages: string[]) => {
  const flow = await prisma.chatbotFlow.findUnique({
    where: { id: flowId }
  });

  if (!flow) {
    throw new Error('Fluxo nao encontrado');
  }

  const definition = parseFlowDefinition(flow.definition);
  const initialState: ChatbotSessionState = {
    history: [],
    collectedData: {}
  };

  const transcript: Array<{ from: 'BOT' | 'CONTACT'; message: string }> = [];

  let currentNodeId: string | null = definition.entryNodeId;

  const initialRun = runFlow(definition, {
    state: initialState,
    currentNodeId,
    consumeInput: false
  });
  initialRun.botMessages.forEach((entry) =>
    transcript.push({ from: 'BOT', message: entry.message })
  );
  currentNodeId = initialRun.nextNodeId;
  let currentState = initialRun.state;

  for (const message of messages) {
    transcript.push({ from: 'CONTACT', message });

    const result = runFlow(definition, {
      state: currentState,
      currentNodeId,
      input: message,
      consumeInput: true
    });

    result.botMessages.forEach((entry) =>
      transcript.push({ from: 'BOT', message: entry.message })
    );
    result.retryMessages.forEach((entry) =>
      transcript.push({ from: 'BOT', message: entry.message })
    );

    currentNodeId = result.nextNodeId;
    currentState = result.state;

    if (result.completed) {
      break;
    }
  }

  return {
    transcript,
    state: currentState,
    completed: currentState.completed ?? false
  };
};

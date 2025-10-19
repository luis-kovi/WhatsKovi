import { Prisma, TagMatchType } from '@prisma/client';
import prisma from '../config/database';
import { io } from '../server';
import { ticketInclude } from '../utils/ticketInclude';

type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;
type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

export class InvalidTagError extends Error {
  constructor(message = 'Uma ou mais tags são inválidas') {
    super(message);
    this.name = 'InvalidTagError';
  }
}

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const dedupe = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    if (!value) return;
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  });

  return result;
};

export const parseKeywordInput = (input: unknown): string[] => {
  if (!input && input !== '') {
    return [];
  }

  const rawList = Array.isArray(input)
    ? input
    : String(input)
        .split(',')
        .map((item) => item.trim());

  const normalized = new Set<string>();
  const keywords: string[] = [];

  rawList.forEach((value) => {
    if (typeof value !== 'string') {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    const signature = normalizeText(trimmed);
    if (normalized.has(signature)) {
      return;
    }
    normalized.add(signature);
    keywords.push(trimmed);
  });

  return keywords;
};

const fetchTicketWithRelations = async (ticketId: string, client: PrismaExecutor = prisma) =>
  client.ticket.findUnique({
    where: { id: ticketId },
    include: ticketInclude
  });

const ensureTagIdsExist = async (tagIds: string[], client: PrismaExecutor = prisma) => {
  if (tagIds.length === 0) {
    return;
  }

  const found = await client.tag.findMany({
    where: { id: { in: tagIds } },
    select: { id: true }
  });

  if (found.length !== tagIds.length) {
    throw new InvalidTagError();
  }
};

export const validateTagIdentifiers = async (tagIds: string[], client: PrismaExecutor = prisma) => {
  const normalized = dedupe(
    tagIds
      .filter((tagId): tagId is string => typeof tagId === 'string')
      .map((tagId) => tagId.trim())
      .filter((tagId) => tagId.length > 0)
  );
  await ensureTagIdsExist(normalized, client);
};

const evaluateMatch = (contentTokens: string[], sanitizedContent: string, keyword: string, matchType: TagMatchType) => {
  if (!keyword) {
    return false;
  }

  switch (matchType) {
    case TagMatchType.STARTS_WITH:
      return contentTokens.some((token) => token.startsWith(keyword));
    case TagMatchType.EXACT:
      return contentTokens.includes(keyword);
    case TagMatchType.CONTAINS:
    default:
      return sanitizedContent.includes(keyword);
  }
};

export const getMatchingTagIds = async (content: string): Promise<string[]> => {
  if (!content || !content.trim()) {
    return [];
  }

  const sanitizedContent = normalizeText(content);
  const contentTokens = sanitizedContent.split(/\s+/).filter(Boolean);

  const keywords = await prisma.tagKeyword.findMany({
    select: {
      tagId: true,
      keyword: true,
      matchType: true
    }
  });

  const matches = new Set<string>();

  keywords.forEach(({ tagId, keyword, matchType }) => {
    const sanitizedKeyword = normalizeText(keyword).trim();
    if (!sanitizedKeyword) {
      return;
    }

    if (evaluateMatch(contentTokens, sanitizedContent, sanitizedKeyword, matchType)) {
      matches.add(tagId);
    }
  });

  return Array.from(matches);
};

export const appendTagsToTicket = async (ticketId: string, tagIds: string[]): Promise<{ changed: boolean }> => {
  const normalized = dedupe(
    tagIds
      .filter((tagId): tagId is string => typeof tagId === 'string')
      .map((tagId) => tagId.trim())
      .filter((tagId) => tagId.length > 0)
  );

  if (normalized.length === 0) {
    return { changed: false };
  }

  await ensureTagIdsExist(normalized);

  const currentRelations = await prisma.ticketTag.findMany({
    where: { ticketId },
    select: { tagId: true }
  });

  const currentSet = new Set(currentRelations.map((relation) => relation.tagId));
  const toCreate = normalized.filter((tagId) => !currentSet.has(tagId));

  if (toCreate.length === 0) {
    return { changed: false };
  }

  await prisma.ticketTag.createMany({
    data: toCreate.map((tagId) => ({ ticketId, tagId })),
    skipDuplicates: true
  });

  return { changed: true };
};

export const replaceTicketTags = async (
  ticketId: string,
  tagIds: string[],
  client: PrismaExecutor = prisma
): Promise<{ changed: boolean }> => {
  const normalized = dedupe(
    tagIds
      .filter((tagId): tagId is string => typeof tagId === 'string')
      .map((tagId) => tagId.trim())
      .filter((tagId) => tagId.length > 0)
  );

  await ensureTagIdsExist(normalized, client);

  const currentRelations = await client.ticketTag.findMany({
    where: { ticketId },
    select: { tagId: true }
  });

  const currentSet = new Set(currentRelations.map((relation) => relation.tagId));
  const nextSet = new Set(normalized);

  const sameComposition =
    currentSet.size === nextSet.size && [...currentSet].every((tagId) => nextSet.has(tagId));

  if (sameComposition) {
    return { changed: false };
  }

  await client.ticketTag.deleteMany({ where: { ticketId } });

  if (normalized.length > 0) {
    await client.ticketTag.createMany({
      data: normalized.map((tagId) => ({ ticketId, tagId })),
      skipDuplicates: true
    });
  }

  return { changed: true };
};

export const removeTagFromTicket = async (ticketId: string, tagId: string): Promise<{ changed: boolean }> => {
  const trimmed = typeof tagId === 'string' ? tagId.trim() : '';

  if (!trimmed) {
    return { changed: false };
  }

  const result = await prisma.ticketTag.deleteMany({
    where: { ticketId, tagId: trimmed }
  });

  return { changed: result.count > 0 };
};

export const loadTicketForResponse = async (
  ticketId: string,
  client: PrismaExecutor = prisma
): Promise<TicketWithRelations | null> => fetchTicketWithRelations(ticketId, client);

export const applyAutomaticTagsToTicket = async (ticketId: string, content: string) => {
  const matching = await getMatchingTagIds(content);
  if (matching.length === 0) {
    return;
  }

  const { changed } = await appendTagsToTicket(ticketId, matching);

  if (!changed) {
    return;
  }

  const ticket = await fetchTicketWithRelations(ticketId);
  if (ticket) {
    io.emit('ticket:update', ticket);
  }
};


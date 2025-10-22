import { Prisma } from '@prisma/client';
import prisma from '../config/database';

const TS_CONFIG = 'portuguese';
const DEFAULT_LIMIT = 15;

export type SearchType = 'messages' | 'contacts' | 'tickets';

export type SearchFilters = {
  types?: SearchType[];
  queueIds?: string[];
  userIds?: string[];
  tagIds?: string[];
  dateFrom?: string;
  dateTo?: string;
};

export type SearchResults = {
  messages: { count: number; items: MessageSearchResult[] };
  contacts: { count: number; items: ContactSearchResult[] };
  tickets: { count: number; items: TicketSearchResult[] };
};

export type MessageSearchResult = {
  id: string;
  ticketId: string;
  contactId: string;
  contactName: string;
  contactPhone?: string | null;
  queueId?: string | null;
  queueName?: string | null;
  userId?: string | null;
  userName?: string | null;
  body: string;
  snippet: string;
  createdAt: Date;
  rank: number;
};

export type ContactSearchResult = {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string | null;
  tagIds: string[];
  lastInteractionAt?: Date | null;
  updatedAt: Date;
  snippet: string;
  rank: number;
};

export type TicketSearchResult = {
  id: string;
  status: string;
  priority: string;
  contactId: string;
  contactName: string;
  contactPhone?: string | null;
  queueId?: string | null;
  queueName?: string | null;
  userId?: string | null;
  userName?: string | null;
  carPlate?: string | null;
  createdAt: Date;
  lastMessageAt: Date;
  snippet: string;
  rank: number;
};

const normalizeTerm = (term: string) => term.trim().replace(/\s+/g, ' ');

const parseDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const buildTsQuery = (term: string) =>
  Prisma.sql`plainto_tsquery('${TS_CONFIG}'::regconfig, ${term})`;

const sanitizeFilters = (filters?: SearchFilters): SearchFilters => {
  if (!filters) return {};
  const unique = <T extends string>(values?: T[]) =>
    Array.isArray(values) ? Array.from(new Set(values.filter((item) => typeof item === 'string' && item.trim().length > 0))) : undefined;
  const sanitized: SearchFilters = {
    types: unique(filters.types),
    queueIds: unique(filters.queueIds),
    userIds: unique(filters.userIds),
    tagIds: unique(filters.tagIds),
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo
  };
  return sanitized;
};

const searchMessages = async (term: string, filters: SearchFilters, limit: number): Promise<MessageSearchResult[]> => {
  const tsQuery = buildTsQuery(term);
  const conditions: Prisma.Sql[] = [
    Prisma.sql`
      to_tsvector('${TS_CONFIG}'::regconfig, coalesce(m."body", '') || ' ' || coalesce(c."name", '') || ' ' || coalesce(c."phoneNumber", '') || ' ' || coalesce(c."email", ''))
      @@ ${tsQuery}
    `
  ];

  if (filters.queueIds?.length) {
    conditions.push(Prisma.sql`t."queueId" = ANY(${filters.queueIds})`);
  }
  if (filters.userIds?.length) {
    conditions.push(Prisma.sql`t."userId" = ANY(${filters.userIds})`);
  }
  if (filters.tagIds?.length) {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "ticket_tags" tt WHERE tt."ticketId" = t."id" AND tt."tagId" = ANY(${filters.tagIds}))`
    );
  }

  const dateFrom = parseDate(filters.dateFrom);
  const dateTo = parseDate(filters.dateTo);
  if (dateFrom) {
    conditions.push(Prisma.sql`m."createdAt" >= ${dateFrom}`);
  }
  if (dateTo) {
    conditions.push(Prisma.sql`m."createdAt" <= ${dateTo}`);
  }

  const whereClause = Prisma.join(conditions, ' AND ');

  type MessageRow = {
    id: string;
    ticketId: string;
    contactId: string;
    contactName: string;
    contactPhone: string | null;
    queueId: string | null;
    queueName: string | null;
    userId: string | null;
    userName: string | null;
    body: string;
    snippet: string | null;
    createdAt: Date;
    rank: number;
  };

  const rows = await prisma.$queryRaw<MessageRow[]>`
    SELECT
      m."id" AS id,
      m."ticketId" AS "ticketId",
      c."id" AS "contactId",
      c."name" AS "contactName",
      c."phoneNumber" AS "contactPhone",
      t."queueId" AS "queueId",
      q."name" AS "queueName",
      t."userId" AS "userId",
      u."name" AS "userName",
      m."body" AS body,
      ts_headline(
        '${TS_CONFIG}'::regconfig,
        coalesce(m."body", ''),
        ${tsQuery},
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=20,MinWords=5'
      ) AS "snippet",
      m."createdAt" AS "createdAt",
      ts_rank_cd(
        to_tsvector('${TS_CONFIG}'::regconfig, coalesce(m."body", '') || ' ' || coalesce(c."name", '') || ' ' || coalesce(c."phoneNumber", '') || ' ' || coalesce(c."email", '')),
        ${tsQuery}
      ) AS rank
    FROM "messages" m
    INNER JOIN "tickets" t ON t."id" = m."ticketId"
    INNER JOIN "contacts" c ON c."id" = t."contactId"
    LEFT JOIN "queues" q ON q."id" = t."queueId"
    LEFT JOIN "users" u ON u."id" = t."userId"
    WHERE ${whereClause}
    ORDER BY rank DESC, m."createdAt" DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    ticketId: row.ticketId,
    contactId: row.contactId,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    queueId: row.queueId,
    queueName: row.queueName,
    userId: row.userId,
    userName: row.userName,
    body: row.body,
    snippet: row.snippet ?? row.body,
    createdAt: row.createdAt,
    rank: Number(row.rank ?? 0)
  }));
};

const searchContacts = async (term: string, filters: SearchFilters, limit: number): Promise<ContactSearchResult[]> => {
  const tsQuery = buildTsQuery(term);
  const conditions: Prisma.Sql[] = [
    Prisma.sql`
      to_tsvector('${TS_CONFIG}'::regconfig, coalesce(c."name", '') || ' ' || coalesce(c."phoneNumber", '') || ' ' || coalesce(c."email", '') || ' ' || coalesce(c."notes", ''))
      @@ ${tsQuery}
    `
  ];

  if (filters.queueIds?.length) {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "tickets" t WHERE t."contactId" = c."id" AND t."queueId" = ANY(${filters.queueIds}))`
    );
  }
  if (filters.userIds?.length) {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "tickets" t WHERE t."contactId" = c."id" AND t."userId" = ANY(${filters.userIds}))`
    );
  }
  if (filters.tagIds?.length) {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "contact_tags" ct WHERE ct."contactId" = c."id" AND ct."tagId" = ANY(${filters.tagIds}))`
    );
  }

  const dateFrom = parseDate(filters.dateFrom);
  const dateTo = parseDate(filters.dateTo);
  if (dateFrom) {
    conditions.push(Prisma.sql`c."updatedAt" >= ${dateFrom}`);
  }
  if (dateTo) {
    conditions.push(Prisma.sql`c."updatedAt" <= ${dateTo}`);
  }

  const whereClause = Prisma.join(conditions, ' AND ');

  type ContactRow = {
    id: string;
    name: string;
    phoneNumber: string;
    email: string | null;
    lastInteractionAt: Date | null;
    updatedAt: Date;
    tagIds: string[] | null;
    snippet: string | null;
    rank: number;
  };

  const rows = await prisma.$queryRaw<ContactRow[]>`
    SELECT
      c."id" AS id,
      c."name" AS name,
      c."phoneNumber" AS "phoneNumber",
      c."email" AS email,
      c."lastInteractionAt" AS "lastInteractionAt",
      c."updatedAt" AS "updatedAt",
      array_remove(array_agg(DISTINCT ct."tagId"), NULL) AS "tagIds",
      MAX(
        ts_headline(
          '${TS_CONFIG}'::regconfig,
          coalesce(c."name", '') || ' ' || coalesce(c."notes", ''),
          ${tsQuery},
          'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=20,MinWords=3'
        )
      ) AS "snippet",
      MAX(
        ts_rank_cd(
        to_tsvector('${TS_CONFIG}'::regconfig, coalesce(c."name", '') || ' ' || coalesce(c."phoneNumber", '') || ' ' || coalesce(c."email", '') || ' ' || coalesce(c."notes", '')),
          ${tsQuery}
        )
      ) AS rank
    FROM "contacts" c
    LEFT JOIN "contact_tags" ct ON ct."contactId" = c."id"
    WHERE ${whereClause}
    GROUP BY c."id", c."name", c."phoneNumber", c."email", c."lastInteractionAt", c."updatedAt"
    ORDER BY rank DESC, c."updatedAt" DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phoneNumber: row.phoneNumber,
    email: row.email,
    tagIds: row.tagIds ?? [],
    lastInteractionAt: row.lastInteractionAt,
    updatedAt: row.updatedAt,
    snippet: row.snippet ?? row.name,
    rank: Number(row.rank ?? 0)
  }));
};

const searchTickets = async (term: string, filters: SearchFilters, limit: number): Promise<TicketSearchResult[]> => {
  const tsQuery = buildTsQuery(term);
  const conditions: Prisma.Sql[] = [
    Prisma.sql`
      to_tsvector(
        '${TS_CONFIG}'::regconfig,
        coalesce(c."name", '') || ' ' || coalesce(c."phoneNumber", '') || ' ' || coalesce(t."carPlate", '') || ' ' || coalesce(q."name", '')
      ) @@ ${tsQuery}
    `
  ];

  if (filters.queueIds?.length) {
    conditions.push(
      Prisma.sql`t."queueId" = ANY(${filters.queueIds})`
    );
  }
  if (filters.userIds?.length) {
    conditions.push(
      Prisma.sql`t."userId" = ANY(${filters.userIds})`
    );
  }
  if (filters.tagIds?.length) {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "ticket_tags" tt WHERE tt."ticketId" = t."id" AND tt."tagId" = ANY(${filters.tagIds}))`
    );
  }

  const dateFrom = parseDate(filters.dateFrom);
  const dateTo = parseDate(filters.dateTo);
  if (dateFrom) {
    conditions.push(Prisma.sql`t."createdAt" >= ${dateFrom}`);
  }
  if (dateTo) {
    conditions.push(Prisma.sql`t."createdAt" <= ${dateTo}`);
  }

  const whereClause = Prisma.join(conditions, ' AND ');

  type TicketRow = {
    id: string;
    status: string;
    priority: string;
    contactId: string;
    contactName: string;
    contactPhone: string | null;
    queueId: string | null;
    queueName: string | null;
    userId: string | null;
    userName: string | null;
    carPlate: string | null;
    createdAt: Date;
    lastMessageAt: Date;
    snippet: string | null;
    rank: number;
  };

  const rows = await prisma.$queryRaw<TicketRow[]>`
    SELECT
      t."id" AS id,
      t."status" AS status,
      t."priority" AS priority,
      c."id" AS "contactId",
      c."name" AS "contactName",
      c."phoneNumber" AS "contactPhone",
      t."queueId" AS "queueId",
      q."name" AS "queueName",
      t."userId" AS "userId",
      u."name" AS "userName",
      t."carPlate" AS "carPlate",
      t."createdAt" AS "createdAt",
      t."lastMessageAt" AS "lastMessageAt",
      ts_headline(
        '${TS_CONFIG}'::regconfig,
        coalesce(c."name", '') || ' ' || coalesce(t."carPlate", '') || ' ' || coalesce(q."name", ''),
        ${tsQuery},
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=15,MinWords=3'
      ) AS "snippet",
      ts_rank_cd(
        to_tsvector(
          '${TS_CONFIG}'::regconfig,
          coalesce(c."name", '') || ' ' || coalesce(c."phoneNumber", '') || ' ' || coalesce(t."carPlate", '') || ' ' || coalesce(q."name", '')
        ),
        ${tsQuery}
      ) AS rank
    FROM "tickets" t
    INNER JOIN "contacts" c ON c."id" = t."contactId"
    LEFT JOIN "queues" q ON q."id" = t."queueId"
    LEFT JOIN "users" u ON u."id" = t."userId"
    WHERE ${whereClause}
    ORDER BY rank DESC, t."lastMessageAt" DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    priority: row.priority,
    contactId: row.contactId,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    queueId: row.queueId,
    queueName: row.queueName,
    userId: row.userId,
    userName: row.userName,
    carPlate: row.carPlate,
    createdAt: row.createdAt,
    lastMessageAt: row.lastMessageAt,
    snippet: row.snippet ?? row.contactName,
    rank: Number(row.rank ?? 0)
  }));
};

export const executeSearch = async (
  userId: string,
  rawTerm: string,
  requestFilters?: SearchFilters,
  limit: number = DEFAULT_LIMIT
): Promise<{ term: string; results: SearchResults; filters: SearchFilters; took: number }> => {
  const term = normalizeTerm(rawTerm);
  if (!term) {
    return {
      term,
      filters: sanitizeFilters(requestFilters),
      took: 0,
      results: {
        messages: { count: 0, items: [] },
        contacts: { count: 0, items: [] },
        tickets: { count: 0, items: [] }
      }
    };
  }

  const filters = sanitizeFilters(requestFilters);
  const types = filters.types?.length ? filters.types : (['messages', 'contacts', 'tickets'] as SearchType[]);

  const start = Date.now();

  const [messages, contacts, tickets] = await Promise.all([
    types.includes('messages') ? searchMessages(term, filters, limit) : Promise.resolve([]),
    types.includes('contacts') ? searchContacts(term, filters, limit) : Promise.resolve([]),
    types.includes('tickets') ? searchTickets(term, filters, limit) : Promise.resolve([])
  ]);

  const took = Date.now() - start;

  const historyFilters: Record<string, Prisma.InputJsonValue> = {};
  if (filters.types?.length) historyFilters.types = filters.types;
  if (filters.queueIds?.length) historyFilters.queueIds = filters.queueIds;
  if (filters.userIds?.length) historyFilters.userIds = filters.userIds;
  if (filters.tagIds?.length) historyFilters.tagIds = filters.tagIds;
  if (filters.dateFrom) historyFilters.dateFrom = filters.dateFrom;
  if (filters.dateTo) historyFilters.dateTo = filters.dateTo;

  const historyResults: Record<string, Prisma.InputJsonValue> = {
    messages: messages.length,
    contacts: contacts.length,
    tickets: tickets.length,
    took
  };

  await prisma.searchHistory
    .create({
      data: {
        userId,
        term,
        filters: Object.keys(historyFilters).length ? (historyFilters as Prisma.InputJsonValue) : undefined,
        results: historyResults as Prisma.InputJsonValue
      }
    })
    .catch(() => undefined);

  return {
    term,
    filters,
    took,
    results: {
      messages: { count: messages.length, items: messages },
      contacts: { count: contacts.length, items: contacts },
      tickets: { count: tickets.length, items: tickets }
    }
  };
};

export const fetchSearchHistory = async (userId: string, limit = 10) => {
  const rows = await prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 50)
  });

  return rows.map((row) => ({
    id: row.id,
    term: row.term,
    filters: row.filters ?? {},
    results: row.results ?? {},
    createdAt: row.createdAt
  }));
};

export const purgeSearchHistory = async (userId: string) => {
  await prisma.searchHistory.deleteMany({ where: { userId } });
};

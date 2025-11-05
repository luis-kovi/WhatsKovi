import { Prisma } from '@prisma/client';

export type SegmentFilters = {
  search?: string;
  tagIds?: string[] | string;
  excludedTagIds?: string[];
  isBlocked?: boolean;
  hasOpenTickets?: boolean;
  queueIds?: string[];
  customFields?: Array<{ fieldId?: string; key?: string; value: string; operator?: 'equals' | 'contains' }>;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseCustomFieldFilters = (raw: unknown): SegmentFilters['customFields'] => {
  if (!raw) return undefined;

  const result: NonNullable<SegmentFilters['customFields']> = [];
  let source: unknown = raw;

  if (typeof raw === 'string') {
    try {
      source = JSON.parse(raw);
    } catch {
      source = undefined;
    }
  }

  if (Array.isArray(source)) {
    for (const entry of source) {
      if (!isPlainObject(entry)) continue;
      if (entry.value === undefined || entry.value === null || entry.value === '') continue;
      result.push({
        fieldId: typeof entry.fieldId === 'string' ? entry.fieldId : undefined,
        key: typeof entry.key === 'string' ? entry.key : undefined,
        value: String(entry.value),
        operator: entry.operator === 'contains' ? 'contains' : 'equals'
      });
    }
  }

  return result.length ? result : undefined;
};

const applyFilters = (target: Prisma.ContactWhereInput[], filter?: SegmentFilters) => {
  if (!filter) return;
  if (filter.search) {
    const term = filter.search.trim();
    if (term) {
      target.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { phoneNumber: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } }
        ]
      });
    }
  }
  if (filter.tagIds?.length) {
    target.push({
      tags: { some: { tagId: { in: filter.tagIds as string[] } } }
    });
  }
  if (filter.excludedTagIds?.length) {
    target.push({
      tags: { none: { tagId: { in: filter.excludedTagIds as string[] } } }
    });
  }
  if (filter.isBlocked !== undefined) {
    target.push({ isBlocked: filter.isBlocked });
  }
  if (filter.hasOpenTickets !== undefined) {
    target.push(
      filter.hasOpenTickets
        ? { tickets: { some: { status: { in: ['BOT', 'OPEN', 'PENDING'] } } } }
        : { tickets: { none: { status: { in: ['BOT', 'OPEN', 'PENDING'] } } } }
    );
  }
  if (filter.queueIds?.length) {
    target.push({
      tickets: { some: { queueId: { in: filter.queueIds } } }
    });
  }
  if (filter.customFields?.length) {
    filter.customFields.forEach((entry) => {
      if (!entry.value) return;
      target.push({
        customFieldValues: {
          some: {
            ...(entry.fieldId ? { fieldId: entry.fieldId } : {}),
            ...(entry.key ? { field: { key: entry.key } } : {}),
            value:
              entry.operator === 'contains'
                ? { contains: entry.value, mode: 'insensitive' }
                : entry.value
          }
        }
      });
    });
  }
};

export const buildContactWhere = (...filters: (SegmentFilters | undefined)[]): Prisma.ContactWhereInput => {
  const and: Prisma.ContactWhereInput[] = [];
  filters.forEach((filter) => applyFilters(and, filter));
  return and.length ? { AND: and } : {};
};

export const parseSegmentFilters = (raw: unknown): SegmentFilters | undefined => {
  if (!raw) return undefined;
  const source =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return undefined;
          }
        })()
      : raw;
  if (!isPlainObject(source)) return undefined;

  const payload: SegmentFilters = {};

  if (typeof source.search === 'string') payload.search = source.search;
  if (Array.isArray(source.tagIds)) payload.tagIds = source.tagIds.filter((item): item is string => typeof item === 'string');
  if (Array.isArray(source.excludedTagIds))
    payload.excludedTagIds = source.excludedTagIds.filter((item): item is string => typeof item === 'string');
  if (source.isBlocked !== undefined) payload.isBlocked = Boolean(source.isBlocked);
  if (source.hasOpenTickets !== undefined) payload.hasOpenTickets = Boolean(source.hasOpenTickets);
  if (Array.isArray(source.queueIds))
    payload.queueIds = source.queueIds.filter((item): item is string => typeof item === 'string');

  const fieldFilters = parseCustomFieldFilters((source as any).customFields);
  if (fieldFilters) payload.customFields = fieldFilters;

  return payload;
};

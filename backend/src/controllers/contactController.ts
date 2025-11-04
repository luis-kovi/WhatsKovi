import { Request, Response } from 'express';
import { Parser as Json2CsvParser } from 'json2csv';
import { parse as parseCsv } from 'csv-parse/sync';
import { ContactFieldType, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import {
  SegmentFilters,
  buildContactWhere,
  parseCustomFieldFilters,
  parseSegmentFilters as parseSegmentFiltersUtil
} from '../utils/contactFilters';

const contactInclude = {
  tags: { include: { tag: true } },
  customFieldValues: { include: { field: true } },
  tickets: {
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: {
      queue: true,
      user: { select: { id: true, name: true } }
    }
  }
} as const;

type ContactWithRelations = Prisma.ContactGetPayload<{ include: typeof contactInclude }>;

type CustomFieldInput = {
  fieldId?: string;
  key?: string;
  value?: unknown;
};

const toArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => String(item).split(',')).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const parseBooleanQuery = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (['true', '1', 'yes', 'sim'].includes(normalized)) return true;
    if (['false', '0', 'no', 'nao', 'não'].includes(normalized)) return false;
  }
  return undefined;
};

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || `campo-${Date.now()}`;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeCustomFieldsInput = (raw: unknown): CustomFieldInput[] => {
  const items: CustomFieldInput[] = [];

  if (!raw) {
    return items;
  }

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!isObject(entry)) continue;
      items.push({
        fieldId: typeof entry.fieldId === 'string' ? entry.fieldId : undefined,
        key: typeof (entry as any).key === 'string' ? (entry as any).key : undefined,
        value: (entry as any).value
      });
    }
    return items;
  }

  if (isObject(raw)) {
    Object.entries(raw).forEach(([key, value]) => {
      items.push({ key, value });
    });
  }

  return items;
};

const mapContact = (contact: ContactWithRelations) => {
  const customFields = contact.customFieldValues
    .map((item) => ({
      id: item.fieldId,
      key: item.field.key,
      name: item.field.name,
      type: item.field.type,
      value: item.value
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return {
    id: contact.id,
    name: contact.name,
    phoneNumber: contact.phoneNumber,
    email: contact.email,
    avatar: contact.avatar,
    isBlocked: contact.isBlocked,
    notes: contact.notes,
    customFields,
    tags: contact.tags.map((entry) => entry.tag),
    lastInteractionAt: contact.lastInteractionAt,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    tickets: contact.tickets.map((ticket) => ({
      id: ticket.id,
      status: ticket.status,
      queue: ticket.queue,
      user: ticket.user,
      updatedAt: ticket.updatedAt,
      createdAt: ticket.createdAt
    }))
  };
};

const buildCustomFieldValues = (
  inputs: CustomFieldInput[],
  maps: { byId: Map<string, { id: string; key: string }>; byKey: Map<string, { id: string; key: string }> }
) => {
  const json: Record<string, string> = {};
  const values: Array<{ fieldId: string; value: string }> = [];
  inputs.forEach((input) => {
    const field = input.fieldId ? maps.byId.get(input.fieldId) : input.key ? maps.byKey.get(input.key) : undefined;
    if (!field) return;
    if (input.value === undefined || input.value === null || input.value === '') return;
    const value = Array.isArray(input.value) ? input.value.join(', ') : String(input.value);
    json[field.key] = value;
    values.push({ fieldId: field.id, value });
  });
  return { json, values };
};

const buildFieldMaps = (definitions: { id: string; key: string }[]) => {
  const byId = new Map<string, { id: string; key: string }>();
  const byKey = new Map<string, { id: string; key: string }>();
  definitions.forEach((field) => {
    byId.set(field.id, field);
    byKey.set(field.key, field);
  });
  return { byId, byKey };
};

const touchContactInteraction = async (contactId: string) => {
  await prisma.contact
    .update({
      where: { id: contactId },
      data: { lastInteractionAt: new Date() }
    })
    .catch(() => undefined);
};
const parseSegmentFilters = parseSegmentFiltersUtil;

export const listContacts = async (req: Request, res: Response) => {
  try {
    const segmentId = typeof req.query.segmentId === 'string' ? req.query.segmentId : undefined;
    let segmentFilters: SegmentFilters | undefined;
    if (segmentId) {
      const segment = await prisma.contactSegment.findUnique({ where: { id: segmentId } });
      if (!segment) {
        return res.status(404).json({ error: 'Segmento de contatos não encontrado' });
      }
      segmentFilters = parseSegmentFilters(segment.filters);
    }

    const queryFilters: SegmentFilters = {
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      tagIds: toArray(req.query.tagIds),
      excludedTagIds: toArray(req.query.excludedTagIds),
      isBlocked: parseBooleanQuery(req.query.blocked),
      hasOpenTickets: parseBooleanQuery(req.query.hasOpenTickets),
      queueIds: toArray(req.query.queueIds ?? req.query.queueId),
      customFields: parseCustomFieldFilters(req.query.customFieldFilters)
    };

    const where = buildContactWhere(segmentFilters, queryFilters);

    const contacts = await prisma.contact.findMany({
      where,
      include: contactInclude,
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }]
    });

    return res.json(contacts.map(mapContact));
  } catch (error) {
    console.error('Erro ao listar contatos:', error);
    return res.status(500).json({ error: 'Erro ao listar contatos' });
  }
};

export const getContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        ...contactInclude,
        tickets: {
          orderBy: { createdAt: 'desc' },
          include: {
            queue: true,
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    const notes = await prisma.contactNote.findMany({
      where: { contactId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    return res.json({
      ...mapContact(contact),
      internalNotes: notes
    });
  } catch (error) {
    console.error('Erro ao buscar contato:', error);
    return res.status(500).json({ error: 'Erro ao buscar contato' });
  }
};

export const updateContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, notes, isBlocked, tagIds, customFields } = req.body as {
      name?: string;
      email?: string | null;
      notes?: string | null;
      isBlocked?: boolean;
      tagIds?: string[] | string;
      customFields?: unknown;
    };

    const normalizedTagIds = Array.isArray(tagIds)
      ? tagIds
      : typeof tagIds === 'string'
      ? tagIds.split(',').map((tag) => tag.trim()).filter(Boolean)
      : undefined;

    const customFieldInputs = normalizeCustomFieldsInput(customFields);

    let updatedContact: ContactWithRelations | null = null;

    await prisma.$transaction(async (tx) => {
      const contactExists = await tx.contact.findUnique({ where: { id } });
      if (!contactExists) {
        throw new Error('NOT_FOUND');
      }

      const fieldDefinitions = await tx.contactField.findMany({ select: { id: true, key: true } });
      const maps = buildFieldMaps(fieldDefinitions);
      const { json, values } = buildCustomFieldValues(customFieldInputs, maps);

      await tx.contact.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(isBlocked !== undefined ? { isBlocked } : {}),
          customFields: json as Prisma.InputJsonValue,
          lastInteractionAt: new Date()
        }
      });

      if (normalizedTagIds) {
        await tx.contactTag.deleteMany({ where: { contactId: id } });
        if (normalizedTagIds.length) {
          await tx.contactTag.createMany({
            data: normalizedTagIds.map((tagId) => ({ contactId: id, tagId })),
            skipDuplicates: true
          });
        }
      }

      await tx.contactFieldValue.deleteMany({ where: { contactId: id } });
      if (values.length) {
        await tx.contactFieldValue.createMany({
          data: values.map((entry) => ({
            contactId: id,
            fieldId: entry.fieldId,
            value: entry.value
          }))
        });
      }

      updatedContact = await tx.contact.findUnique({
        where: { id },
        include: contactInclude
      });
    });

    if (!updatedContact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    return res.json(mapContact(updatedContact));
  } catch (error: any) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }
    console.error('Erro ao atualizar contato:', error);
    return res.status(500).json({ error: 'Erro ao atualizar contato' });
  }
};
export const listContactFields = async (_req: Request, res: Response) => {
  try {
    const fields = await prisma.contactField.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return res.json(fields);
  } catch (error) {
    console.error('Erro ao listar campos de contato:', error);
    return res.status(500).json({ error: 'Erro ao listar campos' });
  }
};

export const createContactField = async (req: AuthRequest, res: Response) => {
  try {
    const { name, key, type, description, options, isRequired } = req.body as {
      name?: string;
      key?: string;
      type?: ContactFieldType;
      description?: string;
      options?: string[];
      isRequired?: boolean;
    };

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome do campo é obrigatório' });
    }

    const normalizedKey = key && key.trim() ? slugify(key) : slugify(name);
    const fieldType = type && Object.values(ContactFieldType).includes(type) ? type : ContactFieldType.TEXT;

    const field = await prisma.contactField.create({
      data: {
        name: name.trim(),
        key: normalizedKey,
        type: fieldType,
        description: description?.trim() || null,
        options:
          fieldType === ContactFieldType.SELECT || fieldType === ContactFieldType.MULTI_SELECT
            ? (Array.isArray(options) ? options.filter(Boolean) : [])
            : [],
        isRequired: Boolean(isRequired)
      }
    });

    return res.status(201).json(field);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Já existe um campo com essa chave' });
    }
    console.error('Erro ao criar campo de contato:', error);
    return res.status(500).json({ error: 'Erro ao criar campo' });
  }
};

export const updateContactField = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, options, isRequired } = req.body as {
      name?: string;
      description?: string | null;
      options?: string[];
      isRequired?: boolean;
    };

    const data: Prisma.ContactFieldUpdateInput = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'Nome inválido' });
      }
      data.name = name.trim();
    }

    if (description !== undefined) {
      data.description = description ? description.trim() : null;
    }

    if (options !== undefined) {
      data.options = Array.isArray(options) ? options.filter(Boolean) : [];
    }

    if (isRequired !== undefined) {
      data.isRequired = Boolean(isRequired);
    }

    const field = await prisma.contactField.update({
      where: { id },
      data
    });

    return res.json(field);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Campo não encontrado' });
    }
    console.error('Erro ao atualizar campo de contato:', error);
    return res.status(500).json({ error: 'Erro ao atualizar campo' });
  }
};

export const deleteContactField = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.contactField.delete({ where: { id } });
    return res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Campo não encontrado' });
    }
    console.error('Erro ao remover campo de contato:', error);
    return res.status(500).json({ error: 'Erro ao remover campo' });
  }
};

export const listContactSegments = async (_req: Request, res: Response) => {
  try {
    const segments = await prisma.contactSegment.findMany({
      orderBy: [{ isFavorite: 'desc' }, { name: 'asc' }]
    });
    return res.json(segments);
  } catch (error) {
    console.error('Erro ao listar segmentos:', error);
    return res.status(500).json({ error: 'Erro ao listar segmentos' });
  }
};

export const createContactSegment = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, filters, isFavorite } = req.body as {
      name?: string;
      description?: string;
      filters?: unknown;
      isFavorite?: boolean;
    };

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome do segmento é obrigatório' });
    }

    const parsedFilters = parseSegmentFilters(filters);
    if (!parsedFilters) {
      return res.status(400).json({ error: 'Filtros inválidos' });
    }

    const segment = await prisma.contactSegment.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        filters: parsedFilters as Prisma.InputJsonValue,
        isFavorite: Boolean(isFavorite),
        createdById: req.user?.id || null
      }
    });

    return res.status(201).json(segment);
  } catch (error) {
    console.error('Erro ao criar segmento:', error);
    return res.status(500).json({ error: 'Erro ao criar segmento' });
  }
};

export const updateContactSegment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, filters, isFavorite } = req.body as {
      name?: string;
      description?: string | null;
      filters?: unknown;
      isFavorite?: boolean;
    };

    const data: Prisma.ContactSegmentUpdateInput = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'Nome inválido' });
      }
      data.name = name.trim();
    }

    if (description !== undefined) {
      data.description = description ? description.trim() : null;
    }

    if (filters !== undefined) {
      const parsed = parseSegmentFilters(filters);
      if (!parsed) {
        return res.status(400).json({ error: 'Filtros inválidos' });
      }
      data.filters = parsed as Prisma.InputJsonValue;
    }

    if (isFavorite !== undefined) {
      data.isFavorite = Boolean(isFavorite);
    }

    const segment = await prisma.contactSegment.update({
      where: { id },
      data
    });

    return res.json(segment);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Segmento não encontrado' });
    }
    console.error('Erro ao atualizar segmento:', error);
    return res.status(500).json({ error: 'Erro ao atualizar segmento' });
  }
};

export const deleteContactSegment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.contactSegment.delete({ where: { id } });
    return res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Segmento não encontrado' });
    }
    console.error('Erro ao remover segmento:', error);
    return res.status(500).json({ error: 'Erro ao remover segmento' });
  }
};

export const getSegmentContacts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const segment = await prisma.contactSegment.findUnique({ where: { id } });
    if (!segment) {
      return res.status(404).json({ error: 'Segmento não encontrado' });
    }
    const filters = parseSegmentFilters(segment.filters);
    const where = buildContactWhere(filters);
    const contacts = await prisma.contact.findMany({
      where,
      include: contactInclude,
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }]
    });
    return res.json(contacts.map(mapContact));
  } catch (error) {
    console.error('Erro ao listar contatos do segmento:', error);
    return res.status(500).json({ error: 'Erro ao carregar contatos do segmento' });
  }
};
export const listContactNotes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notes = await prisma.contactNote.findMany({
      where: { contactId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });
    return res.json(notes);
  } catch (error) {
    console.error('Erro ao listar notas do contato:', error);
    return res.status(500).json({ error: 'Erro ao listar notas' });
  }
};

export const createContactNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { body } = req.body as { body?: string };

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Conteúdo da nota é obrigatório' });
    }

    const note = await prisma.contactNote.create({
      data: {
        contactId: id,
        userId: req.user?.id || null,
        body: body.trim()
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    await touchContactInteraction(id);

    return res.status(201).json(note);
  } catch (error: any) {
    if (error.code === 'P2003') {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }
    console.error('Erro ao registrar nota do contato:', error);
    return res.status(500).json({ error: 'Erro ao registrar nota' });
  }
};

export const deleteContactNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id, noteId } = req.params;
    const note = await prisma.contactNote.findUnique({ where: { id: noteId } });
    if (!note || note.contactId !== id) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }
    await prisma.contactNote.delete({ where: { id: noteId } });
    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover nota do contato:', error);
    return res.status(500).json({ error: 'Erro ao remover nota' });
  }
};

export const getContactHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    const [notes, tickets, messages] = await Promise.all([
      prisma.contactNote.findMany({
        where: { contactId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: { select: { id: true, name: true, avatar: true } }
        }
      }),
      prisma.ticket.findMany({
        where: { contactId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          queue: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } }
        }
      }),
      prisma.message.findMany({
        where: { ticket: { contactId: id } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          ticket: {
            select: {
              id: true,
              status: true,
              queue: { select: { id: true, name: true } }
            }
          }
        }
      })
    ]);

    const timeline = [
      ...notes.map((note) => ({
        id: note.id,
        type: 'note' as const,
        title: 'Nota adicionada',
        description: note.body,
        createdAt: note.createdAt,
        author: note.user,
        context: null
      })),
      ...tickets.flatMap((ticket) => {
        const created = {
          id: `${ticket.id}-created`,
          type: 'ticket' as const,
          title: `Ticket criado (${ticket.queue?.name ?? 'Fila'})`,
          description: `Status: ${ticket.status}`,
          createdAt: ticket.createdAt,
          author: ticket.user,
          context: { ticketId: ticket.id }
        };
        const closed =
          ticket.closedAt && ticket.status === 'CLOSED'
            ? {
                id: `${ticket.id}-closed`,
                type: 'ticket' as const,
                title: 'Ticket encerrado',
                description: 'Atendimento finalizado',
                createdAt: ticket.closedAt,
                author: ticket.user,
                context: { ticketId: ticket.id }
              }
            : null;
        return closed ? [created, closed] : [created];
      }),
      ...messages.map((message) => ({
        id: message.id,
        type: message.isPrivate ? ('internal-message' as const) : ('message' as const),
        title: message.isPrivate ? 'Nota interna' : 'Mensagem',
        description: message.body,
        createdAt: message.createdAt,
        author: message.user,
        context: { ticketId: message.ticketId, queue: message.ticket.queue }
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json(timeline);
  } catch (error) {
    console.error('Erro ao gerar histórico do contato:', error);
    return res.status(500).json({ error: 'Erro ao gerar histórico do contato' });
  }
};
export const importContacts = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo CSV é obrigatório' });
    }

    const content = req.file.buffer.toString('utf-8');
    const records = parseCsv(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];

    const tags = await prisma.tag.findMany();
    const tagsByName = new Map(tags.map((tag) => [tag.name.toLowerCase(), tag]));

    const fieldDefinitions = await prisma.contactField.findMany();
    const fieldById = new Map(fieldDefinitions.map((field) => [field.id, field]));
    const fieldByKey = new Map(fieldDefinitions.map((field) => [field.key.toLowerCase(), field]));

    let created = 0;
    let updated = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let index = 0; index < records.length; index += 1) {
      const row = records[index];
      const normalized = Object.entries(row).reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key.trim()] = typeof value === 'string' ? value.trim() : String(value ?? '');
        return acc;
      }, {});
      const lower = Object.entries(normalized).reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key.toLowerCase()] = value;
        return acc;
      }, {});

      const name = lower['name'] || lower['nome'] || '';
      const phoneNumber = lower['phonenumber'] || lower['telefone'] || lower['celular'] || '';

      if (!name || !phoneNumber) {
        errors.push({ row: index + 1, message: 'Nome e número de telefone são obrigatórios' });
        continue;
      }

      const email = lower['email'] || null;
      const notes = lower['notes'] || lower['observacoes'] || null;
      const blocked = parseBooleanQuery(lower['isblocked']);

      const tagIdList: string[] = [];
      const tagsColumnValue = lower['tags'];
      const tagsColumn = typeof tagsColumnValue === 'string' ? tagsColumnValue : '';
      if (tagsColumn) {
        const tagNames = tagsColumn
          .split(',')
          .map((tag: string) => tag.trim())
          .filter((tag) => tag.length > 0);

        for (const tagName of tagNames) {
          const key = tagName.toLowerCase();
          let tag = tagsByName.get(key);
          if (!tag) {
            tag = await prisma.tag.create({ data: { name: tagName, color: '#2563EB' } });
            tagsByName.set(tag.name.toLowerCase(), tag);
          }
          tagIdList.push(tag.id);
        }
      }

      const customFieldInputs: CustomFieldInput[] = [];
      for (const [originalKey, value] of Object.entries(normalized)) {
        const lowerKey = originalKey.toLowerCase();
        if (lowerKey.startsWith('field:') || lowerKey.startsWith('custom:')) {
          const [, rawKey] = lowerKey.split(':');
          if (!rawKey) continue;

          const key = slugify(rawKey);
          let field = fieldByKey.get(key);
          if (!field) {
            field = await prisma.contactField.create({
              data: {
                name: rawKey.trim(),
                key,
                type: ContactFieldType.TEXT,
                description: 'Importado via CSV',
                options: []
              }
            });
            fieldByKey.set(field.key.toLowerCase(), field);
            fieldById.set(field.id, field);
          }

          customFieldInputs.push({ fieldId: field.id, value });
        }
      }

      try {
        await prisma.$transaction(async (tx) => {
          const existing = await tx.contact.findUnique({ where: { phoneNumber } });
          const fieldMaps = buildFieldMaps(Array.from(fieldById.values()).map(({ id, key }) => ({ id, key })));
          const { json, values } = buildCustomFieldValues(customFieldInputs, fieldMaps);

          if (existing) {
            await tx.contact.update({
              where: { id: existing.id },
              data: {
                name,
                email,
                notes,
                isBlocked: blocked ?? existing.isBlocked,
                customFields: json as Prisma.InputJsonValue,
                lastInteractionAt: new Date()
              }
            });
            updated += 1;

            await tx.contactTag.deleteMany({ where: { contactId: existing.id } });
            if (tagIdList.length) {
            await tx.contactTag.createMany({
              data: tagIdList.map((tagId: string) => ({ contactId: existing.id, tagId })),
                skipDuplicates: true
              });
            }

            await tx.contactFieldValue.deleteMany({ where: { contactId: existing.id } });
            if (values.length) {
              await tx.contactFieldValue.createMany({
                data: values.map((entry) => ({ contactId: existing.id, fieldId: entry.fieldId, value: entry.value }))
              });
            }
          } else {
            const contact = await tx.contact.create({
              data: {
                name,
                phoneNumber,
                email,
                notes,
                isBlocked: blocked ?? false,
                customFields: json as Prisma.InputJsonValue,
                lastInteractionAt: new Date()
              }
            });
            created += 1;

            if (tagIdList.length) {
              await tx.contactTag.createMany({
                data: tagIdList.map((tagId: string) => ({ contactId: contact.id, tagId })),
                skipDuplicates: true
              });
            }

            if (values.length) {
              await tx.contactFieldValue.createMany({
                data: values.map((entry) => ({ contactId: contact.id, fieldId: entry.fieldId, value: entry.value }))
              });
            }
          }
        });
      } catch (transactionError) {
        console.error('Erro ao importar contato via CSV:', transactionError);
        errors.push({ row: index + 1, message: 'Falha ao importar contato' });
      }
    }

    return res.json({ imported: records.length, created, updated, errors });
  } catch (error) {
    console.error('Erro ao importar contatos:', error);
    return res.status(500).json({ error: 'Erro ao importar contatos' });
  }
};

export const exportContacts = async (req: Request, res: Response) => {
  try {
    const segmentId = typeof req.query.segmentId === 'string' ? req.query.segmentId : undefined;
    let segmentFilters: SegmentFilters | undefined;
    if (segmentId) {
      const segment = await prisma.contactSegment.findUnique({ where: { id: segmentId } });
      if (!segment) {
        return res.status(404).json({ error: 'Segmento não encontrado' });
      }
      segmentFilters = parseSegmentFilters(segment.filters);
    }

    const queryFilters: SegmentFilters = {
      tagIds: toArray(req.query.tagIds)
    };

    const where = buildContactWhere(segmentFilters, queryFilters);

    const [contacts, fields] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: contactInclude,
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }]
      }),
      prisma.contactField.findMany({ orderBy: { createdAt: 'asc' } })
    ]);

    const rows = contacts.map((contact) => {
      const base: Record<string, string> = {
        name: contact.name,
        phoneNumber: contact.phoneNumber,
        email: contact.email ?? '',
        isBlocked: contact.isBlocked ? 'true' : 'false',
        tags: contact.tags.map((entry) => entry.tag.name).join(', '),
        lastInteractionAt: contact.lastInteractionAt ? contact.lastInteractionAt.toISOString() : '',
        createdAt: contact.createdAt.toISOString(),
        updatedAt: contact.updatedAt.toISOString()
      };

      fields.forEach((field) => {
        const value = contact.customFieldValues.find((entry) => entry.fieldId === field.id)?.value ?? '';
        base[`field:${field.key}`] = value;
      });

      return base;
    });

    const headerFields = [
      'name',
      'phoneNumber',
      'email',
      'isBlocked',
      'tags',
      'lastInteractionAt',
      'createdAt',
      'updatedAt',
      ...fields.map((field) => `field:${field.key}`)
    ];

    const parser = new Json2CsvParser({ fields: headerFields, withBOM: true });
    const csv = parser.parse(rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contatos.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Erro ao exportar contatos:', error);
    return res.status(500).json({ error: 'Erro ao exportar contatos' });
  }
};


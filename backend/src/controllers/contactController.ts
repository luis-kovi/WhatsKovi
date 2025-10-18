import { Request, Response } from 'express';
import prisma from '../config/database';

export const listContacts = async (req: Request, res: Response) => {
  try {
    const { search, tagIds } = req.query;

    const where: any = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (tagIds) {
      const tagsArray = Array.isArray(tagIds)
        ? tagIds
        : String(tagIds)
            .split(',')
            .map((tagId) => tagId.trim())
            .filter(Boolean);

      if (tagsArray.length > 0) {
        where.tags = {
          some: {
            tagId: { in: tagsArray }
          }
        };
      }
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        tickets: {
          orderBy: { updatedAt: 'desc' },
          take: 5,
          include: {
            queue: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.json(contacts);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar contatos' });
  }
};

export const getContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        tickets: {
          orderBy: { updatedAt: 'desc' },
          include: { queue: true, user: { select: { id: true, name: true } } }
        }
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contato nao encontrado' });
    }

    const internalNotes = await prisma.message.findMany({
      where: {
        isPrivate: true,
        ticket: {
          contactId: id
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        ticket: {
          select: {
            id: true,
            status: true,
            queue: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    return res.json({
      ...contact,
      internalNotes: internalNotes.map((note) => ({
        id: note.id,
        body: note.body,
        type: note.type,
        createdAt: note.createdAt,
        ticket: note.ticket,
        user: note.user
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar contato' });
  }
};

export const updateContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, notes, isBlocked, tagIds } = req.body as {
      name?: string;
      email?: string | null;
      notes?: string | null;
      isBlocked?: boolean;
      tagIds?: string[];
    };

    await prisma.$transaction(async (tx) => {
      await tx.contact.update({
        where: { id },
        data: {
          name,
          email,
          notes,
          isBlocked
        }
      });

      if (Array.isArray(tagIds)) {
        await tx.contactTag.deleteMany({ where: { contactId: id } });

        if (tagIds.length > 0) {
          await tx.contactTag.createMany({
            data: tagIds.map((tagId) => ({
              contactId: id,
              tagId
            })),
            skipDuplicates: true
          });
        }
      }
    });

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } }
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contato nao encontrado' });
    }

    return res.json(contact);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Contato nao encontrado' });
    }
    return res.status(500).json({ error: 'Erro ao atualizar contato' });
  }
};

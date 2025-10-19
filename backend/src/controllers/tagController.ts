import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { parseKeywordInput } from '../services/tagAutomation';

const serializeTag = (tag: {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  keywords: Array<{ keyword: string }>;
}) => ({
  id: tag.id,
  name: tag.name,
  color: tag.color,
  createdAt: tag.createdAt,
  updatedAt: tag.updatedAt,
  keywords: tag.keywords.map((entry) => entry.keyword)
});

export const listTags = async (_req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        keywords: {
          select: { keyword: true },
          orderBy: { keyword: 'asc' }
        }
      }
    });

    return res.json(tags.map(serializeTag));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar tags' });
  }
};

export const createTag = async (req: Request, res: Response) => {
  try {
    const { name, color, keywords } = req.body as { name?: string; color?: string; keywords?: string[] | string };

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome da tag e obrigatorio' });
    }

    const keywordList = parseKeywordInput(keywords ?? []);

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color || '#FF355A',
        keywords:
          keywordList.length > 0
            ? {
                create: keywordList.map((keyword) => ({ keyword }))
              }
            : undefined
      },
      include: {
        keywords: {
          select: { keyword: true },
          orderBy: { keyword: 'asc' }
        }
      }
    });

    return res.status(201).json(serializeTag(tag));
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Tag ja cadastrada' });
    }
    return res.status(500).json({ error: 'Erro ao criar tag' });
  }
};

export const updateTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, keywords } = req.body as {
      name?: string;
      color?: string;
      keywords?: string[] | string | null;
    };

    const keywordProvided = typeof keywords !== 'undefined';
    const keywordList = keywordProvided ? parseKeywordInput(keywords ?? []) : null;

    const tag = await prisma.$transaction(async (tx) => {
      const updated = await tx.tag.update({
        where: { id },
        data: {
          ...(typeof name === 'string' && name.trim().length > 0 ? { name: name.trim() } : {}),
          ...(typeof color === 'string' && color.trim().length > 0 ? { color: color.trim() } : {})
        }
      });

      if (keywordProvided) {
        await tx.tagKeyword.deleteMany({ where: { tagId: id } });

        if (keywordList && keywordList.length > 0) {
          await tx.tagKeyword.createMany({
            data: keywordList.map((keyword) => ({ tagId: id, keyword }))
          });
        }
      }

      return tx.tag.findUnique({
        where: { id: updated.id },
        include: {
          keywords: {
            select: { keyword: true },
            orderBy: { keyword: 'asc' }
          }
        }
      });
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag nao encontrada' });
    }

    return res.json(serializeTag(tag));
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tag nao encontrada' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Nome da tag ja utilizado' });
    }
    return res.status(500).json({ error: 'Erro ao atualizar tag' });
  }
};

export const deleteTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.ticketTag.deleteMany({ where: { tagId: id } });
    await prisma.contactTag.deleteMany({ where: { tagId: id } });
    await prisma.tagKeyword.deleteMany({ where: { tagId: id } });
    await prisma.tag.delete({ where: { id } });

    return res.json({ message: 'Tag deletada com sucesso' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tag nao encontrada' });
    }
    return res.status(500).json({ error: 'Erro ao deletar tag' });
  }
};

export const getTagStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const parseDate = (value: unknown) => {
      if (!value) {
        return undefined;
      }
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (start === null || end === null) {
      return res.status(400).json({ error: 'Periodo informado e invalido' });
    }

    const ticketFilter: Prisma.TicketWhereInput = {};
    const createdAtFilter: Prisma.DateTimeFilter = {};

    if (start) {
      createdAtFilter.gte = start;
    }

    if (end) {
      createdAtFilter.lte = end;
    }

    if (Object.keys(createdAtFilter).length > 0) {
      ticketFilter.createdAt = createdAtFilter;
    }

    const where = Object.keys(ticketFilter).length > 0 ? { ticket: ticketFilter } : undefined;

    const grouped = await prisma.ticketTag.groupBy({
      by: ['tagId'],
      _count: { tagId: true },
      where
    });

    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true }
    });

    const counts = new Map(grouped.map((entry) => [entry.tagId, entry._count.tagId]));
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);

    return res.json({
      total,
      tags: tags.map((tag) => {
        const count = counts.get(tag.id) ?? 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return {
          id: tag.id,
          name: tag.name,
          color: tag.color,
          count,
          percentage
        };
      })
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar estatisticas de tags' });
  }
};

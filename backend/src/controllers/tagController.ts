import { Request, Response } from 'express';
import prisma from '../config/database';

export const listTags = async (_req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' }
    });

    return res.json(tags);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar tags' });
  }
};

export const createTag = async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome da tag e obrigatorio' });
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || '#FF355A'
      }
    });

    return res.status(201).json(tag);
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
    const { name, color } = req.body;

    const tag = await prisma.tag.update({
      where: { id },
      data: { name, color }
    });

    return res.json(tag);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tag nao encontrada' });
    }
    return res.status(500).json({ error: 'Erro ao atualizar tag' });
  }
};

export const deleteTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.ticketTag.deleteMany({ where: { tagId: id } });
    await prisma.contactTag.deleteMany({ where: { tagId: id } });
    await prisma.tag.delete({ where: { id } });

    return res.json({ message: 'Tag deletada com sucesso' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tag nao encontrada' });
    }
    return res.status(500).json({ error: 'Erro ao deletar tag' });
  }
};

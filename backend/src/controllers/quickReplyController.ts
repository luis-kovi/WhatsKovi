import { Request, Response } from 'express';
import prisma from '../config/database';

export const listQuickReplies = async (_req: Request, res: Response) => {
  try {
    const quickReplies = await prisma.quickReply.findMany({
      orderBy: { shortcut: 'asc' }
    });

    return res.json(quickReplies);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar respostas rapidas' });
  }
};

export const createQuickReply = async (req: Request, res: Response) => {
  try {
    const { shortcut, message, isGlobal, mediaUrl } = req.body;

    if (!shortcut || !message) {
      return res.status(400).json({ error: 'Atalho e mensagem sao obrigatorios' });
    }

    const quickReply = await prisma.quickReply.create({
      data: {
        shortcut,
        message,
        isGlobal: isGlobal !== undefined ? isGlobal : true,
        mediaUrl
      }
    });

    return res.status(201).json(quickReply);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Atalho ja cadastrado' });
    }
    return res.status(500).json({ error: 'Erro ao criar resposta rapida' });
  }
};

export const updateQuickReply = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { shortcut, message, isGlobal, mediaUrl } = req.body;

    const quickReply = await prisma.quickReply.update({
      where: { id },
      data: {
        shortcut,
        message,
        isGlobal,
        mediaUrl
      }
    });

    return res.json(quickReply);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Resposta rapida nao encontrada' });
    }
    return res.status(500).json({ error: 'Erro ao atualizar resposta rapida' });
  }
};

export const deleteQuickReply = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.quickReply.delete({ where: { id } });

    return res.json({ message: 'Resposta rapida deletada com sucesso' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Resposta rapida nao encontrada' });
    }
    return res.status(500).json({ error: 'Erro ao deletar resposta rapida' });
  }
};

import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { initializeWhatsApp, disconnectWhatsApp } from '../services/whatsappService';

export const listConnections = async (req: AuthRequest, res: Response) => {
  try {
    const connections = await prisma.whatsAppConnection.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return res.json(connections);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar conexoes' });
  }
};

export const createConnection = async (req: AuthRequest, res: Response) => {
  try {
    const { name, isDefault } = req.body;

    if (isDefault) {
      await prisma.whatsAppConnection.updateMany({
        data: { isDefault: false }
      });
    }

    const connection = await prisma.whatsAppConnection.create({
      data: {
        name,
        isDefault: Boolean(isDefault),
        status: 'DISCONNECTED'
      }
    });

    return res.status(201).json(connection);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar conexao' });
  }
};

export const startConnection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await initializeWhatsApp(id);

    return res.json({ message: 'Conexao iniciada' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao iniciar conexao';
    return res.status(500).json({ error: 'Erro ao iniciar conexao', message });
  }
};

export const stopConnection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await disconnectWhatsApp(id);

    return res.json({ message: 'Conexao encerrada' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao encerrar conexao' });
  }
};

export const deleteConnection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await disconnectWhatsApp(id);
    await prisma.whatsAppConnection.delete({ where: { id } });

    return res.json({ message: 'Conexao deletada' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar conexao' });
  }
};

import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const listQueues = async (req: AuthRequest, res: Response) => {
  try {
    const queues = await prisma.queue.findMany({
      include: {
        users: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { priority: 'desc' }
    });

    return res.json(queues);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar filas' });
  }
};

export const createQueue = async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, description, greetingMessage, outOfHoursMessage, priority, userIds } = req.body;

    const queue = await prisma.queue.create({
      data: {
        name,
        color: color || '#FF355A',
        description,
        greetingMessage,
        outOfHoursMessage,
        priority: priority || 0
      }
    });

    if (userIds && userIds.length > 0) {
      await prisma.queueUser.createMany({
        data: userIds.map((userId: string) => ({
          queueId: queue.id,
          userId
        }))
      });
    }

    return res.status(201).json(queue);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar fila' });
  }
};

export const updateQueue = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, description, greetingMessage, outOfHoursMessage, priority, userIds } = req.body;

    const queue = await prisma.queue.update({
      where: { id },
      data: {
        name,
        color,
        description,
        greetingMessage,
        outOfHoursMessage,
        priority
      }
    });

    if (userIds) {
      await prisma.queueUser.deleteMany({ where: { queueId: id } });
      
      if (userIds.length > 0) {
        await prisma.queueUser.createMany({
          data: userIds.map((userId: string) => ({
            queueId: id,
            userId
          }))
        });
      }
    }

    return res.json(queue);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar fila' });
  }
};

export const deleteQueue = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.queue.delete({ where: { id } });

    return res.json({ message: 'Fila deletada com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar fila' });
  }
};

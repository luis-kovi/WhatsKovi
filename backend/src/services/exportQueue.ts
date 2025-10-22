import Queue from 'bull';
import prisma from '../config/database';
import { ExportStatus } from '@prisma/client';
import { generateConversationExport, loadTicketForExport } from './conversationExportService';

const queueName = 'conversation:export';
const connection = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

type ExportJobData = {
  exportJobId: string;
};

export const conversationExportQueue = new Queue(queueName, connection);

export const enqueueConversationExport = async (exportJobId: string) => {
  await conversationExportQueue.add(
    'generate',
    { exportJobId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true
    }
  );
};

conversationExportQueue.process('generate', async (job) => {
  const { exportJobId } = job.data as ExportJobData;

  const exportJob = await prisma.exportJob.findUnique({
    where: { id: exportJobId }
  });

  if (!exportJob) {
    return;
  }

  await prisma.exportJob.update({
    where: { id: exportJobId },
    data: {
      status: ExportStatus.PROCESSING,
      startedAt: new Date(),
      error: null
    }
  });

  try {
    const ticket = await loadTicketForExport(exportJob.ticketId);
    if (!ticket) {
      throw new Error('Ticket não encontrado');
    }

    const { relativePath, fileName, fileSize, preview, expiresAt } = await generateConversationExport(
      exportJobId,
      exportJob.format,
      ticket
    );

    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: ExportStatus.COMPLETED,
        filePath: relativePath,
        fileName,
        fileSize,
        preview,
        completedAt: new Date(),
        expiresAt
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao gerar exportação';
    console.error(`[ExportQueue] Falha ao gerar exportação ${exportJobId}:`, message);

    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: ExportStatus.FAILED,
        error: message,
        completedAt: new Date()
      }
    });
  }
});

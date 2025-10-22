import path from 'path';
import fs from 'fs/promises';
import { Response } from 'express';
import { ExportFormat, ExportStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { enqueueConversationExport } from '../services/exportQueue';

const DEFAULT_FORMAT: ExportFormat = ExportFormat.PDF;
const ALLOWED_FORMATS: ExportFormat[] = [ExportFormat.PDF, ExportFormat.TXT, ExportFormat.JSON];

type ExportJobWithRelations = Prisma.ExportJobGetPayload<{
  include: {
    ticket: {
      select: {
        id: true;
        contact: { select: { name: true; phoneNumber: true } };
      };
    };
    user: { select: { id: true; name: true } };
  };
}>;

const sanitizeFormat = (raw: unknown): ExportFormat => {
  if (typeof raw !== 'string') return DEFAULT_FORMAT;
  const normalized = raw.trim().toUpperCase();
  const maybeFormat = ALLOWED_FORMATS.find((item) => item === normalized);
  return maybeFormat ?? DEFAULT_FORMAT;
};

const buildDownloadUrl = (jobId: string) => `/api/exports/${jobId}/download`;

const serializeExportJob = (job: ExportJobWithRelations | null) => {
  if (!job) return null;

  const base = {
    id: job.id,
    ticketId: job.ticketId,
    format: job.format,
    status: job.status,
    fileName: job.fileName,
    fileSize: job.fileSize,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    expiresAt: job.expiresAt,
    preview: job.preview,
    error: job.error,
    ticket: job.ticket
      ? {
          id: job.ticket.id,
          contact: job.ticket.contact
        }
      : null,
    requestedBy: job.user ? { id: job.user.id, name: job.user.name } : null
  };

  return {
    ...base,
    downloadUrl:
      job.status === ExportStatus.COMPLETED && job.filePath ? buildDownloadUrl(job.id) : null
  };
};

export const requestConversationExport = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const format = sanitizeFormat(req.body?.format);

    const ticketExists = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!ticketExists) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    const newJob = await prisma.exportJob.create({
      data: {
        ticketId: id,
        userId: req.user?.id,
        format,
        status: ExportStatus.PENDING
      }
    });

    await enqueueConversationExport(newJob.id);

    const jobWithRelations = await prisma.exportJob.findUnique({
      where: { id: newJob.id },
      include: {
        ticket: {
          select: {
            id: true,
            contact: { select: { name: true, phoneNumber: true } }
          }
        },
        user: { select: { id: true, name: true } }
      }
    });

    return res.status(202).json({ job: serializeExportJob(jobWithRelations) });
  } catch (error) {
    console.error('Erro ao solicitar exportação de conversa:', error);
    return res.status(500).json({ error: 'Erro ao solicitar exportação de conversa' });
  }
};

export const listTicketExports = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const jobs = await prisma.exportJob.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        ticket: {
          select: {
            id: true,
            contact: { select: { name: true, phoneNumber: true } }
          }
        },
        user: { select: { id: true, name: true } }
      }
    });

    return res.json({
      items: jobs.map((job) => serializeExportJob(job))
    });
  } catch (error) {
    console.error('Erro ao listar exportações:', error);
    return res.status(500).json({ error: 'Erro ao listar exportações' });
  }
};

export const getExportJobDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.exportJob.findUnique({
      where: { id },
      include: {
        ticket: {
          select: {
            id: true,
            contact: { select: { name: true, phoneNumber: true } }
          }
        },
        user: { select: { id: true, name: true } }
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Exportação não encontrada' });
    }

    return res.json({ job: serializeExportJob(job) });
  } catch (error) {
    console.error('Erro ao buscar exportação:', error);
    return res.status(500).json({ error: 'Erro ao buscar exportação' });
  }
};

export const downloadExportJob = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.exportJob.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        filePath: true,
        fileName: true,
        expiresAt: true
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Exportação não encontrada' });
    }

    if (job.status !== ExportStatus.COMPLETED || !job.filePath) {
      return res.status(409).json({ error: 'Exportação ainda não está pronta' });
    }

    if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: 'Exportação expirada. Solicite uma nova exportação.' });
    }

    const absolutePath = path.resolve(process.cwd(), job.filePath);

    try {
      await fs.access(absolutePath);
    } catch {
      return res.status(404).json({ error: 'Arquivo de exportação não encontrado' });
    }

    const downloadName = job.fileName ?? path.basename(absolutePath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error('Erro ao realizar download da exportação:', error);
    return res.status(500).json({ error: 'Erro ao realizar download da exportação' });
  }
};

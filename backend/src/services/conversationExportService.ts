import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import archiver from 'archiver';
import PDFDocument from 'pdfkit';
import { Prisma, ExportFormat } from '@prisma/client';
import prisma from '../config/database';

const EXPORTS_ROOT = path.resolve(process.cwd(), process.env.EXPORTS_DIR ?? 'exports');
const MEDIA_BASE_URL = (process.env.APP_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
const EXPORT_EXPIRATION_DAYS = Number(process.env.EXPORT_EXPIRATION_DAYS ?? '7');

type TicketForExport = Prisma.TicketGetPayload<{
  include: {
    contact: true;
    user: { select: { id: true; name: true } };
    queue: true;
    tags: { include: { tag: true } };
    messages: {
      include: {
        user: { select: { id: true; name: true } };
      };
      orderBy: { createdAt: 'asc' };
    };
  };
}>;

type ExportArtifacts = {
  relativePath: string;
  fileName: string;
  fileSize: number;
  preview: Prisma.JsonObject;
  expiresAt: Date;
};

const ensureDirectory = async (target: string) => {
  await fs.mkdir(target, { recursive: true });
};

const sanitizeMediaPath = (mediaUrl: string) => {
  const relative = mediaUrl.replace(/^\/+/, '');
  return path.resolve(process.cwd(), relative);
};

const formatTimestamp = (value: Date) => value.toISOString();

const buildSummary = (ticket: TicketForExport): Prisma.JsonObject => ({
  ticketId: ticket.id,
  contact: {
    name: ticket.contact.name,
    phoneNumber: ticket.contact.phoneNumber,
    email: ticket.contact.email
  },
  queue: ticket.queue ? { id: ticket.queue.id, name: ticket.queue.name } : null,
  assignedTo: ticket.user ? { id: ticket.user.id, name: ticket.user.name } : null,
  status: ticket.status,
  priority: ticket.priority,
  tags: ticket.tags.map((relation) => relation.tag.name),
  messageCount: ticket.messages.length
});

const buildTextContent = (ticket: TicketForExport): string => {
  const lines: string[] = [];
  lines.push(`Ticket: ${ticket.id}`);
  lines.push(`Contato: ${ticket.contact.name} (${ticket.contact.phoneNumber})`);
  if (ticket.contact.email) {
    lines.push(`Email: ${ticket.contact.email}`);
  }
  lines.push(`Status: ${ticket.status}`);
  lines.push(`Prioridade: ${ticket.priority}`);
  lines.push(`Fila: ${ticket.queue ? ticket.queue.name : 'Sem fila'}`);
  lines.push(`Responsável: ${ticket.user ? ticket.user.name : 'Não atribuído'}`);
  if (ticket.tags.length > 0) {
    lines.push(`Tags: ${ticket.tags.map((relation) => relation.tag.name).join(', ')}`);
  }
  lines.push('');
  lines.push('Mensagens:');

  ticket.messages.forEach((message) => {
    const author = message.user ? message.user.name : ticket.contact.name;
    const timestamp = formatTimestamp(message.createdAt);
    const visibility = message.isPrivate ? '[INTERNA]' : '';
    const body = message.body && message.body.trim().length > 0 ? message.body : '(sem texto)';
    const attachment = message.mediaUrl
      ? ` [arquivo: ${MEDIA_BASE_URL ? `${MEDIA_BASE_URL}${message.mediaUrl}` : message.mediaUrl}]`
      : '';

    lines.push(`[${timestamp}] ${visibility} ${author}: ${body}${attachment}`.trim());
  });

  return lines.join('\n');
};

const buildJsonContent = (ticket: TicketForExport): string => {
  const payload = {
    summary: buildSummary(ticket),
    messages: ticket.messages.map((message) => ({
      id: message.id,
      createdAt: message.createdAt.toISOString(),
      editedAt: message.editedAt?.toISOString() ?? null,
      author: message.user ? { id: message.user.id, name: message.user.name } : { name: ticket.contact.name },
      body: message.body,
      isPrivate: message.isPrivate,
      type: message.type,
      status: message.status,
      mediaUrl: message.mediaUrl ? (MEDIA_BASE_URL ? `${MEDIA_BASE_URL}${message.mediaUrl}` : message.mediaUrl) : null
    }))
  };

  return JSON.stringify(payload, null, 2);
};

const buildPdfFile = async (ticket: TicketForExport, filePath: string) => {
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const stream = createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(18).text('Relatório de Conversa', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Ticket: ${ticket.id}`);
    doc.text(`Contato: ${ticket.contact.name} (${ticket.contact.phoneNumber})`);
    if (ticket.contact.email) {
      doc.text(`Email: ${ticket.contact.email}`);
    }
    doc.text(`Status: ${ticket.status}`);
    doc.text(`Prioridade: ${ticket.priority}`);
    doc.text(`Fila: ${ticket.queue ? ticket.queue.name : 'Sem fila'}`);
    doc.text(`Responsável: ${ticket.user ? ticket.user.name : 'Não atribuído'}`);
    if (ticket.tags.length > 0) {
      doc.text(`Tags: ${ticket.tags.map((relation) => relation.tag.name).join(', ')}`);
    }

    doc.moveDown();
    doc.fontSize(14).text('Mensagens', { underline: true });
    doc.moveDown(0.5);

    ticket.messages.forEach((message) => {
      const author = message.user ? message.user.name : ticket.contact.name;
      const timestamp = formatTimestamp(message.createdAt);
      const visibility = message.isPrivate ? '(Nota interna)' : '';

      doc.fontSize(11).fillColor('#111827').text(`[${timestamp}] ${author} ${visibility}`.trim());
      if (message.body) {
        doc.moveDown(0.2);
        doc.fontSize(10).fillColor('#374151').text(message.body, { indent: 16 });
      }
      if (message.mediaUrl) {
        const mediaLabel = MEDIA_BASE_URL ? `${MEDIA_BASE_URL}${message.mediaUrl}` : message.mediaUrl;
        doc.moveDown(0.2);
        doc.fontSize(9).fillColor('#2563EB').text(`Arquivo: ${mediaLabel}`, {
          indent: 16,
          link: mediaLabel
        });
      }
      doc.moveDown(0.6);
    });

    doc.end();

    stream.on('finish', () => resolve());
    stream.on('error', (error: Error) => reject(error));
    doc.on('error', (error: Error) => reject(error));
  });
};

export const loadTicketForExport = async (ticketId: string): Promise<TicketForExport | null> => {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      contact: true,
      user: { select: { id: true, name: true } },
      queue: true,
      tags: { include: { tag: true } },
      messages: {
        include: {
          user: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });
};

export const generateConversationExport = async (jobId: string, format: ExportFormat, ticket: TicketForExport): Promise<ExportArtifacts> => {
  await ensureDirectory(EXPORTS_ROOT);

  const jobDir = path.join(EXPORTS_ROOT, jobId);
  await fs.rm(jobDir, { recursive: true, force: true });
  await ensureDirectory(jobDir);

  const extension = format.toLowerCase();
  const conversationFile = path.join(jobDir, `conversation.${extension}`);

  if (format === 'TXT') {
    const textContent = buildTextContent(ticket);
    await fs.writeFile(conversationFile, textContent, 'utf-8');
  } else if (format === 'JSON') {
    const jsonContent = buildJsonContent(ticket);
    await fs.writeFile(conversationFile, jsonContent, 'utf-8');
  } else if (format === 'PDF') {
    await buildPdfFile(ticket, conversationFile);
  } else {
    throw new Error(`Formato não suportado: ${format}`);
  }

  const metadata = {
    summary: buildSummary(ticket),
    generatedAt: new Date().toISOString(),
    format
  };
  const metadataFile = path.join(jobDir, 'metadata.json');
  await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');

  const archive = archiver('zip', { zlib: { level: 9 } });
  const fileName = `ticket-${ticket.id}-${format.toLowerCase()}.zip`;
  const zipPath = path.join(jobDir, fileName);
  const output = createWriteStream(zipPath);

  archive.pipe(output);
  archive.file(conversationFile, { name: `conversation.${extension}` });
  archive.file(metadataFile, { name: 'metadata.json' });

  const addedNames = new Set<string>();

  for (const message of ticket.messages) {
    if (!message.mediaUrl) continue;

    try {
      const absolutePath = sanitizeMediaPath(message.mediaUrl);
      await fs.access(absolutePath);
      const baseName = path.basename(absolutePath);
      let targetName = `media/${baseName}`;
      let counter = 1;
      while (addedNames.has(targetName)) {
        const parsed = path.parse(baseName);
        targetName = `media/${parsed.name}-${counter}${parsed.ext}`;
        counter += 1;
      }
      addedNames.add(targetName);
      archive.file(absolutePath, { name: targetName });
    } catch {
      // ignore missing media files
    }
  }

  await archive.finalize();

  await new Promise<void>((resolve, reject) => {
    output.on('close', () => resolve());
    output.on('error', (error: Error) => reject(error));
    archive.on('error', (error: Error) => reject(error));
  });

  const stats = await fs.stat(zipPath);
  const previewMessages = ticket.messages.slice(0, 5).map((message) => ({
    id: message.id,
    createdAt: message.createdAt.toISOString(),
    author: message.user ? message.user.name : ticket.contact.name,
    isPrivate: message.isPrivate,
    hasMedia: Boolean(message.mediaUrl),
    snippet: (message.body || '').slice(0, 160)
  }));

  const preview: Prisma.JsonObject = {
    summary: buildSummary(ticket),
    sample: previewMessages
  };

  const expiresAt = new Date(Date.now() + EXPORT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

  // Cleanup auxiliary files, keep only the archive
  await fs.rm(conversationFile, { force: true });
  await fs.rm(metadataFile, { force: true });

  return {
    relativePath: path.relative(process.cwd(), zipPath),
    fileName,
    fileSize: stats.size,
    preview,
    expiresAt
  };
};

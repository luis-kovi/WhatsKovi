import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function ensureQueue(data: {
  name: string;
  color: string;
  description?: string | null;
  greetingMessage?: string | null;
  outOfHoursMessage?: string | null;
  priority?: number;
}) {
  const existing = await prisma.queue.findFirst({ where: { name: data.name } });
  if (existing) {
    return existing;
  }

  return prisma.queue.create({ data });
}

async function ensureWhatsAppConnection() {
  const existing = await prisma.whatsAppConnection.findFirst({
    where: { isDefault: true }
  });

  if (existing) {
    return existing;
  }

  return prisma.whatsAppConnection.create({
    data: {
      name: 'WhatsApp Principal',
      status: 'DISCONNECTED',
      isDefault: true
    }
  });
}

async function ensureNotificationPreference(userId: string) {
  await prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      notifyNewTicket: true,
      notifyTicketMessage: true,
      notifyTransfer: true,
      pushEnabled: false,
      emailEnabled: false,
      soundEnabled: true,
      soundTheme: 'classic',
      smtpSecure: true
    }
  });
}

async function main() {
  console.log('==> Iniciando seed...');

  // Admin account
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@whatskovi.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@whatskovi.com',
      password: adminPassword,
      role: 'ADMIN',
      maxTickets: 10
    }
  });
  await ensureNotificationPreference(admin.id);
  console.log('Admin pronto:', admin.email);

  // Agents
  const agentPassword = await bcrypt.hash('agent123', 10);
  const agent1 = await prisma.user.upsert({
    where: { email: 'atendente1@whatskovi.com' },
    update: {},
    create: {
      name: 'Atendente 1',
      email: 'atendente1@whatskovi.com',
      password: agentPassword,
      role: 'AGENT',
      maxTickets: 3
    }
  });
  await ensureNotificationPreference(agent1.id);

  const agent2 = await prisma.user.upsert({
    where: { email: 'atendente2@whatskovi.com' },
    update: {},
    create: {
      name: 'Atendente 2',
      email: 'atendente2@whatskovi.com',
      password: agentPassword,
      role: 'AGENT',
      maxTickets: 3
    }
  });
  await ensureNotificationPreference(agent2.id);
  console.log('Atendentes prontos');

  // Queues
  const queue1 = await ensureQueue({
    name: 'Suporte',
    color: '#FF355A',
    description: 'Fila de suporte tecnico',
    greetingMessage: 'Ola! Bem-vindo ao suporte. Como posso ajudar?',
    priority: 1
  });

  const queue2 = await ensureQueue({
    name: 'Vendas',
    color: '#00C853',
    description: 'Fila de vendas',
    greetingMessage: 'Ola! Seja bem-vindo ao setor de vendas!',
    priority: 2
  });
  console.log('Filas prontas');

  // Queue membership
  await prisma.queueUser.createMany({
    data: [
      { userId: agent1.id, queueId: queue1.id },
      { userId: agent1.id, queueId: queue2.id },
      { userId: agent2.id, queueId: queue1.id }
    ],
    skipDuplicates: true
  });
  console.log('Atendentes vinculados as filas');

  // Tags
  await prisma.tag.createMany({
    data: [
      { name: 'Urgente', color: '#FF0000' },
      { name: 'Duvida', color: '#FFA500' },
      { name: 'Reclamacao', color: '#FF355A' },
      { name: 'Elogio', color: '#00C853' }
    ],
    skipDuplicates: true
  });
  console.log('Tags criadas');

  const tagKeywordMap: Record<string, string[]> = {
    Urgente: ['urgente', 'prioridade', 'imediato', 'emergencia'],
    Duvida: ['duvida', 'dúvida', 'pergunta', 'informacao', 'informação'],
    Reclamacao: ['reclamacao', 'reclamação', 'problema', 'erro', 'defeito'],
    Elogio: ['elogio', 'obrigado', 'satisfeito', 'parabens', 'parabéns']
  };

  const seededTags = await prisma.tag.findMany({
    where: {
      name: {
        in: Object.keys(tagKeywordMap)
      }
    },
    select: {
      id: true,
      name: true
    }
  });

  const keywordEntries = seededTags.flatMap((tag) =>
    (tagKeywordMap[tag.name] || []).map((keyword) => ({
      tagId: tag.id,
      keyword
    }))
  );

  if (keywordEntries.length > 0) {
    await prisma.tagKeyword.createMany({
      data: keywordEntries,
      skipDuplicates: true
    });
    console.log('Palavras-chave das tags configuradas');
  }

  // Quick replies
  await prisma.quickReply.createMany({
    data: [
      {
        shortcut: '/saudacao',
        message: 'Ola {nome}! Como posso ajudar voce hoje?',
        isGlobal: true
      },
      {
        shortcut: '/aguarde',
        message: 'Por favor, aguarde um momento enquanto verifico isso para voce.',
        isGlobal: true
      },
      {
        shortcut: '/despedida',
        message: 'Obrigado pelo contato! Estamos a disposicao. Tenha um otimo dia!',
        isGlobal: true
      }
    ],
    skipDuplicates: true
  });
  console.log('Respostas rapidas criadas');

  // WhatsApp connection
  const integrationConfig = await prisma.integrationConfig.findFirst();
  if (!integrationConfig) {
    await prisma.integrationConfig.create({ data: {} });
    console.log('Configuracoes de integracao inicializadas');
  }


  await ensureWhatsAppConnection();
  console.log('Conexao WhatsApp preparada');

  console.log('Seed concluido com sucesso!');
  console.log('');
  console.log('Credenciais de acesso:');
  console.log('Admin: admin@whatskovi.com / admin123');
  console.log('Atendente 1: atendente1@whatskovi.com / agent123');
  console.log('Atendente 2: atendente2@whatskovi.com / agent123');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

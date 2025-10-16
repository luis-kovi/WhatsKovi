import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Criar usuário admin
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

  console.log('✅ Admin criado:', admin.email);

  // Criar atendentes
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

  console.log('✅ Atendentes criados');

  // Criar filas
  const queue1 = await prisma.queue.create({
    data: {
      name: 'Suporte',
      color: '#FF355A',
      description: 'Fila de suporte técnico',
      greetingMessage: 'Olá! Bem-vindo ao suporte. Como posso ajudar?',
      priority: 1
    }
  });

  const queue2 = await prisma.queue.create({
    data: {
      name: 'Vendas',
      color: '#00C853',
      description: 'Fila de vendas',
      greetingMessage: 'Olá! Seja bem-vindo ao setor de vendas!',
      priority: 2
    }
  });

  console.log('✅ Filas criadas');

  // Vincular atendentes às filas
  await prisma.queueUser.createMany({
    data: [
      { userId: agent1.id, queueId: queue1.id },
      { userId: agent1.id, queueId: queue2.id },
      { userId: agent2.id, queueId: queue1.id }
    ]
  });

  console.log('✅ Atendentes vinculados às filas');

  // Criar tags
  await prisma.tag.createMany({
    data: [
      { name: 'Urgente', color: '#FF0000' },
      { name: 'Dúvida', color: '#FFA500' },
      { name: 'Reclamação', color: '#FF355A' },
      { name: 'Elogio', color: '#00C853' }
    ]
  });

  console.log('✅ Tags criadas');

  // Criar respostas rápidas
  await prisma.quickReply.createMany({
    data: [
      {
        shortcut: '/saudacao',
        message: 'Olá {nome}! Como posso ajudar você hoje?',
        isGlobal: true
      },
      {
        shortcut: '/aguarde',
        message: 'Por favor, aguarde um momento enquanto verifico isso para você.',
        isGlobal: true
      },
      {
        shortcut: '/despedida',
        message: 'Obrigado pelo contato! Estamos à disposição. Tenha um ótimo dia!',
        isGlobal: true
      }
    ]
  });

  console.log('✅ Respostas rápidas criadas');

  // Criar conexão WhatsApp padrão
  await prisma.whatsAppConnection.create({
    data: {
      name: 'WhatsApp Principal',
      status: 'DISCONNECTED',
      isDefault: true
    }
  });

  console.log('✅ Conexão WhatsApp criada');

  console.log('🎉 Seed concluído com sucesso!');
  console.log('\n📝 Credenciais de acesso:');
  console.log('Admin: admin@whatskovi.com / admin123');
  console.log('Atendente 1: atendente1@whatskovi.com / agent123');
  console.log('Atendente 2: atendente2@whatskovi.com / agent123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

# 🚀 Guia Rápido - WhatsKovi

## Início Rápido com Docker

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd WhatsKovi

# 2. Inicie os containers
docker-compose up -d

# 3. Aguarde alguns segundos e acesse
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
```

## Início Rápido sem Docker

### Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Editar .env e configurar DATABASE_URL:
# DATABASE_URL="postgresql://user:password@localhost:5432/whatskovi?schema=public"

# Gerar Prisma Client
npm run prisma:generate

# Executar migrations
npm run prisma:migrate

# Popular banco de dados
npm run prisma:seed

# Iniciar servidor
npm run dev
```

### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Configurar ambiente
cp .env.local.example .env.local

# Iniciar aplicação
npm run dev
```

## 🔐 Primeiro Acesso

1. Acesse: http://localhost:3000
2. Faça login com:
   - Email: `admin@whatskovi.com`
   - Senha: `admin123`

## 📱 Conectar WhatsApp

1. No dashboard, clique em "Configurações" (ícone de engrenagem)
2. Vá em "Conexões WhatsApp"
3. Clique em "Iniciar Conexão"
4. Escaneie o QR Code com seu WhatsApp
5. Aguarde a confirmação de conexão

## 👥 Criar Atendentes

1. Vá em "Usuários" no menu lateral
2. Clique em "Novo Usuário"
3. Preencha os dados:
   - Nome
   - Email
   - Senha
   - Perfil (Atendente)
   - Máximo de atendimentos simultâneos
4. Vincule às filas desejadas

## 📋 Criar Filas

1. Vá em "Configurações" > "Filas"
2. Clique em "Nova Fila"
3. Configure:
   - Nome da fila
   - Cor identificadora
   - Mensagem de saudação
   - Atendentes vinculados

## 💬 Começar a Atender

1. Aguarde mensagens chegarem no WhatsApp conectado
2. Os tickets aparecerão automaticamente na lista
3. Clique em um ticket para visualizar
4. Clique em "Aceitar Atendimento"
5. Responda as mensagens
6. Ao finalizar, clique em "Finalizar"

## 🔧 Comandos Úteis

### Backend

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm start

# Resetar banco de dados
npx prisma migrate reset

# Visualizar banco de dados
npx prisma studio
```

### Frontend

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm start
```

## 🐛 Solução de Problemas

### Erro de conexão com banco de dados
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no arquivo .env
- Teste a conexão: `psql -U user -d whatskovi`

### QR Code não aparece
- Verifique os logs do backend
- Certifique-se que a pasta `sessions` existe
- Tente deletar a pasta `sessions` e reconectar

### Mensagens não chegam
- Verifique se o WhatsApp está conectado
- Confirme que o Socket.IO está funcionando
- Verifique os logs do navegador (F12)

### Erro ao fazer login
- Confirme que o seed foi executado
- Verifique se o JWT_SECRET está configurado
- Limpe o localStorage do navegador

## 📊 Estrutura de Permissões

### Administrador
- Acesso total ao sistema
- Gerenciar usuários
- Gerenciar filas
- Gerenciar conexões WhatsApp
- Visualizar todos os atendimentos
- Acessar relatórios

### Supervisor
- Visualizar todos os atendimentos
- Acessar relatórios
- Não pode editar configurações

### Atendente
- Visualizar apenas seus atendimentos
- Aceitar e finalizar tickets
- Enviar mensagens
- Transferir atendimentos

## 🎯 Próximos Passos

1. Configure as filas de atendimento
2. Crie usuários atendentes
3. Conecte o WhatsApp
4. Configure respostas rápidas (Fase 2)
5. Personalize as mensagens de saudação
6. Configure tags para categorização (Fase 2)

## 📞 Suporte

- Documentação completa: README.md
- Issues: GitHub Issues
- Email: suporte@whatskovi.com

---

✨ Pronto! Seu sistema WhatsKovi está configurado e pronto para uso!

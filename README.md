# 🚀 WhatsKovi - Sistema de Gestão de Atendimentos WhatsApp

<div align="center">

![WhatsKovi Logo](https://via.placeholder.com/200x200/FF355A/FFFFFF?text=WhatsKovi)

**Sistema completo de gestão de atendimentos via WhatsApp**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

[Documentação](#-documentação) •
[Instalação](#-instalação) •
[Funcionalidades](#-funcionalidades) •
[Roadmap](#-roadmap) •
[Contribuir](#-contribuindo)

</div>

---

Sistema completo de gestão de atendimentos via WhatsApp com distribuição inteligente, filas, tags e relatórios.

## 🚀 Tecnologias

### Backend
- Node.js + TypeScript
- Express
- Prisma ORM
- PostgreSQL
- Socket.IO
- WhatsApp Web.js
- JWT Authentication

### Frontend
- Next.js 14
- React
- TypeScript
- TailwindCSS
- Zustand
- Socket.IO Client

## 📋 Pré-requisitos

- Node.js 20+
- PostgreSQL 15+
- Docker e Docker Compose (opcional)

## 🔧 Instalação

### Opção 1: Com Docker (Recomendado)

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd WhatsKovi

# Inicie os containers
docker-compose up -d

# Acesse a aplicação
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### Opção 2: Instalação Manual

#### Backend

```bash
cd backend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Execute as migrations
npm run prisma:migrate

# Popule o banco com dados iniciais
npm run prisma:seed

# Inicie o servidor
npm run dev
```

#### Frontend

```bash
cd frontend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.local.example .env.local

# Inicie o servidor de desenvolvimento
npm run dev
```

## 👤 Credenciais Padrão

Após executar o seed, você pode fazer login com:

- **Admin**: admin@whatskovi.com / admin123
- **Atendente 1**: atendente1@whatskovi.com / agent123
- **Atendente 2**: atendente2@whatskovi.com / agent123

## 🎨 Esquema de Cores

- **Primária**: #FF355A (Botões principais)
- **Secundária**: #FF35AA (Botões secundários)
- **Fundo Claro**: #FFFFFF / #F9F9F9
- **Fundo Escuro**: #0A0A0A
- **Texto**: #1E1E1E (claro) / #F9F9F9 (escuro)

## 📱 Funcionalidades Implementadas (MVP - Fase 1)

### ✅ Módulo de Autenticação
- Login com JWT
- Gestão de sessões
- Proteção de rotas

### ✅ Módulo de Usuários
- CRUD completo de usuários
- Perfis: Admin, Supervisor, Atendente
- Status online/offline em tempo real

### ✅ Módulo de Conexão WhatsApp
- Conexão via QR Code
- Status em tempo real
- Múltiplas instâncias
- Auto-reconexão

### ✅ Módulo de Tickets/Conversas
- Listagem de tickets
- Filtros por status, fila, atendente
- Aceitar atendimento
- Finalizar atendimento
- Transferir entre atendentes

### ✅ Módulo de Mensagens
- Envio e recebimento em tempo real
- Histórico completo
- Indicadores de status
- Notas internas

### ✅ Módulo de Filas
- CRUD de filas
- Vinculação de atendentes
- Mensagens de saudação
- Priorização

### ✅ Comunicação em Tempo Real
- Socket.IO para atualizações instantâneas
- Notificações de novos tickets
- Indicador de digitação
- Status online dos usuários

## 📂 Estrutura do Projeto

```
WhatsKovi/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── services/
│   │   ├── store/
│   │   └── styles/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 🔜 Próximas Fases

### Fase 2 - Core Features
- Tags e categorização
- Respostas rápidas
- Dashboard com métricas
- Gestão de contatos
- Sistema de notificações

### Fase 3 - Avançado
- Chatbot com fluxos
- Relatórios completos
- Pesquisa de satisfação
- Automações
- Configurações avançadas

## 🚀 Deploy

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

### Backend (VPS/Cloud)
- Oracle Cloud Free Tier
- Contabo
- DigitalOcean
- AWS EC2

## 📝 Licença

Este projeto está sob a licença MIT.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📧 Suporte

Para suporte, entre em contato através do email: suporte@whatskovi.com

---

Desenvolvido com ❤️ para gestão eficiente de atendimentos WhatsApp

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

# Rode os testes automatizados (opcional, valida a camada de IA)
npm run test

# Inicie o servidor
npm run dev
```

> Sprint 2: rode `npm run prisma:migrate` sempre que atualizar para garantir que a migration `20251017090000_messages_enhancements` esteja aplicada. Consulte `CHANGELOG.md` para detalhes de rollback em bancos existentes.

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

## API de mensagens (Sprint 2)

- `POST /api/messages` envia texto ou midia e aceita `quotedMsgId` para citar mensagens.
- `PUT /api/messages/:id` edita corpo ou visibilidade e registra `editedAt`/`editedBy`.
- `DELETE /api/messages/:id` remove mensagens, arquivos associados e emite `message:delete`.
- `POST /api/messages/:id/reactions` cria ou atualiza reacoes com o campo `emoji`.
- `DELETE /api/messages/:id/reactions/:reactionId` remove a reacao informada.

Eventos Socket.IO relacionados:
- `message:new` ao publicar uma mensagem.
- `message:update` para edicoes e reacoes.
- `message:delete` ao excluir mensagens.`r`n`r`n## 🤖 IA e Machine Learning

A camada de IA do WhatsKovi pode operar apenas com heurísticas locais ou integrada a um provedor compatível com OpenAI. As variáveis principais (todas exemplificadas em `backend/.env.example`) são:

- `OPENAI_API_KEY` / `OPENAI_API_BASE_URL`: credenciais e endpoint do provedor.
- `OPENAI_MODEL`: modelo padrão (`gpt-4o-mini`).
- `AI_HISTORY_LIMIT` e `AI_SUGGESTION_LIMIT`: quantidade de mensagens analisadas e sugestões retornadas.
- `AI_SENTIMENT_ENABLED`, `AI_SUGGESTIONS_ENABLED`, `AI_CLASSIFICATION_ENABLED`: liga/desliga cada módulo.
- `AI_CHATBOT_MODE`: `assist` (só sugere), `auto` (envia automaticamente) ou `off` (desativa o bot).
- `AI_FORECAST_HORIZON`: horizonte, em dias, para previsão de demanda.
- `AI_DEBUG_LOGS`: defina `true` para registrar no console, a cada mensagem, sentimentos, classificações e número de sugestões geradas (útil para calibração).

### Como calibrar e observar os logs

1. Ajuste as variáveis no `backend/.env` conforme necessário (por exemplo `AI_CHATBOT_MODE=assist` para trabalhar em modo assistido).
2. Ative `AI_DEBUG_LOGS=true` e reinicie o backend (`npm run dev`). Cada mensagem processada emitirá um log `[AI]` com sentimento, classificação, quantidade de sugestões e se houve rascunho de resposta.
3. Envie mensagens de teste (via WhatsApp ou diretamente pela API) e compare o resultado exibido na interface (“Sugestões com IA”) com os logs. Ajuste limites ou modo do chatbot conforme o comportamento desejado.
4. Volte `AI_DEBUG_LOGS=false` após a calibração para manter os logs limpos em produção.

> Dica: execute `npm run test` dentro de `backend/` sempre que alterar prompts ou heurísticas. Os testes garantem que insights e sugestões continuem sendo gerados para mensagens de clientes.

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

### Railway (Recomendado)
```bash
# Deploy automático
./deploy.bat  # Windows
./deploy.sh   # Linux/Mac

# Ou manual
railway login
railway up
```

### Vercel (Frontend)
```bash
cd frontend
vercel --prod
```

### Heroku (Backend)
```bash
heroku create whatskovi-backend
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

### Outras Opções
- Railway (Full-stack)
- DigitalOcean App Platform
- AWS EC2 + RDS
- Oracle Cloud Free Tier

📖 **Guia completo**: [DEPLOY.md](DEPLOY.md)

## 📝 Licença

Este projeto está sob a licença MIT.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📧 Suporte

Para suporte, entre em contato através do email: suporte@whatskovi.com

---

Desenvolvido com ❤️ para gestão eficiente de atendimentos WhatsApp





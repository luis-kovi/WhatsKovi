# 🏗️ Arquitetura do Sistema WhatsKovi

## Visão Geral

O WhatsKovi é uma aplicação full-stack moderna construída com arquitetura cliente-servidor, utilizando comunicação REST API e WebSockets para funcionalidades em tempo real.

## Stack Tecnológica

### Backend
```
Node.js 20+
├── Express (Framework Web)
├── TypeScript (Linguagem)
├── Prisma (ORM)
├── PostgreSQL (Banco de Dados)
├── Socket.IO (WebSockets)
├── WhatsApp Web.js (Integração WhatsApp)
├── JWT (Autenticação)
└── Bcrypt (Criptografia)
```

### Frontend
```
Next.js 14
├── React 18 (UI Library)
├── TypeScript (Linguagem)
├── TailwindCSS (Estilização)
├── Zustand (State Management)
├── Socket.IO Client (WebSockets)
├── Axios (HTTP Client)
└── Lucide React (Ícones)
```

## Arquitetura de Camadas

### Backend

```
┌─────────────────────────────────────┐
│         API REST / WebSocket        │
├─────────────────────────────────────┤
│           Controllers               │
│  (Lógica de Requisição/Resposta)   │
├─────────────────────────────────────┤
│            Services                 │
│    (Lógica de Negócio)             │
├─────────────────────────────────────┤
│         Prisma ORM                  │
│    (Camada de Dados)               │
├─────────────────────────────────────┤
│         PostgreSQL                  │
│    (Banco de Dados)                │
└─────────────────────────────────────┘
```

### Frontend

```
┌─────────────────────────────────────┐
│         Pages (Next.js)             │
├─────────────────────────────────────┤
│         Components                  │
│    (UI Components)                 │
├─────────────────────────────────────┤
│      Store (Zustand)               │
│    (State Management)              │
├─────────────────────────────────────┤
│         Services                    │
│  (API & Socket Clients)            │
└─────────────────────────────────────┘
```

## Fluxo de Dados

### Autenticação

```
1. Usuário → Login Form
2. Frontend → POST /api/auth/login
3. Backend → Valida credenciais
4. Backend → Gera JWT Token
5. Backend → Retorna token + dados do usuário
6. Frontend → Armazena token no localStorage
7. Frontend → Inicializa Socket.IO com token
8. Frontend → Redireciona para dashboard
```

### Recebimento de Mensagem WhatsApp

```
1. WhatsApp → Mensagem recebida
2. WhatsApp Web.js → Captura evento
3. Backend → Processa mensagem
4. Backend → Cria/Atualiza Contact
5. Backend → Cria/Atualiza Ticket
6. Backend → Cria Message
7. Backend → Emite evento Socket.IO
8. Frontend → Recebe evento
9. Frontend → Atualiza UI em tempo real
```

### Envio de Mensagem

```
1. Usuário → Digita mensagem
2. Frontend → POST /api/messages
3. Backend → Valida ticket
4. Backend → Cria Message no DB
5. Backend → Envia via WhatsApp Web.js
6. Backend → Atualiza status da mensagem
7. Backend → Emite evento Socket.IO
8. Frontend → Atualiza UI
```

## Modelo de Dados

### Entidades Principais

```
User (Usuário)
├── id: UUID
├── name: String
├── email: String (unique)
├── password: String (hashed)
├── role: Enum (ADMIN, SUPERVISOR, AGENT)
├── status: Enum (ONLINE, OFFLINE, AWAY)
└── maxTickets: Integer

WhatsAppConnection (Conexão)
├── id: UUID
├── name: String
├── phoneNumber: String
├── status: String
├── qrCode: String
└── isDefault: Boolean

Contact (Contato)
├── id: UUID
├── name: String
├── phoneNumber: String (unique)
├── email: String
└── isBlocked: Boolean

Queue (Fila)
├── id: UUID
├── name: String
├── color: String
├── description: String
├── greetingMessage: String
└── priority: Integer

Ticket (Atendimento)
├── id: UUID
├── status: Enum (PENDING, OPEN, CLOSED)
├── priority: Enum (LOW, MEDIUM, HIGH, URGENT)
├── unreadMessages: Integer
├── contactId: UUID (FK)
├── userId: UUID (FK)
├── queueId: UUID (FK)
└── whatsappId: UUID (FK)

Message (Mensagem)
├── id: UUID
├── body: String
├── type: Enum (TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT)
├── status: Enum (PENDING, SENT, RECEIVED, READ)
├── isPrivate: Boolean
├── ticketId: UUID (FK)
└── userId: UUID (FK)

Tag (Etiqueta)
├── id: UUID
├── name: String (unique)
└── color: String
```

## Comunicação em Tempo Real

### Eventos Socket.IO

#### Servidor → Cliente

```javascript
// Novo ticket criado
socket.emit('ticket:new', ticket)

// Ticket atualizado
socket.emit('ticket:update', ticket)

// Nova mensagem
socket.emit('message:new', { message, ticketId })

// Usuário online
socket.emit('user:online', { userId })

// Usuário offline
socket.emit('user:offline', { userId })

// QR Code gerado
socket.emit('whatsapp:qr', { connectionId, qrCode })

// WhatsApp conectado
socket.emit('whatsapp:ready', { connectionId, phoneNumber })

// WhatsApp desconectado
socket.emit('whatsapp:disconnected', { connectionId })
```

#### Cliente → Servidor

```javascript
// Usuário digitando
socket.emit('ticket:typing', { ticketId, userId })
```

## Segurança

### Autenticação
- JWT (JSON Web Tokens)
- Tokens armazenados no localStorage
- Refresh tokens para renovação
- Expiração configurável

### Autorização
- Middleware de autenticação em todas as rotas protegidas
- Verificação de roles (ADMIN, SUPERVISOR, AGENT)
- Filtros de dados baseados em permissões

### Proteções
- Senhas criptografadas com bcrypt (salt rounds: 10)
- CORS configurado
- Rate limiting (planejado para Fase 2)
- Validação de inputs
- SQL Injection prevenido pelo Prisma ORM

## Escalabilidade

### Horizontal
- Backend stateless (exceto sessões WhatsApp)
- Socket.IO com Redis Adapter (planejado)
- Load balancer para múltiplas instâncias

### Vertical
- Otimização de queries com Prisma
- Índices no banco de dados
- Cache de dados frequentes (planejado)
- Paginação em listagens

## Performance

### Backend
- Queries otimizadas com includes seletivos
- Índices em campos de busca frequente
- Conexão pool do Prisma
- Lazy loading de relações

### Frontend
- Code splitting do Next.js
- Lazy loading de componentes
- Virtualização de listas longas (planejado)
- Debounce em buscas
- Cache de requisições com React Query (planejado)

## Deploy

### Desenvolvimento
```
Backend:  localhost:3001
Frontend: localhost:3000
Database: localhost:5432
```

### Produção Recomendada
```
Frontend:  Vercel (CDN Global, SSL automático)
Backend:   VPS (Oracle Cloud Free / Contabo)
Database:  PostgreSQL no mesmo VPS
WhatsApp:  Mesmo servidor do backend
```

## Monitoramento (Planejado)

- Logs estruturados
- Health checks
- Métricas de performance
- Alertas de erro
- Rastreamento de requisições

## Backup

- Backup automático do PostgreSQL
- Backup de sessões WhatsApp
- Backup de uploads/mídias
- Retenção configurável

## Limitações Conhecidas

1. **WhatsApp Web.js**
   - Depende do WhatsApp Web
   - Pode ser bloqueado pelo WhatsApp
   - Requer manutenção da sessão

2. **Escalabilidade de Conexões WhatsApp**
   - Cada instância requer recursos
   - Limite de ~50 conexões por servidor

3. **Socket.IO**
   - Requer sticky sessions em load balancer
   - Necessita Redis para múltiplas instâncias

## Roadmap Técnico

### Fase 2
- [ ] Redis para cache
- [ ] Bull Queue para jobs assíncronos
- [ ] Rate limiting
- [ ] Testes automatizados

### Fase 3
- [ ] Microserviços
- [ ] Kubernetes
- [ ] CI/CD completo
- [ ] Monitoramento avançado

---

Documentação técnica mantida e atualizada pela equipe WhatsKovi

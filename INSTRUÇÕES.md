# Prompt Completo para Sistema de Gestão de Atendimentos WhatsApp (Tipo Whaticket)

Crie uma plataforma web completa de gestão de atendimentos via WhatsApp com as seguintes especificações:

## NOME DA PLATAFORMA: WhatsKovi

## 🎯 OBJETIVO PRINCIPAL

Desenvolver um sistema multi-atendimento que permite conectar o WhatsApp Web via QR Code e gerenciar conversas em equipe, com distribuição inteligente de atendimentos, filas, tags e relatórios completos.

-----

## 📱 MÓDULO 1: CONEXÃO WHATSAPP

### Autenticação e Conexão

- Tela de login com QR Code do WhatsApp Web
- Status de conexão em tempo real (Conectado/Desconectado/Conectando)
- Botão para desconectar/reconectar sessão
- Possibilidade de múltiplas conexões (multi-instâncias)
- Cada conexão deve ter um nome/identificador único
- Indicador visual do número de telefone conectado
- Auto-reconexão em caso de queda
- Notificação sonora e visual quando desconectado

-----

## 👥 MÓDULO 2: GESTÃO DE USUÁRIOS E PERMISSÕES

### Tipos de Usuário

1. *Administrador*: acesso total ao sistema
1. *Supervisor*: visualiza todos atendimentos, relatórios, não edita configurações
1. *Atendente*: acesso apenas aos seus atendimentos

### Funcionalidades de Usuários

- CRUD completo de usuários (criar, editar, listar, desativar)
- Definição de nome, email, senha, perfil/cargo
- Cada usuário tem avatar personalizável
- Status online/offline/ausente em tempo real
- Horário de trabalho configurável por usuário
- Fila(s) de atendimento atribuída(s) a cada atendente
- Limite de atendimentos simultâneos por atendente
- Histórico de atividades do usuário

-----

## 💬 MÓDULO 3: GESTÃO DE CONVERSAS/TICKETS

### Interface de Atendimento

- Lista lateral com todos os tickets/conversas
- Filtros: Status (aberto/pendente/fechado), Fila, Atendente, Tags, Data
- Busca por nome do contato, número ou conteúdo da mensagem
- Ordenação por: mais recentes, não lidos primeiro, prioridade

### Card de Cada Conversa Deve Mostrar:

- Nome/número do contato
- Avatar do contato
- Último atendente responsável
- Status atual (ícone colorido)
- Hora da última mensagem
- Badge com contador de mensagens não lidas
- Tags visuais aplicadas
- Fila a que pertence

### Área de Chat (Conversa)

- Histórico completo da conversa
- Indicador de “digitando…”
- Timestamp de cada mensagem
- Status de envio (enviado/recebido/lido) com ícones
- Mensagens do cliente alinhadas à esquerda
- Mensagens do atendente alinhadas à direita
- Diferenciação visual de mensagens internas (notas privadas)
- Exibição de mídias (imagens, vídeos, áudios, documentos)
- Player de áudio integrado
- Preview de links com thumbnail
- Possibilidade de responder mensagem específica (quote)
- Reações a mensagens

### Campo de Envio de Mensagens

- Input de texto com formatação básica (negrito, itálico)
- Botão para anexar arquivos
- Botão para emojis
- Botão para mensagens rápidas/respostas prontas
- Botão para gravar áudio
- Contador de caracteres
- Preview de arquivo antes de enviar
- Envio com Enter (Shift+Enter para quebra de linha)

### Ações do Ticket

- Aceitar atendimento (pegar ticket da fila)
- Transferir para outro atendente (com dropdown)
- Transferir para outra fila
- Resolver/Finalizar atendimento
- Reabrir atendimento fechado
- Adicionar/remover tags
- Definir prioridade (baixa/média/alta/urgente)
- Adicionar notas internas (visíveis apenas para equipe)
- Agendar mensagem futura
- Exportar conversa (PDF/TXT)

-----

## 📋 MÓDULO 4: FILAS DE ATENDIMENTO

### Gestão de Filas

- CRUD de filas (criar, editar, excluir, listar)
- Nome da fila e cor identificadora
- Descrição/finalidade da fila
- Atendentes vinculados à fila
- Ordem de prioridade entre filas
- Horário de funcionamento da fila
- Mensagem automática de saudação por fila
- Mensagem de fora de horário

### Distribuição de Tickets

- Distribuição automática ou manual
- Opções de distribuição:
  - Round-robin (rotativo)
  - Menor número de atendimentos ativos
  - Último atendente que conversou com o cliente
  - Aleatório
- Limite máximo de tickets em espera por fila
- Notificação sonora para novos tickets na fila

-----

## 🏷 MÓDULO 5: TAGS E CATEGORIZAÇÃO

### Sistema de Tags

- CRUD de tags (criar, editar, excluir)
- Nome e cor da tag
- Tags podem ser aplicadas a tickets e contatos
- Múltiplas tags por ticket
- Filtro e relatórios por tags
- Tags automáticas baseadas em palavras-chave
- Sugestão de tags baseada no conteúdo

-----

## 📞 MÓDULO 6: GESTÃO DE CONTATOS

### Base de Contatos

- Lista completa de contatos que já interagiram
- Informações: Nome, Número, Email, Avatar
- Campos customizáveis (CPF, endereço, empresa, etc.)
- Tags aplicadas ao contato
- Histórico completo de atendimentos do contato
- Notas sobre o contato (visíveis em todos atendimentos)
- Importação de contatos via CSV
- Exportação de contatos
- Busca avançada com múltiplos filtros
- Possibilidade de bloquear contato
- Criação de grupos/segmentos de contatos

-----

## 💬 MÓDULO 7: RESPOSTAS RÁPIDAS

### Mensagens Prontas

- CRUD de respostas rápidas
- Título/atalho da mensagem (ex: /saudacao)
- Conteúdo da mensagem
- Variáveis dinâmicas: {nome}, {atendente}, {fila}, {data}, {hora}
- Anexar mídia à resposta rápida
- Organização por categorias/pastas
- Busca por atalho ou conteúdo
- Estatísticas de uso de cada resposta
- Respostas globais (todos) ou por usuário/fila
- Acesso rápido via “/” ou botão no chat

-----

## 🤖 MÓDULO 8: CHATBOT E AUTOMAÇÕES

### Chatbot Básico

- Menu de opções interativo
- Árvore de fluxos configurável
- Respostas automáticas por palavra-chave
- Horário de atuação do bot
- Transferência automática para atendente humano
- Coleta de informações antes do atendimento humano
- Mensagens de ausência/fora de horário
- Integração com respostas rápidas

### Regras de Automação

- Distribuição automática de tickets por palavra-chave
- Auto-aplicação de tags
- Fechamento automático de tickets inativos (configurável)
- Envio de pesquisa de satisfação ao finalizar
- Notificações automáticas por email
- Webhooks para integrações externas

-----

## 📊 MÓDULO 9: DASHBOARD E RELATÓRIOS

### Dashboard Principal

Deve exibir cards com métricas em tempo real:

- Total de atendimentos em aberto
- Total de atendimentos em espera
- Total de atendimentos finalizados (hoje/semana/mês)
- Tempo médio de atendimento
- Tempo médio de primeira resposta
- Tempo médio de espera
- Taxa de resolução
- Atendimentos por atendente (gráfico)
- Atendimentos por fila (gráfico)
- Atendimentos por horário (gráfico de linha)
- Atendimentos por tag (gráfico de pizza)
- Satisfação média dos clientes

### Relatórios Avançados

- Filtros: período (data início/fim), atendente, fila, tag, status
- Exportação em Excel/CSV/PDF
- Relatórios disponíveis:
1. *Desempenho por atendente*: número de atendimentos, tempo médio, satisfação
1. *Desempenho por fila*: volume, tempo de espera, taxa de resolução
1. *Análise de horários*: picos de atendimento, horários ociosos
1. *Histórico de conversas*: exportação completa filtrada
1. *Satisfação do cliente*: NPS, comentários
1. *Tempo de resposta*: primeira resposta, tempo total
1. *Produtividade*: mensagens enviadas, tickets resolvidos por hora

### Gráficos Visuais

- Linha temporal de atendimentos
- Gráfico de pizza para distribuição por fila/tag
- Gráfico de barras para comparação entre atendentes
- Heatmap de horários de maior demanda
- Funil de conversão de tickets

-----

## ⚙ MÓDULO 10: CONFIGURAÇÕES DO SISTEMA

### Configurações Gerais

- Nome da empresa/sistema
- Logo personalizado
- Cores do tema (branding)
- Idioma da interface
- Timezone
- Formato de data/hora

### Configurações de Atendimento

- Tempo para considerar ticket inativo
- Fechamento automático após X horas de inatividade
- Mensagem de encerramento automático
- Limite de atendimentos simultâneos (global e por usuário)
- Ativar/desativar notificações sonoras
- Ativar/desativar pesquisa de satisfação

### Configurações de Notificações

- Notificação de novo ticket
- Notificação de mensagem em ticket aberto
- Notificação de transferência recebida
- Notificação por email (configurar SMTP)
- Notificação push no navegador

### Integração e API

- Webhooks para eventos (novo ticket, ticket fechado, nova mensagem)
- Documentação da API REST
- Geração de token de acesso
- Logs de requisições

-----

## 🔔 MÓDULO 11: NOTIFICAÇÕES EM TEMPO REAL

### Sistema de Notificações

- Notificação sonora customizável para:
  - Novo ticket na fila
  - Nova mensagem em ticket aberto
  - Ticket transferido para o usuário
  - Ticket próximo de inativar
- Notificação visual (toast/popup)
- Badge com contador no ícone do navegador
- Notificação push no desktop (mesmo com aba inativa)
- Central de notificações no sistema
- Marcação de lida/não lida

-----

## 📈 MÓDULO 12: PESQUISA DE SATISFAÇÃO

### Sistema de Avaliação

- Enviada automaticamente ao finalizar ticket
- Escala de 1 a 5 estrelas ou NPS (0-10)
- Campo para comentário opcional
- Visualização de avaliações no dashboard
- Relatório de satisfação por período/atendente/fila
- Resposta automática de agradecimento

-----

## 🎨 REQUISITOS DE DESIGN E UX

### Interface Visual

- Design moderno e limpo (estilo Material Design ou similar)
- Responsivo (funcional em desktop, tablet, mobile)
- Modo claro e escuro (dark mode)
- Cores diferenciadas para status (verde=online, amarelo=ausente, vermelho=offline)
- Ícones intuitivos (usar biblioteca como Lucide, Font Awesome)
- Animações suaves em transições
- Loading states claros
- Estados vazios com ilustrações e mensagens amigáveis

### Navegação

- Menu lateral retrátil com ícones e labels
- Breadcrumb para navegação contextual
- Atalhos de teclado para ações frequentes
- Busca global no topo do sistema
- Perfil do usuário com dropdown (config, logout)

-----

## 🔒 REQUISITOS DE SEGURANÇA

- Autenticação JWT com refresh token
- Senhas criptografadas (bcrypt)
- Proteção contra CSRF
- Rate limiting em endpoints sensíveis
- Logs de auditoria (quem fez o quê e quando)
- Sessões expiram após inatividade
- 2FA opcional para usuários admin

-----

## ⚡ REQUISITOS TÉCNICOS

### Frontend

- React ou Next.js
- TypeScript
- TailwindCSS para estilização
- Zustand ou Redux para gerenciamento de estado
- Socket.io para real-time
- React Query para cache e sincronização
- Recharts ou Chart.js para gráficos

### Backend

- Node.js com Express ou NestJS
- TypeScript
- Prisma ORM ou TypeORM
- PostgreSQL ou MySQL como banco de dados
- Socket.io para WebSockets
- Bull ou Bee-Queue para filas de jobs
- Integração com WhatsApp via biblioteca oficial ou Baileys/Venom-bot

### Funcionalidades Real-time

- Atualização instantânea de mensagens
- Status online dos usuários
- Indicador de “digitando…”
- Notificações push
- Atualização de dashboard em tempo real

-----

## 📦 FUNCIONALIDADES ADICIONAIS (DIFERENCIAIS)

- Busca em todo histórico de mensagens (full-text search)
- Atalhos para clientes VIP
- Priorização automática de tickets por cliente
- Integração com CRM (webhook ou API)
- Backup automático de conversas
- Multi-idioma (i18n)
- Campanhas de mensagens em massa (com limitação para não ser spam)
- Agendamento de mensagens
- Templates de mensagem com aprovação do WhatsApp
- Chatbot com IA para respostas inteligentes
- Análise de sentimento das mensagens
- Transcrição automática de áudios

-----

## 🎯 PRIORIDADE DE DESENVOLVIMENTO

### Fase 1 - MVP (Essencial)

1. Conexão WhatsApp via QR Code
1. Sistema de login e usuários básico
1. Listagem de conversas
1. Chat funcional (enviar/receber mensagens)
1. Aceitar e finalizar atendimento
1. Filas básicas

### Fase 2 - Core Features

1. Transferência entre atendentes
1. Tags
1. Respostas rápidas
1. Dashboard básico
1. Gestão de contatos
1. Notificações

### Fase 3 - Avançado

1. Chatbot
1. Relatórios completos
1. Pesquisa de satisfação
1. Automações
1. Configurações avançadas

-----

## 📝 OBSERVAÇÕES IMPORTANTES

- O sistema deve ser escalável para suportar múltiplos atendentes simultâneos
- Todas as ações devem ser registradas em logs para auditoria
- Interface deve ser intuitiva, mesmo para usuários não técnicos
- Priorize performance: listas virtualizadas, lazy loading, paginação
- Implementar tratamento de erros robusto com mensagens claras
- Testes automatizados para funcionalidades críticas
- Documentação técnica para futuras manutenções
- Considerar LGPD/GDPR na coleta e armazenamento de dados

-----

## 🚀 ENTREGA ESPERADA

Um sistema completo, funcional e pronto para produção, com:

- Código limpo e bem documentado
- README com instruções de instalação
- Variáveis de ambiente configuráveis
- Docker/Docker Compose para fácil deploy
- Seeds para popular banco com dados de exemplo
- Testes de pelo menos das funcionalidades principais


## ESQUEMA DE CORES:

Botões principais: Fundo #FF355A, texto #FFFFFF

Botões secundários: Fundo #FFFFFF, borda #FF35AA, texto #FF35AA

Plano de fundo do app: #FFFFFF ou #F9F9F9

Plano de fundo alternativo (modo escuro): #0A0A0A

Títulos e ícones: #1E1E1E (modo claro), #F9F9F9 (modo escuro)

## SISTEMAS PARA DEPLOY 

Solução Híbrida 

Frontend: Vercel (Grátis)
UI/UX rápido e escalável
CDN global
SSL automático​

Backend + WhatsApp: VPS Self-Hosted
Oracle Cloud Free Tier ou Contabo $3.99/mês
Backend Node.js + Socket.io
PostgreSQL local
WhatsApp bot sempre conectado
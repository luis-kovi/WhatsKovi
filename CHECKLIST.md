# ✅ Checklist de Verificação - WhatsKovi

## 📋 Antes de Iniciar

### Pré-requisitos
- [ ] Node.js 20+ instalado
- [ ] PostgreSQL 15+ instalado (ou Docker)
- [ ] Git instalado
- [ ] Editor de código (VS Code recomendado)

### Verificar Instalações
```bash
node --version    # Deve ser v20+
npm --version     # Deve ser v10+
psql --version    # Deve ser 15+
git --version     # Qualquer versão recente
```

## 🔧 Instalação

### Backend
- [ ] Navegou para pasta `backend`
- [ ] Executou `npm install`
- [ ] Copiou `.env.example` para `.env`
- [ ] Configurou `DATABASE_URL` no `.env`
- [ ] Executou `npm run prisma:generate`
- [ ] Executou `npm run prisma:migrate`
- [ ] Executou `npm run prisma:seed`
- [ ] Verificou se seed criou usuários

### Frontend
- [ ] Navegou para pasta `frontend`
- [ ] Executou `npm install`
- [ ] Copiou `.env.local.example` para `.env.local`
- [ ] Verificou URLs no `.env.local`

### Banco de Dados
- [ ] PostgreSQL está rodando
- [ ] Banco `whatskovi` foi criado
- [ ] Migrations foram aplicadas
- [ ] Seed foi executado com sucesso

## 🚀 Primeiro Start

### Backend
- [ ] Executou `npm run dev` na pasta backend
- [ ] Servidor iniciou na porta 3001
- [ ] Não há erros no console
- [ ] Mensagem "Server running on port 3001" apareceu

### Frontend
- [ ] Executou `npm run dev` na pasta frontend
- [ ] Aplicação iniciou na porta 3000
- [ ] Não há erros no console
- [ ] Navegador abriu automaticamente

## 🔐 Primeiro Login

### Teste de Autenticação
- [ ] Acessou http://localhost:3000
- [ ] Página de login carregou corretamente
- [ ] Tentou login com: admin@whatskovi.com / admin123
- [ ] Login foi bem-sucedido
- [ ] Redirecionou para dashboard
- [ ] Nome do usuário aparece na sidebar

### Verificar Permissões
- [ ] Como Admin, vê todos os botões na sidebar
- [ ] Botão de Usuários está visível
- [ ] Botão de Relatórios está visível
- [ ] Botão de Configurações está visível

## 📱 Conexão WhatsApp

### Preparação
- [ ] WhatsApp instalado no celular
- [ ] Celular conectado à internet
- [ ] WhatsApp Web nunca foi usado (ou desconectado)

### Conectar
- [ ] Clicou em Configurações
- [ ] Navegou para Conexões WhatsApp
- [ ] Clicou em "Iniciar Conexão"
- [ ] QR Code apareceu
- [ ] Escaneou QR Code com WhatsApp
- [ ] Status mudou para "Conectado"
- [ ] Número de telefone apareceu

### Testar Recebimento
- [ ] Enviou mensagem de teste para o número conectado
- [ ] Mensagem apareceu no sistema
- [ ] Ticket foi criado automaticamente
- [ ] Contato foi criado automaticamente

## 💬 Teste de Atendimento

### Aceitar Ticket
- [ ] Ticket apareceu na lista
- [ ] Clicou no ticket
- [ ] Detalhes do ticket carregaram
- [ ] Clicou em "Aceitar Atendimento"
- [ ] Status mudou para "Aberto"
- [ ] Ticket foi atribuído ao usuário

### Enviar Mensagem
- [ ] Digitou mensagem no campo de texto
- [ ] Clicou em enviar (ou Enter)
- [ ] Mensagem apareceu no chat
- [ ] Mensagem foi enviada para WhatsApp
- [ ] Status da mensagem atualizou

### Finalizar Atendimento
- [ ] Clicou em "Finalizar"
- [ ] Status mudou para "Fechado"
- [ ] Ticket saiu da lista de abertos

## 👥 Gestão de Usuários

### Criar Atendente
- [ ] Navegou para Usuários
- [ ] Clicou em "Novo Usuário"
- [ ] Preencheu formulário
- [ ] Selecionou perfil "Atendente"
- [ ] Definiu máximo de atendimentos
- [ ] Salvou usuário
- [ ] Usuário apareceu na lista

### Testar Login do Atendente
- [ ] Fez logout
- [ ] Tentou login com novo atendente
- [ ] Login funcionou
- [ ] Vê apenas seus atendimentos
- [ ] Não vê botões de admin

## 📋 Gestão de Filas

### Criar Fila
- [ ] Como Admin, navegou para Filas
- [ ] Clicou em "Nova Fila"
- [ ] Preencheu nome e cor
- [ ] Adicionou mensagem de saudação
- [ ] Vinculou atendentes
- [ ] Salvou fila
- [ ] Fila apareceu na lista

### Testar Fila
- [ ] Novo ticket foi para a fila correta
- [ ] Mensagem de saudação foi enviada
- [ ] Atendentes da fila podem ver o ticket

## 🔄 Tempo Real

### Socket.IO
- [ ] Abriu sistema em duas abas
- [ ] Enviou mensagem em uma aba
- [ ] Mensagem apareceu na outra aba
- [ ] Sem necessidade de refresh

### Status Online
- [ ] Fez login em duas contas
- [ ] Status "online" aparece
- [ ] Ao fazer logout, status muda

## 🐛 Verificação de Erros

### Console do Navegador
- [ ] Abriu DevTools (F12)
- [ ] Verificou aba Console
- [ ] Não há erros em vermelho
- [ ] Socket conectado com sucesso

### Logs do Backend
- [ ] Verificou terminal do backend
- [ ] Não há erros críticos
- [ ] Requisições estão sendo logadas

### Banco de Dados
- [ ] Executou `npx prisma studio`
- [ ] Verificou tabelas criadas
- [ ] Dados do seed estão presentes
- [ ] Relacionamentos funcionando

## 📊 Funcionalidades Básicas

### Lista de Tickets
- [ ] Tickets aparecem ordenados
- [ ] Filtros funcionam
- [ ] Busca funciona
- [ ] Contador de não lidas correto

### Chat
- [ ] Histórico carrega completo
- [ ] Scroll funciona
- [ ] Timestamps corretos
- [ ] Status das mensagens correto

### Transferência
- [ ] Consegue transferir ticket
- [ ] Ticket aparece para novo atendente
- [ ] Histórico é mantido

## 🎨 Interface

### Design
- [ ] Cores estão corretas (#FF355A)
- [ ] Fontes legíveis
- [ ] Espaçamentos adequados
- [ ] Ícones aparecem corretamente

### Responsividade
- [ ] Testou em tela menor
- [ ] Layout se adapta
- [ ] Funcionalidades acessíveis

### Animações
- [ ] Transições suaves
- [ ] Loading states aparecem
- [ ] Hover effects funcionam

## 🔒 Segurança

### Autenticação
- [ ] Não consegue acessar dashboard sem login
- [ ] Token expira corretamente
- [ ] Logout funciona
- [ ] Refresh mantém sessão

### Autorização
- [ ] Atendente não vê opções de admin
- [ ] Atendente não acessa rotas de admin
- [ ] Cada usuário vê apenas seus dados

## 📱 WhatsApp Avançado

### Tipos de Mensagem
- [ ] Texto funciona
- [ ] Imagens funcionam (Fase 2)
- [ ] Áudios funcionam (Fase 2)
- [ ] Documentos funcionam (Fase 2)

### Reconexão
- [ ] Desconectou WhatsApp
- [ ] Sistema detectou desconexão
- [ ] Conseguiu reconectar
- [ ] Mensagens continuam chegando

## 🚀 Performance

### Carregamento
- [ ] Login é rápido (< 2s)
- [ ] Dashboard carrega rápido (< 3s)
- [ ] Lista de tickets carrega rápido
- [ ] Chat carrega rápido

### Tempo Real
- [ ] Mensagens chegam instantaneamente
- [ ] Atualizações são imediatas
- [ ] Sem lag perceptível

## 📝 Documentação

### Arquivos
- [ ] README.md está completo
- [ ] QUICKSTART.md está claro
- [ ] ARCHITECTURE.md está detalhado
- [ ] Todos os arquivos .example existem

### Código
- [ ] Código está comentado onde necessário
- [ ] Funções têm nomes descritivos
- [ ] Estrutura é clara

## 🐳 Docker (Opcional)

### Build
- [ ] `docker-compose build` funciona
- [ ] Sem erros de build
- [ ] Imagens foram criadas

### Run
- [ ] `docker-compose up -d` funciona
- [ ] Todos os containers iniciaram
- [ ] Aplicação acessível
- [ ] Banco de dados funciona

## ✅ Checklist Final

### Desenvolvimento
- [ ] Todos os testes acima passaram
- [ ] Não há erros críticos
- [ ] Funcionalidades principais funcionam
- [ ] Documentação está completa

### Pronto para Produção
- [ ] Variáveis de ambiente configuradas
- [ ] Secrets foram alteradas
- [ ] HTTPS configurado
- [ ] Backup configurado
- [ ] Monitoramento configurado

## 🎉 Conclusão

Se todos os itens acima estão marcados, seu sistema WhatsKovi está:

✅ **Instalado corretamente**
✅ **Funcionando perfeitamente**
✅ **Pronto para uso**
✅ **Pronto para produção** (após ajustes de segurança)

---

**Parabéns! Seu WhatsKovi está operacional!** 🚀

Em caso de problemas, consulte:
- QUICKSTART.md para guia rápido
- README.md para documentação completa
- CREDENTIALS.md para credenciais
- GitHub Issues para reportar bugs

# 🚀 Deploy do WhatsKovi

## Railway Deploy

### 1. Pré-requisitos
- Conta no [Railway](https://railway.app)
- Railway CLI instalado: `npm install -g @railway/cli`

### 2. Deploy Automático
```bash
# Windows
deploy.bat

# Linux/Mac
chmod +x deploy.sh
./deploy.sh
```

### 3. Deploy Manual

#### Passo 1: Login
```bash
railway login
```

#### Passo 2: Criar Projeto
```bash
railway new
```

#### Passo 3: Configurar Variáveis
No painel do Railway, adicione as variáveis do arquivo `.env.railway`

#### Passo 4: Deploy
```bash
railway up
```

### 4. Configuração de Banco

O Railway oferece PostgreSQL gratuito. Para conectar:

1. Vá em "Add Service" > "Database" > "PostgreSQL"
2. Copie a `DATABASE_URL` gerada
3. Cole nas variáveis de ambiente

### 5. Domínio Personalizado

1. Vá em "Settings" > "Domains"
2. Adicione seu domínio
3. Configure DNS conforme instruções

### 6. Monitoramento

- Logs: `railway logs`
- Status: `railway status`
- Métricas: Painel do Railway

## Outros Provedores

### Vercel (Frontend)
```bash
cd frontend
vercel --prod
```

### Heroku (Backend)
```bash
# Instalar Heroku CLI
heroku create whatskovi-backend
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

### DigitalOcean App Platform
1. Conecte repositório GitHub
2. Configure build commands
3. Adicione variáveis de ambiente

## Troubleshooting

### Erro de Build
- Verifique Node.js version (20+)
- Limpe cache: `npm ci`

### Erro de Database
- Verifique DATABASE_URL
- Execute migrations: `npx prisma migrate deploy`

### Erro de CORS
- Configure FRONTEND_URL corretamente
- Verifique domínios permitidos
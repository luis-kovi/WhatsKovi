#!/bin/bash

echo "🚀 Iniciando deploy do WhatsKovi..."

echo ""
echo "📦 Verificando dependências..."
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI não encontrado. Instalando..."
    npm install -g @railway/cli
fi

echo ""
echo "🔐 Fazendo login no Railway..."
railway login

echo ""
echo "📋 Listando projetos..."
railway projects

echo ""
echo "🚀 Fazendo deploy..."
railway up

echo ""
echo "✅ Deploy concluído!"
echo "🌐 Acesse: https://seu-projeto.railway.app"
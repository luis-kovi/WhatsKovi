@echo off
echo 🚀 Iniciando deploy do WhatsKovi...

echo.
echo 📦 Verificando dependências...
where railway >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Railway CLI não encontrado. Instalando...
    npm install -g @railway/cli
)

echo.
echo 🔐 Fazendo login no Railway...
railway login

echo.
echo 📋 Listando projetos...
railway projects

echo.
echo 🚀 Fazendo deploy...
railway up

echo.
echo ✅ Deploy concluído!
echo 🌐 Acesse: https://seu-projeto.railway.app
pause
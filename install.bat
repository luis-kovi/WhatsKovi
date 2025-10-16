@echo off
echo ========================================
echo WhatsKovi - Instalacao Automatica
echo ========================================
echo.

echo [1/4] Instalando dependencias do backend...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Erro ao instalar dependencias do backend
    pause
    exit /b 1
)

echo.
echo [2/4] Configurando banco de dados...
call npx prisma generate
call npx prisma migrate dev --name init
call npx prisma db seed

echo.
echo [3/4] Instalando dependencias do frontend...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo Erro ao instalar dependencias do frontend
    pause
    exit /b 1
)

echo.
echo [4/4] Instalacao concluida!
echo.
echo ========================================
echo Para iniciar o sistema:
echo.
echo Backend:  cd backend  ^&^& npm run dev
echo Frontend: cd frontend ^&^& npm run dev
echo.
echo Acesse: http://localhost:3000
echo Login: admin@whatskovi.com / admin123
echo ========================================
echo.
pause

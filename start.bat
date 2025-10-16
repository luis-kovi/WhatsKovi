@echo off
echo ========================================
echo WhatsKovi - Iniciando Sistema
echo ========================================
echo.

echo Iniciando Backend...
start cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak > nul

echo Iniciando Frontend...
start cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Sistema iniciado!
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Login: admin@whatskovi.com / admin123
echo ========================================

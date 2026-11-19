@echo off
chcp 65001 >nul
where node >nul 2>nul || (echo Instale o Node.js 22.13 ou superior: https://nodejs.org & pause & exit /b 1)
echo Iniciando o FinanceControl com dados de demonstracao...
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
node --disable-warning=ExperimentalWarning api\server.js --demo
pause

@echo off
title nextFinanceDB - Criar banco SQL Server
cd /d "%~dp0"

set SERVER=(localdb)\mssqllocaldb

where sqlcmd >nul 2>&1
if errorlevel 1 (
    echo.
    echo [AVISO] sqlcmd nao encontrado. Abra os arquivos .sql no SQL Server Management Studio:
    echo   1. 01-criar-nextFinanceDB.sql
    echo   2. Execute o FinanceControl uma vez ^(cria usuario admin^)
    echo   3. 02-seed-dados-iniciais.sql
    echo.
    pause
    exit /b 1
)

echo Criando banco e tabelas nextFinanceDB...
sqlcmd -S %SERVER% -i "01-criar-nextFinanceDB.sql"
if errorlevel 1 goto erro

echo.
echo Banco criado. Agora:
echo   1. Execute FinanceControl\Executar.bat ^(login admin / Admin@123^)
echo   2. Rode novamente este script com opcao seed, ou execute 02-seed-dados-iniciais.sql
echo.

set /p SEED=Deseja tentar inserir dados iniciais agora? (S/N): 
if /i "%SEED%"=="S" (
    sqlcmd -S %SERVER% -d nextFinanceDB -i "02-seed-dados-iniciais.sql"
)

echo.
echo Connection string sugerida no appsettings.json:
echo Server=%SERVER%;Database=nextFinanceDB;Trusted_Connection=True;TrustServerCertificate=True
echo.
pause
exit /b 0

:erro
echo Erro ao executar SQL. Verifique se o SQL Server LocalDB esta instalado.
pause
exit /b 1

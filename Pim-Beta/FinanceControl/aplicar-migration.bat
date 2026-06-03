@echo off
title Aplicar banco nextFinanceDB
cd /d "%~dp0src\FinanceControl.Web"

where dotnet >nul 2>&1
if errorlevel 1 (
    echo Instale o .NET 8 SDK.
    pause
    exit /b 1
)

echo Aplicando migrations no banco nextFinanceDB...
dotnet ef database update
if errorlevel 1 (
    echo.
    echo Se falhar, execute nextFinanceDB\aplicar-banco.bat para criar o banco via SQL.
    pause
    exit /b 1
)

echo Banco atualizado com sucesso.
pause

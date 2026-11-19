#!/usr/bin/env sh
command -v node >/dev/null || { echo "Instale o Node.js 22.13 ou superior: https://nodejs.org"; exit 1; }
echo "Iniciando o FinanceControl com dados de demonstração..."
exec node --disable-warning=ExperimentalWarning api/server.js --demo

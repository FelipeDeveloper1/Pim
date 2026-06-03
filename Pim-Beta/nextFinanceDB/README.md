# nextFinanceDB (SQL Server)

Scripts para criar o banco **nextFinanceDB** com tudo que o **FinanceControl** precisa persistir.

## O que fica salvo no banco

| Tabela | Conteudo importante |
|--------|---------------------|
| **Usuarios** | Login, senha (hash), perfil |
| **Categorias** | Tipos de receita/despesa |
| **Contas** | Contas bancarias / carteira |
| **Receitas** | Entradas de dinheiro |
| **Despesas** | Gastos (Visao geral) |
| **Movimentacoes** | Historico de fluxo |
| **Metas** | Nome, valor objetivo, valor atual, data limite |
| **Funcionarios** | Nome, cargo, salario, admissao |
| **LancamentosFinanceiros** | Gastos e investimentos (Relatorios) |

## Views

- `vw_GastosDetalhados` — gastos com categoria e conta
- `vw_RelatorioFinanceiro` — lista para relatorios
- `vw_TotaisRelatorio` — totais e saldo final

## Como aplicar

1. Duplo clique em **`aplicar-banco.bat`**  
   ou no SSMS execute **`01-criar-nextFinanceDB.sql`**
2. Execute **`FinanceControl/Executar.bat`** e faca login (`admin` / `Admin@123`) — cria o usuario no banco
3. Execute **`02-seed-dados-iniciais.sql`** — exemplos de metas, funcionarios, gastos e lancamentos

## Connection string (FinanceControl)

Em `FinanceControl/src/FinanceControl.Web/appsettings.json`:

```json
"DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=nextFinanceDB;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
```

## Arquivo antigo (SQLite)

O `schema.sql` antigo era para SQLite/Node. Use os scripts **`01-*.sql`** e **`02-*.sql`** para SQL Server.

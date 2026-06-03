# FinanceControl (ASP.NET Core 8)

Sistema financeiro **MVC + SQL Server** (`nextFinanceDB`).

## Abrir o sistema

Na pasta **Pim-Beta** (uma acima), dê duplo clique em:

- **`index.bat`** (recomendado)

Ou nesta pasta: **`index.bat`** / **`Executar.bat`**

URL: http://localhost:5150/Account/Login  
Login: `admin` / `Admin@123`

## Primeira execução

1. [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) instalado
2. `aplicar-migration.bat` **ou** `../nextFinanceDB/aplicar-banco.bat`
3. Duplo clique em `index.bat` na raiz do projeto

## Estrutura

```
FinanceControl/
├── index.bat              Atalho para iniciar ASP.NET
├── aplicar-migration.bat  Cria/atualiza banco via EF
└── src/FinanceControl.Web/
    ├── Controllers/
    ├── Views/
    ├── Data/
    └── wwwroot/
```

## O que NÃO é o sistema

A pasta `../prototipo-html/` contém HTML/CSS antigo (apenas visual).

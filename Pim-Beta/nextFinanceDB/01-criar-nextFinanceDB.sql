/*
  nextFinanceDB - SQL Server
  Banco do sistema FinanceControl (dados importantes do financeiro).

  Como executar (SSMS ou sqlcmd):
    sqlcmd -S "(localdb)\mssqllocaldb" -i "01-criar-nextFinanceDB.sql"
  Depois:
    sqlcmd -S "(localdb)\mssqllocaldb" -d nextFinanceDB -i "02-seed-dados-iniciais.sql"
*/

IF DB_ID(N'nextFinanceDB') IS NULL
BEGIN
    CREATE DATABASE nextFinanceDB;
END
GO

USE nextFinanceDB;
GO

/* ===================== USUARIOS (login) ===================== */
IF OBJECT_ID(N'dbo.Usuarios', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Usuarios (
        Id            INT IDENTITY(1,1) NOT NULL,
        NomeCompleto  NVARCHAR(120)     NOT NULL,
        NomeUsuario   NVARCHAR(60)      NOT NULL,
        Email         NVARCHAR(120)     NOT NULL,
        SenhaHash     NVARCHAR(256)     NOT NULL,
        Perfil        INT               NOT NULL,  /* 0=Usuario, 1=Admin */
        Ativo         BIT               NOT NULL CONSTRAINT DF_Usuarios_Ativo DEFAULT (1),
        DataCadastro  DATETIME2         NOT NULL CONSTRAINT DF_Usuarios_DataCadastro DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Usuarios PRIMARY KEY (Id),
        CONSTRAINT UQ_Usuarios_NomeUsuario UNIQUE (NomeUsuario),
        CONSTRAINT UQ_Usuarios_Email UNIQUE (Email)
    );
END
GO

/* ===================== CATEGORIAS ===================== */
IF OBJECT_ID(N'dbo.Categorias', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categorias (
        Id         INT IDENTITY(1,1) NOT NULL,
        Nome       NVARCHAR(80)      NOT NULL,
        Tipo       INT               NOT NULL,  /* 1=Receita, 2=Despesa */
        UsuarioId  INT               NOT NULL,
        CONSTRAINT PK_Categorias PRIMARY KEY (Id),
        CONSTRAINT FK_Categorias_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.Usuarios (Id) ON DELETE CASCADE
    );
    CREATE INDEX IX_Categorias_UsuarioId ON dbo.Categorias (UsuarioId);
END
GO

/* ===================== CONTAS ===================== */
IF OBJECT_ID(N'dbo.Contas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Contas (
        Id           INT IDENTITY(1,1) NOT NULL,
        Nome         NVARCHAR(80)      NOT NULL,
        Descricao    NVARCHAR(200)     NULL,
        SaldoInicial DECIMAL(18,2)     NOT NULL CONSTRAINT DF_Contas_Saldo DEFAULT (0),
        Ativa        BIT               NOT NULL CONSTRAINT DF_Contas_Ativa DEFAULT (1),
        UsuarioId    INT               NOT NULL,
        CONSTRAINT PK_Contas PRIMARY KEY (Id),
        CONSTRAINT FK_Contas_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.Usuarios (Id) ON DELETE CASCADE
    );
    CREATE INDEX IX_Contas_UsuarioId ON dbo.Contas (UsuarioId);
END
GO

/* ===================== RECEITAS ===================== */
IF OBJECT_ID(N'dbo.Receitas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Receitas (
        Id          INT IDENTITY(1,1) NOT NULL,
        Descricao   NVARCHAR(120)     NOT NULL,
        Valor       DECIMAL(18,2)     NOT NULL,
        Data        DATETIME2         NOT NULL,
        UsuarioId   INT               NOT NULL,
        CategoriaId INT               NOT NULL,
        ContaId     INT               NOT NULL,
        CONSTRAINT PK_Receitas PRIMARY KEY (Id),
        CONSTRAINT FK_Receitas_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.Usuarios (Id) ON DELETE CASCADE,
        CONSTRAINT FK_Receitas_Categorias FOREIGN KEY (CategoriaId)
            REFERENCES dbo.Categorias (Id),
        CONSTRAINT FK_Receitas_Contas FOREIGN KEY (ContaId)
            REFERENCES dbo.Contas (Id)
    );
    CREATE INDEX IX_Receitas_UsuarioId ON dbo.Receitas (UsuarioId);
    CREATE INDEX IX_Receitas_Data ON dbo.Receitas (Data DESC);
END
GO

/* ===================== DESPESAS (gastos - visao geral) ===================== */
IF OBJECT_ID(N'dbo.Despesas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Despesas (
        Id          INT IDENTITY(1,1) NOT NULL,
        Descricao   NVARCHAR(120)     NOT NULL,
        Valor       DECIMAL(18,2)     NOT NULL,
        Data        DATETIME2         NOT NULL,
        UsuarioId   INT               NOT NULL,
        CategoriaId INT               NOT NULL,
        ContaId     INT               NOT NULL,
        CONSTRAINT PK_Despesas PRIMARY KEY (Id),
        CONSTRAINT FK_Despesas_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.Usuarios (Id) ON DELETE CASCADE,
        CONSTRAINT FK_Despesas_Categorias FOREIGN KEY (CategoriaId)
            REFERENCES dbo.Categorias (Id),
        CONSTRAINT FK_Despesas_Contas FOREIGN KEY (ContaId)
            REFERENCES dbo.Contas (Id),
        CONSTRAINT CK_Despesas_Valor_Positivo CHECK (Valor > 0)
    );
    CREATE INDEX IX_Despesas_UsuarioId ON dbo.Despesas (UsuarioId);
    CREATE INDEX IX_Despesas_Data ON dbo.Despesas (Data DESC);
END
GO

/* ===================== MOVIMENTACOES ===================== */
IF OBJECT_ID(N'dbo.Movimentacoes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Movimentacoes (
        Id          INT IDENTITY(1,1) NOT NULL,
        Descricao   NVARCHAR(120)     NOT NULL,
        Valor       DECIMAL(18,2)     NOT NULL,
        Tipo        INT               NOT NULL,  /* 1=Receita, 2=Despesa */
        Data        DATETIME2         NOT NULL,
        UsuarioId   INT               NOT NULL,
        ContaId     INT               NOT NULL,
        CONSTRAINT PK_Movimentacoes PRIMARY KEY (Id),
        CONSTRAINT FK_Movimentacoes_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.Usuarios (Id) ON DELETE CASCADE,
        CONSTRAINT FK_Movimentacoes_Contas FOREIGN KEY (ContaId)
            REFERENCES dbo.Contas (Id)
    );
    CREATE INDEX IX_Movimentacoes_UsuarioId ON dbo.Movimentacoes (UsuarioId);
    CREATE INDEX IX_Movimentacoes_Data ON dbo.Movimentacoes (Data DESC);
END
GO

/* ===================== METAS ===================== */
IF OBJECT_ID(N'dbo.Metas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Metas (
        Id          INT IDENTITY(1,1) NOT NULL,
        Titulo      NVARCHAR(120)     NOT NULL,
        ValorAlvo   DECIMAL(18,2)     NOT NULL,
        ValorAtual  DECIMAL(18,2)     NOT NULL CONSTRAINT DF_Metas_ValorAtual DEFAULT (0),
        DataLimite  DATETIME2         NULL,
        Concluida   BIT               NOT NULL CONSTRAINT DF_Metas_Concluida DEFAULT (0),
        UsuarioId   INT               NOT NULL,
        CONSTRAINT PK_Metas PRIMARY KEY (Id),
        CONSTRAINT FK_Metas_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.Usuarios (Id) ON DELETE CASCADE,
        CONSTRAINT CK_Metas_ValorAlvo_Positivo CHECK (ValorAlvo > 0)
    );
    CREATE INDEX IX_Metas_UsuarioId ON dbo.Metas (UsuarioId);
END
GO

/* ===================== FUNCIONARIOS ===================== */
IF OBJECT_ID(N'dbo.Funcionarios', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Funcionarios (
        Id             INT IDENTITY(1,1) NOT NULL,
        Nome           NVARCHAR(120)     NOT NULL,
        Cargo          NVARCHAR(80)      NULL,
        Salario        DECIMAL(18,2)     NOT NULL,
        DataAdmissao   DATETIME2         NOT NULL,
        Ativo          BIT               NOT NULL CONSTRAINT DF_Funcionarios_Ativo DEFAULT (1),
        UsuarioId      INT               NOT NULL,
        CONSTRAINT PK_Funcionarios PRIMARY KEY (Id),
        CONSTRAINT FK_Funcionarios_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.Usuarios (Id) ON DELETE CASCADE,
        CONSTRAINT CK_Funcionarios_Salario CHECK (Salario >= 0)
    );
    CREATE INDEX IX_Funcionarios_UsuarioId ON dbo.Funcionarios (UsuarioId);
END
GO

/* ===================== LANCAMENTOS (relatorios: gastos x investimentos) ===================== */
IF OBJECT_ID(N'dbo.LancamentosFinanceiros', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LancamentosFinanceiros (
        Id         INT IDENTITY(1,1) NOT NULL,
        Tipo       INT               NOT NULL,  /* 1=Gasto, 2=Investimento */
        Valor      DECIMAL(18,2)     NOT NULL,
        Observacao NVARCHAR(200)     NULL,
        Data       DATETIME2         NOT NULL,
        UsuarioId  INT               NOT NULL,
        CONSTRAINT PK_LancamentosFinanceiros PRIMARY KEY (Id),
        CONSTRAINT FK_LancamentosFinanceiros_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.Usuarios (Id) ON DELETE CASCADE,
        CONSTRAINT CK_LancamentosFinanceiros_Valor CHECK (Valor > 0)
    );
    CREATE INDEX IX_LancamentosFinanceiros_UsuarioId ON dbo.LancamentosFinanceiros (UsuarioId);
    CREATE INDEX IX_LancamentosFinanceiros_Tipo_Data ON dbo.LancamentosFinanceiros (Tipo, Data DESC);
END
GO

/* ===================== VIEWS (consultas importantes) ===================== */
CREATE OR ALTER VIEW dbo.vw_GastosDetalhados
AS
    SELECT
        d.Id,
        d.UsuarioId,
        d.Descricao,
        d.Valor,
        d.Data,
        c.Nome AS Categoria,
        ct.Nome AS Conta
    FROM dbo.Despesas d
    INNER JOIN dbo.Categorias c ON c.Id = d.CategoriaId
    INNER JOIN dbo.Contas ct ON ct.Id = d.ContaId;
GO

CREATE OR ALTER VIEW dbo.vw_RelatorioFinanceiro
AS
    SELECT
        l.UsuarioId,
        l.Tipo,
        CASE l.Tipo WHEN 1 THEN N'Gasto' WHEN 2 THEN N'Investimento' END AS TipoNome,
        l.Id,
        l.Observacao AS Descricao,
        l.Valor,
        l.Data
    FROM dbo.LancamentosFinanceiros l;
GO

CREATE OR ALTER VIEW dbo.vw_TotaisRelatorio
AS
    SELECT
        UsuarioId,
        SUM(CASE WHEN Tipo = 1 THEN Valor ELSE 0 END) AS TotalGastos,
        SUM(CASE WHEN Tipo = 2 THEN Valor ELSE 0 END) AS TotalInvestimentos,
        SUM(CASE WHEN Tipo = 2 THEN Valor ELSE -Valor END) AS SaldoFinal
    FROM dbo.LancamentosFinanceiros
    GROUP BY UsuarioId;
GO

/* Historico EF Core (evita conflito se o app rodar Migrate depois do SQL) */
IF OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.__EFMigrationsHistory (
        MigrationId    NVARCHAR(150) NOT NULL,
        ProductVersion NVARCHAR(32)  NOT NULL,
        CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY (MigrationId)
    );

    IF NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = N'20240602000000_InitialCreate')
        INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
        VALUES (N'20240602000000_InitialCreate', N'8.0.11');
END
GO

PRINT N'Banco nextFinanceDB: tabelas e views criadas com sucesso.';
GO

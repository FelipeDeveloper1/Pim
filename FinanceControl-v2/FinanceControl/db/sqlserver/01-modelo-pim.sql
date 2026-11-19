/* FinanceControl — modelo do PDF (seção 3.7) em T-SQL (SQL Server).
   REFERÊNCIA: este script NÃO é executado pela aplicação nem pelos testes (a aplicação usa db/schema.sql em SQLite).
   Mantém as mesmas tabelas, regras e a procedure/trigger propostas na seção 3.7.3. Revise antes de usar em produção. */
IF DB_ID(N'nextFinanceDB') IS NULL CREATE DATABASE nextFinanceDB;
GO
USE nextFinanceDB;
GO
CREATE TABLE dbo.Perfil   (Id INT IDENTITY(1,1) PRIMARY KEY, Nome VARCHAR(40) NOT NULL UNIQUE);
CREATE TABLE dbo.Usuario  (Id INT IDENTITY(1,1) PRIMARY KEY, Nome VARCHAR(120) NOT NULL, Email VARCHAR(160) NOT NULL UNIQUE,
                           HashSenha VARCHAR(255) NOT NULL, PerfilId INT NOT NULL REFERENCES dbo.Perfil(Id), Ativo BIT NOT NULL DEFAULT 1);
CREATE TABLE dbo.Categoria(Id INT IDENTITY(1,1) PRIMARY KEY, Nome VARCHAR(80) NOT NULL,
                           Tipo VARCHAR(20) NOT NULL CHECK (Tipo IN ('Receita','Despesa','Investimento')), CONSTRAINT UQ_Categoria UNIQUE (Nome, Tipo));
CREATE TABLE dbo.Transacao(Id INT IDENTITY(1,1) PRIMARY KEY, Descricao VARCHAR(120) NOT NULL, Valor DECIMAL(12,2) NOT NULL CHECK (Valor > 0),
                           DataMovimento DATE NOT NULL, UsuarioId INT NOT NULL REFERENCES dbo.Usuario(Id), CategoriaId INT NOT NULL REFERENCES dbo.Categoria(Id),
                           Ativo BIT NOT NULL DEFAULT 1);
CREATE TABLE dbo.Auditoria(Id INT IDENTITY(1,1) PRIMARY KEY, UsuarioId INT NULL REFERENCES dbo.Usuario(Id), Acao VARCHAR(60) NOT NULL,
                           Entidade VARCHAR(40) NULL, EntidadeId INT NULL, Detalhe NVARCHAR(1000) NULL, CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());
CREATE INDEX IX_Transacao_Usuario_Data ON dbo.Transacao (UsuarioId, DataMovimento);
CREATE INDEX IX_Transacao_Categoria    ON dbo.Transacao (CategoriaId);
GO
/* Procedure: centraliza o cadastro (a API continua validando; aqui ficam só as regras essenciais). */
CREATE OR ALTER PROCEDURE dbo.sp_RegistrarTransacao
  @Descricao VARCHAR(120), @Valor DECIMAL(12,2), @DataMovimento DATE, @UsuarioId INT, @CategoriaId INT, @NovoId INT OUTPUT
AS BEGIN
  SET NOCOUNT ON;
  IF @Valor <= 0 THROW 50001, 'Valor deve ser positivo.', 1;
  IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE Id = @CategoriaId) THROW 50002, 'Categoria inexistente.', 1;
  INSERT dbo.Transacao (Descricao, Valor, DataMovimento, UsuarioId, CategoriaId) VALUES (@Descricao, @Valor, @DataMovimento, @UsuarioId, @CategoriaId);
  SET @NovoId = SCOPE_IDENTITY();
END;
GO
/* Trigger de auditoria: registra criação, alteração e inativação. */
CREATE OR ALTER TRIGGER dbo.TR_Transacao_Auditoria ON dbo.Transacao AFTER INSERT, UPDATE AS BEGIN
  SET NOCOUNT ON;
  INSERT dbo.Auditoria (UsuarioId, Acao, Entidade, EntidadeId, Detalhe)
  SELECT i.UsuarioId,
         CASE WHEN d.Id IS NULL THEN 'transacao.criada' WHEN d.Ativo = 1 AND i.Ativo = 0 THEN 'transacao.inativada' ELSE 'transacao.atualizada' END,
         'transacao', i.Id, CONCAT('valor=', i.Valor, ';categoria=', i.CategoriaId)
  FROM inserted i LEFT JOIN deleted d ON d.Id = i.Id;
END;
GO

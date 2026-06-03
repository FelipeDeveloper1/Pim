/*
  Dados iniciais do nextFinanceDB.
  O usuario admin e criado pelo FinanceControl na primeira execucao (login: admin / Admin@123).
  Este script preenche categorias, conta, lancamentos, metas e funcionarios de exemplo
  quando ja existir o usuario Id = 1.
*/

USE nextFinanceDB;
GO

SET NOCOUNT ON;

DECLARE @AdminId INT = (SELECT TOP 1 Id FROM dbo.Usuarios WHERE NomeUsuario = N'admin');

IF @AdminId IS NULL
BEGIN
    PRINT N'Usuario admin ainda nao existe. Execute o FinanceControl (Executar.bat) uma vez e rode este script novamente.';
    RETURN;
END

/* Categorias padrao */
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE UsuarioId = @AdminId)
BEGIN
    INSERT INTO dbo.Categorias (Nome, Tipo, UsuarioId) VALUES
        (N'Salario', 1, @AdminId),
        (N'Alimentacao', 2, @AdminId),
        (N'Moradia', 2, @AdminId),
        (N'Transporte', 2, @AdminId);
    PRINT N'Categorias inseridas.';
END

DECLARE @CatReceita INT = (SELECT TOP 1 Id FROM dbo.Categorias WHERE UsuarioId = @AdminId AND Tipo = 1);
DECLARE @CatDespesa INT = (SELECT TOP 1 Id FROM dbo.Categorias WHERE UsuarioId = @AdminId AND Tipo = 2);

/* Conta principal */
IF NOT EXISTS (SELECT 1 FROM dbo.Contas WHERE UsuarioId = @AdminId)
BEGIN
    INSERT INTO dbo.Contas (Nome, Descricao, SaldoInicial, Ativa, UsuarioId)
    VALUES (N'Conta principal', N'Conta corrente', 0, 1, @AdminId);
    PRINT N'Conta inserida.';
END

DECLARE @ContaId INT = (SELECT TOP 1 Id FROM dbo.Contas WHERE UsuarioId = @AdminId);

/* Lancamentos para relatorios (gastos e investimentos) */
IF NOT EXISTS (SELECT 1 FROM dbo.LancamentosFinanceiros WHERE UsuarioId = @AdminId)
BEGIN
    INSERT INTO dbo.LancamentosFinanceiros (Tipo, Valor, Observacao, Data, UsuarioId) VALUES
        (1, 55.90,  N'Assinatura streaming', DATEADD(DAY, -5, CAST(GETDATE() AS DATE)), @AdminId),
        (1, 320.00, N'Supermercado',         DATEADD(DAY, -3, CAST(GETDATE() AS DATE)), @AdminId),
        (2, 500.00, N'Tesouro Selic',         DATEADD(DAY, -2, CAST(GETDATE() AS DATE)), @AdminId),
        (2, 150.00, N'Poupanca',              DATEADD(DAY, -1, CAST(GETDATE() AS DATE)), @AdminId);
    PRINT N'Lancamentos financeiros inseridos.';
END

/* Despesas (gastos na visao geral) */
IF @CatDespesa IS NOT NULL AND @ContaId IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.Despesas WHERE UsuarioId = @AdminId)
BEGIN
    INSERT INTO dbo.Despesas (Descricao, Valor, Data, UsuarioId, CategoriaId, ContaId) VALUES
        (N'Almoco restaurante', 45.00, DATEADD(DAY, -4, CAST(GETDATE() AS DATE)), @AdminId, @CatDespesa, @ContaId),
        (N'Conta de luz',      180.50, DATEADD(DAY, -2, CAST(GETDATE() AS DATE)), @AdminId, @CatDespesa, @ContaId);
    PRINT N'Despesas (gastos) inseridas.';
END

/* Metas */
IF NOT EXISTS (SELECT 1 FROM dbo.Metas WHERE UsuarioId = @AdminId)
BEGIN
    INSERT INTO dbo.Metas (Titulo, ValorAlvo, ValorAtual, DataLimite, Concluida, UsuarioId) VALUES
        (N'Reserva de emergencia', 10000.00, 2500.00, DATEADD(MONTH, 6, CAST(GETDATE() AS DATE)), 0, @AdminId),
        (N'Viagem de ferias',       5000.00,  800.00, DATEADD(MONTH, 12, CAST(GETDATE() AS DATE)), 0, @AdminId);
    PRINT N'Metas inseridas.';
END

/* Funcionarios */
IF NOT EXISTS (SELECT 1 FROM dbo.Funcionarios WHERE UsuarioId = @AdminId)
BEGIN
    INSERT INTO dbo.Funcionarios (Nome, Cargo, Salario, DataAdmissao, Ativo, UsuarioId) VALUES
        (N'Ana Silva',   N'Analista financeiro', 4500.00, DATEADD(YEAR, -2, CAST(GETDATE() AS DATE)), 1, @AdminId),
        (N'Bruno Costa', N'Assistente',          2800.00, DATEADD(MONTH, -8, CAST(GETDATE() AS DATE)), 1, @AdminId);
    PRINT N'Funcionarios inseridos.';
END

PRINT N'Seed concluido para usuario admin (Id=' + CAST(@AdminId AS NVARCHAR(10)) + N').';
GO

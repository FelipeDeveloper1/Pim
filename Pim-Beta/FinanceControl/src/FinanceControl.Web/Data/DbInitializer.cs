using FinanceControl.Web.Helpers;
using FinanceControl.Web.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FinanceControl.Web.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(ApplicationDbContext context, ILogger logger)
    {
        try
        {
            await context.Database.MigrateAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Falha ao aplicar migrations. Execute nextFinanceDB/aplicar-banco.bat ou dotnet ef database update.");
            throw;
        }

        if (await context.Usuarios.AnyAsync())
            return;

        var admin = new Usuario
        {
            NomeCompleto = "Administrador",
            NomeUsuario = "admin",
            Email = "admin@financecontrol.local",
            SenhaHash = PasswordHelper.Hash("Admin@123"),
            Perfil = PerfilUsuario.Admin,
            Ativo = true,
            DataCadastro = DateTime.UtcNow
        };

        context.Usuarios.Add(admin);
        await context.SaveChangesAsync();

        var catReceita = new Categoria { Nome = "Salário", Tipo = TipoCategoria.Receita, UsuarioId = admin.Id };
        var catDespesa = new Categoria { Nome = "Alimentação", Tipo = TipoCategoria.Despesa, UsuarioId = admin.Id };
        var catMoradia = new Categoria { Nome = "Moradia", Tipo = TipoCategoria.Despesa, UsuarioId = admin.Id };

        context.Categorias.AddRange(catReceita, catDespesa, catMoradia);

        var conta = new Conta
        {
            Nome = "Conta principal",
            SaldoInicial = 0,
            UsuarioId = admin.Id,
            Ativa = true
        };
        context.Contas.Add(conta);

        await context.SaveChangesAsync();

        context.LancamentosFinanceiros.AddRange(
            new LancamentoFinanceiro
            {
                Tipo = TipoLancamentoFinanceiro.Gasto,
                Valor = 55.90m,
                Observacao = "Assinatura streaming",
                Data = DateTime.Today.AddDays(-5),
                UsuarioId = admin.Id
            },
            new LancamentoFinanceiro
            {
                Tipo = TipoLancamentoFinanceiro.Investimento,
                Valor = 500m,
                Observacao = "Tesouro Selic",
                Data = DateTime.Today.AddDays(-2),
                UsuarioId = admin.Id
            });

        context.Despesas.Add(new Despesa
        {
            Descricao = "Supermercado",
            Valor = 320m,
            Data = DateTime.Today.AddDays(-3),
            UsuarioId = admin.Id,
            CategoriaId = catDespesa.Id,
            ContaId = conta.Id
        });

        context.Metas.Add(new Meta
        {
            Titulo = "Reserva de emergência",
            ValorAlvo = 10000m,
            ValorAtual = 1500m,
            DataLimite = DateTime.Today.AddMonths(6),
            UsuarioId = admin.Id
        });

        context.Funcionarios.Add(new Funcionario
        {
            Nome = "Ana Silva",
            Cargo = "Analista financeiro",
            Salario = 4500m,
            DataAdmissao = DateTime.Today.AddYears(-1),
            Ativo = true,
            UsuarioId = admin.Id
        });

        await context.SaveChangesAsync();
        logger.LogInformation("Dados iniciais criados. Login: admin / Admin@123");
    }
}

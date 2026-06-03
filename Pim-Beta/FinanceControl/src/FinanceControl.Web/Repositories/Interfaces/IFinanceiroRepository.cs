using FinanceControl.Web.DTOs;
using FinanceControl.Web.Models.Entities;

namespace FinanceControl.Web.Repositories.Interfaces;

public interface IFinanceiroRepository
{
    Task<List<Categoria>> GetCategoriasAsync(int usuarioId, TipoCategoria? tipo = null);
    Task<Categoria?> GetCategoriaByIdAsync(int id, int usuarioId);
    Task AddCategoriaAsync(Categoria categoria);
    Task UpdateCategoriaAsync(Categoria categoria);
    Task DeleteCategoriaAsync(Categoria categoria);

    Task<List<Conta>> GetContasAsync(int usuarioId);
    Task<Conta?> GetContaByIdAsync(int id, int usuarioId);
    Task AddContaAsync(Conta conta);
    Task UpdateContaAsync(Conta conta);
    Task DeleteContaAsync(Conta conta);

    Task<List<Receita>> GetReceitasAsync(int usuarioId);
    Task<Receita?> GetReceitaByIdAsync(int id, int usuarioId);
    Task AddReceitaAsync(Receita receita);
    Task UpdateReceitaAsync(Receita receita);
    Task DeleteReceitaAsync(Receita receita);

    Task<List<Despesa>> GetDespesasAsync(int usuarioId);
    Task<Despesa?> GetDespesaByIdAsync(int id, int usuarioId);
    Task AddDespesaAsync(Despesa despesa);
    Task UpdateDespesaAsync(Despesa despesa);
    Task DeleteDespesaAsync(Despesa despesa);

    Task<List<Movimentacao>> GetMovimentacoesAsync(int usuarioId);
    Task<Movimentacao?> GetMovimentacaoByIdAsync(int id, int usuarioId);
    Task AddMovimentacaoAsync(Movimentacao movimentacao);
    Task UpdateMovimentacaoAsync(Movimentacao movimentacao);
    Task DeleteMovimentacaoAsync(Movimentacao movimentacao);

    Task<List<Meta>> GetMetasAsync(int usuarioId);
    Task<Meta?> GetMetaByIdAsync(int id, int usuarioId);
    Task AddMetaAsync(Meta meta);
    Task UpdateMetaAsync(Meta meta);
    Task DeleteMetaAsync(Meta meta);

    Task<List<Funcionario>> GetFuncionariosAsync(int usuarioId);
    Task<Funcionario?> GetFuncionarioByIdAsync(int id, int usuarioId);
    Task AddFuncionarioAsync(Funcionario funcionario);
    Task UpdateFuncionarioAsync(Funcionario funcionario);
    Task DeleteFuncionarioAsync(Funcionario funcionario);

    Task<List<LancamentoFinanceiro>> GetLancamentosAsync(int usuarioId);
    Task<LancamentoFinanceiro?> GetLancamentoByIdAsync(int id, int usuarioId);
    Task AddLancamentoAsync(LancamentoFinanceiro lancamento);
    Task UpdateLancamentoAsync(LancamentoFinanceiro lancamento);
    Task DeleteLancamentoAsync(LancamentoFinanceiro lancamento);

    Task<DashboardResumoDto> GetDashboardAsync(int usuarioId);
    Task<RelatorioResumoDto> GetRelatorioMesAsync(int usuarioId, int mes, int ano);
}

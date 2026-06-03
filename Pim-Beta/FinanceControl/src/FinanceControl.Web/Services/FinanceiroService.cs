using FinanceControl.Web.DTOs;
using FinanceControl.Web.Models.Entities;
using FinanceControl.Web.Repositories.Interfaces;
using FinanceControl.Web.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FinanceControl.Web.Services;

public class FinanceiroService : IFinanceiroService
{
    private readonly IFinanceiroRepository _repo;

    public FinanceiroService(IFinanceiroRepository repo) => _repo = repo;

    public Task<List<Categoria>> ListarCategoriasAsync(int usuarioId, TipoCategoria? tipo = null) =>
        _repo.GetCategoriasAsync(usuarioId, tipo);

    public async Task<(bool Ok, string? Erro)> ExcluirCategoriaAsync(int id, int usuarioId)
    {
        var categoria = await _repo.GetCategoriaByIdAsync(id, usuarioId);
        if (categoria is null)
            return (false, "Categoria não encontrada.");

        try
        {
            await _repo.DeleteCategoriaAsync(categoria);
            return (true, null);
        }
        catch (DbUpdateException)
        {
            return (false, "Não é possível excluir: categoria em uso.");
        }
    }

    public Task<DashboardResumoDto> ObterDashboardAsync(int usuarioId) =>
        _repo.GetDashboardAsync(usuarioId);

    public Task<RelatorioResumoDto> ObterRelatorioAsync(int usuarioId, int? mes = null, int? ano = null)
    {
        var m = mes ?? DateTime.Today.Month;
        var a = ano ?? DateTime.Today.Year;
        return _repo.GetRelatorioMesAsync(usuarioId, m, a);
    }
}

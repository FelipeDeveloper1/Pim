using FinanceControl.Web.DTOs;
using FinanceControl.Web.Models.Entities;

namespace FinanceControl.Web.Services.Interfaces;

public interface IFinanceiroService
{
    Task<List<Categoria>> ListarCategoriasAsync(int usuarioId, TipoCategoria? tipo = null);
    Task<(bool Ok, string? Erro)> ExcluirCategoriaAsync(int id, int usuarioId);

    Task<DashboardResumoDto> ObterDashboardAsync(int usuarioId);
    Task<RelatorioResumoDto> ObterRelatorioAsync(int usuarioId, int? mes = null, int? ano = null);
}

using FinanceControl.Web.Helpers;
using FinanceControl.Web.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinanceControl.Web.Controllers;

[Authorize]
public class RelatoriosController : Controller
{
    private readonly IFinanceiroService _financeiro;

    public RelatoriosController(IFinanceiroService financeiro) => _financeiro = financeiro;

    public async Task<IActionResult> Index(int? mes, int? ano)
    {
        var userId = UsuarioSessao.GetUserId(User);
        var relatorio = await _financeiro.ObterRelatorioAsync(userId, mes, ano);
        ViewBag.Mes = mes ?? DateTime.Today.Month;
        ViewBag.Ano = ano ?? DateTime.Today.Year;
        return View(relatorio);
    }
}

using FinanceControl.Web.Helpers;
using FinanceControl.Web.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinanceControl.Web.Controllers;

[Authorize]
public class HomeController : Controller
{
    private readonly IFinanceiroService _financeiro;

    public HomeController(IFinanceiroService financeiro) => _financeiro = financeiro;

    public async Task<IActionResult> Index()
    {
        var userId = UsuarioSessao.GetUserId(User);
        var resumo = await _financeiro.ObterDashboardAsync(userId);
        return View(resumo);
    }

    [AllowAnonymous]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error() => View();
}

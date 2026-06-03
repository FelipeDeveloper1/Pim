using FinanceControl.Web.Helpers;
using FinanceControl.Web.Models.Entities;
using FinanceControl.Web.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinanceControl.Web.Controllers;

[Authorize]
public class LancamentosController : Controller
{
    private readonly IFinanceiroRepository _repo;

    public LancamentosController(IFinanceiroRepository repo) => _repo = repo;

    [HttpGet]
    public IActionResult Create(TipoLancamentoFinanceiro? tipo)
    {
        return View(new LancamentoFinanceiro
        {
            Tipo = tipo ?? TipoLancamentoFinanceiro.Gasto,
            Data = DateTime.Today
        });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(LancamentoFinanceiro model)
    {
        if (!ModelState.IsValid)
            return View(model);

        model.UsuarioId = UsuarioSessao.GetUserId(User);
        await _repo.AddLancamentoAsync(model);
        TempData["Sucesso"] = "Lançamento registrado.";
        return RedirectToAction("Index", "Relatorios");
    }
}

using FinanceControl.Web.Helpers;
using FinanceControl.Web.Models.Entities;
using FinanceControl.Web.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinanceControl.Web.Controllers;

[Authorize]
public class ContasController : Controller
{
    private readonly IFinanceiroRepository _repo;

    public ContasController(IFinanceiroRepository repo) => _repo = repo;

    public async Task<IActionResult> Index() =>
        View(await _repo.GetContasAsync(UsuarioSessao.GetUserId(User)));

    public IActionResult Create() => View(new Conta());

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Conta model)
    {
        if (!ModelState.IsValid) return View(model);
        model.UsuarioId = UsuarioSessao.GetUserId(User);
        await _repo.AddContaAsync(model);
        return RedirectToAction(nameof(Index));
    }

    public async Task<IActionResult> Edit(int id)
    {
        var item = await _repo.GetContaByIdAsync(id, UsuarioSessao.GetUserId(User));
        if (item is null) return NotFound();
        return View(item);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, Conta model)
    {
        if (id != model.Id) return NotFound();
        if (!ModelState.IsValid) return View(model);
        var item = await _repo.GetContaByIdAsync(id, UsuarioSessao.GetUserId(User));
        if (item is null) return NotFound();
        item.Nome = model.Nome;
        item.Descricao = model.Descricao;
        item.SaldoInicial = model.SaldoInicial;
        item.Ativa = model.Ativa;
        await _repo.UpdateContaAsync(item);
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = UsuarioSessao.GetUserId(User);
        var item = await _repo.GetContaByIdAsync(id, userId);
        if (item is not null) await _repo.DeleteContaAsync(item);
        return RedirectToAction(nameof(Index));
    }
}

using FinanceControl.Web.Helpers;
using FinanceControl.Web.Models.Entities;
using FinanceControl.Web.Repositories.Interfaces;
using FinanceControl.Web.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace FinanceControl.Web.Controllers;

[Authorize]
public class CategoriasController : Controller
{
    private readonly IFinanceiroRepository _repo;
    private readonly IFinanceiroService _financeiro;

    public CategoriasController(IFinanceiroRepository repo, IFinanceiroService financeiro)
    {
        _repo = repo;
        _financeiro = financeiro;
    }

    public async Task<IActionResult> Index()
    {
        var userId = UsuarioSessao.GetUserId(User);
        return View(await _financeiro.ListarCategoriasAsync(userId));
    }

    public IActionResult Create() => View(new Categoria());

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Categoria model)
    {
        if (!ModelState.IsValid) return View(model);
        model.UsuarioId = UsuarioSessao.GetUserId(User);
        await _repo.AddCategoriaAsync(model);
        return RedirectToAction(nameof(Index));
    }

    public async Task<IActionResult> Edit(int id)
    {
        var userId = UsuarioSessao.GetUserId(User);
        var item = await _repo.GetCategoriaByIdAsync(id, userId);
        if (item is null) return NotFound();
        return View(item);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, Categoria model)
    {
        if (id != model.Id) return NotFound();
        if (!ModelState.IsValid) return View(model);
        var userId = UsuarioSessao.GetUserId(User);
        var item = await _repo.GetCategoriaByIdAsync(id, userId);
        if (item is null) return NotFound();
        item.Nome = model.Nome;
        item.Tipo = model.Tipo;
        await _repo.UpdateCategoriaAsync(item);
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = UsuarioSessao.GetUserId(User);
        var (ok, erro) = await _financeiro.ExcluirCategoriaAsync(id, userId);
        if (!ok) TempData["Erro"] = erro;
        return RedirectToAction(nameof(Index));
    }
}

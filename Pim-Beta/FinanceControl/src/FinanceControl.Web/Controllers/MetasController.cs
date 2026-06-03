using FinanceControl.Web.Helpers;
using FinanceControl.Web.Models.Entities;
using FinanceControl.Web.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinanceControl.Web.Controllers;

[Authorize]
public class MetasController : Controller
{
    private readonly IFinanceiroRepository _repo;

    public MetasController(IFinanceiroRepository repo) => _repo = repo;

    public async Task<IActionResult> Index()
    {
        if (Request.Query.ContainsKey("nova"))
            TempData["AbrirModalMeta"] = "true";
        return View(await _repo.GetMetasAsync(UsuarioSessao.GetUserId(User)));
    }

    public IActionResult Create()
    {
        TempData["AbrirModalMeta"] = "true";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Meta model)
    {
        if (!ModelState.IsValid)
        {
            TempData["AbrirModalMeta"] = "true";
            TempData["Erro"] = "Preencha todos os campos da meta corretamente.";
            return RedirectToAction(nameof(Index));
        }

        model.UsuarioId = UsuarioSessao.GetUserId(User);
        await _repo.AddMetaAsync(model);
        TempData["Sucesso"] = "Meta cadastrada com sucesso.";
        return RedirectToAction(nameof(Index));
    }

    public async Task<IActionResult> Edit(int id)
    {
        var item = await _repo.GetMetaByIdAsync(id, UsuarioSessao.GetUserId(User));
        if (item is null) return NotFound();
        return View(item);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, Meta model)
    {
        if (id != model.Id) return NotFound();
        if (!ModelState.IsValid) return View(model);
        var item = await _repo.GetMetaByIdAsync(id, UsuarioSessao.GetUserId(User));
        if (item is null) return NotFound();
        item.Titulo = model.Titulo;
        item.ValorAlvo = model.ValorAlvo;
        item.ValorAtual = model.ValorAtual;
        item.DataLimite = model.DataLimite;
        item.Concluida = model.Concluida;
        await _repo.UpdateMetaAsync(item);
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = UsuarioSessao.GetUserId(User);
        var item = await _repo.GetMetaByIdAsync(id, userId);
        if (item is not null) await _repo.DeleteMetaAsync(item);
        return RedirectToAction(nameof(Index));
    }
}

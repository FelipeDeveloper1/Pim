using FinanceControl.Web.Helpers;
using FinanceControl.Web.Models.Entities;
using FinanceControl.Web.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace FinanceControl.Web.Controllers;

[Authorize]
public class DespesasController : Controller
{
    private readonly IFinanceiroRepository _repo;

    public DespesasController(IFinanceiroRepository repo) => _repo = repo;

    public async Task<IActionResult> Index() =>
        View(await _repo.GetDespesasAsync(UsuarioSessao.GetUserId(User)));

    public async Task<IActionResult> Create()
    {
        await CarregarListasAsync();
        return View(new Despesa { Data = DateTime.Today });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Despesa model)
    {
        if (!ModelState.IsValid)
        {
            await CarregarListasAsync();
            return View(model);
        }
        model.UsuarioId = UsuarioSessao.GetUserId(User);
        await _repo.AddDespesaAsync(model);
        TempData["Sucesso"] = "Despesa cadastrada.";
        return RedirectToAction(nameof(Index));
    }

    public async Task<IActionResult> Edit(int id)
    {
        var item = await _repo.GetDespesaByIdAsync(id, UsuarioSessao.GetUserId(User));
        if (item is null) return NotFound();
        await CarregarListasAsync();
        return View(item);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, Despesa model)
    {
        if (id != model.Id) return NotFound();
        if (!ModelState.IsValid)
        {
            await CarregarListasAsync();
            return View(model);
        }
        var userId = UsuarioSessao.GetUserId(User);
        var item = await _repo.GetDespesaByIdAsync(id, userId);
        if (item is null) return NotFound();
        item.Descricao = model.Descricao;
        item.Valor = model.Valor;
        item.Data = model.Data;
        item.CategoriaId = model.CategoriaId;
        item.ContaId = model.ContaId;
        await _repo.UpdateDespesaAsync(item);
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = UsuarioSessao.GetUserId(User);
        var item = await _repo.GetDespesaByIdAsync(id, userId);
        if (item is not null) await _repo.DeleteDespesaAsync(item);
        return RedirectToAction(nameof(Index));
    }

    private async Task CarregarListasAsync()
    {
        var userId = UsuarioSessao.GetUserId(User);
        var categorias = await _repo.GetCategoriasAsync(userId, TipoCategoria.Despesa);
        var contas = await _repo.GetContasAsync(userId);
        ViewBag.CategoriaId = new SelectList(categorias, "Id", "Nome");
        ViewBag.ContaId = new SelectList(contas, "Id", "Nome");
    }
}

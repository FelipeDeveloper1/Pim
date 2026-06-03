using FinanceControl.Web.Helpers;
using FinanceControl.Web.Models.Entities;
using FinanceControl.Web.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace FinanceControl.Web.Controllers;

[Authorize]
public class ReceitasController : Controller
{
    private readonly IFinanceiroRepository _repo;

    public ReceitasController(IFinanceiroRepository repo) => _repo = repo;

    public async Task<IActionResult> Index() =>
        View(await _repo.GetReceitasAsync(UsuarioSessao.GetUserId(User)));

    public async Task<IActionResult> Create()
    {
        await CarregarListasAsync();
        return View(new Receita { Data = DateTime.Today });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Receita model)
    {
        if (!ModelState.IsValid)
        {
            await CarregarListasAsync();
            return View(model);
        }
        model.UsuarioId = UsuarioSessao.GetUserId(User);
        await _repo.AddReceitaAsync(model);
        TempData["Sucesso"] = "Receita cadastrada.";
        return RedirectToAction(nameof(Index));
    }

    public async Task<IActionResult> Edit(int id)
    {
        var item = await _repo.GetReceitaByIdAsync(id, UsuarioSessao.GetUserId(User));
        if (item is null) return NotFound();
        await CarregarListasAsync();
        return View(item);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, Receita model)
    {
        if (id != model.Id) return NotFound();
        if (!ModelState.IsValid)
        {
            await CarregarListasAsync();
            return View(model);
        }
        var userId = UsuarioSessao.GetUserId(User);
        var item = await _repo.GetReceitaByIdAsync(id, userId);
        if (item is null) return NotFound();
        item.Descricao = model.Descricao;
        item.Valor = model.Valor;
        item.Data = model.Data;
        item.CategoriaId = model.CategoriaId;
        item.ContaId = model.ContaId;
        await _repo.UpdateReceitaAsync(item);
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = UsuarioSessao.GetUserId(User);
        var item = await _repo.GetReceitaByIdAsync(id, userId);
        if (item is not null) await _repo.DeleteReceitaAsync(item);
        return RedirectToAction(nameof(Index));
    }

    private async Task CarregarListasAsync()
    {
        var userId = UsuarioSessao.GetUserId(User);
        var categorias = await _repo.GetCategoriasAsync(userId, TipoCategoria.Receita);
        var contas = await _repo.GetContasAsync(userId);
        ViewBag.CategoriaId = new SelectList(categorias, "Id", "Nome");
        ViewBag.ContaId = new SelectList(contas, "Id", "Nome");
    }
}

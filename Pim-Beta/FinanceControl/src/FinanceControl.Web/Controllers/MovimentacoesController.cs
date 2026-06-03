using FinanceControl.Web.Helpers;
using FinanceControl.Web.Models.Entities;
using FinanceControl.Web.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace FinanceControl.Web.Controllers;

[Authorize]
public class MovimentacoesController : Controller
{
    private readonly IFinanceiroRepository _repo;

    public MovimentacoesController(IFinanceiroRepository repo) => _repo = repo;

    public async Task<IActionResult> Index() =>
        View(await _repo.GetMovimentacoesAsync(UsuarioSessao.GetUserId(User)));

    public async Task<IActionResult> Create()
    {
        await CarregarContasAsync();
        return View(new Movimentacao { Data = DateTime.Today });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Movimentacao model)
    {
        if (!ModelState.IsValid)
        {
            await CarregarContasAsync();
            return View(model);
        }
        model.UsuarioId = UsuarioSessao.GetUserId(User);
        await _repo.AddMovimentacaoAsync(model);
        return RedirectToAction(nameof(Index));
    }

    public async Task<IActionResult> Edit(int id)
    {
        var item = await _repo.GetMovimentacaoByIdAsync(id, UsuarioSessao.GetUserId(User));
        if (item is null) return NotFound();
        await CarregarContasAsync();
        return View(item);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, Movimentacao model)
    {
        if (id != model.Id) return NotFound();
        if (!ModelState.IsValid)
        {
            await CarregarContasAsync();
            return View(model);
        }
        var userId = UsuarioSessao.GetUserId(User);
        var item = await _repo.GetMovimentacaoByIdAsync(id, userId);
        if (item is null) return NotFound();
        item.Descricao = model.Descricao;
        item.Valor = model.Valor;
        item.Tipo = model.Tipo;
        item.Data = model.Data;
        item.ContaId = model.ContaId;
        await _repo.UpdateMovimentacaoAsync(item);
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = UsuarioSessao.GetUserId(User);
        var item = await _repo.GetMovimentacaoByIdAsync(id, userId);
        if (item is not null) await _repo.DeleteMovimentacaoAsync(item);
        return RedirectToAction(nameof(Index));
    }

    private async Task CarregarContasAsync()
    {
        var contas = await _repo.GetContasAsync(UsuarioSessao.GetUserId(User));
        ViewBag.ContaId = new SelectList(contas, "Id", "Nome");
    }
}

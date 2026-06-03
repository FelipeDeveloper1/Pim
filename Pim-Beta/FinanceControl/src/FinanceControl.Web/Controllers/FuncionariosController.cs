using FinanceControl.Web.Helpers;
using FinanceControl.Web.Models.Entities;
using FinanceControl.Web.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinanceControl.Web.Controllers;

[Authorize]
public class FuncionariosController : Controller
{
    private readonly IFinanceiroRepository _repo;

    public FuncionariosController(IFinanceiroRepository repo) => _repo = repo;

    public async Task<IActionResult> Index()
    {
        if (Request.Query.ContainsKey("nova"))
            TempData["AbrirModalFuncionario"] = "true";
        return View(await _repo.GetFuncionariosAsync(UsuarioSessao.GetUserId(User)));
    }

    public IActionResult Create()
    {
        TempData["AbrirModalFuncionario"] = "true";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Funcionario model)
    {
        if (!ModelState.IsValid)
        {
            TempData["AbrirModalFuncionario"] = "true";
            TempData["Erro"] = "Preencha todos os campos do funcionário.";
            return RedirectToAction(nameof(Index));
        }

        model.UsuarioId = UsuarioSessao.GetUserId(User);
        await _repo.AddFuncionarioAsync(model);
        TempData["Sucesso"] = "Funcionário cadastrado com sucesso.";
        return RedirectToAction(nameof(Index));
    }

    public async Task<IActionResult> Edit(int id)
    {
        var item = await _repo.GetFuncionarioByIdAsync(id, UsuarioSessao.GetUserId(User));
        if (item is null) return NotFound();
        return View(item);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, Funcionario model)
    {
        if (id != model.Id) return NotFound();
        if (!ModelState.IsValid) return View(model);
        var item = await _repo.GetFuncionarioByIdAsync(id, UsuarioSessao.GetUserId(User));
        if (item is null) return NotFound();
        item.Nome = model.Nome;
        item.Cargo = model.Cargo;
        item.Salario = model.Salario;
        item.DataAdmissao = model.DataAdmissao;
        item.Ativo = model.Ativo;
        await _repo.UpdateFuncionarioAsync(item);
        TempData["Sucesso"] = "Funcionário atualizado.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = UsuarioSessao.GetUserId(User);
        var item = await _repo.GetFuncionarioByIdAsync(id, userId);
        if (item is not null)
        {
            await _repo.DeleteFuncionarioAsync(item);
            TempData["Sucesso"] = "Funcionário excluído.";
        }
        return RedirectToAction(nameof(Index));
    }
}

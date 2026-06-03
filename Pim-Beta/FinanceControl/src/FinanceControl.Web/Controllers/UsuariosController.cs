using FinanceControl.Web.Helpers;
using FinanceControl.Web.Models.Entities;
using FinanceControl.Web.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinanceControl.Web.Controllers;

[Authorize]
public class UsuariosController : Controller
{
    private readonly IUsuarioRepository _usuarios;

    public UsuariosController(IUsuarioRepository usuarios) => _usuarios = usuarios;

    public async Task<IActionResult> Index()
    {
        if (!UsuarioSessao.IsAdmin(User))
            return Forbid();

        return View(await _usuarios.GetAllAsync());
    }

    public IActionResult Create()
    {
        if (!UsuarioSessao.IsAdmin(User)) return Forbid();
        return View(new Usuario { Ativo = true });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Usuario model, string senha)
    {
        if (!UsuarioSessao.IsAdmin(User)) return Forbid();
        if (!ModelState.IsValid) return View(model);

        if (await _usuarios.ExistsNomeUsuarioAsync(model.NomeUsuario))
        {
            ModelState.AddModelError(nameof(model.NomeUsuario), "Usuário já existe.");
            return View(model);
        }

        model.SenhaHash = PasswordHelper.Hash(senha);
        model.DataCadastro = DateTime.UtcNow;
        await _usuarios.AddAsync(model);
        return RedirectToAction(nameof(Index));
    }

    public async Task<IActionResult> Edit(int id)
    {
        if (!UsuarioSessao.IsAdmin(User)) return Forbid();
        var item = await _usuarios.GetByIdAsync(id);
        if (item is null) return NotFound();
        return View(item);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, Usuario model, string? senha)
    {
        if (!UsuarioSessao.IsAdmin(User)) return Forbid();
        if (id != model.Id) return NotFound();

        var item = await _usuarios.GetByIdAsync(id);
        if (item is null) return NotFound();

        item.NomeCompleto = model.NomeCompleto;
        item.NomeUsuario = model.NomeUsuario;
        item.Email = model.Email;
        item.Perfil = model.Perfil;
        item.Ativo = model.Ativo;
        if (!string.IsNullOrWhiteSpace(senha))
            item.SenhaHash = PasswordHelper.Hash(senha);

        await _usuarios.UpdateAsync(item);
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        if (!UsuarioSessao.IsAdmin(User)) return Forbid();
        var item = await _usuarios.GetByIdAsync(id);
        if (item is not null && item.NomeUsuario != "admin")
            await _usuarios.DeleteAsync(item);
        return RedirectToAction(nameof(Index));
    }
}

using System.Security.Claims;
using FinanceControl.Web.DTOs;
using FinanceControl.Web.Helpers;
using FinanceControl.Web.Models.Entities;
using FinanceControl.Web.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinanceControl.Web.Controllers;

public class AccountController : Controller
{
    private readonly IAuthService _auth;

    public AccountController(IAuthService auth) => _auth = auth;

    [HttpGet]
    [AllowAnonymous]
    public IActionResult Login(string? returnUrl = null)
    {
        if (User.Identity?.IsAuthenticated == true)
            return RedirectToAction("Index", "Home");

        ViewData["ReturnUrl"] = returnUrl;
        return View(new LoginDto());
    }

    [HttpPost]
    [AllowAnonymous]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(LoginDto model, string? returnUrl = null)
    {
        if (!ModelState.IsValid)
            return View(model);

        var (ok, usuario, erro) = await _auth.LoginAsync(model.NomeUsuario, model.Senha);
        if (!ok || usuario is null)
        {
            ModelState.AddModelError(string.Empty, erro ?? "Falha no login.");
            return View(model);
        }

        var identity = new ClaimsIdentity(UsuarioSessao.CriarClaims(usuario), CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));

        if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl))
            return Redirect(returnUrl);

        return RedirectToAction("Index", "Home");
    }

    [HttpGet]
    [AllowAnonymous]
    public IActionResult Register()
    {
        if (User.Identity?.IsAuthenticated == true)
            return RedirectToAction("Index", "Home");
        return View(new RegistroDto());
    }

    [HttpPost]
    [AllowAnonymous]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Register(RegistroDto model)
    {
        if (!ModelState.IsValid)
            return View(model);

        var usuario = new Usuario
        {
            NomeCompleto = model.NomeCompleto,
            NomeUsuario = model.NomeUsuario,
            Email = model.Email,
            Perfil = PerfilUsuario.Usuario
        };

        var (ok, erro) = await _auth.RegistrarAsync(usuario, model.Senha);
        if (!ok)
        {
            ModelState.AddModelError(string.Empty, erro ?? "Não foi possível registrar.");
            return View(model);
        }

        TempData["Sucesso"] = "Conta criada. Faça login.";
        return RedirectToAction(nameof(Login));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction(nameof(Login));
    }
}

using System.Security.Claims;
using FinanceControl.Web.Models.Entities;

namespace FinanceControl.Web.Helpers;

public static class UsuarioSessao
{
    public const string ClaimUserId = "UserId";
    public const string ClaimNome = "Nome";
    public const string ClaimPerfil = "Perfil";

    public static int GetUserId(ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(ClaimUserId) ?? "0");

    public static bool IsAdmin(ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimPerfil) == PerfilUsuario.Admin.ToString();

    public static List<Claim> CriarClaims(Usuario usuario) =>
    [
        new Claim(ClaimTypes.Name, usuario.NomeUsuario),
        new Claim(ClaimUserId, usuario.Id.ToString()),
        new Claim(ClaimNome, usuario.NomeCompleto),
        new Claim(ClaimPerfil, usuario.Perfil.ToString()),
        new Claim(ClaimTypes.Role, usuario.Perfil.ToString())
    ];
}

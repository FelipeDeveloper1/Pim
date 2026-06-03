using FinanceControl.Web.Models.Entities;

namespace FinanceControl.Web.Services.Interfaces;

public interface IAuthService
{
    Task<(bool Ok, Usuario? Usuario, string? Erro)> LoginAsync(string nomeUsuario, string senha);
    Task<(bool Ok, string? Erro)> RegistrarAsync(Usuario usuario, string senha);
}

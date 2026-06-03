using FinanceControl.Web.Helpers;
using FinanceControl.Web.Models.Entities;
using FinanceControl.Web.Repositories.Interfaces;
using FinanceControl.Web.Services.Interfaces;

namespace FinanceControl.Web.Services;

public class AuthService : IAuthService
{
    private readonly IUsuarioRepository _usuarios;

    public AuthService(IUsuarioRepository usuarios) => _usuarios = usuarios;

    public async Task<(bool Ok, Usuario? Usuario, string? Erro)> LoginAsync(string nomeUsuario, string senha)
    {
        var usuario = await _usuarios.GetByNomeUsuarioAsync(nomeUsuario.Trim());
        if (usuario is null || !usuario.Ativo)
            return (false, null, "Usuário ou senha inválidos.");

        if (!PasswordHelper.Verify(senha, usuario.SenhaHash))
            return (false, null, "Usuário ou senha inválidos.");

        return (true, usuario, null);
    }

    public async Task<(bool Ok, string? Erro)> RegistrarAsync(Usuario usuario, string senha)
    {
        if (await _usuarios.ExistsNomeUsuarioAsync(usuario.NomeUsuario))
            return (false, "Nome de usuário já está em uso.");

        if (await _usuarios.ExistsEmailAsync(usuario.Email))
            return (false, "E-mail já está em uso.");

        usuario.SenhaHash = PasswordHelper.Hash(senha);
        usuario.DataCadastro = DateTime.UtcNow;
        await _usuarios.AddAsync(usuario);
        return (true, null);
    }
}

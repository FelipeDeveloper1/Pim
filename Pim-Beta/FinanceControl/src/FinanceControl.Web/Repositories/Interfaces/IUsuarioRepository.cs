using FinanceControl.Web.Models.Entities;

namespace FinanceControl.Web.Repositories.Interfaces;

public interface IUsuarioRepository
{
    Task<Usuario?> GetByIdAsync(int id);
    Task<Usuario?> GetByNomeUsuarioAsync(string nomeUsuario);
    Task<List<Usuario>> GetAllAsync();
    Task AddAsync(Usuario usuario);
    Task UpdateAsync(Usuario usuario);
    Task DeleteAsync(Usuario usuario);
    Task<bool> ExistsNomeUsuarioAsync(string nomeUsuario, int? ignoreId = null);
    Task<bool> ExistsEmailAsync(string email, int? ignoreId = null);
}

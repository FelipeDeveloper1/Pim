using FinanceControl.Web.Data;
using FinanceControl.Web.Models.Entities;
using FinanceControl.Web.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FinanceControl.Web.Repositories;

public class UsuarioRepository : IUsuarioRepository
{
    private readonly ApplicationDbContext _context;

    public UsuarioRepository(ApplicationDbContext context) => _context = context;

    public Task<Usuario?> GetByIdAsync(int id) =>
        _context.Usuarios.FirstOrDefaultAsync(u => u.Id == id);

    public Task<Usuario?> GetByNomeUsuarioAsync(string nomeUsuario) =>
        _context.Usuarios.FirstOrDefaultAsync(u => u.NomeUsuario == nomeUsuario);

    public Task<List<Usuario>> GetAllAsync() =>
        _context.Usuarios.OrderBy(u => u.NomeCompleto).ToListAsync();

    public async Task AddAsync(Usuario usuario)
    {
        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Usuario usuario)
    {
        _context.Usuarios.Update(usuario);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Usuario usuario)
    {
        _context.Usuarios.Remove(usuario);
        await _context.SaveChangesAsync();
    }

    public Task<bool> ExistsNomeUsuarioAsync(string nomeUsuario, int? ignoreId = null) =>
        _context.Usuarios.AnyAsync(u =>
            u.NomeUsuario == nomeUsuario && (!ignoreId.HasValue || u.Id != ignoreId));

    public Task<bool> ExistsEmailAsync(string email, int? ignoreId = null) =>
        _context.Usuarios.AnyAsync(u =>
            u.Email == email && (!ignoreId.HasValue || u.Id != ignoreId));
}

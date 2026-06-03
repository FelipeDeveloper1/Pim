using FinanceControl.Web.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FinanceControl.Web.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Conta> Contas => Set<Conta>();
    public DbSet<Receita> Receitas => Set<Receita>();
    public DbSet<Despesa> Despesas => Set<Despesa>();
    public DbSet<Movimentacao> Movimentacoes => Set<Movimentacao>();
    public DbSet<Meta> Metas => Set<Meta>();
    public DbSet<Funcionario> Funcionarios => Set<Funcionario>();
    public DbSet<LancamentoFinanceiro> LancamentosFinanceiros => Set<LancamentoFinanceiro>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.NomeUsuario)
            .IsUnique();

        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<Categoria>()
            .HasOne(c => c.Usuario)
            .WithMany(u => u.Categorias)
            .HasForeignKey(c => c.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Conta>()
            .HasOne(c => c.Usuario)
            .WithMany(u => u.Contas)
            .HasForeignKey(c => c.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Receita>()
            .Property(r => r.Valor)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Despesa>()
            .Property(d => d.Valor)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Movimentacao>()
            .Property(m => m.Valor)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Meta>()
            .Property(m => m.ValorAlvo)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Meta>()
            .Property(m => m.ValorAtual)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Funcionario>()
            .Property(f => f.Salario)
            .HasPrecision(18, 2);

        modelBuilder.Entity<LancamentoFinanceiro>()
            .Property(l => l.Valor)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Conta>()
            .Property(c => c.SaldoInicial)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Receita>()
            .HasOne(r => r.Categoria)
            .WithMany(c => c.Receitas)
            .HasForeignKey(r => r.CategoriaId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Receita>()
            .HasOne(r => r.Conta)
            .WithMany(c => c.Receitas)
            .HasForeignKey(r => r.ContaId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Despesa>()
            .HasOne(d => d.Categoria)
            .WithMany(c => c.Despesas)
            .HasForeignKey(d => d.CategoriaId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Despesa>()
            .HasOne(d => d.Conta)
            .WithMany(c => c.Despesas)
            .HasForeignKey(d => d.ContaId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Movimentacao>()
            .HasOne(m => m.Conta)
            .WithMany(c => c.Movimentacoes)
            .HasForeignKey(m => m.ContaId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

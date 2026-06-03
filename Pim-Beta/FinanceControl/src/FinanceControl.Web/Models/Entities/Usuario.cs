using System.ComponentModel.DataAnnotations;

namespace FinanceControl.Web.Models.Entities;

public class Usuario
{
    public int Id { get; set; }

    [Required, StringLength(120)]
    public string NomeCompleto { get; set; } = string.Empty;

    [Required, StringLength(60)]
    public string NomeUsuario { get; set; } = string.Empty;

    [Required, StringLength(120), EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(256)]
    public string SenhaHash { get; set; } = string.Empty;

    public PerfilUsuario Perfil { get; set; } = PerfilUsuario.Usuario;

    public bool Ativo { get; set; } = true;

    public DateTime DataCadastro { get; set; } = DateTime.UtcNow;

    public ICollection<Categoria> Categorias { get; set; } = new List<Categoria>();
    public ICollection<Conta> Contas { get; set; } = new List<Conta>();
    public ICollection<Receita> Receitas { get; set; } = new List<Receita>();
    public ICollection<Despesa> Despesas { get; set; } = new List<Despesa>();
    public ICollection<Movimentacao> Movimentacoes { get; set; } = new List<Movimentacao>();
    public ICollection<Meta> Metas { get; set; } = new List<Meta>();
    public ICollection<Funcionario> Funcionarios { get; set; } = new List<Funcionario>();
    public ICollection<LancamentoFinanceiro> LancamentosFinanceiros { get; set; } = new List<LancamentoFinanceiro>();
}

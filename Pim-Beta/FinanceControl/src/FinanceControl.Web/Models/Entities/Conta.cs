using System.ComponentModel.DataAnnotations;

namespace FinanceControl.Web.Models.Entities;

public class Conta
{
    public int Id { get; set; }

    [Required, StringLength(80)]
    public string Nome { get; set; } = string.Empty;

    [StringLength(200)]
    public string? Descricao { get; set; }

    public decimal SaldoInicial { get; set; }

    public bool Ativa { get; set; } = true;

    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;

    public ICollection<Receita> Receitas { get; set; } = new List<Receita>();
    public ICollection<Despesa> Despesas { get; set; } = new List<Despesa>();
    public ICollection<Movimentacao> Movimentacoes { get; set; } = new List<Movimentacao>();
}

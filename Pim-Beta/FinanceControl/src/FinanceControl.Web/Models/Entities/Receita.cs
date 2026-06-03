using System.ComponentModel.DataAnnotations;

namespace FinanceControl.Web.Models.Entities;

public class Receita
{
    public int Id { get; set; }

    [Required, StringLength(120)]
    public string Descricao { get; set; } = string.Empty;

    public decimal Valor { get; set; }

    public DateTime Data { get; set; } = DateTime.Today;

    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;

    public int CategoriaId { get; set; }
    public Categoria Categoria { get; set; } = null!;

    public int ContaId { get; set; }
    public Conta Conta { get; set; } = null!;
}

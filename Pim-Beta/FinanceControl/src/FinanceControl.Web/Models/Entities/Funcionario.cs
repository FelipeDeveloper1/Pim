using System.ComponentModel.DataAnnotations;

namespace FinanceControl.Web.Models.Entities;

public class Funcionario
{
    public int Id { get; set; }

    [Required, StringLength(120)]
    public string Nome { get; set; } = string.Empty;

    [StringLength(80)]
    public string? Cargo { get; set; }

    public decimal Salario { get; set; }

    public DateTime DataAdmissao { get; set; } = DateTime.Today;

    public bool Ativo { get; set; } = true;

    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
}

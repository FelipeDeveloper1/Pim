using System.ComponentModel.DataAnnotations;

namespace FinanceControl.Web.Models.Entities;

public class LancamentoFinanceiro
{
    public int Id { get; set; }

    public TipoLancamentoFinanceiro Tipo { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Valor { get; set; }

    [Required, StringLength(200)]
    [Display(Name = "Descrição")]
    public string Observacao { get; set; } = string.Empty;

    public DateTime Data { get; set; } = DateTime.Today;

    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
}

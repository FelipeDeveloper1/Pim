using System.ComponentModel.DataAnnotations;

namespace FinanceControl.Web.Models.Entities;

public class Meta
{
    public int Id { get; set; }

    [Required, StringLength(120)]
    [Display(Name = "Nome da meta")]
    public string Titulo { get; set; } = string.Empty;

    [Display(Name = "Valor objetivo")]
    [Range(0.01, double.MaxValue)]
    public decimal ValorAlvo { get; set; }

    [Display(Name = "Valor atual")]
    public decimal ValorAtual { get; set; }

    [Display(Name = "Data limite")]
    public DateTime? DataLimite { get; set; }

    public bool Concluida { get; set; }

    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
}

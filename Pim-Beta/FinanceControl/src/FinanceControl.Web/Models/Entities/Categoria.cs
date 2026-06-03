using System.ComponentModel.DataAnnotations;

namespace FinanceControl.Web.Models.Entities;

public class Categoria
{
    public int Id { get; set; }

    [Required, StringLength(80)]
    public string Nome { get; set; } = string.Empty;

    public TipoCategoria Tipo { get; set; }

    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;

    public ICollection<Receita> Receitas { get; set; } = new List<Receita>();
    public ICollection<Despesa> Despesas { get; set; } = new List<Despesa>();
}

namespace FinanceControl.Web.DTOs;

public class DashboardResumoDto
{
    public decimal TotalReceitas { get; set; }
    public decimal TotalDespesas { get; set; }
    public decimal TotalInvestimentos { get; set; }
    public decimal SaldoContas { get; set; }
    public decimal TotalGastos { get; set; }
    public List<GastoDashboardDto> Gastos { get; set; } = [];
    public List<LancamentoResumoDto> UltimosLancamentos { get; set; } = [];
}

public class GastoDashboardDto
{
    public string Descricao { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public DateTime Data { get; set; }
    public string Categoria { get; set; } = string.Empty;
}

public class LancamentoResumoDto
{
    public string Descricao { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public DateTime Data { get; set; }
    public string Tipo { get; set; } = string.Empty;
}

public class RelatorioResumoDto
{
    public int Mes { get; set; }
    public int Ano { get; set; }
    public decimal ReceitasMes { get; set; }
    public decimal DespesasMes { get; set; }
    public decimal InvestimentosMes { get; set; }
    public decimal SaldoMes { get; set; }
    public List<CategoriaResumoDto> PorCategoria { get; set; } = [];
    public List<LancamentoResumoDto> Gastos { get; set; } = [];
    public List<LancamentoResumoDto> Investimentos { get; set; } = [];
    public decimal TotalGastos { get; set; }
    public decimal TotalInvestimentos { get; set; }
    public decimal SaldoFinal { get; set; }
}

public class CategoriaResumoDto
{
    public string Nome { get; set; } = string.Empty;
    public decimal Total { get; set; }
}

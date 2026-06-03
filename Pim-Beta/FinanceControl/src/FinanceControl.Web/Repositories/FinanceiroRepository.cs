using FinanceControl.Web.Data;
using FinanceControl.Web.DTOs;
using FinanceControl.Web.Models.Entities;
using FinanceControl.Web.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FinanceControl.Web.Repositories;

public class FinanceiroRepository : IFinanceiroRepository
{
    private readonly ApplicationDbContext _context;

    public FinanceiroRepository(ApplicationDbContext context) => _context = context;

    public Task<List<Categoria>> GetCategoriasAsync(int usuarioId, TipoCategoria? tipo = null)
    {
        var q = _context.Categorias.Where(c => c.UsuarioId == usuarioId);
        if (tipo.HasValue) q = q.Where(c => c.Tipo == tipo);
        return q.OrderBy(c => c.Nome).ToListAsync();
    }

    public Task<Categoria?> GetCategoriaByIdAsync(int id, int usuarioId) =>
        _context.Categorias.FirstOrDefaultAsync(c => c.Id == id && c.UsuarioId == usuarioId);

    public async Task AddCategoriaAsync(Categoria categoria)
    {
        _context.Categorias.Add(categoria);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateCategoriaAsync(Categoria categoria)
    {
        _context.Categorias.Update(categoria);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteCategoriaAsync(Categoria categoria)
    {
        _context.Categorias.Remove(categoria);
        await _context.SaveChangesAsync();
    }

    public Task<List<Conta>> GetContasAsync(int usuarioId) =>
        _context.Contas.Where(c => c.UsuarioId == usuarioId).OrderBy(c => c.Nome).ToListAsync();

    public Task<Conta?> GetContaByIdAsync(int id, int usuarioId) =>
        _context.Contas.FirstOrDefaultAsync(c => c.Id == id && c.UsuarioId == usuarioId);

    public async Task AddContaAsync(Conta conta)
    {
        _context.Contas.Add(conta);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateContaAsync(Conta conta)
    {
        _context.Contas.Update(conta);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteContaAsync(Conta conta)
    {
        _context.Contas.Remove(conta);
        await _context.SaveChangesAsync();
    }

    public Task<List<Receita>> GetReceitasAsync(int usuarioId) =>
        _context.Receitas
            .Include(r => r.Categoria)
            .Include(r => r.Conta)
            .Where(r => r.UsuarioId == usuarioId)
            .OrderByDescending(r => r.Data)
            .ToListAsync();

    public Task<Receita?> GetReceitaByIdAsync(int id, int usuarioId) =>
        _context.Receitas
            .Include(r => r.Categoria)
            .Include(r => r.Conta)
            .FirstOrDefaultAsync(r => r.Id == id && r.UsuarioId == usuarioId);

    public async Task AddReceitaAsync(Receita receita)
    {
        _context.Receitas.Add(receita);
        await _context.SaveChangesAsync();

        _context.Movimentacoes.Add(new Movimentacao
        {
            UsuarioId = receita.UsuarioId,
            Descricao = receita.Descricao,
            Valor = receita.Valor,
            Tipo = TipoMovimentacao.Receita,
            Data = receita.Data,
            ContaId = receita.ContaId
        });
        await _context.SaveChangesAsync();
    }

    public async Task UpdateReceitaAsync(Receita receita)
    {
        _context.Receitas.Update(receita);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteReceitaAsync(Receita receita)
    {
        _context.Receitas.Remove(receita);
        await _context.SaveChangesAsync();
    }

    public Task<List<Despesa>> GetDespesasAsync(int usuarioId) =>
        _context.Despesas
            .Include(d => d.Categoria)
            .Include(d => d.Conta)
            .Where(d => d.UsuarioId == usuarioId)
            .OrderByDescending(d => d.Data)
            .ToListAsync();

    public Task<Despesa?> GetDespesaByIdAsync(int id, int usuarioId) =>
        _context.Despesas
            .Include(d => d.Categoria)
            .Include(d => d.Conta)
            .FirstOrDefaultAsync(d => d.Id == id && d.UsuarioId == usuarioId);

    public async Task AddDespesaAsync(Despesa despesa)
    {
        _context.Despesas.Add(despesa);
        await _context.SaveChangesAsync();

        _context.Movimentacoes.Add(new Movimentacao
        {
            UsuarioId = despesa.UsuarioId,
            Descricao = despesa.Descricao,
            Valor = despesa.Valor,
            Tipo = TipoMovimentacao.Despesa,
            Data = despesa.Data,
            ContaId = despesa.ContaId
        });
        await _context.SaveChangesAsync();
    }

    public async Task UpdateDespesaAsync(Despesa despesa)
    {
        _context.Despesas.Update(despesa);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteDespesaAsync(Despesa despesa)
    {
        _context.Despesas.Remove(despesa);
        await _context.SaveChangesAsync();
    }

    public Task<List<Movimentacao>> GetMovimentacoesAsync(int usuarioId) =>
        _context.Movimentacoes
            .Include(m => m.Conta)
            .Where(m => m.UsuarioId == usuarioId)
            .OrderByDescending(m => m.Data)
            .ToListAsync();

    public Task<Movimentacao?> GetMovimentacaoByIdAsync(int id, int usuarioId) =>
        _context.Movimentacoes
            .Include(m => m.Conta)
            .FirstOrDefaultAsync(m => m.Id == id && m.UsuarioId == usuarioId);

    public async Task AddMovimentacaoAsync(Movimentacao movimentacao)
    {
        _context.Movimentacoes.Add(movimentacao);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateMovimentacaoAsync(Movimentacao movimentacao)
    {
        _context.Movimentacoes.Update(movimentacao);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteMovimentacaoAsync(Movimentacao movimentacao)
    {
        _context.Movimentacoes.Remove(movimentacao);
        await _context.SaveChangesAsync();
    }

    public Task<List<Meta>> GetMetasAsync(int usuarioId) =>
        _context.Metas.Where(m => m.UsuarioId == usuarioId).OrderBy(m => m.Titulo).ToListAsync();

    public Task<Meta?> GetMetaByIdAsync(int id, int usuarioId) =>
        _context.Metas.FirstOrDefaultAsync(m => m.Id == id && m.UsuarioId == usuarioId);

    public async Task AddMetaAsync(Meta meta)
    {
        _context.Metas.Add(meta);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateMetaAsync(Meta meta)
    {
        _context.Metas.Update(meta);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteMetaAsync(Meta meta)
    {
        _context.Metas.Remove(meta);
        await _context.SaveChangesAsync();
    }

    public Task<List<Funcionario>> GetFuncionariosAsync(int usuarioId) =>
        _context.Funcionarios.Where(f => f.UsuarioId == usuarioId).OrderBy(f => f.Nome).ToListAsync();

    public Task<Funcionario?> GetFuncionarioByIdAsync(int id, int usuarioId) =>
        _context.Funcionarios.FirstOrDefaultAsync(f => f.Id == id && f.UsuarioId == usuarioId);

    public async Task AddFuncionarioAsync(Funcionario funcionario)
    {
        _context.Funcionarios.Add(funcionario);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateFuncionarioAsync(Funcionario funcionario)
    {
        _context.Funcionarios.Update(funcionario);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteFuncionarioAsync(Funcionario funcionario)
    {
        _context.Funcionarios.Remove(funcionario);
        await _context.SaveChangesAsync();
    }

    public Task<List<LancamentoFinanceiro>> GetLancamentosAsync(int usuarioId) =>
        _context.LancamentosFinanceiros
            .Where(l => l.UsuarioId == usuarioId)
            .OrderByDescending(l => l.Data)
            .ToListAsync();

    public Task<LancamentoFinanceiro?> GetLancamentoByIdAsync(int id, int usuarioId) =>
        _context.LancamentosFinanceiros.FirstOrDefaultAsync(l => l.Id == id && l.UsuarioId == usuarioId);

    public async Task AddLancamentoAsync(LancamentoFinanceiro lancamento)
    {
        _context.LancamentosFinanceiros.Add(lancamento);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateLancamentoAsync(LancamentoFinanceiro lancamento)
    {
        _context.LancamentosFinanceiros.Update(lancamento);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteLancamentoAsync(LancamentoFinanceiro lancamento)
    {
        _context.LancamentosFinanceiros.Remove(lancamento);
        await _context.SaveChangesAsync();
    }

    public async Task<DashboardResumoDto> GetDashboardAsync(int usuarioId)
    {
        var inicioMes = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
        var receitas = await _context.Receitas
            .Where(r => r.UsuarioId == usuarioId && r.Data >= inicioMes)
            .SumAsync(r => (decimal?)r.Valor) ?? 0;

        var despesas = await _context.Despesas
            .Where(d => d.UsuarioId == usuarioId && d.Data >= inicioMes)
            .SumAsync(d => (decimal?)d.Valor) ?? 0;

        var investimentos = await _context.LancamentosFinanceiros
            .Where(l => l.UsuarioId == usuarioId && l.Tipo == TipoLancamentoFinanceiro.Investimento && l.Data >= inicioMes)
            .SumAsync(l => (decimal?)l.Valor) ?? 0;

        var saldoContas = await _context.Contas
            .Where(c => c.UsuarioId == usuarioId)
            .SumAsync(c => (decimal?)c.SaldoInicial) ?? 0;

        var gastos = await _context.Despesas
            .Include(d => d.Categoria)
            .Where(d => d.UsuarioId == usuarioId)
            .OrderByDescending(d => d.Data)
            .Select(d => new GastoDashboardDto
            {
                Descricao = d.Descricao,
                Valor = d.Valor,
                Data = d.Data,
                Categoria = d.Categoria.Nome
            })
            .ToListAsync();

        var ultimos = await _context.LancamentosFinanceiros
            .Where(l => l.UsuarioId == usuarioId)
            .OrderByDescending(l => l.Data)
            .Take(5)
            .Select(l => new LancamentoResumoDto
            {
                Descricao = l.Observacao ?? l.Tipo.ToString(),
                Valor = l.Valor,
                Data = l.Data,
                Tipo = l.Tipo.ToString()
            })
            .ToListAsync();

        return new DashboardResumoDto
        {
            TotalReceitas = receitas,
            TotalDespesas = despesas,
            TotalInvestimentos = investimentos,
            SaldoContas = saldoContas,
            Gastos = gastos,
            TotalGastos = gastos.Sum(g => g.Valor),
            UltimosLancamentos = ultimos
        };
    }

    public async Task<RelatorioResumoDto> GetRelatorioMesAsync(int usuarioId, int mes, int ano)
    {
        var inicio = new DateTime(ano, mes, 1);
        var fim = inicio.AddMonths(1);

        var receitas = await _context.Receitas
            .Where(r => r.UsuarioId == usuarioId && r.Data >= inicio && r.Data < fim)
            .SumAsync(r => (decimal?)r.Valor) ?? 0;

        var despesas = await _context.Despesas
            .Where(d => d.UsuarioId == usuarioId && d.Data >= inicio && d.Data < fim)
            .SumAsync(d => (decimal?)d.Valor) ?? 0;

        var investimentos = await _context.LancamentosFinanceiros
            .Where(l => l.UsuarioId == usuarioId && l.Tipo == TipoLancamentoFinanceiro.Investimento && l.Data >= inicio && l.Data < fim)
            .SumAsync(l => (decimal?)l.Valor) ?? 0;

        var porCategoria = await _context.Despesas
            .Include(d => d.Categoria)
            .Where(d => d.UsuarioId == usuarioId && d.Data >= inicio && d.Data < fim)
            .GroupBy(d => d.Categoria.Nome)
            .Select(g => new CategoriaResumoDto { Nome = g.Key, Total = g.Sum(x => x.Valor) })
            .ToListAsync();

        var lancamentos = await _context.LancamentosFinanceiros
            .Where(l => l.UsuarioId == usuarioId && l.Data >= inicio && l.Data < fim)
            .OrderByDescending(l => l.Data)
            .ToListAsync();

        var gastos = lancamentos
            .Where(l => l.Tipo == TipoLancamentoFinanceiro.Gasto)
            .Select(l => new LancamentoResumoDto
            {
                Descricao = l.Observacao ?? "Gasto",
                Valor = l.Valor,
                Data = l.Data,
                Tipo = "Gasto"
            })
            .ToList();

        var investimentosLista = lancamentos
            .Where(l => l.Tipo == TipoLancamentoFinanceiro.Investimento)
            .Select(l => new LancamentoResumoDto
            {
                Descricao = l.Observacao ?? "Investimento",
                Valor = l.Valor,
                Data = l.Data,
                Tipo = "Investimento"
            })
            .ToList();

        var totalGastos = gastos.Sum(g => g.Valor);
        var totalInvest = investimentosLista.Sum(i => i.Valor);

        return new RelatorioResumoDto
        {
            Mes = mes,
            Ano = ano,
            ReceitasMes = receitas,
            DespesasMes = despesas,
            InvestimentosMes = investimentos,
            SaldoMes = receitas - despesas,
            PorCategoria = porCategoria,
            Gastos = gastos,
            Investimentos = investimentosLista,
            TotalGastos = totalGastos,
            TotalInvestimentos = totalInvest,
            SaldoFinal = totalInvest - totalGastos
        };
    }
}

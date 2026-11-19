'use strict';
const { isDate, isMonth, monthRange, addMonths, currentMonth, toReais, validationError } = require('../util');
const { scope } = require('./transactions');

const zero = () => ({ receita: 0, despesa: 0, investimento: 0 });

// Regra de cálculo (exibida na tela, seção 3.3.1): saldo = receitas − despesas;
// "após investimentos" = saldo − investimentos. Tudo agregado no servidor (seção 3.7.4).
function totaisDoPeriodo(db, user, inicio, fim) {
  const s = scope(user);
  const rows = db.prepare(`SELECT c.tipo, COALESCE(SUM(t.valor_centavos), 0) AS s FROM transacao t JOIN categoria c ON c.id = t.categoria_id
                           WHERE t.ativo = 1 AND ${s.sql} AND t.data_movimento BETWEEN ? AND ? GROUP BY c.tipo`).all(...s.params, inicio, fim);
  const t = zero(); rows.forEach((x) => { t[x.tipo] = x.s; });
  const saldo = t.receita - t.despesa;
  return { receitas: toReais(t.receita), despesas: toReais(t.despesa), investimentos: toReais(t.investimento),
           saldo: toReais(saldo), saldoAposInvestimentos: toReais(saldo - t.investimento) };
}

module.exports = function dashboardRoutes(r) {
  r.add('GET', '/api/dashboard', {}, (ctx) => {
    const q = ctx.query; const mes = currentMonth();
    const range = monthRange(mes);
    const inicio = q.inicio ?? range.inicio, fim = q.fim ?? range.fim;
    if (!isDate(inicio) || !isDate(fim) || inicio > fim) throw validationError({ periodo: 'Informe inicio e fim válidos (AAAA-MM-DD), com início ≤ fim.' });

    const s = scope(ctx.user);
    const totais = totaisDoPeriodo(ctx.db, ctx.user, inicio, fim);

    const cats = ctx.db.prepare(`SELECT c.id, c.nome, SUM(t.valor_centavos) AS total FROM transacao t JOIN categoria c ON c.id = t.categoria_id
      WHERE t.ativo = 1 AND c.tipo = 'despesa' AND ${s.sql} AND t.data_movimento BETWEEN ? AND ? GROUP BY c.id ORDER BY total DESC`).all(...s.params, inicio, fim);
    const somaDesp = cats.reduce((a, c) => a + c.total, 0);
    const despesasPorCategoria = cats.map((c) => ({ categoriaId: c.id, categoria: c.nome, total: toReais(c.total), percentual: somaDesp ? Math.round((c.total / somaDesp) * 1000) / 10 : 0 }));

    // Evolução dos últimos 6 meses, terminando no mês de "fim"
    const ultimo = fim.slice(0, 7), primeiro = addMonths(ultimo, -5);
    const rows = ctx.db.prepare(`SELECT strftime('%Y-%m', t.data_movimento) AS mes, c.tipo, SUM(t.valor_centavos) AS s FROM transacao t JOIN categoria c ON c.id = t.categoria_id
      WHERE t.ativo = 1 AND ${s.sql} AND t.data_movimento BETWEEN ? AND ? GROUP BY mes, c.tipo`).all(...s.params, `${primeiro}-01`, monthRange(ultimo).fim);
    const mensal = [];
    for (let i = 0; i < 6; i++) {
      const m = addMonths(primeiro, i); const t = zero();
      rows.filter((x) => x.mes === m).forEach((x) => { t[x.tipo] = x.s; });
      mensal.push({ mes: m, receitas: toReais(t.receita), despesas: toReais(t.despesa), investimentos: toReais(t.investimento) });
    }
    return { body: { periodo: { inicio, fim }, escopo: ctx.user.perfil === 'operador' ? 'proprias' : 'organizacao', ...totais, despesasPorCategoria, mensal } };
  });

  // Comparação de resultados entre dois meses (RF / objetivo específico "comparar entre diferentes meses")
  r.add('GET', '/api/dashboard/comparacao', {}, (ctx) => {
    const mesB = ctx.query.b ?? currentMonth();
    const mesA = ctx.query.a ?? addMonths(mesB, -1);
    if (!isMonth(mesA) || !isMonth(mesB)) throw validationError({ periodo: 'Use os parâmetros a e b no formato AAAA-MM.' });
    const ra = monthRange(mesA), rb = monthRange(mesB);
    const a = { mes: mesA, ...totaisDoPeriodo(ctx.db, ctx.user, ra.inicio, ra.fim) };
    const b = { mes: mesB, ...totaisDoPeriodo(ctx.db, ctx.user, rb.inicio, rb.fim) };
    const variacao = (x, y) => (x === 0 ? null : Math.round(((y - x) / Math.abs(x)) * 10000) / 100);
    return { body: { a, b, variacaoPercentual: { receitas: variacao(a.receitas, b.receitas), despesas: variacao(a.despesas, b.despesas), saldo: variacao(a.saldo, b.saldo) } } };
  });
};

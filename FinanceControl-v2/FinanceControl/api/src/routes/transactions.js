'use strict';
const { HttpError } = require('../http');
const { withActor } = require('../db');
const { isDate, parseMoney, MAX_CENTS, toReais, validationError, intId } = require('../util');

const TIPOS = ['receita', 'despesa', 'investimento'];
const SELECT = `SELECT t.id, t.descricao, t.valor_centavos, t.data_movimento, t.criado_em, t.atualizado_em,
                       c.id AS categoria_id, c.nome AS categoria_nome, c.tipo,
                       u.id AS usuario_id, u.nome AS usuario_nome
                FROM transacao t JOIN categoria c ON c.id = t.categoria_id JOIN usuario u ON u.id = t.usuario_id`;

const dto = (t) => ({
  id: t.id, descricao: t.descricao, valor: toReais(t.valor_centavos), data: t.data_movimento, tipo: t.tipo,
  categoria: { id: t.categoria_id, nome: t.categoria_nome }, usuario: { id: t.usuario_id, nome: t.usuario_nome },
  criadoEm: t.criado_em, atualizadoEm: t.atualizado_em,
});

/** Operador enxerga somente as próprias movimentações; Financeiro e Administrador enxergam todas. */
function scope(user, alias = 't') {
  return user.perfil === 'operador' ? { sql: `${alias}.usuario_id = ?`, params: [user.id] } : { sql: '1 = 1', params: [] };
}

function buildFilter(user, q) {
  const where = ['t.ativo = 1']; const params = [];
  const s = scope(user); where.push(s.sql); params.push(...s.params);
  const erros = {};
  if (q.inicio !== undefined) { if (isDate(q.inicio)) { where.push('t.data_movimento >= ?'); params.push(q.inicio); } else erros.inicio = 'Data inválida (AAAA-MM-DD).'; }
  if (q.fim !== undefined) { if (isDate(q.fim)) { where.push('t.data_movimento <= ?'); params.push(q.fim); } else erros.fim = 'Data inválida (AAAA-MM-DD).'; }
  if (q.categoriaId !== undefined) { const n = Number(q.categoriaId); if (Number.isInteger(n) && n > 0) { where.push('t.categoria_id = ?'); params.push(n); } else erros.categoriaId = 'Categoria inválida.'; }
  if (q.tipo !== undefined) { if (TIPOS.includes(q.tipo)) { where.push('c.tipo = ?'); params.push(q.tipo); } else erros.tipo = 'Tipo inválido.'; }
  if (q.q) { where.push("t.descricao LIKE ? ESCAPE '\\'"); params.push(`%${String(q.q).slice(0, 60).replace(/[\\%_]/g, '\\$&')}%`); }
  if (Object.keys(erros).length) throw validationError(erros);
  return { sql: where.join(' AND '), params };
}

function parsePayload(db, body) {
  const erros = {};
  const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : '';
  if (!descricao || descricao.length > 120) erros.descricao = 'Informe a descrição (até 120 caracteres).';
  const cents = parseMoney(body.valor);
  if (cents === null || cents <= 0 || cents > MAX_CENTS) erros.valor = 'Informe um valor positivo com até 2 casas decimais.';
  if (!isDate(body.data)) erros.data = 'Informe a data no formato AAAA-MM-DD.';
  const categoriaId = Number(body.categoriaId);
  if (!Number.isInteger(categoriaId) || !db.prepare('SELECT 1 FROM categoria WHERE id = ?').get(categoriaId)) erros.categoriaId = 'Categoria inexistente.';
  if (Object.keys(erros).length) throw validationError(erros);
  return { descricao, cents, data: body.data, categoriaId };
}

// Proteção contra injeção de fórmulas ao abrir o CSV no Excel.
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

module.exports = function transactionRoutes(r) {
  r.add('GET', '/api/transactions', {}, (ctx) => {
    const f = buildFilter(ctx.user, ctx.query);
    const limit = Math.min(Math.max(parseInt(ctx.query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(ctx.query.page, 10) || 1, 1);
    const from = `FROM transacao t JOIN categoria c ON c.id = t.categoria_id WHERE ${f.sql}`;
    const total = ctx.db.prepare(`SELECT COUNT(*) AS n ${from}`).get(...f.params).n;
    const sums = ctx.db.prepare(`SELECT c.tipo, COALESCE(SUM(t.valor_centavos), 0) AS s ${from} GROUP BY c.tipo`).all(...f.params);
    const totais = { receita: 0, despesa: 0, investimento: 0 };
    sums.forEach((x) => { totais[x.tipo] = toReais(x.s); });
    const rows = ctx.db.prepare(`${SELECT} WHERE ${f.sql} ORDER BY t.data_movimento DESC, t.id DESC LIMIT ? OFFSET ?`).all(...f.params, limit, (page - 1) * limit);
    return { body: { items: rows.map(dto), total, page, limit, paginas: Math.max(1, Math.ceil(total / limit)), totais } };
  });

  r.add('GET', '/api/transactions/export', {}, (ctx) => {
    const f = buildFilter(ctx.user, ctx.query);
    const rows = ctx.db.prepare(`${SELECT} WHERE ${f.sql} ORDER BY t.data_movimento DESC, t.id DESC LIMIT 50000`).all(...f.params);
    const linhas = [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Responsável'].join(';')];
    for (const t of rows) {
      linhas.push([t.data_movimento, t.tipo, t.categoria_nome, t.descricao, toReais(t.valor_centavos).toFixed(2).replace('.', ','), t.usuario_nome].map(csvCell).join(';'));
    }
    return { status: 200, raw: '\uFEFF' + linhas.join('\r\n') + '\r\n', contentType: 'text/csv; charset=utf-8',
      headers: { 'Content-Disposition': 'attachment; filename="movimentacoes.csv"' } };
  });

  r.add('POST', '/api/transactions', {}, (ctx) => {
    const p = parsePayload(ctx.db, ctx.body);
    const id = withActor(ctx.db, ctx.user.id, () => ctx.db.prepare(
      'INSERT INTO transacao (descricao, valor_centavos, data_movimento, usuario_id, categoria_id) VALUES (?, ?, ?, ?, ?)')
      .run(p.descricao, p.cents, p.data, ctx.user.id, p.categoriaId).lastInsertRowid);
    return { status: 201, body: dto(ctx.db.prepare(`${SELECT} WHERE t.id = ?`).get(id)) };
  });

  const loadOwned = (ctx) => {
    const id = intId(ctx.params.id);
    const s = scope(ctx.user);
    const row = ctx.db.prepare(`${SELECT} WHERE t.id = ? AND t.ativo = 1 AND ${s.sql}`).get(id, ...s.params);
    if (!row) throw new HttpError(404, 'nao_encontrado', 'Movimentação não encontrada.'); // 404 também para registros de outros usuários
    return row;
  };

  r.add('GET', '/api/transactions/:id', {}, (ctx) => ({ body: dto(loadOwned(ctx)) }));

  r.add('PUT', '/api/transactions/:id', {}, (ctx) => {
    const atual = loadOwned(ctx);
    const p = parsePayload(ctx.db, ctx.body);
    withActor(ctx.db, ctx.user.id, () => ctx.db.prepare(
      "UPDATE transacao SET descricao = ?, valor_centavos = ?, data_movimento = ?, categoria_id = ?, atualizado_em = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?")
      .run(p.descricao, p.cents, p.data, p.categoriaId, atual.id));
    return { body: dto(ctx.db.prepare(`${SELECT} WHERE t.id = ?`).get(atual.id)) };
  });

  // Exclusão lógica (inativar): preserva o histórico e a trilha de auditoria. Apenas Administrador e Financeiro.
  r.add('DELETE', '/api/transactions/:id', { roles: ['administrador', 'financeiro'] }, (ctx) => {
    const atual = loadOwned(ctx);
    withActor(ctx.db, ctx.user.id, () => ctx.db.prepare('UPDATE transacao SET ativo = 0 WHERE id = ?').run(atual.id));
    return { status: 204 };
  });

  r.add('GET', '/api/categories', {}, (ctx) => ({
    body: { items: ctx.db.prepare('SELECT id, nome, tipo FROM categoria ORDER BY tipo, nome').all() },
  }));
};
module.exports.scope = scope;

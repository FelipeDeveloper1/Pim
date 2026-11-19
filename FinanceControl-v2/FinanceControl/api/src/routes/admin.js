'use strict';
const { HttpError } = require('../http');
const { hashPassword } = require('../security');
const { audit } = require('../db');
const { USER_SQL, publicUser } = require('./auth');
const { isDate, isEmail, parseMoney, MAX_CENTS, toReais, validationError, intId, senhaValida, MSG_SENHA } = require('../util');

const ADMIN = { roles: ['administrador'] };
const GESTAO = { roles: ['administrador', 'financeiro'] };

module.exports = function adminRoutes(r) {
  // ---------- Usuários e perfis (RF05) ----------
  r.add('GET', '/api/perfis', ADMIN, (ctx) => ({ body: { items: ctx.db.prepare('SELECT id, nome FROM perfil ORDER BY id').all() } }));

  r.add('GET', '/api/users', ADMIN, (ctx) => ({ body: { items: ctx.db.prepare(`${USER_SQL} ORDER BY u.nome`).all().map(publicUser) } }));

  r.add('POST', '/api/users', ADMIN, async (ctx) => {
    const { nome, senha } = ctx.body; const email = String(ctx.body.email || '').trim().toLowerCase();
    const perfilId = Number(ctx.body.perfilId); const erros = {};
    if (typeof nome !== 'string' || !nome.trim() || nome.length > 120) erros.nome = 'Informe o nome (até 120 caracteres).';
    if (!isEmail(email)) erros.email = 'Informe um e-mail válido.';
    if (!senhaValida(senha)) erros.senha = MSG_SENHA;
    if (!ctx.db.prepare('SELECT 1 FROM perfil WHERE id = ?').get(perfilId)) erros.perfilId = 'Perfil inexistente.';
    if (Object.keys(erros).length) throw validationError(erros);
    if (ctx.db.prepare('SELECT 1 FROM usuario WHERE email = ?').get(email)) throw new HttpError(409, 'email_em_uso', 'Este e-mail já está cadastrado.');
    const id = Number(ctx.db.prepare('INSERT INTO usuario (nome, email, hash_senha, perfil_id) VALUES (?, ?, ?, ?)').run(nome.trim(), email, await hashPassword(senha), perfilId).lastInsertRowid);
    audit(ctx.db, { usuarioId: ctx.user.id, acao: 'usuario.criado', entidade: 'usuario', entidadeId: id, ip: ctx.ip, detalhe: { perfilId } });
    return { status: 201, body: { usuario: publicUser(ctx.db.prepare(`${USER_SQL} WHERE u.id = ?`).get(id)) } };
  });

  r.add('PUT', '/api/users/:id', ADMIN, async (ctx) => {
    const id = intId(ctx.params.id);
    const atual = ctx.db.prepare(`${USER_SQL} WHERE u.id = ?`).get(id);
    if (!atual) throw new HttpError(404, 'nao_encontrado', 'Usuário não encontrado.');
    const nome = ctx.body.nome === undefined ? atual.nome : String(ctx.body.nome).trim();
    const perfilId = ctx.body.perfilId === undefined ? atual.perfil_id : Number(ctx.body.perfilId);
    const ativo = ctx.body.ativo === undefined ? !!atual.ativo : ctx.body.ativo === true;
    const erros = {};
    if (!nome || nome.length > 120) erros.nome = 'Informe o nome (até 120 caracteres).';
    const perfil = ctx.db.prepare('SELECT nome FROM perfil WHERE id = ?').get(perfilId);
    if (!perfil) erros.perfilId = 'Perfil inexistente.';
    if (ctx.body.senha !== undefined && !senhaValida(ctx.body.senha)) erros.senha = MSG_SENHA;
    if (Object.keys(erros).length) throw validationError(erros);
    if (id === ctx.user.id && (!ativo || perfil.nome !== 'Administrador')) {
      throw new HttpError(409, 'auto_bloqueio', 'Você não pode desativar nem rebaixar o próprio acesso de administrador.');
    }
    const hash = ctx.body.senha !== undefined ? await hashPassword(ctx.body.senha) : atual.hash_senha;
    ctx.db.prepare('UPDATE usuario SET nome = ?, perfil_id = ?, ativo = ?, hash_senha = ? WHERE id = ?').run(nome, perfilId, ativo ? 1 : 0, hash, id);
    audit(ctx.db, { usuarioId: ctx.user.id, acao: 'usuario.atualizado', entidade: 'usuario', entidadeId: id, ip: ctx.ip,
      detalhe: { perfilId, ativo, senhaAlterada: ctx.body.senha !== undefined } });
    return { body: { usuario: publicUser(ctx.db.prepare(`${USER_SQL} WHERE u.id = ?`).get(id)) } };
  });

  // ---------- Auditoria (RNF04) ----------
  r.add('GET', '/api/auditoria', ADMIN, (ctx) => {
    const limit = Math.min(Math.max(parseInt(ctx.query.limit, 10) || 100, 1), 500);
    const rows = ctx.db.prepare(`SELECT a.id, a.acao, a.entidade, a.entidade_id, a.detalhe, a.ip, a.criado_em, u.nome AS usuario_nome
      FROM auditoria a LEFT JOIN usuario u ON u.id = a.usuario_id ORDER BY a.id DESC LIMIT ?`).all(limit);
    return { body: { items: rows.map((a) => ({ id: a.id, acao: a.acao, entidade: a.entidade, entidadeId: a.entidade_id, usuario: a.usuario_nome, ip: a.ip, em: a.criado_em, detalhe: a.detalhe ? JSON.parse(a.detalhe) : null })) } };
  });

  // ---------- Categorias ----------
  r.add('POST', '/api/categories', GESTAO, (ctx) => {
    const nome = String(ctx.body.nome || '').trim(); const tipo = ctx.body.tipo; const erros = {};
    if (!nome || nome.length > 80) erros.nome = 'Informe o nome (até 80 caracteres).';
    if (!['receita', 'despesa', 'investimento'].includes(tipo)) erros.tipo = 'Tipo deve ser receita, despesa ou investimento.';
    if (Object.keys(erros).length) throw validationError(erros);
    if (ctx.db.prepare('SELECT 1 FROM categoria WHERE nome = ? AND tipo = ?').get(nome, tipo)) throw new HttpError(409, 'categoria_existente', 'Já existe uma categoria com esse nome e tipo.');
    const id = Number(ctx.db.prepare('INSERT INTO categoria (nome, tipo) VALUES (?, ?)').run(nome, tipo).lastInsertRowid);
    audit(ctx.db, { usuarioId: ctx.user.id, acao: 'categoria.criada', entidade: 'categoria', entidadeId: id, ip: ctx.ip });
    return { status: 201, body: { id, nome, tipo } };
  });

  // ---------- Funcionários (módulo do protótipo anterior) ----------
  const funcDto = (f) => ({ id: f.id, nome: f.nome, cargo: f.cargo, salario: toReais(f.salario_centavos), dataAdmissao: f.data_admissao, ativo: !!f.ativo });
  const parseFunc = (b) => {
    const erros = {}; const nome = String(b.nome || '').trim(); const cargo = b.cargo ? String(b.cargo).trim() : null; const sal = parseMoney(b.salario);
    if (!nome || nome.length > 120) erros.nome = 'Informe o nome (até 120 caracteres).';
    if (cargo && cargo.length > 80) erros.cargo = 'Cargo com até 80 caracteres.';
    if (sal === null || sal < 0 || sal > MAX_CENTS) erros.salario = 'Informe um salário válido (≥ 0, até 2 casas decimais).';
    if (!isDate(b.dataAdmissao)) erros.dataAdmissao = 'Informe a data (AAAA-MM-DD).';
    if (Object.keys(erros).length) throw validationError(erros);
    return { nome, cargo, sal, data: b.dataAdmissao, ativo: b.ativo === false ? 0 : 1 };
  };
  r.add('GET', '/api/funcionarios', GESTAO, (ctx) => ({ body: { items: ctx.db.prepare('SELECT * FROM funcionario ORDER BY nome').all().map(funcDto) } }));
  r.add('POST', '/api/funcionarios', GESTAO, (ctx) => {
    const p = parseFunc(ctx.body);
    const id = Number(ctx.db.prepare('INSERT INTO funcionario (nome, cargo, salario_centavos, data_admissao, ativo) VALUES (?, ?, ?, ?, ?)').run(p.nome, p.cargo, p.sal, p.data, p.ativo).lastInsertRowid);
    audit(ctx.db, { usuarioId: ctx.user.id, acao: 'funcionario.criado', entidade: 'funcionario', entidadeId: id, ip: ctx.ip });
    return { status: 201, body: funcDto(ctx.db.prepare('SELECT * FROM funcionario WHERE id = ?').get(id)) };
  });
  r.add('PUT', '/api/funcionarios/:id', GESTAO, (ctx) => {
    const id = intId(ctx.params.id); const p = parseFunc(ctx.body);
    if (!ctx.db.prepare('SELECT 1 FROM funcionario WHERE id = ?').get(id)) throw new HttpError(404, 'nao_encontrado', 'Funcionário não encontrado.');
    ctx.db.prepare('UPDATE funcionario SET nome = ?, cargo = ?, salario_centavos = ?, data_admissao = ?, ativo = ? WHERE id = ?').run(p.nome, p.cargo, p.sal, p.data, p.ativo, id);
    audit(ctx.db, { usuarioId: ctx.user.id, acao: 'funcionario.atualizado', entidade: 'funcionario', entidadeId: id, ip: ctx.ip });
    return { body: funcDto(ctx.db.prepare('SELECT * FROM funcionario WHERE id = ?').get(id)) };
  });
  r.add('DELETE', '/api/funcionarios/:id', GESTAO, (ctx) => {
    const id = intId(ctx.params.id);
    if (!ctx.db.prepare('DELETE FROM funcionario WHERE id = ?').run(id).changes) throw new HttpError(404, 'nao_encontrado', 'Funcionário não encontrado.');
    audit(ctx.db, { usuarioId: ctx.user.id, acao: 'funcionario.excluido', entidade: 'funcionario', entidadeId: id, ip: ctx.ip });
    return { status: 204 };
  });

  // ---------- Metas ----------
  const metaDto = (m) => ({ id: m.id, nome: m.nome, valorObjetivo: toReais(m.valor_objetivo_centavos), valorAtual: toReais(m.valor_atual_centavos),
    dataLimite: m.data_limite, funcionarioId: m.funcionario_id, funcionarioNome: m.funcionario_nome ?? null,
    progresso: Math.min(100, Math.round((m.valor_atual_centavos / m.valor_objetivo_centavos) * 100)) });
  const META_SQL = 'SELECT m.*, f.nome AS funcionario_nome FROM meta m LEFT JOIN funcionario f ON f.id = m.funcionario_id';
  const parseMeta = (db, b) => {
    const erros = {}; const nome = String(b.nome || '').trim(); const obj = parseMoney(b.valorObjetivo); const atual = parseMoney(b.valorAtual ?? 0);
    const funcId = b.funcionarioId ? Number(b.funcionarioId) : null;
    if (!nome || nome.length > 120) erros.nome = 'Informe o nome (até 120 caracteres).';
    if (obj === null || obj <= 0 || obj > MAX_CENTS) erros.valorObjetivo = 'Informe um valor objetivo positivo.';
    if (atual === null || atual < 0 || atual > MAX_CENTS) erros.valorAtual = 'Informe um valor atual válido (≥ 0).';
    if (!isDate(b.dataLimite)) erros.dataLimite = 'Informe a data (AAAA-MM-DD).';
    if (funcId !== null && !db.prepare('SELECT 1 FROM funcionario WHERE id = ?').get(funcId)) erros.funcionarioId = 'Funcionário inexistente.';
    if (Object.keys(erros).length) throw validationError(erros);
    return { nome, obj, atual, data: b.dataLimite, funcId };
  };
  r.add('GET', '/api/metas', GESTAO, (ctx) => ({ body: { items: ctx.db.prepare(`${META_SQL} ORDER BY m.data_limite`).all().map(metaDto) } }));
  r.add('POST', '/api/metas', GESTAO, (ctx) => {
    const p = parseMeta(ctx.db, ctx.body);
    const id = Number(ctx.db.prepare('INSERT INTO meta (nome, valor_objetivo_centavos, valor_atual_centavos, data_limite, funcionario_id) VALUES (?, ?, ?, ?, ?)').run(p.nome, p.obj, p.atual, p.data, p.funcId).lastInsertRowid);
    audit(ctx.db, { usuarioId: ctx.user.id, acao: 'meta.criada', entidade: 'meta', entidadeId: id, ip: ctx.ip });
    return { status: 201, body: metaDto(ctx.db.prepare(`${META_SQL} WHERE m.id = ?`).get(id)) };
  });
  r.add('PUT', '/api/metas/:id', GESTAO, (ctx) => {
    const id = intId(ctx.params.id); const p = parseMeta(ctx.db, ctx.body);
    if (!ctx.db.prepare('SELECT 1 FROM meta WHERE id = ?').get(id)) throw new HttpError(404, 'nao_encontrado', 'Meta não encontrada.');
    ctx.db.prepare('UPDATE meta SET nome = ?, valor_objetivo_centavos = ?, valor_atual_centavos = ?, data_limite = ?, funcionario_id = ? WHERE id = ?').run(p.nome, p.obj, p.atual, p.data, p.funcId, id);
    audit(ctx.db, { usuarioId: ctx.user.id, acao: 'meta.atualizada', entidade: 'meta', entidadeId: id, ip: ctx.ip });
    return { body: metaDto(ctx.db.prepare(`${META_SQL} WHERE m.id = ?`).get(id)) };
  });
  r.add('DELETE', '/api/metas/:id', GESTAO, (ctx) => {
    const id = intId(ctx.params.id);
    if (!ctx.db.prepare('DELETE FROM meta WHERE id = ?').run(id).changes) throw new HttpError(404, 'nao_encontrado', 'Meta não encontrada.');
    audit(ctx.db, { usuarioId: ctx.user.id, acao: 'meta.excluida', entidade: 'meta', entidadeId: id, ip: ctx.ip });
    return { status: 204 };
  });
};

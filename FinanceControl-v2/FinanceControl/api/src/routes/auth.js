'use strict';
const { HttpError } = require('../http');
const { hashPassword, verifyPassword, dummyVerify, signJwt } = require('../security');
const { audit } = require('../db');
const { isEmail, senhaValida, MSG_SENHA, validationError } = require('../util');

const USER_SQL = `SELECT u.id, u.nome, u.email, u.hash_senha, u.ativo, u.criado_em, p.id AS perfil_id, p.nome AS perfil_nome
                  FROM usuario u JOIN perfil p ON p.id = u.perfil_id`;

const publicUser = (u) => ({ id: u.id, nome: u.nome, email: u.email, perfil: u.perfil_nome.toLowerCase(), perfilId: u.perfil_id, ativo: !!u.ativo, criadoEm: u.criado_em });

function tooMany(seconds) {
  const e = new HttpError(429, 'muitas_tentativas', `Muitas tentativas. Tente novamente em ${Math.ceil(seconds / 60)} minuto(s).`);
  e.headers = { 'Retry-After': String(seconds) };
  return e;
}

module.exports = function authRoutes(r) {
  r.add('POST', '/api/auth/login', { auth: false }, async (ctx) => {
    const email = String(ctx.body.email || '').trim().toLowerCase();
    const senha = typeof ctx.body.senha === 'string' ? ctx.body.senha : '';
    if (!email || !senha || email.length > 160 || senha.length > 128) throw new HttpError(400, 'campos_obrigatorios', 'Informe e-mail e senha.');
    const key = `${ctx.ip}|${email}`;
    const wait = ctx.loginLimiter.blockedFor(key);
    if (wait) throw tooMany(wait);

    const u = ctx.db.prepare(`${USER_SQL} WHERE u.email = ?`).get(email);
    let ok = false;
    if (u) ok = (await verifyPassword(senha, u.hash_senha)) && !!u.ativo; else await dummyVerify(senha);

    if (!ok) {
      const bloqueou = ctx.loginLimiter.fail(key);
      audit(ctx.db, { usuarioId: u?.id ?? null, acao: bloqueou ? 'auth.bloqueio' : 'auth.login_falha', ip: ctx.ip, detalhe: { email } });
      throw new HttpError(401, 'credenciais_invalidas', 'E-mail ou senha incorretos.');
    }
    ctx.loginLimiter.reset(key);
    const { token, exp } = signJwt({ sub: u.id }, ctx.cfg.jwtSecret, ctx.cfg.tokenTtlSeconds);
    audit(ctx.db, { usuarioId: u.id, acao: 'auth.login', ip: ctx.ip });
    return { body: { token, expiraEm: new Date(exp * 1000).toISOString(), usuario: publicUser(u) } };
  });

  r.add('POST', '/api/auth/register', { auth: false }, async (ctx) => {
    if (!ctx.cfg.allowRegistration) throw new HttpError(403, 'cadastro_desabilitado', 'O cadastro público está desabilitado. Peça a um administrador.');
    const wait = ctx.registerLimiter.blockedFor(ctx.ip);
    if (wait) throw tooMany(wait);
    ctx.registerLimiter.fail(ctx.ip);

    const nome = String(ctx.body.nome || '').trim();
    const email = String(ctx.body.email || '').trim().toLowerCase();
    const senha = ctx.body.senha;
    const erros = {};
    if (!nome || nome.length > 120) erros.nome = 'Informe o nome (até 120 caracteres).';
    if (!isEmail(email)) erros.email = 'Informe um e-mail válido.';
    if (!senhaValida(senha)) erros.senha = MSG_SENHA;
    if (Object.keys(erros).length) throw validationError(erros);
    if (ctx.db.prepare('SELECT 1 FROM usuario WHERE email = ?').get(email)) throw new HttpError(409, 'email_em_uso', 'Este e-mail já está cadastrado.');

    const perfilId = ctx.db.prepare("SELECT id FROM perfil WHERE nome = 'Operador'").get().id; // cadastro público sempre entra como Operador
    const id = ctx.db.prepare('INSERT INTO usuario (nome, email, hash_senha, perfil_id) VALUES (?, ?, ?, ?)')
      .run(nome, email, await hashPassword(senha), perfilId).lastInsertRowid;
    audit(ctx.db, { usuarioId: Number(id), acao: 'usuario.criado', entidade: 'usuario', entidadeId: Number(id), ip: ctx.ip, detalhe: { origem: 'cadastro' } });
    return { status: 201, body: { usuario: publicUser(ctx.db.prepare(`${USER_SQL} WHERE u.id = ?`).get(id)) } };
  });

  r.add('POST', '/api/auth/logout', {}, (ctx) => {
    audit(ctx.db, { usuarioId: ctx.user.id, acao: 'auth.logout', ip: ctx.ip });
    return { status: 204 };
  });

  r.add('GET', '/api/me', {}, (ctx) => ({ body: { usuario: ctx.user } }));
};
module.exports.USER_SQL = USER_SQL;
module.exports.publicUser = publicUser;

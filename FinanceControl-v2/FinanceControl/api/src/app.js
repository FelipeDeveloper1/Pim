'use strict';
const http = require('node:http');
const path = require('node:path');
const { getConfig } = require('./config');
const { openDb, audit } = require('./db');
const { seedBase, seedDemo } = require('./seed');
const { HttpError, Router, sendJson, sendError, readJson, serveFile } = require('./http');
const { verifyJwt, AttemptLimiter } = require('./security');
const { USER_SQL } = require('./routes/auth');

const VERSION = require('../../package.json').version;

function buildRouter() {
  const r = new Router();
  r.add('GET', '/api/health', { auth: false }, () => ({ body: { status: 'ok', versao: VERSION } }));
  require('./routes/auth')(r);
  require('./routes/transactions')(r);
  require('./routes/dashboard')(r);
  require('./routes/admin')(r);
  return r;
}

function securityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  // HTTPS fica a cargo do proxy/nuvem; quando a requisição chega por ele, instruímos o navegador a manter HTTPS.
  if (req.headers['x-forwarded-proto'] === 'https') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

async function createApp(overrides = {}) {
  const cfg = getConfig(overrides);
  const db = openDb(cfg);
  await seedBase(db, cfg);
  if (cfg.seedDemo) await seedDemo(db, cfg);

  const router = buildRouter();
  const loginLimiter = new AttemptLimiter(cfg.loginMaxAttempts, cfg.loginWindowMs);
  const registerLimiter = new AttemptLimiter(10, cfg.loginWindowMs);
  const roots = { web: path.join(cfg.root, 'web'), mobile: path.join(cfg.root, 'mobile'), shared: path.join(cfg.root, 'shared') };

  const clientIp = (req) => (cfg.trustProxy && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress) || '';

  function authenticate(ctx) {
    const h = ctx.req.headers.authorization || '';
    const payload = h.startsWith('Bearer ') ? verifyJwt(h.slice(7), cfg.jwtSecret) : null;
    const row = payload && db.prepare(`${USER_SQL} WHERE u.id = ?`).get(payload.sub);
    if (!row || !row.ativo) {
      const e = new HttpError(401, 'nao_autenticado', 'Sessão inválida ou expirada. Faça login novamente.');
      e.headers = { 'WWW-Authenticate': 'Bearer' };
      throw e;
    }
    // Perfil e status vêm sempre do banco: mudar o perfil/desativar um usuário vale imediatamente.
    return { id: row.id, nome: row.nome, email: row.email, perfil: row.perfil_nome.toLowerCase() };
  }

  async function handleApi(req, res, url) {
    const { route, params, pathMatched } = router.match(req.method, url.pathname);
    if (!route) throw new HttpError(pathMatched ? 405 : 404, pathMatched ? 'metodo_nao_permitido' : 'nao_encontrado', pathMatched ? 'Método não permitido.' : 'Recurso não encontrado.');
    const ctx = { req, res, db, cfg, params, query: Object.fromEntries(url.searchParams), ip: clientIp(req), body: {}, user: null, loginLimiter, registerLimiter };
    if (route.opts.auth !== false) {
      ctx.user = authenticate(ctx);
      if (route.opts.roles && !route.opts.roles.includes(ctx.user.perfil)) {
        audit(db, { usuarioId: ctx.user.id, acao: 'acesso.negado', ip: ctx.ip, detalhe: { rota: `${req.method} ${url.pathname}` } });
        throw new HttpError(403, 'acesso_negado', 'Seu perfil não tem permissão para esta operação.');
      }
    }
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) ctx.body = await readJson(req);
    const out = (await route.handler(ctx)) || {};
    if (out.raw !== undefined) {
      res.writeHead(out.status || 200, { 'Content-Type': out.contentType, 'Cache-Control': 'no-store', ...out.headers });
      res.end(out.raw);
    } else sendJson(res, out.status || 200, out.body, out.headers);
  }

  function handleStatic(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'metodo_nao_permitido', 'Método não permitido.');
    const p = url.pathname;
    const hit = (root, rel) => serveFile(root, rel, req, res);
    let ok;
    if (p === '/mobile') { res.writeHead(301, { Location: '/mobile/' }); res.end(); return; }
    if (p.startsWith('/mobile/')) ok = hit(roots.mobile, p.slice('/mobile'.length));
    else if (p.startsWith('/shared/')) ok = hit(roots.shared, p.slice('/shared'.length));
    else ok = hit(roots.web, p);
    if (!ok) throw new HttpError(404, 'nao_encontrado', 'Página não encontrada.');
  }

  const server = http.createServer(async (req, res) => {
    const t0 = Date.now();
    securityHeaders(req, res);
    const url = new URL(req.url, 'http://localhost');
    if (!cfg.quiet) res.on('finish', () => console.log(`${new Date().toISOString()} ${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - t0}ms`)); // sem query string nem corpo: não registra dados financeiros
    try {
      if (url.pathname.startsWith('/api/')) await handleApi(req, res, url); else handleStatic(req, res, url);
    } catch (err) { sendError(res, err, cfg.quiet); }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;

  return { server, db, cfg, close: () => new Promise((resolve) => { server.close(() => { db.close(); resolve(); }); }) };
}

module.exports = { createApp };

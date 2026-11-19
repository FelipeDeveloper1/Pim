'use strict';
const fs = require('node:fs');
const path = require('node:path');

class HttpError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
}

function sendJson(res, status, body, headers = {}) {
  const payload = body === undefined || body === null ? '' : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(payload);
}

// Erros inesperados nunca vazam SQL, caminhos ou stack trace para o cliente (seção 3.4.3).
function sendError(res, err, quiet) {
  if (res.headersSent) { res.end(); return; }
  if (err instanceof HttpError) {
    const headers = err.headers || {};
    return sendJson(res, err.status, { erro: { codigo: err.code, mensagem: err.message, detalhes: err.details } }, headers);
  }
  if (!quiet) console.error('[erro]', err);
  sendJson(res, 500, { erro: { codigo: 'erro_interno', mensagem: 'Erro interno. Tente novamente mais tarde.' } });
}

function readJson(req, limit = 100 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0, tooBig = false;
    req.on('data', (c) => { size += c.length; if (size > limit) tooBig = true; else chunks.push(c); });
    req.on('error', reject);
    req.on('end', () => {
      if (tooBig) return reject(new HttpError(413, 'corpo_grande', 'Corpo da requisição muito grande.'));
      if (!chunks.length) return resolve({});
      if (!(req.headers['content-type'] || '').includes('application/json')) {
        return reject(new HttpError(415, 'tipo_invalido', 'Envie o corpo como application/json.'));
      }
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error('forma');
        resolve(v);
      } catch { reject(new HttpError(400, 'json_invalido', 'JSON inválido.')); }
    });
  });
}

class Router {
  constructor() { this.routes = []; }
  add(method, pattern, opts, handler) {
    const keys = [];
    const regex = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    this.routes.push({ method, regex, keys, opts, handler });
  }
  match(method, pathname) {
    let pathMatched = false;
    for (const route of this.routes) {
      const m = route.regex.exec(pathname);
      if (!m) continue;
      if (route.method !== method) { pathMatched = true; continue; }
      const params = {};
      route.keys.forEach((k, i) => { try { params[k] = decodeURIComponent(m[i + 1]); } catch { params[k] = ''; } });
      return { route, params };
    }
    return { pathMatched };
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

/** Serve um arquivo de `root`, bloqueando path traversal. Devolve false se não existir. */
function serveFile(root, rel, req, res) {
  let decoded;
  try { decoded = decodeURIComponent(rel); } catch { return false; }
  if (decoded.includes('\0')) return false;
  let full = path.join(root, path.normalize('/' + decoded));
  if (!full.startsWith(root + path.sep) && full !== root) return false;
  let st;
  try { st = fs.statSync(full); if (st.isDirectory()) { full = path.join(full, 'index.html'); st = fs.statSync(full); } } catch { return false; }
  const ext = path.extname(full).toLowerCase();
  const type = MIME[ext];
  if (!type) return false;
  const noCache = ext === '.html' || full.endsWith('sw.js');
  res.writeHead(200, {
    'Content-Type': type, 'Content-Length': st.size,
    'Cache-Control': noCache ? 'no-cache' : 'public, max-age=3600',
  });
  if (req.method === 'HEAD') { res.end(); return true; }
  fs.createReadStream(full).pipe(res);
  return true;
}

module.exports = { HttpError, sendJson, sendError, readJson, Router, serveFile };

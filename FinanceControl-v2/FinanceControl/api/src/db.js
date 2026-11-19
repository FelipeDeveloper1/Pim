'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function openDb(cfg) {
  if (cfg.dbPath !== ':memory:') fs.mkdirSync(path.dirname(cfg.dbPath), { recursive: true });
  const db = new DatabaseSync(cfg.dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (cfg.dbPath !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(fs.readFileSync(path.join(cfg.root, 'db', 'schema.sql'), 'utf8'));
  return db;
}

/** Executa várias escritas de forma atômica. */
function transaction(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

/** Informa à trigger de auditoria quem está gravando (síncrono: sem risco de intercalar requisições). */
function withActor(db, userId, fn) {
  db.prepare('UPDATE app_contexto SET usuario_id = ? WHERE id = 1').run(userId);
  try { return fn(); } finally { db.prepare('UPDATE app_contexto SET usuario_id = NULL WHERE id = 1').run(); }
}

function audit(db, { usuarioId = null, acao, entidade = null, entidadeId = null, detalhe = null, ip = null }) {
  db.prepare('INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, detalhe, ip) VALUES (?, ?, ?, ?, ?, ?)')
    .run(usuarioId, acao, entidade, entidadeId, detalhe ? JSON.stringify(detalhe) : null, ip);
}

module.exports = { openDb, transaction, withActor, audit };

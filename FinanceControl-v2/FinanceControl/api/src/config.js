'use strict';
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');

// O segredo do JWT nunca fica no repositório: vem do ambiente ou é gerado em data/.jwt-secret (ignorado pelo Git).
function loadSecret(dataDir, production) {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (production) throw new Error('JWT_SECRET é obrigatório em produção.');
  const file = path.join(dataDir, '.jwt-secret');
  try { return fs.readFileSync(file, 'utf8').trim(); } catch { /* gera abaixo */ }
  fs.mkdirSync(dataDir, { recursive: true });
  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

function getConfig(overrides = {}) {
  const production = process.env.NODE_ENV === 'production';
  const dataDir = overrides.dataDir || process.env.DATA_DIR || path.join(ROOT, 'data');
  if (production && !process.env.ADMIN_PASSWORD && !overrides.adminPassword) {
    throw new Error('ADMIN_PASSWORD é obrigatório em produção.');
  }
  return {
    root: ROOT,
    production,
    port: Number(process.env.PORT || 3000),
    dataDir,
    dbPath: overrides.dbPath || process.env.DB_PATH || path.join(dataDir, 'financecontrol.db'),
    jwtSecret: overrides.jwtSecret ?? loadSecret(dataDir, production),
    tokenTtlSeconds: 8 * 3600,
    adminName: process.env.ADMIN_NAME || 'Administrador',
    adminEmail: overrides.adminEmail || process.env.ADMIN_EMAIL || 'admin@financecontrol.local',
    adminPassword: overrides.adminPassword || process.env.ADMIN_PASSWORD || 'Admin@123',
    allowRegistration: overrides.allowRegistration ?? (process.env.ALLOW_REGISTRATION !== 'false'),
    seedDemo: overrides.seedDemo ?? (process.env.SEED_DEMO === '1'),
    trustProxy: process.env.TRUST_PROXY === 'true',
    loginMaxAttempts: 5,
    loginWindowMs: 15 * 60 * 1000,
    quiet: overrides.quiet ?? false,
  };
}

module.exports = { getConfig, ROOT };

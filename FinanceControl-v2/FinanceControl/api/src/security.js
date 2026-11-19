'use strict';
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);

// ---- Hash de senha (scrypt + salt aleatório). Nunca armazenamos a senha em texto puro. ----
const N = 16384, R = 8, P = 1, KEYLEN = 64;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function verifyPassword(password, stored) {
  const [alg, n, r, p, saltB64, keyB64] = String(stored).split('$');
  if (alg !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, { N: +n, r: +r, p: +p });
  return crypto.timingSafeEqual(expected, actual);
}

// Hash "falso" usado para gastar o mesmo tempo quando o e-mail não existe (evita enumerar usuários pelo tempo de resposta).
let dummyHash;
async function dummyVerify(password) {
  dummyHash ??= await hashPassword('senha-inexistente');
  await verifyPassword(password, dummyHash);
}

// ---- JWT HS256 com expiração ----
function signJwt(payload, secret, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return { token: `${head}.${body}.${sig}`, exp: now + ttlSeconds };
}

function verifyJwt(token, secret) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  try {
    if (JSON.parse(Buffer.from(head, 'base64url')).alg !== 'HS256') return null;
    const expected = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest();
    const got = Buffer.from(sig, 'base64url');
    if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url'));
    if (!payload.exp || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

// ---- Limite de tentativas (login e cadastro) ----
class AttemptLimiter {
  constructor(max, windowMs) { this.max = max; this.windowMs = windowMs; this.map = new Map(); }
  /** segundos restantes de bloqueio (0 = liberado) */
  blockedFor(key) {
    const e = this.map.get(key);
    if (!e) return 0;
    if (Date.now() - e.first > this.windowMs) { this.map.delete(key); return 0; }
    return e.count >= this.max ? Math.ceil((e.first + this.windowMs - Date.now()) / 1000) : 0;
  }
  /** registra falha; devolve true quando atingiu o limite agora */
  fail(key) {
    if (this.map.size > 10000) this.map.clear();
    const e = this.map.get(key);
    if (!e || Date.now() - e.first > this.windowMs) { this.map.set(key, { first: Date.now(), count: 1 }); return this.max <= 1; }
    e.count += 1;
    return e.count === this.max;
  }
  reset(key) { this.map.delete(key); }
}

module.exports = { hashPassword, verifyPassword, dummyVerify, signJwt, verifyJwt, AttemptLimiter };

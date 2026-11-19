'use strict';
const { HttpError } = require('./http');

const isDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const isMonth = (s) => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
const isEmail = (s) => typeof s === 'string' && s.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function monthRange(m) {
  const [y, mo] = m.split('-').map(Number);
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return { inicio: `${m}-01`, fim: `${m}-${String(last).padStart(2, '0')}` };
}
function addMonths(m, n) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1 + n, 1)).toISOString().slice(0, 7);
}
const currentMonth = () => new Date().toISOString().slice(0, 7);

/** Converte "12,50" / 12.5 para centavos; devolve null se inválido (mais de 2 casas, NaN...). */
function parseMoney(v) {
  if (typeof v === 'string' && /^\d+([.,]\d{1,2})?$/.test(v.trim())) v = Number(v.trim().replace(',', '.'));
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const cents = Math.round(v * 100);
  return Math.abs(v * 100 - cents) < 1e-6 ? cents : null;
}
const MAX_CENTS = 99_999_999_999; // R$ 999.999.999,99
const toReais = (cents) => Math.round(cents) / 100;

function validationError(details) {
  return new HttpError(422, 'validacao', 'Dados inválidos. Verifique os campos informados.', details);
}

function intId(value, nome = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'parametro_invalido', `Parâmetro "${nome}" inválido.`);
  return n;
}

/** Política de senha: mínimo 8 caracteres, com letra e número. */
function senhaValida(s) {
  return typeof s === 'string' && s.length >= 8 && s.length <= 128 && /[A-Za-z]/.test(s) && /\d/.test(s);
}
const MSG_SENHA = 'A senha deve ter de 8 a 128 caracteres, com ao menos uma letra e um número.';

module.exports = { isDate, isMonth, isEmail, monthRange, addMonths, currentMonth, parseMoney, MAX_CENTS, toReais, validationError, intId, senhaValida, MSG_SENHA };

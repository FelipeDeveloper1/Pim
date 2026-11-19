'use strict';
const { hashPassword } = require('./security');
const { transaction, withActor } = require('./db');
const { addMonths, currentMonth } = require('./util');

const PERFIS = ['Administrador', 'Financeiro', 'Operador'];
const CATEGORIAS = [
  ['Vendas', 'receita'], ['Serviços', 'receita'], ['Outras receitas', 'receita'],
  ['Operacionais', 'despesa'], ['Administrativas', 'despesa'], ['Comerciais', 'despesa'], ['Impostos e taxas', 'despesa'],
  ['Renda fixa', 'investimento'], ['Ações', 'investimento'], ['Reserva de emergência', 'investimento'],
];

async function seedBase(db, cfg) {
  const hash = await hashPassword(cfg.adminPassword);
  transaction(db, () => {
    for (const p of PERFIS) db.prepare('INSERT OR IGNORE INTO perfil (nome) VALUES (?)').run(p);
    for (const [n, t] of CATEGORIAS) db.prepare('INSERT OR IGNORE INTO categoria (nome, tipo) VALUES (?, ?)').run(n, t);
    const adm = db.prepare("SELECT id FROM perfil WHERE nome = 'Administrador'").get().id;
    const existe = db.prepare('SELECT COUNT(*) AS n FROM usuario').get().n;
    if (!existe) {
      db.prepare('INSERT INTO usuario (nome, email, hash_senha, perfil_id) VALUES (?, ?, ?, ?)').run(cfg.adminName, cfg.adminEmail, hash, adm);
    }
  });
}

// Dados de demonstração: o mês atual reproduz os números da documentação
// (receita R$ 8.350, despesas R$ 3.180, investimentos R$ 2.420 → saldo R$ 5.170).
async function seedDemo(db, cfg) {
  if (db.prepare('SELECT COUNT(*) AS n FROM transacao').get().n > 0) return;
  const senha = 'Demo@1234';
  const hash = await hashPassword(senha);
  const perfil = (n) => db.prepare('SELECT id FROM perfil WHERE nome = ?').get(n).id;
  const cat = (n) => db.prepare('SELECT id FROM categoria WHERE nome = ?').get(n).id;
  transaction(db, () => {
    for (const [nome, email, p] of [['Fernanda Financeiro', 'financeiro@financecontrol.local', 'Financeiro'], ['Otávio Operador', 'operador@financecontrol.local', 'Operador']]) {
      db.prepare('INSERT OR IGNORE INTO usuario (nome, email, hash_senha, perfil_id) VALUES (?, ?, ?, ?)').run(nome, email, hash, perfil(p));
    }
    const admin = db.prepare('SELECT id FROM usuario WHERE email = ?').get(cfg.adminEmail).id;
    const oper = db.prepare("SELECT id FROM usuario WHERE email = 'operador@financecontrol.local'").get().id;
    // [descrição, categoria, valor em centavos (mês atual), dia, usuário]
    const base = [
      ['Vendas do mês', 'Vendas', 600000, 5, admin], ['Contratos de serviço', 'Serviços', 235000, 10, admin],
      ['Aluguel e energia', 'Operacionais', 152640, 6, oper], ['Folha administrativa', 'Administrativas', 104940, 12, admin],
      ['Campanha de marketing', 'Comerciais', 60420, 18, oper],
      ['Aplicação CDB', 'Renda fixa', 150000, 20, admin], ['Carteira de ações', 'Ações', 92000, 22, admin],
    ];
    const fator = [1, 0.94, 0.9, 0.97, 0.88, 0.85];
    const mes = currentMonth();
    fator.forEach((f, k) => {
      const m = addMonths(mes, -k);
      for (const [desc, c, cents, dia, u] of base) {
        withActor(db, u, () => db.prepare('INSERT INTO transacao (descricao, valor_centavos, data_movimento, usuario_id, categoria_id) VALUES (?, ?, ?, ?, ?)')
          .run(desc, Math.round(cents * f), `${m}-${String(dia).padStart(2, '0')}`, u, cat(c)));
      }
    });
    const f1 = db.prepare('INSERT INTO funcionario (nome, cargo, salario_centavos, data_admissao) VALUES (?, ?, ?, ?)');
    const maria = f1.run('Maria Silva', 'Analista', 450000, '2024-03-01').lastInsertRowid;
    f1.run('João Pereira', 'Assistente administrativo', 320000, '2025-01-15');
    const m1 = db.prepare('INSERT INTO meta (nome, valor_objetivo_centavos, valor_atual_centavos, data_limite, funcionario_id) VALUES (?, ?, ?, ?, ?)');
    m1.run('Reserva de emergência', 1000000, 250000, `${new Date().getUTCFullYear() + 1}-06-30`, maria);
    m1.run('Reduzir despesas operacionais', 200000, 80000, `${new Date().getUTCFullYear() + 1}-03-31`, null);
  });
}

module.exports = { seedBase, seedDemo };

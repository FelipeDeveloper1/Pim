'use strict';
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { hashPassword, verifyPassword, signJwt, verifyJwt } = require('../src/security');

let app, base;
const tokens = {};
const call = async (method, path, { token, body, headers } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* csv/html */ }
  return { status: res.status, json, text, headers: res.headers };
};
const login = async (email, senha) => (await call('POST', '/api/auth/login', { body: { email, senha } }));

before(async () => {
  app = await createApp({ dbPath: ':memory:', jwtSecret: 'segredo-de-teste', quiet: true, adminPassword: 'Admin@123' });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;

  tokens.admin = (await login('admin@financecontrol.local', 'Admin@123')).json.token;
  const perfis = (await call('GET', '/api/perfis', { token: tokens.admin })).json.items;
  const pid = (n) => perfis.find((p) => p.nome === n).id;
  for (const [nome, email, perfil] of [['Fin', 'fin@t.com', 'Financeiro'], ['Op Um', 'op1@t.com', 'Operador'], ['Op Dois', 'op2@t.com', 'Operador']]) {
    const r = await call('POST', '/api/users', { token: tokens.admin, body: { nome, email, senha: 'Senha123', perfilId: pid(perfil) } });
    assert.equal(r.status, 201);
  }
  tokens.fin = (await login('fin@t.com', 'Senha123')).json.token;
  tokens.op1 = (await login('op1@t.com', 'Senha123')).json.token;
  tokens.op2 = (await login('op2@t.com', 'Senha123')).json.token;
});
after(() => app.close());

const cats = async () => (await call('GET', '/api/categories', { token: tokens.admin })).json.items;
const catId = async (nome) => (await cats()).find((c) => c.nome === nome).id;

describe('Autenticação e segurança (RF01, RNF01, seção 3.4.3)', () => {
  test('login válido devolve token, perfil e expiração', async () => {
    const r = await login('admin@financecontrol.local', 'Admin@123');
    assert.equal(r.status, 200);
    assert.equal(r.json.usuario.perfil, 'administrador');
    assert.ok(r.json.token.split('.').length === 3 && r.json.expiraEm);
    assert.equal(r.json.usuario.hash_senha, undefined);
  });
  test('senha é guardada com hash scrypt (nunca em texto puro)', () => {
    const row = app.db.prepare("SELECT hash_senha FROM usuario WHERE email = 'admin@financecontrol.local'").get();
    assert.match(row.hash_senha, /^scrypt\$/);
    assert.ok(!row.hash_senha.includes('Admin@123'));
  });
  test('hash usa salt: mesma senha gera hashes diferentes, mas ambos verificam', async () => {
    const a = await hashPassword('Abc12345'), b = await hashPassword('Abc12345');
    assert.notEqual(a, b);
    assert.ok(await verifyPassword('Abc12345', a) && await verifyPassword('Abc12345', b));
    assert.ok(!(await verifyPassword('abc12345', a)));
  });
  test('credenciais erradas: 401 com mensagem genérica (não revela se o e-mail existe)', async () => {
    const r1 = await login('admin@financecontrol.local', 'errada123');
    const r2 = await login('naoexiste@x.com', 'qualquer123');
    assert.equal(r1.status, 401); assert.equal(r2.status, 401);
    assert.equal(r1.json.erro.mensagem, r2.json.erro.mensagem);
  });
  test('bloqueia após 5 tentativas erradas (429 + Retry-After) e audita', async () => {
    for (let i = 0; i < 5; i++) assert.equal((await login('fin@t.com', 'errada123')).status, 401);
    const r = await login('fin@t.com', 'Senha123'); // mesmo com a senha certa, está bloqueado
    assert.equal(r.status, 429);
    assert.ok(Number(r.headers.get('retry-after')) > 0);
    assert.ok(app.db.prepare("SELECT 1 FROM auditoria WHERE acao = 'auth.bloqueio'").get());
  });
  test('rotas protegidas exigem token válido', async () => {
    assert.equal((await call('GET', '/api/transactions')).status, 401);
    assert.equal((await call('GET', '/api/transactions', { token: 'lixo.lixo.lixo' })).status, 401);
    const adulterado = tokens.admin.slice(0, -3) + 'xxx';
    assert.equal((await call('GET', '/api/me', { token: adulterado })).status, 401);
  });
  test('token expirado é recusado; alg=none é recusado', () => {
    const { token } = signJwt({ sub: 1 }, 'segredo-de-teste', -10);
    assert.equal(verifyJwt(token, 'segredo-de-teste'), null);
    const none = Buffer.from('{"alg":"none"}').toString('base64url') + '.' + Buffer.from('{"sub":1,"exp":9999999999}').toString('base64url') + '.';
    assert.equal(verifyJwt(none, 'segredo-de-teste'), null);
  });
  test('cadastro público cria sempre perfil Operador e valida senha/e-mail', async () => {
    const ruim = await call('POST', '/api/auth/register', { body: { nome: 'X', email: 'invalido', senha: '123' } });
    assert.equal(ruim.status, 422); assert.ok(ruim.json.erro.detalhes.email && ruim.json.erro.detalhes.senha);
    const ok = await call('POST', '/api/auth/register', { body: { nome: 'Novo', email: 'novo@t.com', senha: 'Senha123', perfilId: 1, perfil: 'administrador' } });
    assert.equal(ok.status, 201); assert.equal(ok.json.usuario.perfil, 'operador');
    assert.equal((await call('POST', '/api/auth/register', { body: { nome: 'Novo', email: 'NOVO@t.com', senha: 'Senha123' } })).status, 409);
  });
  test('usuário desativado perde acesso imediatamente (mesmo com token válido)', async () => {
    const reg = await call('POST', '/api/auth/register', { body: { nome: 'Temp', email: 'temp@t.com', senha: 'Senha123' } });
    const tk = (await login('temp@t.com', 'Senha123')).json.token;
    assert.equal((await call('GET', '/api/me', { token: tk })).status, 200);
    await call('PUT', `/api/users/${reg.json.usuario.id}`, { token: tokens.admin, body: { ativo: false } });
    assert.equal((await call('GET', '/api/me', { token: tk })).status, 401);
    assert.equal((await login('temp@t.com', 'Senha123')).status, 401);
  });
  test('erros internos e SQL não vazam para o cliente', async () => {
    const r = await call('GET', "/api/transactions?categoriaId=1;DROP TABLE transacao;--", { token: tokens.admin });
    assert.equal(r.status, 422);
    assert.ok(!/sqlite|select|stack|at /i.test(r.text));
    assert.ok(app.db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'transacao'").get());
  });
  test('JSON malformado e corpo grande são rejeitados', async () => {
    const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{quebrado' });
    assert.equal(r.status, 400);
    const grande = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a', senha: 'x'.repeat(200000) }) });
    assert.equal(grande.status, 413);
  });
  test('cabeçalhos de segurança presentes', async () => {
    const r = await call('GET', '/api/health');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
  });
  test('arquivos estáticos bloqueiam path traversal', async () => {
    for (const p of ['/..%2f..%2fpackage.json', '/%2e%2e/%2e%2e/etc/passwd', '/mobile/..%2f..%2fapi/server.js', '/db/schema.sql']) {
      assert.equal((await call('GET', p)).status, 404, p);
    }
  });
});

describe('Movimentações (RF02, RF04, seção 3.7)', () => {
  let vendas, operacionais, idOp1;
  before(async () => { vendas = await catId('Vendas'); operacionais = await catId('Operacionais'); });

  test('cria receita/despesa e devolve valor em reais', async () => {
    const r = await call('POST', '/api/transactions', { token: tokens.op1, body: { descricao: 'Venda balcão', valor: 1234.56, data: '2026-05-10', categoriaId: vendas } });
    assert.equal(r.status, 201);
    assert.equal(r.json.valor, 1234.56); assert.equal(r.json.tipo, 'receita'); assert.equal(r.json.usuario.nome, 'Op Um');
    idOp1 = r.json.id;
  });
  test('aceita valor com vírgula (string) e rejeita inválidos (zero, negativo, 3 casas, texto, data impossível)', async () => {
    const ok = await call('POST', '/api/transactions', { token: tokens.op1, body: { descricao: 'Aluguel', valor: '800,50', data: '2026-05-11', categoriaId: operacionais } });
    assert.equal(ok.status, 201); assert.equal(ok.json.valor, 800.5);
    for (const valor of [0, -5, 10.123, 'abc', null, 1e15]) {
      const r = await call('POST', '/api/transactions', { token: tokens.op1, body: { descricao: 'x', valor, data: '2026-05-11', categoriaId: vendas } });
      assert.equal(r.status, 422, `valor ${valor}`); assert.ok(r.json.erro.detalhes.valor);
    }
    const dt = await call('POST', '/api/transactions', { token: tokens.op1, body: { descricao: 'x', valor: 1, data: '2026-02-30', categoriaId: vendas } });
    assert.ok(dt.json.erro.detalhes.data);
    const cat = await call('POST', '/api/transactions', { token: tokens.op1, body: { descricao: 'x', valor: 1, data: '2026-05-11', categoriaId: 9999 } });
    assert.ok(cat.json.erro.detalhes.categoriaId);
  });
  test('banco também impede valor ≤ 0 (CHECK), mesmo fora da API', () => {
    assert.throws(() => app.db.prepare("INSERT INTO transacao (descricao, valor_centavos, data_movimento, usuario_id, categoria_id) VALUES ('x', 0, '2026-01-01', 1, 1)").run(), /CHECK/);
  });
  test('operador só vê as próprias movimentações; 404 ao acessar a de outro', async () => {
    const op2 = await call('POST', '/api/transactions', { token: tokens.op2, body: { descricao: 'Do Op2', valor: 50, data: '2026-05-12', categoriaId: vendas } });
    const lista1 = (await call('GET', '/api/transactions', { token: tokens.op1 })).json;
    assert.ok(lista1.items.every((t) => t.usuario.nome === 'Op Um'));
    assert.equal((await call('GET', `/api/transactions/${op2.json.id}`, { token: tokens.op1 })).status, 404);
    assert.equal((await call('PUT', `/api/transactions/${op2.json.id}`, { token: tokens.op1, body: { descricao: 'hack', valor: 1, data: '2026-05-12', categoriaId: vendas } })).status, 404);
    const todas = (await call('GET', '/api/transactions', { token: tokens.fin })).json;
    assert.ok(todas.items.some((t) => t.usuario.nome === 'Op Dois') && todas.items.some((t) => t.usuario.nome === 'Op Um'));
  });
  test('filtros por período, tipo, categoria e busca + totais', async () => {
    const q = async (qs) => (await call('GET', '/api/transactions?' + qs, { token: tokens.fin })).json;
    assert.ok((await q('inicio=2026-05-11&fim=2026-05-11')).items.every((t) => t.data === '2026-05-11'));
    const rec = await q('tipo=receita'); assert.ok(rec.items.every((t) => t.tipo === 'receita'));
    assert.equal((await q(`categoriaId=${operacionais}`)).items.length, 1);
    assert.equal((await q('q=alug')).items[0].descricao, 'Aluguel');
    assert.equal((await q('q=%25')).items.length, 0); // % é literal, não curinga
    assert.equal(rec.totais.receita, 1284.56);
    const pag = await q('limit=1&page=2'); assert.equal(pag.items.length, 1); assert.ok(pag.paginas >= 2);
  });
  test('operador não pode excluir (403); financeiro inativa; item some das listas', async () => {
    assert.equal((await call('DELETE', `/api/transactions/${idOp1}`, { token: tokens.op1 })).status, 403);
    assert.equal((await call('DELETE', `/api/transactions/${idOp1}`, { token: tokens.fin })).status, 204);
    assert.equal((await call('GET', `/api/transactions/${idOp1}`, { token: tokens.fin })).status, 404);
    assert.equal(app.db.prepare('SELECT ativo FROM transacao WHERE id = ?').get(idOp1).ativo, 0); // preservado no banco
  });
  test('trigger de auditoria registra criação, edição e inativação com o autor correto', async () => {
    const c = await call('POST', '/api/transactions', { token: tokens.op1, body: { descricao: 'Auditada', valor: 10, data: '2026-05-13', categoriaId: vendas } });
    await call('PUT', `/api/transactions/${c.json.id}`, { token: tokens.fin, body: { descricao: 'Auditada', valor: 20, data: '2026-05-13', categoriaId: vendas } });
    await call('DELETE', `/api/transactions/${c.json.id}`, { token: tokens.admin });
    const ev = app.db.prepare("SELECT a.acao, u.email FROM auditoria a LEFT JOIN usuario u ON u.id = a.usuario_id WHERE a.entidade = 'transacao' AND a.entidade_id = ? ORDER BY a.id").all(c.json.id);
    assert.deepEqual(ev.map((e) => [e.acao, e.email]), [['transacao.criada', 'op1@t.com'], ['transacao.atualizada', 'fin@t.com'], ['transacao.inativada', 'admin@financecontrol.local']]);
  });
  test('exportação CSV: BOM, separador ; e proteção contra injeção de fórmula', async () => {
    await call('POST', '/api/transactions', { token: tokens.fin, body: { descricao: '=HYPERLINK("http://x")', valor: 5, data: '2026-05-14', categoriaId: vendas } });
    const r = await call('GET', '/api/transactions/export?inicio=2026-05-14&fim=2026-05-14', { token: tokens.fin });
    assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /text\/csv/);
    const bytes = Buffer.from(await (await fetch(base + '/api/transactions/export?inicio=2026-05-14&fim=2026-05-14', { headers: { Authorization: `Bearer ${tokens.fin}` } })).arrayBuffer());
    assert.deepEqual([...bytes.subarray(0, 3)], [0xEF, 0xBB, 0xBF]); // BOM UTF-8 (Excel abre acentos corretamente)
    assert.ok(r.text.startsWith('Data;Tipo;Categoria'));
    assert.ok(r.text.includes(`"'=HYPERLINK(""http://x"")"`) && r.text.includes('5,00'));
  });
});

describe('Dashboard e comparação (RF03)', () => {
  test('totais, saldo, categorias e evolução mensal calculados no servidor', async () => {
    const [rec, ali, ope, inv] = [await catId('Serviços'), await catId('Administrativas'), await catId('Comerciais'), await catId('Renda fixa')];
    const post = (d, v, c, dt) => call('POST', '/api/transactions', { token: tokens.fin, body: { descricao: d, valor: v, data: dt, categoriaId: c } });
    await post('Receita A', 8350, rec, '2031-03-05'); await post('Desp 1', 2000, ali, '2031-03-06');
    await post('Desp 2', 1180, ope, '2031-03-07'); await post('Aplicação', 2420, inv, '2031-03-08');
    const r = (await call('GET', '/api/dashboard?inicio=2031-03-01&fim=2031-03-31', { token: tokens.fin })).json;
    assert.equal(r.receitas, 8350); assert.equal(r.despesas, 3180); assert.equal(r.investimentos, 2420);
    assert.equal(r.saldo, 5170); assert.equal(r.saldoAposInvestimentos, 2750); // números do exemplo da documentação
    assert.equal(r.despesasPorCategoria[0].categoria, 'Administrativas');
    assert.equal(r.despesasPorCategoria.reduce((a, c) => a + c.percentual, 0).toFixed(0), '100');
    assert.equal(r.mensal.length, 6); assert.equal(r.mensal[5].mes, '2031-03'); assert.equal(r.mensal[5].receitas, 8350); assert.equal(r.mensal[0].receitas, 0);
  });
  test('operador vê o painel apenas com os próprios dados', async () => {
    const r = (await call('GET', '/api/dashboard?inicio=2031-03-01&fim=2031-03-31', { token: tokens.op1 })).json;
    assert.equal(r.escopo, 'proprias'); assert.equal(r.receitas, 0);
  });
  test('comparação entre meses com variação percentual', async () => {
    const vendas = await catId('Vendas');
    await call('POST', '/api/transactions', { token: tokens.fin, body: { descricao: 'Abr', valor: 4920, data: '2032-04-10', categoriaId: vendas } });
    await call('POST', '/api/transactions', { token: tokens.fin, body: { descricao: 'Mai', valor: 5170, data: '2032-05-10', categoriaId: vendas } });
    const r = (await call('GET', '/api/dashboard/comparacao?a=2032-04&b=2032-05', { token: tokens.fin })).json;
    assert.equal(r.a.saldo, 4920); assert.equal(r.b.saldo, 5170); assert.equal(r.variacaoPercentual.saldo, 5.08); // +5,08% como na tela do app
  });
  test('parâmetros inválidos retornam 422', async () => {
    assert.equal((await call('GET', '/api/dashboard?inicio=2031-03-31&fim=2031-03-01', { token: tokens.fin })).status, 422);
    assert.equal((await call('GET', '/api/dashboard/comparacao?a=2032-13&b=x', { token: tokens.fin })).status, 422);
  });
});

describe('Perfis e permissões (RF05) e auditoria (RNF04)', () => {
  test('somente administrador gerencia usuários e vê auditoria', async () => {
    for (const t of [tokens.fin, tokens.op1]) {
      assert.equal((await call('GET', '/api/users', { token: t })).status, 403);
      assert.equal((await call('GET', '/api/auditoria', { token: t })).status, 403);
    }
    assert.equal((await call('GET', '/api/users', { token: tokens.admin })).status, 200);
    assert.ok((await call('GET', '/api/auditoria', { token: tokens.admin })).json.items.length > 0);
  });
  test('tentativa de acesso negado é auditada', () => {
    assert.ok(app.db.prepare("SELECT 1 FROM auditoria WHERE acao = 'acesso.negado'").get());
  });
  test('operador não acessa funcionários/metas (dados de salário); financeiro acessa', async () => {
    assert.equal((await call('GET', '/api/funcionarios', { token: tokens.op1 })).status, 403);
    assert.equal((await call('GET', '/api/metas', { token: tokens.op1 })).status, 403);
    assert.equal((await call('GET', '/api/funcionarios', { token: tokens.fin })).status, 200);
  });
  test('administrador não consegue se rebaixar/desativar (evita ficar sem admin)', async () => {
    const me = (await call('GET', '/api/me', { token: tokens.admin })).json.usuario;
    const r = await call('PUT', `/api/users/${me.id}`, { token: tokens.admin, body: { ativo: false } });
    assert.equal(r.status, 409);
  });
  test('trocar o perfil vale na hora (token antigo assume o novo perfil)', async () => {
    const perfis = (await call('GET', '/api/perfis', { token: tokens.admin })).json.items;
    const u = (await call('GET', '/api/users', { token: tokens.admin })).json.items.find((x) => x.email === 'op2@t.com');
    await call('PUT', `/api/users/${u.id}`, { token: tokens.admin, body: { perfilId: perfis.find((p) => p.nome === 'Financeiro').id } });
    assert.equal((await call('GET', '/api/me', { token: tokens.op2 })).json.usuario.perfil, 'financeiro');
  });
  test('CRUD de funcionários e metas', async () => {
    const f = await call('POST', '/api/funcionarios', { token: tokens.fin, body: { nome: 'Ana', cargo: 'Dev', salario: 5000, dataAdmissao: '2025-02-01' } });
    assert.equal(f.status, 201);
    const m = await call('POST', '/api/metas', { token: tokens.fin, body: { nome: 'Meta 1', valorObjetivo: 1000, valorAtual: 250, dataLimite: '2027-01-01', funcionarioId: f.json.id } });
    assert.equal(m.status, 201); assert.equal(m.json.progresso, 25); assert.equal(m.json.funcionarioNome, 'Ana');
    assert.equal((await call('DELETE', `/api/funcionarios/${f.json.id}`, { token: tokens.fin })).status, 204);
    const lista = (await call('GET', '/api/metas', { token: tokens.fin })).json.items;
    assert.equal(lista.find((x) => x.id === m.json.id).funcionarioId, null); // ON DELETE SET NULL
    assert.equal((await call('POST', '/api/metas', { token: tokens.fin, body: { nome: '', valorObjetivo: -1, dataLimite: 'x' } })).status, 422);
  });
});

describe('Disponibilidade', () => {
  test('health, 404 e 405 em formato JSON', async () => {
    assert.equal((await call('GET', '/api/health')).json.status, 'ok');
    assert.equal((await call('GET', '/api/nao-existe')).status, 404);
    assert.equal((await call('PATCH', '/api/health')).status, 405);
  });
  test('serve web, mobile (PWA) e arquivos compartilhados com o tipo MIME correto', async () => {
    const casos = [['/', /text\/html/], ['/app.html', /text\/html/], ['/mobile/', /text\/html/], ['/mobile/manifest.webmanifest', /manifest\+json/],
      ['/mobile/sw.js', /javascript/], ['/mobile/icons/icon-192.png', /image\/png/], ['/shared/api.js', /javascript/], ['/shared/vendor/chart.umd.min.js', /javascript/]];
    for (const [path, tipo] of casos) {
      const r = await call('GET', path);
      assert.equal(r.status, 200, path); assert.match(r.headers.get('content-type'), tipo, path);
    }
    assert.equal((await fetch(base + '/mobile', { redirect: 'manual' })).status, 301);
  });
  test('páginas não usam scripts/estilos inline (compatível com a CSP)', async () => {
    for (const path of ['/', '/app.html', '/register.html', '/mobile/']) {
      const html = (await call('GET', path)).text;
      assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>/i.test(html), `${path}: script inline`);
      assert.ok(!/\sstyle=|\sonclick=|<style/i.test(html), `${path}: estilo/handler inline`);
    }
  });
});

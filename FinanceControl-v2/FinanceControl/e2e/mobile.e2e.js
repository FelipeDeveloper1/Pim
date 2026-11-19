const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'pt-BR', serviceWorkers: 'allow' }); const p = await ctx.newPage();
  const problems = []; const B = (process.env.BASE || 'http://localhost:3100') + '/mobile/';
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(`[${m.type()}] ${m.text()}`); });
  p.on('pageerror', (e) => problems.push('[pageerror] ' + e.message));
  const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };

  await p.goto(B); await p.waitForSelector('#f');
  await p.screenshot({ path: 'e2e/screenshots/m-login.png' });
  await p.fill('#email', 'financeiro@financecontrol.local'); await p.fill('#senha', 'Demo@1234'); await p.click('#ok');
  await p.waitForSelector('.cards .card'); await p.waitForTimeout(700);
  const v = await p.$$eval('.cards .v', (e) => e.map((x) => x.textContent));
  ok(v[0].includes('8.350') && v[1].includes('3.180') && v[2].includes('2.420') && v[3].includes('5.170'), 'início mostra os números da Figura 3: ' + v.join(' | '));
  ok((await p.textContent('.hello')).includes('Fernanda'), 'saudação com o nome');
  await p.screenshot({ path: 'e2e/screenshots/m-inicio.png', fullPage: true });

  // Nova movimentação (Figura 4)
  await p.click('.nav a.fab'); await p.waitForSelector('#f [name=tipo]');
  await p.click('label:has(input[value=receita])'); await p.fill('#descricao', 'Venda mobile'); await p.fill('#valor', 'abc'); await p.click('#ok');
  await p.waitForSelector('#valor_e:not(:empty)'); ok(true, 'valor inválido: ' + await p.textContent('#valor_e'));
  ok(await p.inputValue('#descricao') === 'Venda mobile', 'dados digitados preservados após erro');
  await p.fill('#valor', '99,90'); await p.click('#ok'); await p.waitForSelector('.cards'); 
  await p.screenshot({ path: 'e2e/screenshots/m-nova.png' });

  // Lista + detalhe
  await p.click('.nav a[href="#movs"]'); await p.waitForSelector('.item'); await p.fill('#q', 'Venda mobile'); await p.click('#fl button[type=submit]'); await p.waitForTimeout(500);
  ok((await p.$$('.item')).length === 1, 'filtro encontra a movimentação criada');
  await p.screenshot({ path: 'e2e/screenshots/m-movs.png' });
  await p.click('.item'); await p.waitForSelector('.kv'); ok((await p.textContent('.kv')).includes('99,90'), 'detalhe mostra valor');
  await p.screenshot({ path: 'e2e/screenshots/m-detalhe.png' });
  p.once('dialog', (d) => d.accept()); await p.click('#del'); await p.waitForSelector('.list, .empty'); ok(true, 'exclusão (perfil Financeiro)');

  // Relatórios
  await p.click('.nav a[href="#relatorios"]'); await p.waitForSelector('.compare'); await p.waitForTimeout(500);
  const badge = await p.textContent('.badge'); ok(/▲|▼/.test(badge), 'variação com símbolo: ' + badge);
  await p.screenshot({ path: 'e2e/screenshots/m-rel.png', fullPage: true });

  // Perfil e permissões do operador
  await p.click('.nav a[href="#perfil"]'); await p.waitForSelector('#sair'); await p.click('#sair'); await p.waitForSelector('#f');
  await p.fill('#email', 'operador@financecontrol.local'); await p.fill('#senha', 'Demo@1234'); await p.click('#ok'); await p.waitForSelector('.cards');
  await p.click('.nav a[href="#movs"]'); await p.waitForSelector('.item'); await p.click('.item'); await p.waitForSelector('.kv');
  ok(!(await p.$('#del')) && (await p.textContent('main')).includes('Somente Financeiro'), 'operador não vê botão Excluir');

  // Offline: mensagem clara + sem cache de dados
  await ctx.setOffline(true); await p.evaluate(() => window.dispatchEvent(new Event('offline')));
  ok(await p.isVisible('#offline'), 'banner de offline visível');
  await p.click('.nav a[href="#inicio"]'); await p.waitForTimeout(800);
  const txt = await p.textContent('#app'); ok(/Sem conexão/.test(txt), 'tela mostra "Sem conexão com a internet" ao buscar dados');
  await p.screenshot({ path: 'e2e/screenshots/m-offline.png' });
  await ctx.setOffline(false);

  // PWA
  await p.goto(B); await p.waitForTimeout(800);
  const pwa = await p.evaluate(async () => ({ sw: !!(await navigator.serviceWorker.getRegistration('/mobile/')), manifest: !!document.querySelector('link[rel=manifest]') }));
  ok(pwa.sw && pwa.manifest, 'service worker registrado + manifest');
  const sem = await p.evaluate(async () => { const keys = await caches.keys(); let api = 0; for (const k of keys) { for (const r of await (await caches.open(k)).keys()) if (r.url.includes('/api/')) api++; } return api; });
  ok(sem === 0, 'nenhuma resposta da API foi guardada em cache');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem horizontal');
  console.log(problems.length ? 'CONSOLE:\n' + problems.join('\n') : 'console limpo');
  await b.close();
})();

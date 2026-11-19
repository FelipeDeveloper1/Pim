const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'pt-BR' }); const p = await ctx.newPage();
  const problems = [];
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(`[console.${m.type()}] ${m.text()}`); });
  p.on('pageerror', (e) => problems.push('[pageerror] ' + e.message));
  const B = process.env.BASE || 'http://localhost:3100';
  const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };

  // 1. Login com senha errada
  await p.goto(B + '/'); await p.fill('#email', 'admin@financecontrol.local'); await p.fill('#senha', 'errada123'); await p.click('#entrar');
  await p.waitForSelector('#erro:not([hidden])'); ok((await p.textContent('#erro')).includes('incorretos'), 'login inválido mostra erro');
  // 2. Login correto
  await p.fill('#senha', 'Admin@123'); await p.click('#entrar'); await p.waitForURL('**/app.html');
  await p.waitForSelector('.cards .card'); await p.waitForTimeout(600);
  const cards = await p.$$eval('.cards .valor', (e) => e.map((x) => x.textContent.replace(/\s/g, ' ')));
  console.log('cards:', cards);
  ok(cards[0].includes('8.350,00') && cards[1].includes('3.180,00') && cards[2].includes('2.420,00') && cards[3].includes('5.170,00'), 'visão geral reproduz números da documentação (8.350 / 3.180 / 2.420 / 5.170)');
  ok(await p.$('#cPizza') && await p.$('#cBarras'), 'gráficos presentes');
  await p.screenshot({ path: 'e2e/screenshots/web-visao.png', fullPage: true });
  // 3. Nova movimentação via formulário
  await p.click('#novo'); await p.waitForSelector('dialog[open]');
  await p.selectOption('#f_tipo', 'receita'); await p.selectOption('#f_categoriaId', { label: 'Serviços' });
  await p.fill('#f_descricao', 'Teste E2E'); await p.fill('#f_valor', '0'); await p.fill('#f_data', '2026-11-10');
  await p.click('dialog [type=submit]'); await p.waitForSelector('#f_valor_e:not(:empty)');
  ok((await p.textContent('#f_valor_e')).includes('positivo'), 'valor 0 é recusado com mensagem junto do campo');
  ok(await p.getAttribute('#f_valor', 'aria-invalid') === 'true', 'campo inválido recebe aria-invalid');
  await p.fill('#f_valor', '150,75'); await p.click('dialog [type=submit]'); await p.waitForSelector('dialog[open]', { state: 'detached' }).catch(()=>{}); await p.waitForTimeout(500);
  // 4. Movimentações: filtro e item criado
  await p.click('nav a[data-id=movimentacoes]'); await p.waitForSelector('table'); 
  await p.fill('#fq', 'Teste E2E'); await p.click('#filtros button[type=submit]'); await p.waitForTimeout(500);
  const linhas = await p.$$eval('tbody tr', (r) => r.map((x) => x.innerText.replace(/\s+/g, ' ')));
  console.log('linhas:', linhas);
  ok(linhas.length === 1 && linhas[0].includes('150,75'), 'movimentação criada aparece filtrada');
  await p.screenshot({ path: 'e2e/screenshots/web-mov.png', fullPage: true });
  // 5. Exportar CSV
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#csv')]); ok(dl.suggestedFilename() === 'movimentacoes.csv', 'download do CSV');
  // 6. Excluir
  p.once('dialog', (d) => d.accept()); await p.click('tbody [data-act=del]'); await p.waitForTimeout(700);
  ok((await p.$$('tbody tr .tag')).length === 0, 'exclusão remove o item');
  // 7. Relatórios
  await p.click('nav a[data-id=relatorios]'); await p.waitForSelector('#comp'); await p.waitForTimeout(500);
  const variacao = await p.$$eval('tbody tr', (r) => r[3] && r[3].innerText.replace(/\s+/g, ' '));
  console.log('saldo comparação:', variacao); ok(/▲|▼/.test(variacao || ''), 'variação com símbolo (não só cor)');
  await p.screenshot({ path: 'e2e/screenshots/web-rel.png', fullPage: true });
  // 8. Telas de gestão
  for (const id of ['metas', 'funcionarios', 'usuarios', 'auditoria']) { await p.click(`nav a[data-id=${id}]`); await p.waitForTimeout(500); ok((await p.$$('main table tbody tr')).length > 0, `tela ${id} lista dados`); }
  await p.screenshot({ path: 'e2e/screenshots/web-audit.png', fullPage: true });
  // 9. Teclado: Tab alcança o menu e o foco é visível
  await p.goto(B + '/app.html#visao'); await p.waitForSelector('.cards'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
  ok(await p.evaluate(() => { const a = document.activeElement; return !!a && getComputedStyle(a).outlineStyle !== 'none'; }), 'foco por teclado visível');
  // 10. Perfil operador: menu reduzido
  await p.click('#sair'); await p.waitForURL('**/index.html'); await p.fill('#email', 'operador@financecontrol.local'); await p.fill('#senha', 'Demo@1234'); await p.click('#entrar'); await p.waitForSelector('nav a');
  const nav = await p.$$eval('nav a', (a) => a.map((x) => x.textContent)); console.log('menu operador:', nav);
  ok(nav.length === 3 && !nav.includes('Usuários'), 'operador vê só 3 itens de menu');
  await p.screenshot({ path: 'e2e/screenshots/web-operador.png' });
  // 11. Responsivo (celular)
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem horizontal em 390px');
  await p.screenshot({ path: 'e2e/screenshots/web-390.png' });
  console.log(problems.length ? 'PROBLEMAS:\n' + problems.join('\n') : 'sem erros/avisos de console (nenhuma violação de CSP)');
  await b.close();
})();

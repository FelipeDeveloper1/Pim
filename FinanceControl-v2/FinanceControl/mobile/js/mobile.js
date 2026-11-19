(() => {
  'use strict';
  // PWA: o token fica em localStorage (um navegador não tem o "armazenamento seguro do SO" de um app nativo — ver docs/ATUALIZACOES.md).
  const api = FCApi.create(localStorage);
  const { esc, money, date, today, curMonth, addMonths, monthRange, monthLabel, monthShort, signedPct, moneyInput, TIPOS } = FCFmt;
  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app');
  const GESTAO = ['administrador', 'financeiro'];
  const ROTULO = { despesa: 'Despesa de Empresa', receita: 'Receita', investimento: 'Investimento' };
  let me = api.user(), mes = curMonth(), relMes = curMonth(), charts = [], catCache = null, toastTimer;
  const movState = { mes: '', tipo: '', q: '', page: 1 };

  api.onUnauthorized = () => { me = null; catCache = null; Object.assign(movState, { mes: '', tipo: '', q: '', page: 1 }); toast('Sessão expirada. Entre novamente.'); go('login'); };
  const toast = (m) => { const t = $('#toast'); t.textContent = m; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.textContent = ''; }, 4000); };
  const go = (h) => { if (location.hash === '#' + h) route(); else location.hash = h; };
  const cats = async () => (catCache ??= (await api.get('/api/categories')).items);
  const first = (n) => String(n || '').split(' ')[0];

  const ICON = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="currentColor"/></svg>',
    swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h12l-3-3M17 17H5l3 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bars: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10M12 20V4M19 20v-7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6z" fill="currentColor"/></svg>',
  };
  const NAV = [['inicio', 'Início', ICON.home], ['movs', 'Movimentações', ICON.swap], ['nova', 'Nova', null], ['relatorios', 'Relatórios', ICON.bars], ['perfil', 'Perfil', ICON.user]];
  const ACTIVE = { detalhe: 'movs', editar: 'movs' };

  function shell(title, body, { nav = true, back } = {}, name = '') {
    const active = ACTIVE[name] || name;
    app.innerHTML = `<header class="topbar">${back ? '<button type="button" id="back" aria-label="Voltar">←</button>' : ''}<h1>${esc(title)}</h1></header>
      <main class="content${nav ? '' : ' nonav'}" id="main" tabindex="-1">${body}</main>
      ${nav ? `<nav class="nav" aria-label="Navegação principal">${NAV.map(([id, label, icon]) => id === 'nova'
        ? `<a class="fab" href="#nova" aria-label="Nova movimentação"${active === 'nova' ? ' aria-current="page"' : ''}><span class="c" aria-hidden="true">+</span><small>${label}</small></a>`
        : `<a href="#${id}"${active === id ? ' aria-current="page"' : ''}>${icon}<span>${label}</span></a>`).join('')}</nav>` : ''}`;
    if (back) $('#back').onclick = () => (typeof back === 'string' ? go(back) : history.back());
    document.title = `${title} — FinanceControl`;
  }
  const errBox = (e, retry) => { app.querySelector('main')?.insertAdjacentHTML('afterbegin', `<div class="alert" role="alert">${esc(e.message)}${retry ? ' <button type="button" class="btn ghost" id="retry">Tentar novamente</button>' : ''}</div>`); if (retry) $('#retry').onclick = retry; };

  /* ---------- Login / cadastro ---------- */
  const LOGO = '<svg viewBox="0 0 512 512" aria-hidden="true"><g fill="#fff"><rect x="120" y="300" width="70" height="100" rx="10"/><rect x="221" y="240" width="70" height="160" rx="10"/><rect x="322" y="170" width="70" height="230" rx="10"/></g><path d="M110 250 L210 170 L270 205 L400 105" fill="none" stroke="#34d399" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function viewLogin(aviso) {
    app.innerHTML = `<div class="login"><div class="logo">${LOGO}<h1>FinanceControl</h1><p class="sub">Gestão financeira empresarial</p></div>
      ${aviso ? `<p class="alert" role="status">${esc(aviso)}</p>` : ''}
      <form id="f" novalidate>
        <div class="field"><label for="email">E-mail</label><input id="email" type="email" autocomplete="username" inputmode="email" required></div>
        <div class="field"><label for="senha">Senha</label><input id="senha" type="password" autocomplete="current-password" required></div>
        <div class="field"><label><input class="u-check" type="checkbox" id="ver"> Mostrar senha</label></div>
        <div class="alert" id="erro" role="alert" hidden></div>
        <button class="btn" type="submit" id="ok">Entrar</button>
      </form>
      <button class="btn ghost" type="button" id="esq">Esqueceu sua senha?</button>
      <a class="btn ghost u-link" href="#cadastro">Criar conta</a></div>`;
    document.title = 'Entrar — FinanceControl';
    $('#ver').onchange = (e) => { $('#senha').type = e.target.checked ? 'text' : 'password'; };
    $('#esq').onclick = () => { const b = $('#erro'); b.textContent = 'Peça a um administrador do sistema para redefinir a sua senha.'; b.hidden = false; };
    $('#f').onsubmit = async (e) => {
      e.preventDefault(); $('#erro').hidden = true; const btn = $('#ok'); btn.disabled = true;
      try { const r = await api.post('/api/auth/login', { email: $('#email').value.trim(), senha: $('#senha').value }); api.setSession(r.token, r.usuario); me = r.usuario; go('inicio'); }
      catch (err) { const b = $('#erro'); b.textContent = err.message; b.hidden = false; $('#senha').value = ''; $('#senha').focus(); }
      finally { btn.disabled = false; }
    };
  }

  function viewCadastro() {
    shell('Criar conta', `<form id="f" novalidate>
      <div class="field"><label for="nome">Nome</label><input id="nome" name="nome" autocomplete="name" maxlength="120" required><span class="err" id="nome_e"></span></div>
      <div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="username" required><span class="err" id="email_e"></span></div>
      <div class="field"><label for="senha">Senha</label><input id="senha" name="senha" type="password" autocomplete="new-password" required><span class="hint">Mínimo de 8 caracteres, com letra e número.</span><span class="err" id="senha_e"></span></div>
      <div class="field"><label for="conf">Confirmar senha</label><input id="conf" name="conf" type="password" autocomplete="new-password" required><span class="err" id="conf_e"></span></div>
      <div class="alert" id="erro" role="alert" hidden></div><button class="btn dark" type="submit" id="ok">Criar conta</button></form>`, { nav: false, back: 'login' });
    $('#f').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target; $('#erro').hidden = true; f.querySelectorAll('.err').forEach((n) => { n.textContent = ''; }); f.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));
      if (f.senha.value !== f.conf.value) { $('#conf_e').textContent = 'As senhas não coincidem.'; f.conf.setAttribute('aria-invalid', 'true'); f.conf.focus(); return; }
      $('#ok').disabled = true;
      try { await api.post('/api/auth/register', { nome: f.nome.value.trim(), email: f.email.value.trim(), senha: f.senha.value }); viewLogin('Conta criada! Faça login.'); location.hash = 'login'; }
      catch (err) {
        const d = err.detalhes || {}; let foco = null;
        Object.keys(d).forEach((k) => { const m = $('#' + k + '_e'); if (m && f[k]) { m.textContent = d[k]; f[k].setAttribute('aria-invalid', 'true'); foco ??= f[k]; } });
        if (foco) foco.focus(); else { const b = $('#erro'); b.textContent = err.message; b.hidden = false; }
      } finally { $('#ok').disabled = false; }
    };
  }

  /* ---------- Início (dashboard) ---------- */
  async function viewInicio() {
    shell('FinanceControl', '<p role="status">Carregando…</p>', {}, 'inicio');
    const { inicio, fim } = monthRange(mes);
    const d = await api.get(`/api/dashboard?inicio=${inicio}&fim=${fim}`);
    const base = d.despesas + d.investimentos;
    const pDesp = base ? Math.round((d.despesas / base) * 100) : 0;
    shell('FinanceControl', `
      <p class="hello">Olá, ${esc(first(me.nome))}</p>
      <div class="month"><button type="button" id="ant" aria-label="Mês anterior">‹</button><strong aria-live="polite">${esc(monthLabel(mes))}</strong><button type="button" id="prox" aria-label="Próximo mês">›</button></div>
      <section class="cards" aria-label="Indicadores do mês">
        <div class="card"><h3>Receita</h3><p class="v">${money(d.receitas)}</p></div><div class="card d"><h3>Despesas de Empresas</h3><p class="v">${money(d.despesas)}</p></div>
        <div class="card"><h3>Investimentos</h3><p class="v">${money(d.investimentos)}</p></div><div class="card d"><h3>Saldo em carteira</h3><p class="v">${money(d.saldo)}</p></div></section>
      <p class="hint u-note">Saldo = receitas − despesas.</p>
      <section class="panel"><h2>Resumo financeiro</h2>${base ? `
        <div class="donut"><canvas id="rosca" role="img" aria-label="Despesas ${pDesp}% e investimentos ${100 - pDesp}% do total aplicado"></canvas><div class="center"><strong>${money(d.receitas)}</strong><span>Receitas</span></div></div>
        <ul class="list u-mt1"><li>Despesas de Empresas: <strong>${pDesp}%</strong> (${money(d.despesas)})</li><li>Investimentos: <strong>${100 - pDesp}%</strong> (${money(d.investimentos)})</li></ul>` : '<p class="empty">Sem lançamentos neste mês.</p>'}</section>
      <section class="panel"><h2>Principais despesas da empresa</h2>${d.despesasPorCategoria.length ? `<ul class="bars">${d.despesasPorCategoria.slice(0, 5).map((c) =>
        `<li><div><span>${esc(c.categoria)}</span><span>${c.percentual.toLocaleString('pt-BR')}%</span></div><progress value="${c.percentual}" max="100" aria-label="${esc(c.categoria)}"></progress></li>`).join('')}</ul>` : '<p class="empty">Sem despesas neste mês.</p>'}</section>`, {}, 'inicio');
    $('#ant').onclick = () => { mes = addMonths(mes, -1); route(); }; $('#prox').onclick = () => { mes = addMonths(mes, 1); route(); };
    if (base && typeof Chart !== 'undefined') charts.push(new Chart($('#rosca'), { type: 'doughnut', data: { labels: ['Despesas', 'Investimentos'], datasets: [{ data: [d.despesas, d.investimentos], backgroundColor: ['#dc2626', '#16a34a'], borderColor: '#fff', borderWidth: 2 }] }, options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } } }));
  }

  /* ---------- Movimentações ---------- */
  async function viewMovs() {
    shell('Movimentações', '<p role="status">Carregando…</p>', {}, 'movs');
    const qs = new URLSearchParams({ page: movState.page, limit: 12 });
    if (movState.mes) { const r = monthRange(movState.mes); qs.set('inicio', r.inicio); qs.set('fim', r.fim); }
    if (movState.tipo) qs.set('tipo', movState.tipo); if (movState.q) qs.set('q', movState.q);
    const d = await api.get('/api/transactions?' + qs);
    shell('Movimentações', `
      <form class="filters" id="fl" aria-label="Filtros">
        <div class="field"><label for="m">Mês</label><input type="month" id="m" value="${esc(movState.mes)}"></div>
        <div class="field"><label for="t">Tipo</label><select id="t"><option value="">Todos</option>${Object.entries(TIPOS).map(([k, v]) => `<option value="${k}"${movState.tipo === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field full"><label for="q">Buscar</label><input id="q" type="search" value="${esc(movState.q)}" maxlength="60"></div>
        <button class="btn dark full" type="submit">Filtrar</button></form>
      ${d.items.length ? `<ul class="list">${d.items.map((t) => `<li><a class="item ${t.tipo}" href="#detalhe/${t.id}" aria-label="${esc(`${t.descricao}, ${TIPOS[t.tipo]}, ${money(t.valor)}, ${date(t.data)}. Abrir detalhes`)}"><span class="dot" aria-hidden="true">${t.tipo === 'receita' ? '+' : t.tipo === 'despesa' ? '−' : '↗'}</span>
        <span class="t"><strong>${esc(t.descricao)}</strong><small>${date(t.data)} · ${esc(t.categoria.nome)}</small></span><span class="amt">${t.tipo === 'despesa' ? '−' : ''}${money(t.valor)}</span></a></li>`).join('')}</ul>` : '<p class="empty">Nenhuma movimentação encontrada.</p>'}
      <div class="pager"><button class="btn ghost" type="button" id="p1"${d.page <= 1 ? ' disabled' : ''}>Anterior</button><span>${d.page}/${d.paginas}</span><button class="btn ghost" type="button" id="p2"${d.page >= d.paginas ? ' disabled' : ''}>Próxima</button></div>`, {}, 'movs');
    $('#fl').onsubmit = (e) => { e.preventDefault(); Object.assign(movState, { mes: $('#m').value, tipo: $('#t').value, q: $('#q').value.trim(), page: 1 }); route(); };
    $('#p1').onclick = () => { movState.page--; route(); }; $('#p2').onclick = () => { movState.page++; route(); };
  }

  /* ---------- Nova / editar ---------- */
  async function viewForm(id) {
    const categorias = await cats();
    let item = null;
    if (id) item = await api.get('/api/transactions/' + id);
    const tipo = item?.tipo || 'despesa';
    const opts = (t, sel) => categorias.filter((c) => c.tipo === t).map((c) => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${esc(c.nome)}</option>`).join('');
    shell(item ? 'Editar movimentação' : 'Nova Movimentação', `<form id="f" novalidate>
      <fieldset class="seg"><legend>Tipo</legend>${Object.keys(ROTULO).map((k) => `<label><input type="radio" name="tipo" value="${k}"${k === tipo ? ' checked' : ''}><span>${ROTULO[k]}</span></label>`).join('')}</fieldset>
      <div class="field"><label for="descricao">Descrição</label><input id="descricao" name="descricao" placeholder="Ex.: Aluguel, Fornecedor, Energia" maxlength="120" value="${esc(item?.descricao || '')}" required><span class="err" id="descricao_e"></span></div>
      <div class="field"><label for="valor">Valor (R$)</label><input id="valor" name="valor" inputmode="decimal" placeholder="0,00" value="${esc(moneyInput(item?.valor))}" required><span class="err" id="valor_e"></span></div>
      <div class="field"><label for="categoriaId">Categoria</label><select id="categoriaId" name="categoriaId" required>${opts(tipo, item?.categoria.id)}</select><span class="err" id="categoriaId_e"></span></div>
      <div class="field"><label for="data">Data</label><input id="data" name="data" type="date" value="${item?.data || today()}" required><span class="err" id="data_e"></span></div>
      <div class="alert" id="erro" role="alert" hidden></div><button class="btn dark" type="submit" id="ok">Salvar</button></form>`, { back: item ? `detalhe/${id}` : 'inicio' }, item ? 'editar' : 'nova');
    const f = $('#f');
    f.querySelectorAll('[name=tipo]').forEach((r) => { r.onchange = () => { f.categoriaId.innerHTML = opts(r.value); }; });
    f.onsubmit = async (e) => {
      e.preventDefault(); $('#erro').hidden = true; f.querySelectorAll('.err').forEach((n) => { n.textContent = ''; }); f.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));
      const body = { descricao: f.descricao.value.trim(), valor: f.valor.value, data: f.data.value, categoriaId: Number(f.categoriaId.value) };
      $('#ok').disabled = true;
      try { await (item ? api.put('/api/transactions/' + id, body) : api.post('/api/transactions', body)); toast('Movimentação salva.'); go('inicio'); }
      catch (err) { // mantém o que foi digitado e mostra mensagem clara (seção 3.5.2)
        const d = err.detalhes || {}; let foco = null;
        Object.keys(d).forEach((k) => { const m = $('#' + k + '_e'); if (m && f[k]) { m.textContent = d[k]; f[k].setAttribute('aria-invalid', 'true'); foco ??= f[k]; } });
        if (foco) foco.focus(); else { const b = $('#erro'); b.textContent = err.message; b.hidden = false; }
      } finally { $('#ok').disabled = false; }
    };
  }

  /* ---------- Detalhes ---------- */
  async function viewDetalhe(id) {
    const t = await api.get('/api/transactions/' + id);
    shell('Detalhes', `<section class="panel"><dl class="kv"><dt>Descrição</dt><dd>${esc(t.descricao)}</dd><dt>Tipo</dt><dd>${TIPOS[t.tipo]}</dd><dt>Categoria</dt><dd>${esc(t.categoria.nome)}</dd>
      <dt>Valor</dt><dd>${t.tipo === 'despesa' ? '−' : ''}${money(t.valor)}</dd><dt>Data</dt><dd>${date(t.data)}</dd><dt>Responsável</dt><dd>${esc(t.usuario.nome)}</dd></dl></section>
      <a class="btn dark u-link" href="#editar/${t.id}">Editar</a>
      ${GESTAO.includes(me.perfil) ? '<button class="btn danger" type="button" id="del">Excluir</button>' : '<p class="hint u-mt2">Somente Financeiro e Administrador podem excluir.</p>'}`, { back: 'movs' }, 'detalhe');
    const del = $('#del');
    if (del) del.onclick = async () => { if (!confirm('Excluir esta movimentação?')) return; try { await api.del('/api/transactions/' + id); toast('Movimentação excluída.'); go('movs'); } catch (e) { toast(e.message); } };
  }

  /* ---------- Relatórios ---------- */
  async function viewRelatorios() {
    shell('Relatórios', '<p role="status">Carregando…</p>', {}, 'relatorios');
    const a = addMonths(relMes, -1), { inicio, fim } = monthRange(relMes);
    const [c, d] = await Promise.all([api.get(`/api/dashboard/comparacao?a=${a}&b=${relMes}`), api.get(`/api/dashboard?inicio=${inicio}&fim=${fim}`)]);
    const v = c.variacaoPercentual.saldo, cls = v > 0 ? 'pos' : v < 0 ? 'neg' : '';
    shell('Relatórios', `
      <div class="field no-print"><label for="per">Período</label><input type="month" id="per" value="${relMes}"></div>
      <section class="panel"><h2>Comparação de períodos</h2><div class="compare"><div><small>${esc(monthLabel(c.a.mes))}</small><strong>${money(c.a.saldo)}</strong></div><div><small>${esc(monthLabel(c.b.mes))}</small><strong>${money(c.b.saldo)}</strong></div></div>
        <p class="u-center"><span class="badge ${cls}">${signedPct(v)}</span></p><p class="hint u-center">Variação do saldo (receitas − despesas).</p></section>
      <section class="panel"><h2>Evolução mensal</h2><div class="chart-box"><canvas id="evo" role="img" aria-label="Receitas e despesas dos últimos 6 meses. Valores na lista abaixo."></canvas></div>
        <ul class="list u-mt1">${d.mensal.map((m) => `<li><strong>${esc(monthLabel(m.mes))}:</strong> receitas ${money(m.receitas)} · despesas ${money(m.despesas)}</li>`).join('')}</ul></section>
      <div class="no-print"><button class="btn ghost" type="button" id="pdf">Exportar relatório (PDF)</button><button class="btn ghost" type="button" id="csv">Exportar CSV</button></div>`, {}, 'relatorios');
    $('#per').onchange = (e) => { if (e.target.value) { relMes = e.target.value; route(); } };
    $('#pdf').onclick = () => window.print();
    $('#csv').onclick = async () => { try { await api.download(`/api/transactions/export?inicio=${monthRange(a).inicio}&fim=${fim}`, 'movimentacoes.csv'); toast('Arquivo CSV gerado.'); } catch (e) { toast(e.message); } };
    if (typeof Chart !== 'undefined') charts.push(new Chart($('#evo'), { type: 'bar', data: { labels: d.mensal.map((m) => monthShort(m.mes)), datasets: [{ label: 'Receitas', data: d.mensal.map((m) => m.receitas), backgroundColor: '#16a34a' }, { label: 'Despesas de Empresas', data: d.mensal.map((m) => m.despesas), backgroundColor: '#dc2626' }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } }));
  }

  /* ---------- Perfil ---------- */
  function viewPerfil() {
    shell('Perfil', `<section class="panel"><dl class="kv"><dt>Nome</dt><dd>${esc(me.nome)}</dd><dt>E-mail</dt><dd>${esc(me.email)}</dd><dt>Perfil</dt><dd>${esc(me.perfil)}</dd></dl></section>
      <p class="hint u-mb">Esta versão funciona somente online. Seus dados ficam no servidor, nunca no aparelho.</p><button class="btn danger" type="button" id="sair">Encerrar sessão</button>`, {}, 'perfil');
    $('#sair').onclick = async () => { try { await api.post('/api/auth/logout'); } catch { /* sair mesmo offline */ } api.clear(); me = null; catCache = null; Object.assign(movState, { mes: '', tipo: '', q: '', page: 1 }); mes = relMes = curMonth(); go('login'); };
  }

  /* ---------- Roteamento ---------- */
  async function route() {
    charts.forEach((c) => c.destroy()); charts = [];
    const [name, arg] = (location.hash.slice(1) || 'inicio').split('/');
    if (name === 'login') { if (api.token()) return go('inicio'); return viewLogin(); }
    if (name === 'cadastro') return viewCadastro();
    if (!api.token()) return go('login');
    if (!me) { try { me = (await api.get('/api/me')).usuario; api.setUser(me); } catch { return go('login'); } }
    const views = { inicio: viewInicio, movs: viewMovs, nova: () => viewForm(null), editar: () => viewForm(arg), detalhe: () => viewDetalhe(arg), relatorios: viewRelatorios, perfil: viewPerfil };
    const fn = views[name] || viewInicio;
    try { await fn(); } catch (e) { if (e.status === 401) return; if (!app.querySelector('main')) shell('FinanceControl', '', {}, ''); errBox(e, () => route()); }
    $('#main')?.focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', route);
  const offline = $('#offline'); const sync = () => { offline.hidden = navigator.onLine; };
  window.addEventListener('online', sync); window.addEventListener('offline', sync); sync();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/mobile/sw.js', { scope: '/mobile/' }).catch(() => {});
  route();
})();

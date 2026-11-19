(() => {
  'use strict';
  const api = FCApi.create(sessionStorage);
  api.onUnauthorized = () => location.replace('/index.html?expirou=1');
  if (!api.token()) { location.replace('/index.html'); return; }

  const { esc, money, date, dateTime, today, curMonth, addMonths, monthRange, monthLabel, monthShort, signedPct, moneyInput, TIPOS } = FCFmt;
  const $ = (s, r = document) => r.querySelector(s);
  const view = $('#view'), dlg = $('#dlg'), dlgForm = $('#dlgForm');
  const GESTAO = ['administrador', 'financeiro'];
  const NAV = [
    { id: 'visao', label: 'Visão geral' }, { id: 'movimentacoes', label: 'Movimentações' }, { id: 'relatorios', label: 'Relatórios' },
    { id: 'metas', label: 'Metas', roles: GESTAO }, { id: 'funcionarios', label: 'Funcionários', roles: GESTAO },
    { id: 'usuarios', label: 'Usuários', roles: ['administrador'] }, { id: 'auditoria', label: 'Auditoria', roles: ['administrador'] },
  ];
  let me = api.user(), allowed = [], charts = [], catCache = null;
  const state = { mov: { page: 1, f: {} }, mes: curMonth() };

  const cats = async (force) => { if (!catCache || force) catCache = (await api.get('/api/categories')).items; return catCache; };
  const can = (roles) => !roles || roles.includes(me.perfil);

  let statusTimer;
  function announce(msg) { const s = $('#status'); s.textContent = msg; clearTimeout(statusTimer); statusTimer = setTimeout(() => { s.textContent = ''; }, 4000); }
  const alertBox = (m) => `<div class="alert" role="alert">${esc(m)}</div>`;
  const fail = (e) => { if (e.status !== 401) announce(e.message); };

  /* ---------- componentes ---------- */
  function table(caption, cols, rows, empty = 'Nenhum registro.') {
    if (!rows.length) return `<p class="empty">${esc(empty)}</p>`;
    return `<div class="table-wrap"><table><caption class="sr-only">${esc(caption)}</caption><thead><tr>${cols.map((c) => `<th scope="col"${c.num ? ' class="num"' : ''}>${esc(c.h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td${c.num ? ' class="num"' : c.actions ? ' class="actions"' : ''}>${c.f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  const btnAct = (act, id, label, extra = '', cls = '') => `<button type="button" class="btn small ${cls}" data-act="${act}" data-id="${id}" aria-label="${esc(label)}">${esc(extra || label.split(' ')[0])}</button>`;

  function fieldHtml(f) {
    const id = 'f_' + f.name, v = f.value ?? '';
    let input;
    if (f.type === 'select') input = `<select id="${id}" name="${f.name}"${f.required ? ' required' : ''}>${f.options.map((o) => `<option value="${esc(o.value)}"${String(o.value) === String(v) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
    else if (f.type === 'checkbox') return `<div class="field check"><input type="checkbox" id="${id}" name="${f.name}"${v ? ' checked' : ''}><label for="${id}">${esc(f.label)}</label></div>`;
    else input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}"${f.required ? ' required' : ''}${f.inputmode ? ` inputmode="${f.inputmode}"` : ''}${f.max ? ` maxlength="${f.max}"` : ''} autocomplete="${f.autocomplete || 'off'}"${f.hint ? ` aria-describedby="${id}_h"` : ''}>`;
    return `<div class="field"><label for="${id}">${esc(f.label)}${f.required ? ' <span aria-hidden="true">*</span>' : ''}</label>${input}${f.hint ? `<small id="${id}_h">${esc(f.hint)}</small>` : ''}<small class="err" id="${id}_e" role="alert"></small></div>`;
  }

  /** Formulário modal acessível (<dialog>: foco preso, Esc fecha). Erros do servidor aparecem junto de cada campo. */
  function openForm({ title, fields, submitLabel = 'Salvar', onRender, onSubmit }) {
    dlgForm.innerHTML = `<h2 id="dlgTitle">${esc(title)}</h2>${fields.map(fieldHtml).join('')}
      <div id="formError" class="alert" role="alert" hidden></div>
      <div class="actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button type="submit" class="btn">${esc(submitLabel)}</button></div>`;
    if (onRender) onRender(dlgForm);
    dlgForm.onsubmit = async (e) => {
      e.preventDefault();
      const sub = dlgForm.querySelector('[type=submit]'); $('#formError').hidden = true;
      dlgForm.querySelectorAll('.err').forEach((n) => { n.textContent = ''; }); dlgForm.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));
      const values = {};
      fields.forEach((f) => { const el = dlgForm.elements[f.name]; values[f.name] = f.type === 'checkbox' ? el.checked : el.value; });
      sub.disabled = true;
      try { await onSubmit(values); dlg.close(); }
      catch (err) {
        const d = err.detalhes || {}; let first = null;
        Object.keys(d).forEach((k) => { const el = dlgForm.elements[k], msg = $('#f_' + k + '_e', dlgForm); if (el && msg) { msg.textContent = d[k]; el.setAttribute('aria-invalid', 'true'); first ??= el; } });
        if (first) first.focus(); else { const b = $('#formError'); b.textContent = err.message; b.hidden = false; }
      } finally { sub.disabled = false; }
    };
    dlg.showModal();
    (dlgForm.querySelector('input:not([type=hidden]),select') || dlgForm).focus();
  }
  dlg.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) dlg.close(); });

  /* ---------- gráficos ---------- */
  const PALETA = ['#0b5d45', '#2563eb', '#d97706', '#7c3aed', '#be123c', '#0e7490', '#4d7c0f', '#a16207'];
  function chart(canvas, config) { if (typeof Chart !== 'undefined' && canvas) charts.push(new Chart(canvas, config)); }

  /* ---------- telas ---------- */
  const VIEWS = {
    async visao() {
      const { inicio, fim } = monthRange(state.mes);
      const d = await api.get(`/api/dashboard?inicio=${inicio}&fim=${fim}`);
      const cat = d.despesasPorCategoria, mensal = d.mensal;
      const proprias = d.escopo === 'proprias' ? '<p class="hint">Você vê apenas as suas próprias movimentações.</p>' : '';
      view.innerHTML = `
        <div class="page-head"><h1>Visão geral</h1>
          <div class="toolbar"><div class="field"><label for="mes">Mês</label><input type="month" id="mes" value="${state.mes}"></div>
          <button class="btn" type="button" id="novo">Nova movimentação</button></div></div>${proprias}
        <section class="cards" aria-label="Indicadores de ${esc(monthLabel(state.mes))}">
          <div class="card"><h3>Receitas</h3><p class="valor">${money(d.receitas)}</p></div>
          <div class="card despesa"><h3>Despesas</h3><p class="valor">${money(d.despesas)}</p></div>
          <div class="card invest"><h3>Investimentos</h3><p class="valor">${money(d.investimentos)}</p></div>
          <div class="card saldo"><h3>Saldo do mês</h3><p class="valor">${money(d.saldo)}</p><small>Após investimentos: ${money(d.saldoAposInvestimentos)}</small></div>
        </section>
        <p class="hint">Como calculamos: <strong>saldo = receitas − despesas</strong>; “após investimentos” = saldo − investimentos. Valores do mês selecionado.</p>
        <div class="grid2">
          <section class="panel"><h2>Despesas por categoria</h2>
            ${cat.length ? `<div class="chart-box"><canvas id="cPizza" role="img" aria-label="Gráfico de rosca das despesas por categoria. ${esc(cat.map((c) => `${c.categoria} ${c.percentual}%`).join('; '))}."></canvas></div>` : '<p class="empty">Sem despesas no mês.</p>'}
            <details><summary>Ver dados em tabela</summary>${table('Despesas por categoria', [{ h: 'Categoria', f: (r) => esc(r.categoria) }, { h: 'Total', num: 1, f: (r) => money(r.total) }, { h: '%', num: 1, f: (r) => r.percentual.toLocaleString('pt-BR') + '%' }], cat)}</details></section>
          <section class="panel"><h2>Evolução mensal</h2>
            <div class="chart-box"><canvas id="cBarras" role="img" aria-label="Gráfico de barras de receitas, despesas e investimentos nos últimos 6 meses. Os valores estão na tabela abaixo."></canvas></div>
            <details><summary>Ver dados em tabela</summary>${table('Evolução mensal', [{ h: 'Mês', f: (r) => esc(monthLabel(r.mes)) }, { h: 'Receitas', num: 1, f: (r) => money(r.receitas) }, { h: 'Despesas', num: 1, f: (r) => money(r.despesas) }, { h: 'Investimentos', num: 1, f: (r) => money(r.investimentos) }], mensal)}</details></section>
        </div>`;
      $('#mes').onchange = (e) => { if (e.target.value) { state.mes = e.target.value; route(); } };
      $('#novo').onclick = () => formMov(null, () => route());
      chart($('#cPizza'), { type: 'doughnut', data: { labels: cat.map((c) => c.categoria), datasets: [{ data: cat.map((c) => c.total), backgroundColor: PALETA, borderColor: '#fff', borderWidth: 2 }] },
        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${money(c.parsed)}` } } } } });
      chart($('#cBarras'), { type: 'bar', data: { labels: mensal.map((m) => monthShort(m.mes)), datasets: [
        { label: 'Receitas', data: mensal.map((m) => m.receitas), backgroundColor: '#0b5d45' }, { label: 'Despesas', data: mensal.map((m) => m.despesas), backgroundColor: '#b91c1c' },
        { label: 'Investimentos', data: mensal.map((m) => m.investimentos), backgroundColor: '#2563eb' }] },
        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${money(c.parsed.y)}` } } }, scales: { y: { ticks: { callback: (v) => money(v) } } } } });
    },

    async movimentacoes() {
      const f = state.mov.f, categorias = await cats();
      const qs = new URLSearchParams({ page: state.mov.page, limit: 15, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) });
      const d = await api.get('/api/transactions?' + qs);
      const opt = (v, l, s) => `<option value="${esc(v)}"${String(s) === String(v) ? ' selected' : ''}>${esc(l)}</option>`;
      view.innerHTML = `
        <div class="page-head"><h1>Movimentações</h1><button class="btn" type="button" id="novo">Nova movimentação</button></div>
        <form class="panel toolbar" id="filtros" aria-label="Filtros">
          <div class="field"><label for="fi">De</label><input type="date" id="fi" name="inicio" value="${esc(f.inicio || '')}"></div>
          <div class="field"><label for="ff">Até</label><input type="date" id="ff" name="fim" value="${esc(f.fim || '')}"></div>
          <div class="field"><label for="ft">Tipo</label><select id="ft" name="tipo">${opt('', 'Todos', f.tipo)}${Object.entries(TIPOS).map(([k, v]) => opt(k, v, f.tipo)).join('')}</select></div>
          <div class="field"><label for="fc">Categoria</label><select id="fc" name="categoriaId">${opt('', 'Todas', f.categoriaId)}${categorias.map((c) => opt(c.id, `${c.nome} (${TIPOS[c.tipo]})`, f.categoriaId)).join('')}</select></div>
          <div class="field"><label for="fq">Buscar</label><input id="fq" name="q" value="${esc(f.q || '')}" maxlength="60"></div>
          <button class="btn" type="submit">Filtrar</button><button class="btn ghost" type="button" id="limpar">Limpar</button><button class="btn ghost" type="button" id="csv">Exportar CSV</button>
        </form>
        <section class="cards" aria-label="Totais do filtro">
          <div class="card"><h3>Receitas</h3><p class="valor">${money(d.totais.receita)}</p></div><div class="card despesa"><h3>Despesas</h3><p class="valor">${money(d.totais.despesa)}</p></div>
          <div class="card invest"><h3>Investimentos</h3><p class="valor">${money(d.totais.investimento)}</p></div></section>
        <section class="panel">${table('Movimentações', [
          { h: 'Data', f: (r) => date(r.data) }, { h: 'Descrição', f: (r) => esc(r.descricao) }, { h: 'Tipo', f: (r) => `<span class="tag ${r.tipo}">${TIPOS[r.tipo]}</span>` },
          { h: 'Categoria', f: (r) => esc(r.categoria.nome) }, { h: 'Responsável', f: (r) => esc(r.usuario.nome) }, { h: 'Valor', num: 1, f: (r) => (r.tipo === 'despesa' ? '−' : '') + money(r.valor) },
          { h: 'Ações', actions: 1, f: (r) => btnAct('edit', r.id, `Editar ${r.descricao}`, 'Editar') + (can(GESTAO) ? btnAct('del', r.id, `Excluir ${r.descricao}`, 'Excluir', 'danger') : '') }], d.items, 'Nenhuma movimentação encontrada.')}
          <div class="pager"><span>Página ${d.page} de ${d.paginas} · ${d.total} registro(s)</span>
            <button class="btn ghost small" type="button" id="ant"${d.page <= 1 ? ' disabled' : ''}>Anterior</button><button class="btn ghost small" type="button" id="prox"${d.page >= d.paginas ? ' disabled' : ''}>Próxima</button></div></section>`;
      const refresh = () => route();
      $('#novo').onclick = () => formMov(null, refresh);
      $('#filtros').onsubmit = (e) => { e.preventDefault(); const fd = new FormData(e.target); state.mov = { page: 1, f: Object.fromEntries([...fd].filter(([, v]) => v)) }; refresh(); };
      $('#limpar').onclick = () => { state.mov = { page: 1, f: {} }; refresh(); };
      $('#ant').onclick = () => { state.mov.page--; refresh(); }; $('#prox').onclick = () => { state.mov.page++; refresh(); };
      $('#csv').onclick = () => exportCsv(f);
      view.onclick = async (e) => {
        const b = e.target.closest('[data-act]'); if (!b) return; const item = d.items.find((x) => x.id === Number(b.dataset.id));
        if (b.dataset.act === 'edit') formMov(item, refresh);
        else if (confirm(`Excluir a movimentação "${item.descricao}"? Ela será inativada e continuará na auditoria.`)) { try { await api.del('/api/transactions/' + item.id); announce('Movimentação excluída.'); refresh(); } catch (err) { fail(err); } }
      };
    },

    async relatorios() {
      const b = state.relB || curMonth(), a = state.relA || addMonths(b, -1); state.relA = a; state.relB = b;
      const [c, d] = await Promise.all([api.get(`/api/dashboard/comparacao?a=${a}&b=${b}`), api.get(`/api/dashboard?inicio=${monthRange(b).inicio}&fim=${monthRange(b).fim}`)]);
      const lin = (nome, k, cls = '') => `<tr><th scope="row">${nome}</th><td class="num">${money(c.a[k])}</td><td class="num">${money(c.b[k])}</td><td class="num ${cls}">${c.variacaoPercentual[k] === undefined ? '—' : signedPct(c.variacaoPercentual[k])}</td></tr>`;
      const cor = c.variacaoPercentual.saldo > 0 ? 'pos' : c.variacaoPercentual.saldo < 0 ? 'neg' : '';
      view.innerHTML = `
        <div class="page-head"><h1>Relatórios</h1><div class="toolbar no-print"><button class="btn ghost" type="button" id="csv">Exportar CSV</button><button class="btn" type="button" id="pdf">Exportar PDF</button></div></div>
        <p class="hint" id="printHead">Gerado em ${dateTime(new Date().toISOString())} por ${esc(me.nome)}${d.escopo === 'proprias' ? ' (apenas movimentações próprias)' : ''}.</p>
        <form class="panel toolbar no-print" id="comp" aria-label="Períodos a comparar">
          <div class="field"><label for="ma">Mês A</label><input type="month" id="ma" value="${a}" required></div>
          <div class="field"><label for="mb">Mês B</label><input type="month" id="mb" value="${b}" required></div><button class="btn" type="submit">Comparar</button></form>
        <section class="panel"><h2>Comparação de períodos</h2>
          <div class="table-wrap"><table><caption class="sr-only">Comparação entre ${esc(monthLabel(a))} e ${esc(monthLabel(b))}</caption>
            <thead><tr><th scope="col">Indicador</th><th scope="col" class="num">${esc(monthLabel(a))}</th><th scope="col" class="num">${esc(monthLabel(b))}</th><th scope="col" class="num">Variação</th></tr></thead>
            <tbody>${lin('Receitas', 'receitas')}${lin('Despesas', 'despesas')}${lin('Investimentos', 'investimentos')}${lin('Saldo (receitas − despesas)', 'saldo', cor)}</tbody></table></div>
          <p class="hint">Variação = (mês B − mês A) ÷ mês A. “—” quando o mês A é zero.</p></section>
        <section class="panel"><h2>Evolução dos últimos 6 meses</h2><div class="chart-box"><canvas id="cEvo" role="img" aria-label="Receitas e despesas por mês. Valores na tabela abaixo."></canvas></div>
          ${table('Evolução mensal', [{ h: 'Mês', f: (r) => esc(monthLabel(r.mes)) }, { h: 'Receitas', num: 1, f: (r) => money(r.receitas) }, { h: 'Despesas', num: 1, f: (r) => money(r.despesas) }, { h: 'Investimentos', num: 1, f: (r) => money(r.investimentos) }, { h: 'Saldo', num: 1, f: (r) => money(r.receitas - r.despesas) }], d.mensal)}</section>`;
      $('#comp').onsubmit = (e) => { e.preventDefault(); state.relA = $('#ma').value; state.relB = $('#mb').value; route(); };
      $('#pdf').onclick = () => window.print();
      $('#csv').onclick = () => exportCsv({ inicio: monthRange(a).inicio, fim: monthRange(b).fim });
      chart($('#cEvo'), { type: 'bar', data: { labels: d.mensal.map((m) => monthShort(m.mes)), datasets: [{ label: 'Receitas', data: d.mensal.map((m) => m.receitas), backgroundColor: '#0b5d45' }, { label: 'Despesas', data: d.mensal.map((m) => m.despesas), backgroundColor: '#b91c1c' }] },
        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { ticks: { callback: (v) => money(v) } } } } });
    },

    async metas() {
      const [m, f] = await Promise.all([api.get('/api/metas'), api.get('/api/funcionarios')]);
      view.innerHTML = `<div class="page-head"><h1>Metas</h1><button class="btn" type="button" id="novo">Nova meta</button></div>
        <section class="panel">${table('Metas', [{ h: 'Meta', f: (r) => esc(r.nome) }, { h: 'Responsável', f: (r) => esc(r.funcionarioNome || '—') },
          { h: 'Progresso', f: (r) => `<progress value="${r.progresso}" max="100" aria-label="Progresso de ${esc(r.nome)}"></progress><small>${money(r.valorAtual)} de ${money(r.valorObjetivo)} (${r.progresso}%)</small>` },
          { h: 'Prazo', f: (r) => date(r.dataLimite) }, { h: 'Ações', actions: 1, f: (r) => btnAct('edit', r.id, `Editar meta ${r.nome}`, 'Editar') + btnAct('del', r.id, `Excluir meta ${r.nome}`, 'Excluir', 'danger') }], m.items, 'Nenhuma meta cadastrada.')}</section>`;
      const form = (item) => openForm({ title: item ? 'Editar meta' : 'Nova meta', fields: [
        { name: 'nome', label: 'Nome da meta', required: 1, value: item?.nome, max: 120 },
        { name: 'funcionarioId', label: 'Funcionário responsável', type: 'select', value: item?.funcionarioId ?? '', options: [{ value: '', label: 'Nenhum' }, ...f.items.map((x) => ({ value: x.id, label: x.nome }))] },
        { name: 'valorObjetivo', label: 'Valor objetivo (R$)', required: 1, inputmode: 'decimal', value: moneyInput(item?.valorObjetivo) },
        { name: 'valorAtual', label: 'Valor atual (R$)', inputmode: 'decimal', value: moneyInput(item?.valorAtual ?? 0) },
        { name: 'dataLimite', label: 'Data limite', type: 'date', required: 1, value: item?.dataLimite }],
        onSubmit: async (v) => { await (item ? api.put('/api/metas/' + item.id, v) : api.post('/api/metas', v)); announce('Meta salva.'); route(); } });
      $('#novo').onclick = () => form(null);
      view.onclick = (e) => crudClick(e, m.items, form, '/api/metas/', 'Excluir esta meta?');
    },

    async funcionarios() {
      const d = await api.get('/api/funcionarios');
      view.innerHTML = `<div class="page-head"><h1>Funcionários</h1><button class="btn" type="button" id="novo">Novo funcionário</button></div>
        <section class="panel">${table('Funcionários', [{ h: 'Nome', f: (r) => esc(r.nome) }, { h: 'Cargo', f: (r) => esc(r.cargo || '—') }, { h: 'Salário', num: 1, f: (r) => money(r.salario) },
          { h: 'Admissão', f: (r) => date(r.dataAdmissao) }, { h: 'Situação', f: (r) => (r.ativo ? 'Ativo' : 'Inativo') },
          { h: 'Ações', actions: 1, f: (r) => btnAct('edit', r.id, `Editar ${r.nome}`, 'Editar') + btnAct('del', r.id, `Excluir ${r.nome}`, 'Excluir', 'danger') }], d.items, 'Nenhum funcionário cadastrado.')}</section>`;
      const form = (item) => openForm({ title: item ? 'Editar funcionário' : 'Novo funcionário', fields: [
        { name: 'nome', label: 'Nome', required: 1, value: item?.nome, max: 120 }, { name: 'cargo', label: 'Cargo', value: item?.cargo, max: 80 },
        { name: 'salario', label: 'Salário (R$)', required: 1, inputmode: 'decimal', value: moneyInput(item?.salario) },
        { name: 'dataAdmissao', label: 'Data de admissão', type: 'date', required: 1, value: item?.dataAdmissao }, { name: 'ativo', label: 'Funcionário ativo', type: 'checkbox', value: item ? item.ativo : true }],
        onSubmit: async (v) => { await (item ? api.put('/api/funcionarios/' + item.id, v) : api.post('/api/funcionarios', v)); announce('Funcionário salvo.'); route(); } });
      $('#novo').onclick = () => form(null);
      view.onclick = (e) => crudClick(e, d.items, form, '/api/funcionarios/', 'Excluir este funcionário? As metas dele ficarão sem responsável.');
    },

    async usuarios() {
      const [u, p] = await Promise.all([api.get('/api/users'), api.get('/api/perfis')]);
      const perfOpts = p.items.map((x) => ({ value: x.id, label: x.nome }));
      view.innerHTML = `<div class="page-head"><h1>Usuários e permissões</h1><button class="btn" type="button" id="novo">Novo usuário</button></div>
        <p class="hint">Administrador: tudo. Financeiro: painel, relatórios, metas, funcionários e edição/exclusão de movimentações de todos. Operador: lança e edita apenas as próprias movimentações.</p>
        <section class="panel">${table('Usuários', [{ h: 'Nome', f: (r) => esc(r.nome) }, { h: 'E-mail', f: (r) => esc(r.email) }, { h: 'Perfil', f: (r) => esc(r.perfil) },
          { h: 'Situação', f: (r) => (r.ativo ? 'Ativo' : 'Inativo') }, { h: 'Ações', actions: 1, f: (r) => btnAct('edit', r.id, `Editar ${r.nome}`, 'Editar') }], u.items)}</section>`;
      const form = (item) => openForm({ title: item ? 'Editar usuário' : 'Novo usuário', fields: [
        { name: 'nome', label: 'Nome', required: 1, value: item?.nome, max: 120 },
        ...(item ? [] : [{ name: 'email', label: 'E-mail', type: 'email', required: 1, autocomplete: 'off' }]),
        { name: 'senha', label: item ? 'Nova senha (opcional)' : 'Senha', type: 'password', required: !item, autocomplete: 'new-password', hint: 'Mínimo de 8 caracteres, com letra e número.' },
        { name: 'perfilId', label: 'Perfil', type: 'select', value: item?.perfilId, options: perfOpts },
        ...(item ? [{ name: 'ativo', label: 'Usuário ativo', type: 'checkbox', value: item.ativo }] : [])],
        onSubmit: async (v) => { if (item && !v.senha) delete v.senha; await (item ? api.put('/api/users/' + item.id, v) : api.post('/api/users', v)); announce('Usuário salvo.'); route(); } });
      $('#novo').onclick = () => form(null);
      view.onclick = (e) => { const b = e.target.closest('[data-act=edit]'); if (b) form(u.items.find((x) => x.id === Number(b.dataset.id))); };
    },

    async auditoria() {
      const d = await api.get('/api/auditoria?limit=150');
      view.innerHTML = `<div class="page-head"><h1>Auditoria</h1></div><p class="hint">Últimos 150 eventos relevantes (logins, bloqueios, acessos negados e alterações de dados).</p>
        <section class="panel">${table('Eventos de auditoria', [{ h: 'Quando', f: (r) => dateTime(r.em) }, { h: 'Usuário', f: (r) => esc(r.usuario || '—') }, { h: 'Ação', f: (r) => `<code>${esc(r.acao)}</code>` },
          { h: 'Item', f: (r) => (r.entidade ? `${esc(r.entidade)} #${r.entidadeId ?? ''}` : '—') }, { h: 'IP', f: (r) => esc(r.ip || '—') }], d.items)}</section>`;
    },
  };

  function crudClick(e, items, form, base, msg) {
    const b = e.target.closest('[data-act]'); if (!b) return; const item = items.find((x) => x.id === Number(b.dataset.id));
    if (b.dataset.act === 'edit') form(item);
    else if (confirm(msg)) api.del(base + item.id).then(() => { announce('Registro excluído.'); route(); }).catch(fail);
  }

  async function exportCsv(f) {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    try { await api.download('/api/transactions/export?' + qs, 'movimentacoes.csv'); announce('Arquivo CSV gerado.'); } catch (e) { fail(e); }
  }

  /** Formulário de movimentação: o tipo filtra a lista de categorias. */
  async function formMov(item, done) {
    const categorias = await cats();
    const tipoInicial = item?.tipo || 'despesa';
    const opcoes = (tipo) => categorias.filter((c) => c.tipo === tipo).map((c) => ({ value: c.id, label: c.nome }));
    openForm({ title: item ? 'Editar movimentação' : 'Nova movimentação', fields: [
      { name: 'tipo', label: 'Tipo', type: 'select', value: tipoInicial, options: Object.entries(TIPOS).map(([value, label]) => ({ value, label })) },
      { name: 'categoriaId', label: 'Categoria', type: 'select', required: 1, value: item?.categoria.id, options: opcoes(tipoInicial) },
      { name: 'descricao', label: 'Descrição', required: 1, value: item?.descricao, max: 120 },
      { name: 'valor', label: 'Valor (R$)', required: 1, inputmode: 'decimal', value: moneyInput(item?.valor), hint: 'Use vírgula para centavos. Ex.: 1250,90' },
      { name: 'data', label: 'Data', type: 'date', required: 1, value: item?.data || today() }],
      onRender: (f) => { f.elements.tipo.onchange = () => { f.elements.categoriaId.innerHTML = opcoes(f.elements.tipo.value).map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join(''); }; },
      onSubmit: async (v) => { const body = { descricao: v.descricao, valor: v.valor, data: v.data, categoriaId: Number(v.categoriaId) };
        await (item ? api.put('/api/transactions/' + item.id, body) : api.post('/api/transactions', body)); announce('Movimentação salva.'); done(); } });
  }

  /* ---------- roteamento ---------- */
  async function route() {
    const id = location.hash.slice(1) || 'visao';
    const item = allowed.find((n) => n.id === id) || allowed[0];
    charts.forEach((c) => c.destroy()); charts = []; view.onclick = null;
    $('#nav').querySelectorAll('a').forEach((a) => (a.dataset.id === item.id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    document.title = `${item.label} — FinanceControl`;
    view.innerHTML = '<p role="status">Carregando…</p>';
    try { await VIEWS[item.id](); } catch (e) { if (e.status !== 401) view.innerHTML = alertBox(e.message); }
    if (!view.contains(document.activeElement)) view.focus();
  }

  $('#sair').onclick = async () => { try { await api.post('/api/auth/logout'); } catch { /* sair mesmo offline */ } api.clear(); location.replace('/index.html'); };
  window.addEventListener('hashchange', route);

  (async function init() {
    try { me = (await api.get('/api/me')).usuario; api.setUser(me); } catch { return; }
    allowed = NAV.filter((n) => can(n.roles));
    $('#quem').textContent = me.nome; $('#perfil').textContent = 'Perfil: ' + me.perfil[0].toUpperCase() + me.perfil.slice(1);
    $('#nav').innerHTML = allowed.map((n) => `<a href="#${n.id}" data-id="${n.id}">${esc(n.label)}</a>`).join('');
    route();
  })();
})();

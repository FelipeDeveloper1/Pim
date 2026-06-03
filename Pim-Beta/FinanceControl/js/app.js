fcInit();
if (!fcGetSession()) {
  window.location.href = "index.html";
}

const usuario = fcGetUsuarioLogado();
const nomeEl = document.getElementById("userName");
if (nomeEl && usuario) nomeEl.textContent = usuario.nome || usuario.login;

document.getElementById("btnLogout")?.addEventListener("click", () => {
  fcClearSession();
  window.location.href = "index.html";
});

const views = document.querySelectorAll(".view-panel");
const navItems = document.querySelectorAll("nav .features[data-view]");

function showView(name) {
  views.forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  navItems.forEach((n) => n.classList.toggle("active", n.dataset.view === name));
  if (name === "visao") renderVisao();
  if (name === "relatorios") renderRelatorios();
  if (name === "metas") renderMetas();
  if (name === "funcionarios") renderFuncionarios();
}

navItems.forEach((item) => {
  item.addEventListener("click", () => showView(item.dataset.view));
});

function renderVisao() {
  const gastos = fcRead(FC_KEY.gastos, []);
  const lanc = fcRead(FC_KEY.lancamentos, []);
  const totalGastos = gastos.reduce((s, g) => s + Number(g.valor), 0);
  const totalLancGastos = lanc.filter((l) => l.tipo === "gasto").reduce((s, l) => s + Number(l.valor), 0);
  const totalInv = lanc.filter((l) => l.tipo === "investimento").reduce((s, l) => s + Number(l.valor), 0);

  document.getElementById("cardGastos").textContent = fcFormatMoney(totalGastos);
  document.getElementById("cardInvest").textContent = fcFormatMoney(totalInv);
  document.getElementById("cardLancGastos").textContent = fcFormatMoney(totalLancGastos);
  document.getElementById("totalGastosVisao").textContent = fcFormatMoney(totalGastos);

  const tbody = document.querySelector("#tabelaGastos tbody");
  if (!tbody) return;

  if (!gastos.length) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="table-empty">Nenhum gasto cadastrado.</td></tr>';
  } else {
    tbody.innerHTML = gastos
      .map(
        (g) =>
          `<tr><td>${escapeHtml(g.descricao)}</td><td>${fcFormatMoney(g.valor)}</td><td>${fcFormatDate(g.data)}</td><td>${escapeHtml(g.categoria)}</td></tr>`
      )
      .join("");
  }

  if (typeof renderChartsVisao === "function") renderChartsVisao();
}

function renderRelatorios() {
  const lanc = fcRead(FC_KEY.lancamentos, []);
  const gastos = lanc.filter((l) => l.tipo === "gasto");
  const inv = lanc.filter((l) => l.tipo === "investimento");
  const totalG = gastos.reduce((s, l) => s + Number(l.valor), 0);
  const totalI = inv.reduce((s, l) => s + Number(l.valor), 0);

  document.getElementById("relTotalGastos").textContent = fcFormatMoney(totalG);
  document.getElementById("relTotalInv").textContent = fcFormatMoney(totalI);
  document.getElementById("relSaldo").textContent = fcFormatMoney(totalI - totalG);

  fillTable(
    "#tabelaRelGastos",
    gastos,
    (l) =>
      `<tr><td>${fcFormatDate(l.data)}</td><td>${escapeHtml(l.observacao || "—")}</td><td>${fcFormatMoney(l.valor)}</td></tr>`
  );
  fillTable(
    "#tabelaRelInv",
    inv,
    (l) =>
      `<tr><td>${fcFormatDate(l.data)}</td><td>${escapeHtml(l.observacao || "—")}</td><td>${fcFormatMoney(l.valor)}</td></tr>`
  );
}

function renderMetas() {
  const metas = fcRead(FC_KEY.metas, []);
  const tbody = document.querySelector("#tabelaMetas tbody");
  if (!tbody) return;
  if (!metas.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="table-empty">Nenhuma meta. Clique em Nova meta.</td></tr>';
    return;
  }
  tbody.innerHTML = metas
    .map((m) => {
      const pct = m.valorObjetivo
        ? Math.min(100, (m.valorAtual / m.valorObjetivo) * 100).toFixed(0)
        : 0;
      return `<tr>
        <td>${escapeHtml(m.nome)}</td>
        <td>${fcFormatMoney(m.valorObjetivo)}</td>
        <td>${fcFormatMoney(m.valorAtual)} (${pct}%)</td>
        <td>${fcFormatDate(m.dataLimite)}</td>
        <td><button type="button" class="btn-sm btn-delete" data-del-meta="${m.id}">Excluir</button></td>
      </tr>`;
    })
    .join("");
  tbody.querySelectorAll("[data-del-meta]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Excluir esta meta?")) return;
      const id = btn.dataset.delMeta;
      fcWrite(
        FC_KEY.metas,
        fcRead(FC_KEY.metas, []).filter((m) => m.id !== id)
      );
      renderMetas();
    });
  });
}

function renderFuncionarios() {
  const lista = fcRead(FC_KEY.funcionarios, []);
  const tbody = document.querySelector("#tabelaFuncionarios tbody");
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="table-empty">Nenhum funcionário cadastrado.</td></tr>';
    return;
  }
  tbody.innerHTML = lista
    .map(
      (f) =>
        `<tr>
        <td>${escapeHtml(f.nome)}</td>
        <td>${escapeHtml(f.cargo || "—")}</td>
        <td>${fcFormatMoney(f.salario)}</td>
        <td>${fcFormatDate(f.dataAdmissao)}</td>
        <td>
          <button type="button" class="btn-sm btn-delete" data-del-func="${f.id}">Excluir</button>
        </td>
      </tr>`
    )
    .join("");
  tbody.querySelectorAll("[data-del-func]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Excluir funcionário?")) return;
      fcWrite(
        FC_KEY.funcionarios,
        fcRead(FC_KEY.funcionarios, []).filter((f) => f.id !== btn.dataset.delFunc)
      );
      renderFuncionarios();
    });
  });
}

function fillTable(sel, rows, rowHtml) {
  const tbody = document.querySelector(`${sel} tbody`);
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="table-empty">Sem registros.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(rowHtml).join("");
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

function openModal(id) {
  document.getElementById(id)?.classList.add("open");
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove("open");
}

document.querySelectorAll("[data-close-modal]").forEach((el) => {
  el.addEventListener("click", () => {
    el.closest(".modal-overlay-app")?.classList.remove("open");
  });
});

document.getElementById("btnNovaMeta")?.addEventListener("click", () => {
  document.getElementById("formMeta").reset();
  openModal("modalMeta");
});

document.getElementById("formMeta")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const metas = fcRead(FC_KEY.metas, []);
  metas.push({
    id: fcId(),
    nome: f.nome.value.trim(),
    valorObjetivo: Number(f.valorObjetivo.value),
    valorAtual: Number(f.valorAtual.value) || 0,
    dataLimite: f.dataLimite.value,
  });
  fcWrite(FC_KEY.metas, metas);
  closeModal("modalMeta");
  renderMetas();
});

document.getElementById("btnNovoFunc")?.addEventListener("click", () => {
  document.getElementById("formFunc").reset();
  openModal("modalFunc");
});

document.getElementById("formFunc")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const lista = fcRead(FC_KEY.funcionarios, []);
  lista.push({
    id: fcId(),
    nome: f.nome.value.trim(),
    cargo: f.cargo.value.trim(),
    salario: Number(f.salario.value),
    dataAdmissao: f.dataAdmissao.value,
    ativo: true,
  });
  fcWrite(FC_KEY.funcionarios, lista);
  closeModal("modalFunc");
  renderFuncionarios();
});

document.getElementById("btnNovoGasto")?.addEventListener("click", () => {
  const form = document.getElementById("formGasto");
  form?.reset();
  const dataInput = form?.querySelector('[name="data"]');
  if (dataInput) dataInput.valueAsDate = new Date();
  openModal("modalGasto");
});

document.getElementById("formGasto")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const gastos = fcRead(FC_KEY.gastos, []);
  gastos.push({
    id: fcId(),
    descricao: f.descricao.value.trim(),
    valor: Number(f.valor.value),
    data: f.data.value,
    categoria: f.categoria.value.trim() || "Geral",
  });
  fcWrite(FC_KEY.gastos, gastos);
  closeModal("modalGasto");
  renderVisao();
});

document.getElementById("btnNovoLanc")?.addEventListener("click", () => {
  const form = document.getElementById("formLanc");
  form?.reset();
  const dataInput = form?.querySelector('[name="data"]');
  if (dataInput) dataInput.valueAsDate = new Date();
  openModal("modalLanc");
});

document.getElementById("formLanc")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const lanc = fcRead(FC_KEY.lancamentos, []);
  lanc.push({
    id: fcId(),
    tipo: f.tipo.value,
    valor: Number(f.valor.value),
    observacao: f.observacao.value.trim(),
    data: f.data.value,
  });
  fcWrite(FC_KEY.lancamentos, lanc);
  closeModal("modalLanc");
  renderRelatorios();
});

const params = new URLSearchParams(window.location.search);
const startView = params.get("view") || "visao";
showView(startView);

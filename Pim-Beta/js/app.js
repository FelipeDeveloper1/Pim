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
  if (name === "visao") {
    renderVisao();
    return;
  }
  if (name === "relatorios") renderRelatorios();
  else if (name === "metas") renderMetas();
  else if (name === "funcionarios") renderFuncionarios();
}

navItems.forEach((item) => {
  item.addEventListener("click", () => showView(item.dataset.view));
});

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

function acoesCell(editAttr, delAttr) {
  return `<td class="acoes-cell">
    <button type="button" class="btn-sm btn-edit" ${editAttr}>Editar</button>
    <button type="button" class="btn-sm btn-delete" ${delAttr}>Excluir</button>
  </td>`;
}

function bindAcoes(tbody, onEdit, onDelete) {
  tbody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => onEdit(btn.dataset.edit));
  });
  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm("Excluir este registro?")) onDelete(btn.dataset.del);
    });
  });
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
      '<tr><td colspan="5" class="table-empty">Nenhum gasto cadastrado.</td></tr>';
  } else {
    tbody.innerHTML = gastos
      .map(
        (g) =>
          `<tr>
            <td>${escapeHtml(g.descricao)}</td>
            <td>${fcFormatMoney(g.valor)}</td>
            <td>${fcFormatDate(g.data)}</td>
            <td>${escapeHtml(g.categoria)}</td>
            ${acoesCell(`data-edit="${g.id}"`, `data-del="${g.id}"`)}
          </tr>`
      )
      .join("");
    bindAcoes(
      tbody,
      (id) => abrirModalGasto(gastos.find((g) => g.id === id)),
      (id) => {
        fcWrite(FC_KEY.gastos, gastos.filter((g) => g.id !== id));
        renderVisao();
      }
    );
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

  renderLancTable("#tabelaRelGastos", gastos, lanc);
  renderLancTable("#tabelaRelInv", inv, lanc);
}

function renderLancTable(sel, rows, allLanc) {
  const tbody = document.querySelector(`${sel} tbody`);
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Sem registros.</td></tr>';
    return;
  }
  tbody.innerHTML = rows
    .map(
      (l) =>
        `<tr>
          <td>${fcFormatDate(l.data)}</td>
          <td>${escapeHtml(l.observacao || "—")}</td>
          <td>${fcFormatMoney(l.valor)}</td>
          ${acoesCell(`data-edit="${l.id}"`, `data-del="${l.id}"`)}
        </tr>`
    )
    .join("");
  bindAcoes(
    tbody,
    (id) => abrirModalLanc(allLanc.find((l) => l.id === id)),
    (id) => {
      fcWrite(
        FC_KEY.lancamentos,
        allLanc.filter((l) => l.id !== id)
      );
      renderRelatorios();
      if (document.getElementById("view-visao")?.classList.contains("active")) renderVisao();
    }
  );
}

function renderMetas() {
  const metas = fcRead(FC_KEY.metas, []);
  const tbody = document.querySelector("#tabelaMetas tbody");
  if (!tbody) return;
  if (!metas.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="table-empty">Nenhuma meta. Clique em Nova meta.</td></tr>';
    return;
  }
  tbody.innerHTML = metas
    .map((m) => {
      const pct = m.valorObjetivo
        ? Math.min(100, (m.valorAtual / m.valorObjetivo) * 100).toFixed(0)
        : 0;
      return `<tr>
        <td>${escapeHtml(m.nome)}</td>
        <td>${escapeHtml(fcNomeFuncionario(m.funcionarioId))}</td>
        <td>${fcFormatMoney(m.valorObjetivo)}</td>
        <td>${fcFormatMoney(m.valorAtual)} (${pct}%)</td>
        <td>${fcFormatDate(m.dataLimite)}</td>
        ${acoesCell(`data-edit="${m.id}"`, `data-del="${m.id}"`)}
      </tr>`;
    })
    .join("");
  bindAcoes(
    tbody,
    (id) => abrirModalMeta(metas.find((m) => m.id === id)),
    (id) => {
      fcWrite(
        FC_KEY.metas,
        metas.filter((m) => m.id !== id)
      );
      renderMetas();
    }
  );
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
          ${acoesCell(`data-edit="${f.id}"`, `data-del="${f.id}"`)}
        </tr>`
    )
    .join("");
  bindAcoes(
    tbody,
    (id) => abrirModalFunc(lista.find((f) => f.id === id)),
    (id) => {
      const metas = fcRead(FC_KEY.metas, []);
      metas.forEach((m) => {
        if (m.funcionarioId === id) m.funcionarioId = "";
      });
      fcWrite(FC_KEY.metas, metas);
      fcWrite(
        FC_KEY.funcionarios,
        lista.filter((f) => f.id !== id)
      );
      renderFuncionarios();
      renderMetas();
    }
  );
}

function abrirModalGasto(item) {
  const form = document.getElementById("formGasto");
  document.getElementById("tituloModalGasto").textContent = item ? "Editar gasto" : "Novo gasto";
  form.editId.value = item?.id || "";
  form.descricao.value = item?.descricao || "";
  form.valor.value = item?.valor ?? "";
  form.data.value = item?.data || new Date().toISOString().slice(0, 10);
  form.categoria.value = item?.categoria || "";
  if (!item) {
    form.reset();
    form.data.valueAsDate = new Date();
  }
  openModal("modalGasto");
}

function abrirModalLanc(item) {
  const form = document.getElementById("formLanc");
  document.getElementById("tituloModalLanc").textContent = item ? "Editar lançamento" : "Novo lançamento";
  form.editId.value = item?.id || "";
  form.tipo.value = item?.tipo || "gasto";
  form.valor.value = item?.valor ?? "";
  form.observacao.value = item?.observacao || "";
  form.data.value = item?.data || new Date().toISOString().slice(0, 10);
  if (!item) {
    form.reset();
    form.data.valueAsDate = new Date();
  }
  openModal("modalLanc");
}

function abrirModalMeta(item) {
  const form = document.getElementById("formMeta");
  document.getElementById("tituloModalMeta").textContent = item ? "Editar meta" : "Nova meta";
  form.editId.value = item?.id || "";
  form.nome.value = item?.nome || "";
  form.valorObjetivo.value = item?.valorObjetivo ?? "";
  form.valorAtual.value = item?.valorAtual ?? 0;
  form.dataLimite.value = item?.dataLimite || "";
  fcPreencherSelectFuncionarios(
    document.getElementById("selectMetaFuncionario"),
    item?.funcionarioId || ""
  );
  openModal("modalMeta");
}

function abrirModalFunc(item) {
  const form = document.getElementById("formFunc");
  document.getElementById("tituloModalFunc").textContent = item ? "Editar funcionário" : "Novo funcionário";
  form.editId.value = item?.id || "";
  form.nome.value = item?.nome || "";
  form.cargo.value = item?.cargo || "";
  form.salario.value = item?.salario ?? "";
  form.dataAdmissao.value = item?.dataAdmissao || "";
  openModal("modalFunc");
}

document.getElementById("btnNovaMeta")?.addEventListener("click", () => abrirModalMeta(null));
document.getElementById("formMeta")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const metas = fcRead(FC_KEY.metas, []);
  const payload = {
    nome: f.nome.value.trim(),
    valorObjetivo: Number(f.valorObjetivo.value),
    valorAtual: Number(f.valorAtual.value) || 0,
    dataLimite: f.dataLimite.value,
    funcionarioId: f.funcionarioId.value || "",
  };
  if (f.editId.value) {
    const i = metas.findIndex((m) => m.id === f.editId.value);
    if (i >= 0) metas[i] = { ...metas[i], ...payload };
  } else {
    metas.push({ id: fcId(), ...payload });
  }
  fcWrite(FC_KEY.metas, metas);
  closeModal("modalMeta");
  renderMetas();
});

document.getElementById("btnNovoFunc")?.addEventListener("click", () => abrirModalFunc(null));
document.getElementById("formFunc")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const lista = fcRead(FC_KEY.funcionarios, []);
  const payload = {
    nome: f.nome.value.trim(),
    cargo: f.cargo.value.trim(),
    salario: Number(f.salario.value),
    dataAdmissao: f.dataAdmissao.value,
    ativo: true,
  };
  if (f.editId.value) {
    const i = lista.findIndex((x) => x.id === f.editId.value);
    if (i >= 0) lista[i] = { ...lista[i], ...payload };
  } else {
    lista.push({ id: fcId(), ...payload });
  }
  fcWrite(FC_KEY.funcionarios, lista);
  closeModal("modalFunc");
  renderFuncionarios();
  renderMetas();
});

document.getElementById("btnNovoGasto")?.addEventListener("click", () => abrirModalGasto(null));
document.getElementById("formGasto")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const gastos = fcRead(FC_KEY.gastos, []);
  const payload = {
    descricao: f.descricao.value.trim(),
    valor: Number(f.valor.value),
    data: f.data.value,
    categoria: f.categoria.value.trim() || "Geral",
  };
  if (f.editId.value) {
    const i = gastos.findIndex((g) => g.id === f.editId.value);
    if (i >= 0) gastos[i] = { ...gastos[i], ...payload };
  } else {
    gastos.push({ id: fcId(), ...payload });
  }
  fcWrite(FC_KEY.gastos, gastos);
  closeModal("modalGasto");
  renderVisao();
});

document.getElementById("btnNovoLanc")?.addEventListener("click", () => abrirModalLanc(null));
document.getElementById("formLanc")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const lanc = fcRead(FC_KEY.lancamentos, []);
  const payload = {
    tipo: f.tipo.value,
    valor: Number(f.valor.value),
    observacao: f.observacao.value.trim(),
    data: f.data.value,
  };
  if (f.editId.value) {
    const i = lanc.findIndex((l) => l.id === f.editId.value);
    if (i >= 0) lanc[i] = { ...lanc[i], ...payload };
  } else {
    lanc.push({ id: fcId(), ...payload });
  }
  fcWrite(FC_KEY.lancamentos, lanc);
  closeModal("modalLanc");
  renderRelatorios();
});

const params = new URLSearchParams(window.location.search);
showView(params.get("view") || "visao");

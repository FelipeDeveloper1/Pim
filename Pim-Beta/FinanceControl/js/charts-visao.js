let chartPizza = null;
let chartLinha = null;

const CORES_PIZZA = [
  "#226449",
  "#00df81",
  "#032221",
  "#22c55e",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#8b5cf6",
  "#64748b",
];

function agruparPorCategoria(gastos) {
  const map = {};
  gastos.forEach((g) => {
    const cat = (g.categoria || "Geral").trim() || "Geral";
    map[cat] = (map[cat] || 0) + Number(g.valor);
  });
  return map;
}

function agruparPorMes(items, filtroTipo) {
  const map = {};
  items.forEach((item) => {
    if (filtroTipo && item.tipo !== filtroTipo) return;
    const data = item.data;
    if (!data) return;
    const mes = data.slice(0, 7);
    map[mes] = (map[mes] || 0) + Number(item.valor);
  });
  return map;
}

function mesesOrdenados(...maps) {
  const set = new Set();
  maps.forEach((m) => Object.keys(m).forEach((k) => set.add(k)));
  return Array.from(set).sort();
}

function labelMes(yyyyMm) {
  if (!yyyyMm || yyyyMm.length < 7) return yyyyMm;
  const [y, m] = yyyyMm.split("-");
  const nomes = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${nomes[Number(m) - 1]}/${y.slice(2)}`;
}

function renderChartsVisao() {
  if (typeof Chart === "undefined") return;

  const gastos = fcRead(FC_KEY.gastos, []);
  const lanc = fcRead(FC_KEY.lancamentos, []);

  const ctxPizza = document.getElementById("graficoPizza");
  const ctxLinha = document.getElementById("graficoLinha");
  if (!ctxPizza || !ctxLinha) return;

  /* --- Pizza: gastos por categoria (ou gastos x investimentos) --- */
  let labelsPizza = [];
  let dadosPizza = [];

  const porCat = agruparPorCategoria(gastos);
  const cats = Object.keys(porCat);

  if (cats.length > 0) {
    labelsPizza = cats;
    dadosPizza = cats.map((c) => porCat[c]);
  } else {
    const gLanc = lanc
      .filter((l) => l.tipo === "gasto")
      .reduce((s, l) => s + Number(l.valor), 0);
    const iLanc = lanc
      .filter((l) => l.tipo === "investimento")
      .reduce((s, l) => s + Number(l.valor), 0);
    labelsPizza = ["Gastos", "Investimentos"];
    dadosPizza = [gLanc, iLanc];
  }

  if (chartPizza) chartPizza.destroy();
  chartPizza = new Chart(ctxPizza, {
    type: "pie",
    data: {
      labels: labelsPizza,
      datasets: [
        {
          data: dadosPizza,
          backgroundColor: CORES_PIZZA.slice(0, labelsPizza.length),
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#475569", padding: 12, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const v = ctx.parsed || 0;
              return ` ${ctx.label}: ${fcFormatMoney(v)}`;
            },
          },
        },
      },
    },
  });

  /* --- Linha: evolução mensal gastos x investimentos --- */
  const mesGastosCad = agruparPorMes(gastos);
  const mesGastosLanc = agruparPorMes(lanc, "gasto");
  const mesInvLanc = agruparPorMes(lanc, "investimento");

  const mesesGastos = {};
  mesesOrdenados(mesGastosCad, mesGastosLanc).forEach((mes) => {
    mesesGastos[mes] = (mesGastosCad[mes] || 0) + (mesGastosLanc[mes] || 0);
  });

  const meses = mesesOrdenados(mesesGastos, mesInvLanc);
  const labelsLinha = meses.map(labelMes);
  const serieGastos = meses.map((m) => mesesGastos[m] || 0);
  const serieInvest = meses.map((m) => mesInvLanc[m] || 0);

  if (chartLinha) chartLinha.destroy();
  chartLinha = new Chart(ctxLinha, {
    type: "line",
    data: {
      labels: labelsLinha.length ? labelsLinha : ["—"],
      datasets: [
        {
          label: "Gastos",
          data: labelsLinha.length ? serieGastos : [0],
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#ef4444",
        },
        {
          label: "Investimentos",
          data: labelsLinha.length ? serieInvest : [0],
          borderColor: "#226449",
          backgroundColor: "rgba(34, 100, 73, 0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#226449",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#475569", usePointStyle: true },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              return ` ${ctx.dataset.label}: ${fcFormatMoney(ctx.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "#f1f5f9" },
          ticks: { color: "#64748b" },
        },
        y: {
          beginAtZero: true,
          grid: { color: "#f1f5f9" },
          ticks: {
            color: "#64748b",
            callback: (v) =>
              Number(v).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              }),
          },
        },
      },
    },
  });
}

window.renderChartsVisao = renderChartsVisao;

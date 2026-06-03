/* Gráficos Visão geral — Chart.js */
(function () {
  let chartPizza = null;
  let chartLinha = null;
  let resizeObserver = null;

  const CORES = [
    "#226449", "#00df81", "#032221", "#22c55e", "#14b8a6",
    "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6", "#64748b",
  ];

  function getChartLib() {
    return typeof Chart !== "undefined" ? Chart : null;
  }

  function destroyIfExists(canvas) {
    if (!canvas || !getChartLib()) return;
    const old = Chart.getChart(canvas);
    if (old) old.destroy();
  }

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
      if (!item.data) return;
      const mes = String(item.data).slice(0, 7);
      map[mes] = (map[mes] || 0) + Number(item.valor);
    });
    return map;
  }

  function mesesOrdenados(...maps) {
    const set = new Set();
    maps.forEach((m) => Object.keys(m).forEach((k) => set.add(k)));
    return Array.from(set).sort();
  }

  function ultimosMeses(n) {
    const list = [];
    const d = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      list.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
    }
    return list;
  }

  function labelMes(yyyyMm) {
    const [y, m] = String(yyyyMm).split("-");
    const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${nomes[Number(m) - 1] || m}/${String(y).slice(2)}`;
  }

  function soma(arr) {
    return arr.reduce((s, v) => s + Number(v), 0);
  }

  function dadosPizza(gastos, lanc) {
    const porCat = agruparPorCategoria(gastos);
    const cats = Object.keys(porCat);
    if (cats.length > 0) {
      return {
        labels: cats,
        values: cats.map((c) => porCat[c]),
        cores: CORES.slice(0, cats.length),
        vazio: false,
      };
    }
    const g = lanc.filter((l) => l.tipo === "gasto").reduce((s, l) => s + Number(l.valor), 0);
    const i = lanc.filter((l) => l.tipo === "investimento").reduce((s, l) => s + Number(l.valor), 0);
    if (g + i > 0) {
      return { labels: ["Gastos", "Investimentos"], values: [g, i], cores: ["#ef4444", "#226449"], vazio: false };
    }
    return { labels: ["Sem dados"], values: [1], cores: ["#e2e8f0"], vazio: true };
  }

  function dadosLinha(gastos, lanc) {
    const mesGastosCad = agruparPorMes(gastos);
    const mesGastosLanc = agruparPorMes(lanc, "gasto");
    const mesInv = agruparPorMes(lanc, "investimento");
    const mesesGastos = {};
    mesesOrdenados(mesGastosCad, mesGastosLanc).forEach((mes) => {
      mesesGastos[mes] = (mesGastosCad[mes] || 0) + (mesGastosLanc[mes] || 0);
    });
    let meses = mesesOrdenados(mesesGastos, mesInv);
    if (!meses.length) meses = ultimosMeses(6);
    return {
      labels: meses.map(labelMes),
      gastos: meses.map((m) => mesesGastos[m] || 0),
      invest: meses.map((m) => mesInv[m] || 0),
    };
  }

  function criarPizza(canvas, info) {
    const ChartLib = getChartLib();
    destroyIfExists(canvas);
    chartPizza = new ChartLib(canvas, {
      type: "doughnut",
      data: {
        labels: info.labels,
        datasets: [{
          data: info.values,
          backgroundColor: info.cores,
          borderWidth: 2,
          borderColor: "#ffffff",
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 8 },
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, padding: 10, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label(t) {
                if (info.vazio) return " Cadastre gastos ou lançamentos";
                const val = t.raw ?? 0;
                return ` ${t.label}: ${fcFormatMoney(val)}`;
              },
            },
          },
        },
      },
    });
  }

  function criarLinha(canvas, info) {
    const ChartLib = getChartLib();
    destroyIfExists(canvas);
    chartLinha = new ChartLib(canvas, {
      type: "line",
      data: {
        labels: info.labels,
        datasets: [
          {
            label: "Gastos",
            data: info.gastos,
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.3,
          },
          {
            label: "Investimentos",
            data: info.invest,
            borderColor: "#226449",
            backgroundColor: "rgba(34, 100, 73, 0.15)",
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 8, right: 8, bottom: 0, left: 4 } },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, usePointStyle: true, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label(t) {
                return ` ${t.dataset.label}: ${fcFormatMoney(t.parsed.y)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(148, 163, 184, 0.25)" },
            ticks: {
              callback(v) {
                return Number(v).toLocaleString("pt-BR", {
                  notation: "compact",
                  compactDisplay: "short",
                });
              },
            },
          },
        },
      },
    });
  }

  function renderChartsVisao() {
    const aviso = document.getElementById("chartsAviso");
    const panel = document.getElementById("view-visao");
    const canvasPizza = document.getElementById("graficoPizza");
    const canvasLinha = document.getElementById("graficoLinha");

    if (!panel?.classList.contains("active")) return;
    if (!canvasPizza || !canvasLinha) return;

    if (!getChartLib()) {
      if (aviso) {
        aviso.textContent =
          "Gráficos indisponíveis: arquivo js/vendor/chart.umd.min.js não encontrado.";
        aviso.style.display = "block";
      }
      return;
    }
    if (aviso) aviso.style.display = "none";

    const gastos = fcRead(FC_KEY.gastos, []);
    const lanc = fcRead(FC_KEY.lancamentos, []);

    try {
      criarPizza(canvasPizza, dadosPizza(gastos, lanc));
      criarLinha(canvasLinha, dadosLinha(gastos, lanc));
    } catch (err) {
      console.error("Erro ao desenhar gráficos:", err);
      if (aviso) {
        aviso.textContent = "Erro ao exibir gráficos. Recarregue a página (Ctrl+F5).";
        aviso.style.display = "block";
      }
    }
  }

  function resizeCharts() {
    if (chartPizza) chartPizza.resize();
    if (chartLinha) chartLinha.resize();
  }

  function agendarChartsVisao() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        renderChartsVisao();
        resizeCharts();
      });
    });
  }

  function setupResizeObserver() {
    const row = document.querySelector(".charts-row");
    if (!row || resizeObserver) return;
    resizeObserver = new ResizeObserver(() => {
      if (document.getElementById("view-visao")?.classList.contains("active")) {
        resizeCharts();
      }
    });
    resizeObserver.observe(row);
  }

  window.renderChartsVisao = agendarChartsVisao;

  window.addEventListener("load", () => {
    setupResizeObserver();
    if (document.getElementById("view-visao")?.classList.contains("active")) {
      agendarChartsVisao();
    }
  });
})();

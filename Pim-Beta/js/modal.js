
let grafico;
let transacoes = [];

function carregarDados(dados){
    transacoes = dados;
    carregarGrafico();
}

function calcularResumo() {
    let gastos = 0;
    let investimentos = 0;

    transacoes.forEach(t => {
        if (t.tipo === "gasto") gastos += t.valor;
        if (t.tipo === "investimento") investimentos += t.valor;
    });

    return { gastos, investimentos };
}

function carregarGrafico() {
    const { gastos, investimentos } = calcularResumo();
    const ctx = document.getElementById('graficoFinanceiro');

    if (!ctx) return;
    if (typeof Chart === 'undefined') return;

    if (grafico) grafico.destroy();

    grafico = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Gastos', 'Investimentos'],
            datasets: [{
                data: [gastos, investimentos],
                backgroundColor: ['#ef4444','#22c55e']
            }]
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        color: '#e2e8f0'
                    }
                }
            }
        },
    });
}

function adicionarTransacao(tipo, valor) {
    if (!Number.isFinite(valor) || valor <= 0) return;

    transacoes.push({ tipo, valor });
    carregarGrafico();
}

window.adicionarTransacao = adicionarTransacao;

// dados mock iniciais
carregarDados([
    { tipo: "gasto", valor: 800 },
    { tipo: "investimento", valor: 400 }
]);

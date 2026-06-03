const popup = document.querySelector(".popup");
const closeModalButton = document.querySelector(".close");
const formGasto = document.querySelector("#form");
const formInvestimento = document.querySelector("#form_in");
const openButtons = document.querySelectorAll("[data-modal]");

if (!popup || !closeModalButton || !formGasto || !formInvestimento) {
    console.warn("FinanceControl: elementos do popup nao encontrados.");
}

function abrirModal(tipo) {
    if (!popup || !formGasto || !formInvestimento) return;
    popup.classList.remove("disable");

    if (tipo === "gasto") {
        formGasto.classList.remove("disable");
        formInvestimento.classList.add("disable");
    } else {
        formInvestimento.classList.remove("disable");
        formGasto.classList.add("disable");
    }
}

function fecharModal() {
    if (!popup || !formGasto || !formInvestimento) return;
    popup.classList.add("disable");
    formGasto.classList.add("disable");
    formInvestimento.classList.add("disable");
}

if (popup && closeModalButton && formGasto && formInvestimento) {
    openButtons.forEach((button) => {
        button.addEventListener("click", () => abrirModal(button.dataset.modal));
    });

    closeModalButton.addEventListener("click", fecharModal);

    popup.addEventListener("click", (event) => {
        if (event.target === popup) fecharModal();
    });

    formGasto.addEventListener("submit", (event) => {
        event.preventDefault();
        const valor = Number(document.querySelector("#cashout").value);
        if (typeof window.adicionarTransacao === "function") {
            window.adicionarTransacao("gasto", valor);
        }
        formGasto.reset();
        fecharModal();
    });

    formInvestimento.addEventListener("submit", (event) => {
        event.preventDefault();
        const valor = Number(document.querySelector("#investValue").value);
        if (typeof window.adicionarTransacao === "function") {
            window.adicionarTransacao("investimento", valor);
        }
        formInvestimento.reset();
        fecharModal();
    });
}
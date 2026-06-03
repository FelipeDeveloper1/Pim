const btnFuncionarios = document.querySelector('.employe');
const modal = document.querySelector('.modal-overlay_employer');
const fechar = document.querySelector('.modal-close');

if (btnFuncionarios && modal) {
    btnFuncionarios.addEventListener('click', (event) => {
        if (event.target.closest('.modal-overlay_employer')) return;
        modal.style.display = 'flex';
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.style.display = 'none';
    });
}

if (fechar && modal) {
    fechar.addEventListener('click', (event) => {
        event.stopPropagation();
        modal.style.display = 'none';
    });
}
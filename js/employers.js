const btnFuncionarios = document.querySelector('.employe');
const modal = document.querySelector('.modal-overlay_employer');
const fechar = document.querySelector('.modal-close');

btnFuncionarios.addEventListener('click', () => {
    modal.style.display = 'flex';
});

fechar.addEventListener('click', () => {
    console.log(modal.style.display )
    modal.style.display = 'none';
});
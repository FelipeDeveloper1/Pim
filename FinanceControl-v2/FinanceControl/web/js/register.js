(() => {
  'use strict';
  const api = FCApi.create(sessionStorage);
  const form = document.getElementById('form'), erro = document.getElementById('erro'), btn = document.getElementById('enviar');
  const campos = ['nome', 'email', 'senha', 'confirmar'];
  const limpar = () => { erro.hidden = true; campos.forEach((c) => { document.getElementById(c + '_e').textContent = ''; form[c].removeAttribute('aria-invalid'); }); };
  const marcar = (c, msg) => { document.getElementById(c + '_e').textContent = msg; form[c].setAttribute('aria-invalid', 'true'); };

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); limpar();
    if (form.senha.value !== form.confirmar.value) { marcar('confirmar', 'As senhas não coincidem.'); form.confirmar.focus(); return; }
    btn.disabled = true;
    try {
      await api.post('/api/auth/register', { nome: form.nome.value.trim(), email: form.email.value.trim(), senha: form.senha.value });
      location.replace('/index.html?criada=1');
    } catch (err) {
      const d = err.detalhes || {};
      const primeiro = campos.find((c) => d[c]);
      Object.keys(d).forEach((c) => form[c] && marcar(c, d[c]));
      if (primeiro) form[primeiro].focus(); else { erro.textContent = err.message; erro.hidden = false; }
    } finally { btn.disabled = false; }
  });
})();

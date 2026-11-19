(() => {
  'use strict';
  const api = FCApi.create(sessionStorage);
  if (api.token()) { location.replace('/app.html'); return; }
  const form = document.getElementById('form'), erro = document.getElementById('erro'), btn = document.getElementById('entrar');
  const q = new URLSearchParams(location.search);
  if (q.get('expirou')) document.getElementById('aviso').innerHTML = '<p class="notice">Sua sessão expirou. Entre novamente.</p>';
  if (q.get('criada')) document.getElementById('aviso').innerHTML = '<p class="ok">Conta criada! Faça login.</p>';

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); erro.hidden = true;
    const email = form.email.value.trim(), senha = form.senha.value;
    if (!email || !senha) { erro.textContent = 'Informe e-mail e senha.'; erro.hidden = false; (email ? form.senha : form.email).focus(); return; }
    btn.disabled = true;
    try {
      const r = await api.post('/api/auth/login', { email, senha });
      api.setSession(r.token, r.usuario);
      location.replace('/app.html');
    } catch (err) { erro.textContent = err.message; erro.hidden = false; form.senha.value = ''; form.senha.focus(); }
    finally { btn.disabled = false; }
  });
})();

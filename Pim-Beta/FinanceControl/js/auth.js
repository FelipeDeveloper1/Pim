fcInit();

const fcPage = (window.location.pathname.split("/").pop() || "app.html").toLowerCase();
if (fcGetSession() && (fcPage === "app.html" || fcPage === "register.html" || fcPage === "")) {
  window.location.href = "app.html";
}

function fcBindLogin(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const login = form.login.value.trim();
    const senha = form.senha.value;
    const erro = document.getElementById("erroLogin");
    const r = fcLogin(login, senha);
    if (!r.ok) {
      if (erro) {
        erro.textContent = r.erro;
        erro.style.display = "block";
      }
      return;
    }
    window.location.href = "app.html";
  });
}

function fcBindRegister(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const erro = document.getElementById("erroRegister");
    if (form.senha.value !== form.confirmar.value) {
      if (erro) {
        erro.textContent = "As senhas não coincidem.";
        erro.style.display = "block";
      }
      return;
    }
    const r = fcRegistrar({
      nome: form.nome.value.trim(),
      login: form.login.value.trim(),
      senha: form.senha.value,
    });
    if (!r.ok) {
      if (erro) {
        erro.textContent = r.erro;
        erro.style.display = "block";
      }
      return;
    }
    alert("Conta criada! Faça login.");
    window.location.href = "app.html";
  });
}

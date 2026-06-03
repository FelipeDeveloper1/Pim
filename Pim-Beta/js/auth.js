fcInit();

function fcCurrentPage() {
  const path = (window.location.pathname || "").toLowerCase();
  const href = (window.location.href || "").toLowerCase();
  if (path.endsWith("register.html") || href.endsWith("register.html")) return "register.html";
  if (path.endsWith("app.html") || href.endsWith("app.html")) return "app.html";
  if (path.endsWith("index.html") || href.endsWith("index.html")) return "index.html";
  if (path.endsWith("/") || href.endsWith("/")) return "index.html";
  return path.split("/").pop() || "index.html";
}

const fcPage = fcCurrentPage();
if (fcGetSession() && (fcPage === "index.html" || fcPage === "register.html")) {
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
    window.location.href = "index.html";
  });
}

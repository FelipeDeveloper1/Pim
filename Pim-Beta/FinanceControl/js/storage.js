const FC_KEY = {
  usuarios: "fc_usuarios",
  session: "fc_session",
  gastos: "fc_gastos",
  lancamentos: "fc_lancamentos",
  metas: "fc_metas",
  funcionarios: "fc_funcionarios",
  seeded: "fc_seeded",
};

function fcRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function fcWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function fcId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function fcInit() {
  if (localStorage.getItem(FC_KEY.seeded)) return;

  fcWrite(FC_KEY.usuarios, [
    {
      id: "admin",
      login: "admin",
      senha: "Admin@123",
      nome: "Administrador",
    },
  ]);

  const hoje = new Date().toISOString().slice(0, 10);
  fcWrite(FC_KEY.gastos, [
    { id: fcId(), descricao: "Aluguel", valor: 1200, data: hoje, categoria: "Moradia" },
    { id: fcId(), descricao: "Mercado", valor: 450, data: hoje, categoria: "Alimentação" },
  ]);

  fcWrite(FC_KEY.lancamentos, [
    { id: fcId(), tipo: "gasto", valor: 800, observacao: "Contas", data: hoje },
    { id: fcId(), tipo: "investimento", valor: 1500, observacao: "Poupança", data: hoje },
  ]);

  fcWrite(FC_KEY.metas, [
    {
      id: fcId(),
      nome: "Reserva de emergência",
      valorObjetivo: 10000,
      valorAtual: 2500,
      dataLimite: "2026-12-31",
    },
  ]);

  fcWrite(FC_KEY.funcionarios, [
    {
      id: fcId(),
      nome: "Maria Silva",
      cargo: "Analista",
      salario: 4500,
      dataAdmissao: "2024-03-01",
      ativo: true,
    },
  ]);

  localStorage.setItem(FC_KEY.seeded, "1");
}

function fcGetSession() {
  return fcRead(FC_KEY.session, null);
}

function fcSetSession(userId) {
  fcWrite(FC_KEY.session, { userId });
}

function fcClearSession() {
  localStorage.removeItem(FC_KEY.session);
}

function fcGetUsuarioLogado() {
  const s = fcGetSession();
  if (!s) return null;
  return fcRead(FC_KEY.usuarios, []).find((u) => u.id === s.userId) || null;
}

function fcLogin(login, senha) {
  const user = fcRead(FC_KEY.usuarios, []).find(
    (u) => u.login === login && u.senha === senha
  );
  if (!user) return { ok: false, erro: "Login ou senha incorretos." };
  fcSetSession(user.id);
  return { ok: true, usuario: user };
}

function fcRegistrar(dados) {
  const users = fcRead(FC_KEY.usuarios, []);
  if (users.some((u) => u.login === dados.login)) {
    return { ok: false, erro: "Este login já existe." };
  }
  const user = {
    id: fcId(),
    login: dados.login,
    senha: dados.senha,
    nome: dados.nome,
  };
  users.push(user);
  fcWrite(FC_KEY.usuarios, users);
  return { ok: true };
}

function fcFormatMoney(v) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fcFormatDate(s) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

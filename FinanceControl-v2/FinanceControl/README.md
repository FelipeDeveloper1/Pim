# FinanceControl v2

Gestão financeira empresarial — evolução do protótipo `localStorage` para uma solução integrada:
**API REST + banco relacional + aplicação web + aplicativo mobile (PWA)**, conforme o PIM IV.

## Como rodar (Windows, Mac ou Linux)

Requisito único: **Node.js 22.13 ou superior** (https://nodejs.org). Não há `npm install` — a API não usa dependências externas.

| Sistema | Comando |
|---|---|
| Windows | duplo clique em `iniciar.bat` |
| Mac/Linux | `./iniciar.sh` |
| Qualquer um | `npm run demo` (com dados de exemplo) ou `npm start` (banco vazio) |

Depois abra:
- **Web:** http://localhost:3000/
- **Mobile (PWA):** http://localhost:3000/mobile/ — no celular, use o IP do computador e "Adicionar à tela inicial".
- **API:** http://localhost:3000/api/health

### Contas de demonstração (somente com `npm run demo`)
| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@financecontrol.local` | `Admin@123` |
| Financeiro | `financeiro@financecontrol.local` | `Demo@1234` |
| Operador | `operador@financecontrol.local` | `Demo@1234` |

O mês atual dos dados de demonstração reproduz os números do PDF: receitas R$ 8.350, despesas R$ 3.180, investimentos R$ 2.420, saldo R$ 5.170.
**Em produção** defina `ADMIN_PASSWORD` e `JWT_SECRET` (o servidor se recusa a iniciar sem eles). Veja `.env.example`.

## Estrutura

```
api/        servidor HTTP, rotas REST, segurança (scrypt, JWT), testes automatizados
db/         schema.sql (SQLite, usado pela aplicação) · sqlserver/ (T-SQL de referência do PDF)
web/        aplicação web (HTML/CSS/JS puro)         shared/  cliente da API, formatação, Chart.js
mobile/     aplicativo mobile PWA (manifest, service worker, 6 telas)
e2e/        testes ponta a ponta no navegador (Playwright, opcional)
Dockerfile · docker-compose.yml · .github/workflows/ci.yml · docs/
```

## API REST (seção 3.4.2)

Todas as rotas, exceto login/cadastro/health, exigem `Authorization: Bearer <token>`.

| Método e rota | Finalidade | Quem acessa |
|---|---|---|
| `POST /api/auth/login` | Autentica e emite token (8 h) | Público |
| `POST /api/auth/register` | Cadastro (entra como Operador) | Público |
| `GET /api/dashboard` | Totais, saldo, despesas por categoria, evolução de 6 meses | Autenticado |
| `GET /api/dashboard/comparacao?a=AAAA-MM&b=AAAA-MM` | Comparação entre dois meses | Autenticado |
| `GET /api/transactions` | Lista com filtros `inicio, fim, tipo, categoriaId, q, page, limit` | Autenticado |
| `POST /api/transactions` | Cria movimentação | Autenticado |
| `GET · PUT /api/transactions/{id}` | Consulta · atualiza | Dono (Operador) ou Financeiro/Admin |
| `DELETE /api/transactions/{id}` | Inativa (exclusão lógica) | Financeiro / Admin |
| `GET /api/transactions/export` | CSV (abre no Excel) | Autenticado |
| `GET · POST /api/categories` | Lista · cria | Autenticado · Financeiro/Admin |
| `/api/users`, `/api/perfis`, `/api/auditoria` | Usuários, perfis, trilha de auditoria | Admin |
| `/api/funcionarios`, `/api/metas` | Módulos do protótipo anterior | Financeiro / Admin |

Erros seguem `{ "erro": { "codigo", "mensagem", "detalhes" } }`. Nunca expõem SQL, caminhos ou stack trace.

## Perfis (RF05)

| | Administrador | Financeiro | Operador |
|---|:-:|:-:|:-:|
| Lançar e editar movimentações | todas | todas | só as próprias |
| Ver painel e relatórios | organização | organização | só os próprios |
| Excluir (inativar) movimentação | ✔ | ✔ | ✘ |
| Metas e funcionários | ✔ | ✔ | ✘ |
| Usuários, perfis e auditoria | ✔ | ✘ | ✘ |

## Testes

```bash
npm test                      # 34 testes da API (segurança, permissões, regras de negócio, auditoria)
npm i -g playwright && npx playwright install chromium
npm run demo                  # em outro terminal
NODE_PATH=$(npm root -g) node e2e/web.e2e.js && NODE_PATH=$(npm root -g) node e2e/mobile.e2e.js   # porta 3000: BASE=http://localhost:3000
```

## Docker

```bash
cp .env.example .env   # preencha JWT_SECRET e ADMIN_PASSWORD
docker compose up -d --build
```
O app fala HTTP na porta 3000. **HTTPS (certificado TLS) é responsabilidade do proxy/serviço de nuvem** na frente dele; com `TRUST_PROXY=true` o servidor passa a enviar HSTS.

Leia `docs/ATUALIZACOES.md` para o mapeamento detalhado entre o PDF e o código, e o que ainda precisa ser ajustado no texto.

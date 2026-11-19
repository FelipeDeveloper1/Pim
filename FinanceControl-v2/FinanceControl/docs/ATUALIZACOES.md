# Do PDF ao código — o que foi implementado

Legenda: ✅ implementado e testado · 🟡 implementado com ressalva · 📄 preparado, mas não executado · ❌ não implementado

## Requisitos (Figura 2)
| ID | Requisito | Situação | Onde |
|---|---|:-:|---|
| RF01 | Cadastrar e autenticar usuários | ✅ | `routes/auth.js`, telas de login/cadastro (web e mobile) |
| RF02 | Registrar receitas, despesas e investimentos | ✅ | `routes/transactions.js` |
| RF03 | Painel com totais e gráficos | ✅ | `routes/dashboard.js`, tela "Visão geral" |
| RF04 | Filtrar por período e categoria | ✅ | `GET /api/transactions`, tela "Movimentações" |
| RF05 | Administrar usuários e permissões | ✅ | `routes/admin.js`, tela "Usuários" |
| RNF01 | Comunicação por HTTPS | 🟡 | O app serve HTTP; TLS fica no proxy/nuvem. Envia HSTS atrás de proxy |
| RNF02 | Interface responsiva e acessível | 🟡 | Ver "Acessibilidade" abaixo |
| RNF03 | Persistência em banco relacional | ✅ | SQLite (`db/schema.sql`) — ver "Banco de dados" |
| RNF04 | Registrar eventos para auditoria | ✅ | tabela `auditoria`, trigger, tela "Auditoria" |

## Seção a seção
| Seção do PDF | Situação | Observação |
|---|:-:|---|
| 3.4 Web (frontend → API → banco) | ✅ | O front não acessa o banco; tudo passa pela API. O array em memória foi removido |
| 3.4.2 APIs REST | ✅ | Os 8 endpoints do quadro, mais os de apoio |
| 3.4.3 Senhas com hash | ✅ | scrypt com salt aleatório (não há senha em texto puro, nem no `localStorage`) |
| 3.4.3 Token com prazo | ✅ | JWT HS256, 8 h; perfil e status do usuário são relidos do banco a cada requisição |
| 3.4.3 Limite de tentativas | ✅ | 5 falhas / 15 min por IP + e-mail → HTTP 429 |
| 3.4.3 Validação no servidor, proteção contra injeção, acesso a registros de outros | ✅ | SQL parametrizado; Operador recebe 404 em registros alheios; testado |
| 3.4.3 Segredos fora do Git | ✅ | `.gitignore`; CI falha se `.env`, `.db` ou segredo forem versionados |
| 3.5 Mobile — 6 telas e fluxo | 🟡 | Telas implementadas como **PWA**, não app nativo — ver abaixo |
| 3.5.2 Apenas online + mensagem sem conexão | ✅ | Banner e mensagem; service worker nunca guarda dados da API (testado) |
| 3.6 Camadas e módulos | 🟡 | Separação por módulos (`routes/`, `security.js`, `db.js`). O PDF descreve POO com classes; o código é modular em funções (JavaScript) |
| 3.7 Banco: MER, dicionário | 🟡 | Mesmas tabelas e relações. Valor em centavos (`INTEGER`) em vez de `DECIMAL(12,2)`; `Categoria.Tipo` em minúsculas |
| 3.7.3 Procedure e trigger | 🟡 | Trigger de auditoria ✅ (SQLite). SQLite não tem *stored procedure*: a regra fica na API. T-SQL de `sp_RegistrarTransacao` em `db/sqlserver/` 📄 |
| 3.7.4 Índices, CHECK, UNIQUE, FK; agregação no servidor | ✅ | `db/schema.sql` |
| 3.8 Docker, compose, CI/CD | 📄 | Escritos, **não executados** (sem Docker nesta máquina). Deploy em nuvem é *placeholder* |
| 3.8.2 Monitoramento e backup | ❌ | Há log de requisições e `/api/health`; monitoramento e rotina de backup não foram feitos |
| 3.3 Acessibilidade | 🟡 | Teclado, foco visível, rótulos, `aria-invalid`, `<dialog>`, tabelas alternativas aos gráficos, variação com ▲▼. **Pendente (manual):** teste com leitor de tela e relatório de contraste |
| "Comparar resultados entre meses" | ✅ | `GET /api/dashboard/comparacao` |
| "Exportação de dados" | ✅ | CSV (web e mobile); "PDF" usa a impressão do navegador (Salvar como PDF) |

## Trechos do PDF que precisam ser ajustados para refletir o código
1. **3.5 / 3.5.2 – "Android e iOS" e "armazenamento seguro do sistema operacional".** O app é um PWA instalável nos dois sistemas; o token fica em `localStorage`. Reescreva como PWA, ou deixe o app nativo (Keychain/Keystore) como evolução futura.
2. **3.7 / Figuras 5–8 – SQL Server.** O banco que roda é SQLite. Ou troque as figuras pelo `db/schema.sql`, ou cite o T-SQL como alternativa.
3. **Figura 8 (Procedure).** O trecho mostra `CREATE PROCEDURE USERDB;`, que não é T-SQL válido. Use a `sp_RegistrarTransacao` de `db/sqlserver/01-modelo-pim.sql`.
4. **3.4.1 / 3.8 – HTTPS.** Diga que o TLS é terminado no proxy/provedor.
5. **3.7.2 – `DECIMAL(12,2)`.** Mencione que o valor é guardado em centavos.
6. **Seção 3.8 e 3.9 (verbos no passado).** "Foram feitas" testes de responsividade, etc.: hoje há 34 testes automatizados da API e roteiros E2E; a nuvem ainda é planejamento.
7. **Recuperação de senha (tela de login do mobile).** Não existe envio de e-mail; o app orienta pedir a um administrador (que redefine em "Usuários"). Ajuste a tabela da seção 3.5.1.
8. **Aba "Metas" do mobile (Figuras 3–4).** A tabela 3.5.1 lista 6 telas (sem Metas); no mobile ela foi trocada por "Perfil". Metas e Funcionários continuam na web.
9. **Referências** estão com "Acesso em" de outubro de 2026: confirme as datas.

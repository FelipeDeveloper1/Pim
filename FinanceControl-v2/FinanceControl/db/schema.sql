-- FinanceControl v2 — modelo físico (SQLite)
-- Segue o MER e o dicionário de dados da seção 3.7 da documentação:
-- PERFIL 1-N USUARIO, USUARIO 1-N TRANSACAO, CATEGORIA 1-N TRANSACAO, USUARIO 1-N AUDITORIA.
-- Valores monetários ficam em centavos (INTEGER) para evitar erro de arredondamento;
-- a API converte de/para reais (equivalente a DECIMAL(12,2)).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS perfil (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE CHECK (length(nome) BETWEEN 1 AND 40)
);

CREATE TABLE IF NOT EXISTS usuario (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 120),
  email      TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(email) BETWEEN 3 AND 160),
  hash_senha TEXT NOT NULL,
  perfil_id  INTEGER NOT NULL REFERENCES perfil(id),
  ativo      INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  criado_em  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS categoria (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 80),
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa', 'investimento')),
  UNIQUE (nome, tipo)
);

CREATE TABLE IF NOT EXISTS transacao (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  descricao      TEXT NOT NULL CHECK (length(descricao) BETWEEN 1 AND 120),
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  data_movimento TEXT NOT NULL CHECK (date(data_movimento) IS NOT NULL AND date(data_movimento) = data_movimento),
  usuario_id     INTEGER NOT NULL REFERENCES usuario(id),
  categoria_id   INTEGER NOT NULL REFERENCES categoria(id),
  ativo          INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),   -- exclusão lógica (inativar)
  criado_em      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  atualizado_em  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
-- Índices para os filtros do painel (seção 3.7.4): usuário, data, categoria.
CREATE INDEX IF NOT EXISTS ix_transacao_usuario_data ON transacao (usuario_id, data_movimento);
CREATE INDEX IF NOT EXISTS ix_transacao_data         ON transacao (data_movimento);
CREATE INDEX IF NOT EXISTS ix_transacao_categoria    ON transacao (categoria_id);

CREATE TABLE IF NOT EXISTS auditoria (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id  INTEGER REFERENCES usuario(id),
  acao        TEXT NOT NULL,
  entidade    TEXT,
  entidade_id INTEGER,
  detalhe     TEXT,
  ip          TEXT,
  criado_em   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS ix_auditoria_criado ON auditoria (criado_em);

-- Módulos mantidos do protótipo anterior (Funcionários e Metas)
CREATE TABLE IF NOT EXISTS funcionario (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  nome             TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 120),
  cargo            TEXT CHECK (cargo IS NULL OR length(cargo) <= 80),
  salario_centavos INTEGER NOT NULL CHECK (salario_centavos >= 0),
  data_admissao    TEXT NOT NULL CHECK (date(data_admissao) IS NOT NULL AND date(data_admissao) = data_admissao),
  ativo            INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
);

CREATE TABLE IF NOT EXISTS meta (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  nome                   TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 120),
  valor_objetivo_centavos INTEGER NOT NULL CHECK (valor_objetivo_centavos > 0),
  valor_atual_centavos    INTEGER NOT NULL DEFAULT 0 CHECK (valor_atual_centavos >= 0),
  data_limite            TEXT NOT NULL CHECK (date(data_limite) IS NOT NULL AND date(data_limite) = data_limite),
  funcionario_id         INTEGER REFERENCES funcionario(id) ON DELETE SET NULL
);

-- Contexto do usuário que está gravando: permite que a trigger registre QUEM alterou.
-- A API define o usuário imediatamente antes de cada escrita (ver db.js: withActor).
CREATE TABLE IF NOT EXISTS app_contexto (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  usuario_id INTEGER
);
INSERT OR IGNORE INTO app_contexto (id, usuario_id) VALUES (1, NULL);

-- Triggers de auditoria da tabela transacao (seção 3.7.3).
CREATE TRIGGER IF NOT EXISTS trg_transacao_ai AFTER INSERT ON transacao
BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, detalhe)
  VALUES ((SELECT usuario_id FROM app_contexto WHERE id = 1), 'transacao.criada', 'transacao', NEW.id,
          json_object('valor_centavos', NEW.valor_centavos, 'categoria_id', NEW.categoria_id, 'data', NEW.data_movimento));
END;

CREATE TRIGGER IF NOT EXISTS trg_transacao_au AFTER UPDATE ON transacao
BEGIN
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, detalhe)
  VALUES ((SELECT usuario_id FROM app_contexto WHERE id = 1),
          CASE WHEN OLD.ativo = 1 AND NEW.ativo = 0 THEN 'transacao.inativada' ELSE 'transacao.atualizada' END,
          'transacao', NEW.id,
          json_object('de',   json_object('valor_centavos', OLD.valor_centavos, 'categoria_id', OLD.categoria_id, 'data', OLD.data_movimento),
                      'para', json_object('valor_centavos', NEW.valor_centavos, 'categoria_id', NEW.categoria_id, 'data', NEW.data_movimento)));
END;

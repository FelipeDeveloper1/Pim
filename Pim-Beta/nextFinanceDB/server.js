const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Caminho do banco de dados
const dbPath = path.join(__dirname, 'database.sqlite');
const schemaPath = path.join(__dirname, 'schema.sql');

// Inicializar banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite');
        inicializarBanco();
    }
});

// Função para inicializar o banco de dados
function inicializarBanco() {
    // Verificar se o schema já foi aplicado
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='transacoes'", (err, row) => {
        if (err) {
            console.error('Erro ao verificar tabelas:', err.message);
            return;
        }
        
        if (!row) {
            // Aplicar schema
            const schema = fs.readFileSync(schemaPath, 'utf8');
            db.exec(schema, (err) => {
                if (err) {
                    console.error('Erro ao criar tabelas:', err.message);
                } else {
                    console.log('Tabelas criadas com sucesso');
                }
            });
        } else {
            console.log('Tabelas já existem');
        }
    });
}

// API - Transações
app.get('/api/transacoes', (req, res) => {
    db.all('SELECT * FROM transacoes ORDER BY data_criacao DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/transacoes', (req, res) => {
    const { tipo, valor, descricao, metodo } = req.body;
    
    if (!tipo || !valor) {
        res.status(400).json({ error: 'Tipo e valor são obrigatórios' });
        return;
    }
    
    const sql = 'INSERT INTO transacoes (tipo, valor, descricao, metodo) VALUES (?, ?, ?, ?)';
    const params = [tipo, valor, descricao || null, metodo || null];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, tipo, valor, descricao, metodo });
    });
});

app.delete('/api/transacoes/:id', (req, res) => {
    const sql = 'DELETE FROM transacoes WHERE id = ?';
    db.run(sql, req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Transação deletada' });
    });
});

// API - Funcionários
app.get('/api/funcionarios', (req, res) => {
    db.all('SELECT * FROM funcionarios ORDER BY data_criacao DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/funcionarios', (req, res) => {
    const { nome, salario, setor } = req.body;
    
    if (!nome || !salario) {
        res.status(400).json({ error: 'Nome e salário são obrigatórios' });
        return;
    }
    
    const sql = 'INSERT INTO funcionarios (nome, salario, setor) VALUES (?, ?, ?)';
    const params = [nome, salario, setor || null];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, nome, salario, setor });
    });
});

app.delete('/api/funcionarios/:id', (req, res) => {
    const sql = 'DELETE FROM funcionarios WHERE id = ?';
    db.run(sql, req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Funcionário deletado' });
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

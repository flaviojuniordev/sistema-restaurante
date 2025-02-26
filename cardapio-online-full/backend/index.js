const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:3000' } });
const port = 3001;

app.use(cors());
app.use(express.json());

const SECRET_KEY = 'sua-chave-secreta-aqui';

// Conexão com o banco de dados
const db = new sqlite3.Database('./data/database.sqlite', (err) => {
    if (err) console.error('Erro ao conectar ao banco:', err);
    else console.log('Conectado ao banco SQLite');
});

// Criação e atualização das tabelas
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'garcom')`);
    db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'garcom'`, (err) => { if (err && err.code !== 'SQLITE_ERROR') console.error(err); });

    // Criação da tabela products (com type)
    db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL
    )
  `);
    // Adicionar a coluna type se não existir
    db.run(`ALTER TABLE products ADD COLUMN type TEXT DEFAULT 'food'`, (err) => {
        if (err && err.code !== 'SQLITE_ERROR') console.error('Erro ao adicionar coluna type:', err);
    });

    db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, table_number TEXT NOT NULL, items TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)');
    insertUser.run('garcom1', bcrypt.hashSync('senha123', 10), 'garcom');
    insertUser.run('garcom2', bcrypt.hashSync('senha456', 10), 'garcom');
    insertUser.run('admin', bcrypt.hashSync('admin123', 10), 'admin');
    insertUser.finalize();

    const insertProduct = db.prepare('INSERT OR IGNORE INTO products (name, description, price, category, type) VALUES (?, ?, ?, ?, ?)');
    insertProduct.run('Bruschetta', 'Pão italiano com tomate e manjericão.', 18.90, 'Entradas', 'food');
    insertProduct.run('Pizza Margherita', 'Molho de tomate, muçarela fresca e manjericão.', 45.90, 'Pratos Principais', 'food');
    insertProduct.run('Hambúrguer Clássico', 'Carne grelhada, queijo cheddar, alface e tomate.', 29.90, 'Pratos Principais', 'food');
    insertProduct.run('Suco Natural', 'Suco de laranja fresco e sem açúcar.', 12.50, 'Bebidas', 'other');
    insertProduct.finalize();
});

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token não fornecido' });
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido' });
        req.user = user;
        next();
    });
};

app.get('/api/menu', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar cardápio' });
        const menu = rows.reduce((acc, product) => {
            const category = acc.find((c) => c.category === product.category);
            if (category) category.items.push({ name: product.name, description: product.description, price: product.price, type: product.type });
            else acc.push({ category: product.category, items: [{ name: product.name, description: product.description, price: product.price, type: product.type }] });
            return acc;
        }, []);
        res.json(menu);
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err || !row || !bcrypt.compareSync(password, row.password)) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }
        const token = jwt.sign({ username: row.username, role: row.role }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ success: true, token, role: row.role });
    });
});

app.post('/api/orders', authenticateToken, (req, res) => {
    if (req.user.role !== 'garcom') return res.status(403).json({ message: 'Acesso negado' });
    const { table, items } = req.body;
    const stmt = db.prepare('INSERT INTO orders (table_number, items) VALUES (?, ?)');
    stmt.run(table, JSON.stringify(items), function (err) {
        if (err) return res.status(500).json({ message: 'Erro ao criar pedido' });
        const order = { id: this.lastID, table, items, status: 'pending' };
        io.emit('newOrder', order);
        res.json({ success: true, order });
    });
    stmt.finalize();
});

app.get('/api/kitchen', (req, res) => {
    db.all("SELECT * FROM orders WHERE status IN ('pending', 'preparing')", [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar pedidos' });
        const orders = rows.map(row => ({
            id: row.id,
            table: row.table_number,
            items: JSON.parse(row.items),
            status: row.status,
            created_at: row.created_at,
        }));
        res.json(orders);
    });
});

app.post('/api/orders/:id/status', authenticateToken, (req, res) => {
    const { status } = req.body;
    const orderId = req.params.id;
    const validStatuses = ['pending', 'preparing', 'completed', 'delivered'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Status inválido' });

    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], function (err) {
        if (err) return res.status(500).json({ message: 'Erro ao atualizar status' });
        if (this.changes === 0) return res.status(404).json({ message: 'Pedido não encontrado' });
        db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, row) => {
            const updatedOrder = {
                id: row.id,
                table: row.table_number,
                items: JSON.parse(row.items),
                status: row.status,
                created_at: row.created_at,
            };
            io.emit('orderUpdated', updatedOrder);
            res.json({ success: true, order: updatedOrder });
        });
    });
});

app.get('/api/garcom/orders', authenticateToken, (req, res) => {
    if (req.user.role !== 'garcom') return res.status(403).json({ message: 'Acesso negado' });
    db.all("SELECT * FROM orders WHERE status IN ('pending', 'preparing', 'completed')", [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar pedidos' });
        const orders = rows.map(row => ({
            id: row.id,
            table: row.table_number,
            items: JSON.parse(row.items),
            status: row.status,
            created_at: row.created_at,
        }));
        res.json(orders);
    });
});

// Rotas Admin (sem alterações)
app.get('/api/admin/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso negado' });
    db.all('SELECT id, username, role FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar usuários' });
        res.json(rows);
    });
});

app.post('/api/admin/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso negado' });
    const { newUsername, newPassword, role } = req.body;
    const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    stmt.run(newUsername, bcrypt.hashSync(newPassword, 10), role || 'garcom', (err) => {
        if (err) return res.status(500).json({ message: 'Erro ao adicionar usuário' });
        res.json({ success: true });
    });
    stmt.finalize();
});

app.delete('/api/admin/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso negado' });
    const userId = req.params.id;
    db.run('DELETE FROM users WHERE id = ? AND username != ?', [userId, req.user.username], function (err) {
        if (err) return res.status(500).json({ message: 'Erro ao remover usuário' });
        if (this.changes === 0) return res.status(404).json({ message: 'Usuário não encontrado ou protegido' });
        res.json({ success: true });
    });
});

app.get('/api/admin/products', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso negado' });
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar produtos' });
        res.json(rows);
    });
});

app.post('/api/admin/products', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso negado' });
    const { name, description, price, category, type } = req.body;
    const stmt = db.prepare('INSERT INTO products (name, description, price, category, type) VALUES (?, ?, ?, ?, ?)');
    stmt.run(name, description, price, category, type, (err) => {
        if (err) return res.status(500).json({ message: 'Erro ao adicionar produto' });
        res.json({ success: true });
    });
    stmt.finalize();
});

app.delete('/api/admin/products/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso negado' });
    const productId = req.params.id;
    db.run('DELETE FROM products WHERE id = ?', [productId], function (err) {
        if (err) return res.status(500).json({ message: 'Erro ao remover produto' });
        if (this.changes === 0) return res.status(404).json({ message: 'Produto não encontrado' });
        res.json({ success: true });
    });
});

server.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
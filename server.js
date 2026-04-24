const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

const dbPath = path.join(__dirname, 'db', 'technomir.db');
let db;
try {
  db = new Database(dbPath, { readonly: false });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
} catch (err) {
  console.error('Ошибка подключения к БД. Запустите: npm run init-db');
  console.error(err.message);
  process.exit(1);
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

/* ───────── API: Категории ───────── */

app.get('/api/categories', (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json(rows);
});

/* ───────── API: Товары ───────── */

app.get('/api/products', (req, res) => {
  const { category_id, search, limit, offset } = req.query;
  let sql = 'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
  const params = [];

  if (category_id) {
    sql += ' AND p.category_id = ?';
    params.push(Number(category_id));
  }
  if (search) {
    sql += ' AND (p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  sql += ' ORDER BY p.id DESC';

  if (limit) {
    sql += ' LIMIT ?';
    params.push(Number(limit));
    if (offset) {
      sql += ' OFFSET ?';
      params.push(Number(offset));
    }
  }

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

app.get('/api/products/:id', (req, res) => {
  const product = db.prepare(
    'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?'
  ).get(Number(req.params.id));

  if (!product) return res.status(404).json({ error: 'Товар не найден' });

  const specs = db.prepare(
    'SELECT spec_group, spec_name, spec_value FROM product_specs WHERE product_id = ? ORDER BY spec_group, id'
  ).all(product.id);

  res.json({ ...product, specs });
});

/* ───────── API: Сравнение ───────── */

app.post('/api/compare', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Передайте массив ids товаров' });
  }

  const placeholders = ids.map(() => '?').join(',');

  const products = db.prepare(
    `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id IN (${placeholders})`
  ).all(...ids.map(Number));

  const specs = db.prepare(
    `SELECT * FROM product_specs WHERE product_id IN (${placeholders}) ORDER BY spec_group, id`
  ).all(...ids.map(Number));

  const specsByProduct = {};
  for (const s of specs) {
    if (!specsByProduct[s.product_id]) specsByProduct[s.product_id] = [];
    specsByProduct[s.product_id].push(s);
  }

  const allSpecNames = new Map();
  for (const s of specs) {
    if (!allSpecNames.has(s.spec_group)) allSpecNames.set(s.spec_group, new Set());
    allSpecNames.get(s.spec_group).add(s.spec_name);
  }

  const specGroups = [];
  for (const [group, names] of allSpecNames) {
    const rows = [];
    for (const name of names) {
      const values = {};
      let allSame = true;
      let firstVal = null;
      for (const p of products) {
        const found = (specsByProduct[p.id] || []).find(
          sp => sp.spec_group === group && sp.spec_name === name
        );
        const val = found ? found.spec_value : '—';
        values[p.id] = val;
        if (firstVal === null) firstVal = val;
        else if (val !== firstVal) allSame = false;
      }
      rows.push({ name, values, different: !allSame });
    }
    specGroups.push({ group, rows });
  }

  res.json({ products, specGroups });
});

/* ───────── SPA fallback ───────── */

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ТехноМир запущен: http://localhost:${PORT}`);
});

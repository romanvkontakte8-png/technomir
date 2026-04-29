const express = require('express');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.TECHNOMIR_SECRET || 'technomir-secret-2024';

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

/* Заголовки безопасности */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '1mb' }));

/* ───────── Утилиты авторизации ───────── */

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

function createToken(user) {
  const payload = JSON.stringify({ id: user.id, role: user.role, exp: Date.now() + 7 * 24 * 3600000 });
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + sig;
}

function verifyToken(token) {
  try {
    if (!token) return null;
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const payload = Buffer.from(b64, 'base64').toString();
    const check = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    if (check.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(check), Buffer.from(sig))) return null;
    const data = JSON.parse(payload);
    if (data.exp < Date.now()) return null;
    return data;
  } catch { return null; }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
  const data = verifyToken(token);
  if (!data) return res.status(401).json({ error: 'Необходима авторизация' });
  req.user = db.prepare('SELECT id, name, email, phone, role, balance, created_at FROM users WHERE id = ?').get(data.id);
  if (!req.user) return res.status(401).json({ error: 'Пользователь не найден' });
  next();
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });
  next();
}

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

/* ───────── API: Авторизация ───────── */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Заполните все обязательные поля' });
  if (typeof name !== 'string' || name.length > 100) return res.status(400).json({ error: 'Имя слишком длинное' });
  if (typeof email !== 'string' || email.length > 200) return res.status(400).json({ error: 'Почта слишком длинная' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Некорректный формат почты' });
  if (typeof password !== 'string' || password.length < 4 || password.length > 200) return res.status(400).json({ error: 'Пароль от 4 до 200 символов' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(400).json({ error: 'Пользователь с такой почтой уже существует' });

  const info = db.prepare('INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)')
    .run(name, email, phone || null, hashPassword(password), 'client');

  const user = db.prepare('SELECT id, name, email, phone, role, balance FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = createToken(user);
  res.json({ user, token });
});

/* Rate-limit для логина: макс. 10 попыток за 15 мин с одного IP */
const loginAttempts = new Map();
function checkLoginRate(ip) {
  const now = Date.now();
  const window = 15 * 60 * 1000;
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.first > window) {
    loginAttempts.set(ip, { count: 1, first: now });
    return true;
  }
  entry.count++;
  return entry.count <= 10;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) {
    if (now - entry.first > 15 * 60 * 1000) loginAttempts.delete(ip);
  }
}, 15 * 60 * 1000);

app.post('/api/auth/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!checkLoginRate(ip)) return res.status(429).json({ error: 'Слишком много попыток. Подождите 15 минут' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Введите почту и пароль' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || user.password !== hashPassword(password)) {
    return res.status(401).json({ error: 'Неверная почта или пароль' });
  }

  const token = createToken(user);
  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

/* ───────── API: Баланс ───────── */

app.get('/api/balance', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
  res.json({ balance: user.balance });
});

app.post('/api/balance/topup', authMiddleware, (req, res) => {
  const { amount } = req.body;
  const val = parseInt(amount);
  if (!val || val <= 0) return res.status(400).json({ error: 'Укажите положительную сумму' });
  if (val > 100000000) return res.status(400).json({ error: 'Максимальная сумма пополнения: 100 000 000 ₽' });

  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(val, req.user.id);
  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
  res.json({ balance: user.balance });
});

/* ───────── API: Профиль ───────── */

app.put('/api/profile', authMiddleware, (req, res) => {
  const { name, email, phone, remove_phone, password, current_password } = req.body;

  const needsPassword = !!(email || password || phone !== undefined || remove_phone);

  if (needsPassword) {
    if (!current_password) return res.status(400).json({ error: 'Введите текущий пароль' });
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    if (user.password !== hashPassword(current_password)) {
      return res.status(403).json({ error: 'Неверный текущий пароль' });
    }
  }

  if (name) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id);
  }

  if (needsPassword) {
    if (email) {
      if (!isValidEmail(email)) return res.status(400).json({ error: 'Некорректный формат почты' });
      const exists = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
      if (exists) return res.status(400).json({ error: 'Эта почта уже используется' });
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, req.user.id);
    }
    if (phone !== undefined && !remove_phone) {
      db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(phone || null, req.user.id);
    }
    if (remove_phone) {
      db.prepare('UPDATE users SET phone = NULL WHERE id = ?').run(req.user.id);
    }
    if (password && password.length >= 4) {
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(password), req.user.id);
    }
  }

  const updated = db.prepare('SELECT id, name, email, phone, role, balance, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(updated);
});

app.put('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { name, email, phone, role, balance, password, admin_password } = req.body;

  if (!admin_password) return res.status(400).json({ error: 'Введите пароль администратора' });
  const admin = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (admin.password !== hashPassword(admin_password)) {
    return res.status(403).json({ error: 'Неверный пароль администратора' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  if (name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, user.id);
  if (email) {
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Некорректный формат почты' });
    const exists = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, user.id);
    if (exists) return res.status(400).json({ error: 'Эта почта уже используется' });
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, user.id);
  }
  if (phone !== undefined) db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(phone || null, user.id);
  if (role && ['client', 'admin'].includes(role)) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
  if (balance !== undefined) db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(Math.max(0, parseInt(balance) || 0), user.id);
  if (password && password.length >= 4) db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(password), user.id);

  const updated = db.prepare('SELECT id, name, email, phone, role, balance, created_at FROM users WHERE id = ?').get(user.id);
  res.json(updated);
});

/* ───────── API: Заказы (клиент) ───────── */

app.post('/api/orders', authMiddleware, (req, res) => {
  const { items, address, comment } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Корзина пуста' });
  }
  if (address && (typeof address !== 'string' || address.length > 500)) return res.status(400).json({ error: 'Адрес слишком длинный' });
  if (comment && (typeof comment !== 'string' || comment.length > 1000)) return res.status(400).json({ error: 'Комментарий слишком длинный' });
  if (items.length > 100) return res.status(400).json({ error: 'Слишком много товаров' });

  let total = 0;
  const validated = [];
  for (const item of items) {
    const product = db.prepare('SELECT id, price, name FROM products WHERE id = ?').get(item.product_id);
    if (!product) return res.status(400).json({ error: `Товар ${item.product_id} не найден` });
    const qty = Math.max(1, parseInt(item.quantity) || 1);
    total += product.price * qty;
    validated.push({ product_id: product.id, price: product.price, quantity: qty });
  }

  const currentUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
  if (currentUser.balance < total) {
    return res.status(400).json({ error: 'Недостаточно средств', need: total, balance: currentUser.balance });
  }

  const createOrder = db.transaction(() => {
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(total, req.user.id);
    const orderInfo = db.prepare('INSERT INTO orders (user_id, status, total, address, comment) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, 'new', total, address || '', comment || '');
    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
    for (const v of validated) {
      insertItem.run(orderInfo.lastInsertRowid, v.product_id, v.quantity, v.price);
    }
    return orderInfo.lastInsertRowid;
  });

  const orderId = createOrder();
  const newBalance = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id).balance;
  res.json({ order_id: orderId, status: 'new', total, balance: newBalance });
});

app.get('/api/orders', authMiddleware, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);

  for (const order of orders) {
    order.items = db.prepare(
      'SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?'
    ).all(order.id);
  }
  res.json(orders);
});

app.put('/api/orders/:id/cancel', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  if (order.status !== 'new') return res.status(400).json({ error: 'Можно отменить только новые заказы' });

  const cancelOrder = db.transaction(() => {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('cancelled', order.id);
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(order.total, req.user.id);
  });
  cancelOrder();
  res.json({ success: true });
});

/* ───────── API: Админ-панель ───────── */

app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, name, email, phone, role, balance, created_at FROM users ORDER BY id').all();
  for (const u of users) {
    u.order_count = db.prepare('SELECT COUNT(*) as c FROM orders WHERE user_id = ?').get(u.id).c;
    u.total_spent = db.prepare('SELECT COALESCE(SUM(total),0) as s FROM orders WHERE user_id = ? AND status != ?').get(u.id, 'cancelled').s;
  }
  res.json(users);
});

app.get('/api/admin/orders', authMiddleware, adminMiddleware, (req, res) => {
  const orders = db.prepare(
    'SELECT o.*, u.name as user_name, u.email as user_email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC'
  ).all();
  for (const order of orders) {
    order.items = db.prepare(
      'SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?'
    ).all(order.id);
  }
  res.json(orders);
});

app.put('/api/admin/orders/:id/status', authMiddleware, adminMiddleware, (req, res) => {
  const { status } = req.body;
  const allowedTransitions = {
    new: ['confirmed', 'cancelled'],
    confirmed: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: []
  };

  const valid = ['new', 'confirmed', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Недопустимый статус' });

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  const statusLabels = { new: 'Новый', confirmed: 'Подтверждён', delivered: 'Доставлен', cancelled: 'Отменён' };
  if (!(allowedTransitions[order.status] || []).includes(status)) {
    return res.status(400).json({ error: `Нельзя сменить статус с «${statusLabels[order.status] || order.status}» на «${statusLabels[status] || status}»` });
  }

  const updateStatus = db.transaction(() => {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, order.id);
    if (status === 'cancelled') {
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(order.total, order.user_id);
    }
  });
  updateStatus();
  res.json({ success: true });
});

/* ───────── SPA fallback ───────── */

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ТехноМир запущен: http://localhost:${PORT}`);
});

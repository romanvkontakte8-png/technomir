const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'technomir.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ───────── Создание таблиц ───────── */

db.exec(`
  DROP TABLE IF EXISTS product_specs;
  DROP TABLE IF EXISTS products;
  DROP TABLE IF EXISTS categories;

  CREATE TABLE categories (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    slug  TEXT NOT NULL UNIQUE
  );

  CREATE TABLE products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    category_id INTEGER REFERENCES categories(id),
    price       INTEGER NOT NULL,
    old_price   INTEGER,
    image       TEXT,
    description TEXT,
    brand       TEXT,
    in_stock    INTEGER DEFAULT 1
  );

  CREATE TABLE product_specs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    spec_group TEXT NOT NULL,
    spec_name  TEXT NOT NULL,
    spec_value TEXT NOT NULL
  );

  CREATE INDEX idx_products_category ON products(category_id);
  CREATE INDEX idx_specs_product ON product_specs(product_id);
`);

/* ───────── Категории ───────── */

const insertCategory = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
const categories = [
  ['Смартфоны', 'smartphones'],
  ['Ноутбуки', 'laptops'],
  ['Планшеты', 'tablets'],
  ['Наушники', 'headphones'],
  ['Умные часы', 'smartwatches'],
  ['Телевизоры', 'tvs'],
  ['Аксессуары', 'accessories']
];

const catIds = {};
for (const [name, slug] of categories) {
  const info = insertCategory.run(name, slug);
  catIds[slug] = info.lastInsertRowid;
}

/* ───────── Товары ───────── */

const insertProduct = db.prepare(
  'INSERT INTO products (name, slug, category_id, price, old_price, image, description, brand, in_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
const insertSpec = db.prepare(
  'INSERT INTO product_specs (product_id, spec_group, spec_name, spec_value) VALUES (?, ?, ?, ?)'
);

function addProduct(data, specs) {
  const info = insertProduct.run(
    data.name, data.slug, data.category_id,
    data.price, data.old_price || null,
    data.image || null, data.description || '', data.brand, data.in_stock ?? 1
  );
  const pid = info.lastInsertRowid;
  for (const [group, name, value] of specs) {
    insertSpec.run(pid, group, name, value);
  }
  return pid;
}

const addAll = db.transaction(() => {
  /* ── Смартфоны ── */

  addProduct({
    name: 'Apple iPhone 15 Pro Max 256GB Black Titanium',
    slug: 'iphone-15-pro-max-256-black',
    category_id: catIds['smartphones'],
    price: 149990,
    old_price: 159990,
    image: '/img/products/iphone-15-pro-max-256-black.png',
    description: 'Флагманский смартфон Apple с чипом A17 Pro, титановым корпусом и камерой 48 Мп.',
    brand: 'Apple'
  }, [
    ['Экран', 'Диагональ', '6.7"'],
    ['Экран', 'Тип матрицы', 'Super Retina XDR OLED'],
    ['Экран', 'Разрешение', '2796x1290'],
    ['Экран', 'Частота обновления', '120 Гц (ProMotion)'],
    ['Производительность', 'Процессор', 'Apple A17 Pro'],
    ['Производительность', 'Оперативная память', '8 ГБ'],
    ['Производительность', 'Встроенная память', '256 ГБ'],
    ['Камера', 'Основная камера', '48 Мп + 12 Мп + 12 Мп'],
    ['Камера', 'Фронтальная камера', '12 Мп'],
    ['Камера', 'Оптический зум', '5x'],
    ['Аккумулятор', 'Ёмкость', '4441 мАч'],
    ['Аккумулятор', 'Быстрая зарядка', 'Да, 27 Вт'],
    ['Аккумулятор', 'Беспроводная зарядка', 'MagSafe 15 Вт'],
    ['Корпус', 'Материал', 'Титан'],
    ['Корпус', 'Защита от воды', 'IP68'],
    ['Корпус', 'Вес', '221 г'],
    ['Связь', 'SIM', 'nano-SIM + eSIM'],
    ['Связь', '5G', 'Да'],
    ['Связь', 'Wi-Fi', 'Wi-Fi 6E'],
    ['Связь', 'Bluetooth', '5.3'],
    ['Связь', 'NFC', 'Да']
  ]);

  addProduct({
    name: 'Apple iPhone 15 Pro 256GB Natural Titanium',
    slug: 'iphone-15-pro-256-natural',
    category_id: catIds['smartphones'],
    price: 129990,
    old_price: 139990,
    image: '/img/products/iphone-15-pro-256-natural.png',
    description: 'Мощный смартфон Apple с чипом A17 Pro и камерой 48 Мп в титановом корпусе.',
    brand: 'Apple'
  }, [
    ['Экран', 'Диагональ', '6.1"'],
    ['Экран', 'Тип матрицы', 'Super Retina XDR OLED'],
    ['Экран', 'Разрешение', '2556x1179'],
    ['Экран', 'Частота обновления', '120 Гц (ProMotion)'],
    ['Производительность', 'Процессор', 'Apple A17 Pro'],
    ['Производительность', 'Оперативная память', '8 ГБ'],
    ['Производительность', 'Встроенная память', '256 ГБ'],
    ['Камера', 'Основная камера', '48 Мп + 12 Мп + 12 Мп'],
    ['Камера', 'Фронтальная камера', '12 Мп'],
    ['Камера', 'Оптический зум', '3x'],
    ['Аккумулятор', 'Ёмкость', '3274 мАч'],
    ['Аккумулятор', 'Быстрая зарядка', 'Да, 27 Вт'],
    ['Аккумулятор', 'Беспроводная зарядка', 'MagSafe 15 Вт'],
    ['Корпус', 'Материал', 'Титан'],
    ['Корпус', 'Защита от воды', 'IP68'],
    ['Корпус', 'Вес', '187 г'],
    ['Связь', 'SIM', 'nano-SIM + eSIM'],
    ['Связь', '5G', 'Да'],
    ['Связь', 'Wi-Fi', 'Wi-Fi 6E'],
    ['Связь', 'Bluetooth', '5.3'],
    ['Связь', 'NFC', 'Да']
  ]);

  addProduct({
    name: 'Apple iPhone 15 128GB Blue',
    slug: 'iphone-15-128-blue',
    category_id: catIds['smartphones'],
    price: 89990,
    old_price: 99990,
    image: '/img/products/iphone-15-128-blue.png',
    description: 'Смартфон Apple с Dynamic Island, камерой 48 Мп и чипом A16 Bionic.',
    brand: 'Apple'
  }, [
    ['Экран', 'Диагональ', '6.1"'],
    ['Экран', 'Тип матрицы', 'Super Retina XDR OLED'],
    ['Экран', 'Разрешение', '2556x1179'],
    ['Экран', 'Частота обновления', '60 Гц'],
    ['Производительность', 'Процессор', 'Apple A16 Bionic'],
    ['Производительность', 'Оперативная память', '6 ГБ'],
    ['Производительность', 'Встроенная память', '128 ГБ'],
    ['Камера', 'Основная камера', '48 Мп + 12 Мп'],
    ['Камера', 'Фронтальная камера', '12 Мп'],
    ['Камера', 'Оптический зум', '2x'],
    ['Аккумулятор', 'Ёмкость', '3349 мАч'],
    ['Аккумулятор', 'Быстрая зарядка', 'Да, 20 Вт'],
    ['Аккумулятор', 'Беспроводная зарядка', 'MagSafe 15 Вт'],
    ['Корпус', 'Материал', 'Алюминий + стекло'],
    ['Корпус', 'Защита от воды', 'IP68'],
    ['Корпус', 'Вес', '171 г'],
    ['Связь', 'SIM', 'nano-SIM + eSIM'],
    ['Связь', '5G', 'Да'],
    ['Связь', 'Wi-Fi', 'Wi-Fi 6'],
    ['Связь', 'Bluetooth', '5.3'],
    ['Связь', 'NFC', 'Да']
  ]);

  addProduct({
    name: 'Samsung Galaxy S24 Ultra 256GB Titanium Black',
    slug: 'galaxy-s24-ultra-256-black',
    category_id: catIds['smartphones'],
    price: 134990,
    old_price: 144990,
    image: '/img/products/galaxy-s24-ultra-256-black.png',
    description: 'Флагман Samsung с AI-функциями, S Pen, камерой 200 Мп и титановой рамкой.',
    brand: 'Samsung'
  }, [
    ['Экран', 'Диагональ', '6.8"'],
    ['Экран', 'Тип матрицы', 'Dynamic AMOLED 2X'],
    ['Экран', 'Разрешение', '3120x1440'],
    ['Экран', 'Частота обновления', '120 Гц'],
    ['Производительность', 'Процессор', 'Snapdragon 8 Gen 3 for Galaxy'],
    ['Производительность', 'Оперативная память', '12 ГБ'],
    ['Производительность', 'Встроенная память', '256 ГБ'],
    ['Камера', 'Основная камера', '200 Мп + 50 Мп + 12 Мп + 10 Мп'],
    ['Камера', 'Фронтальная камера', '12 Мп'],
    ['Камера', 'Оптический зум', '5x'],
    ['Аккумулятор', 'Ёмкость', '5000 мАч'],
    ['Аккумулятор', 'Быстрая зарядка', 'Да, 45 Вт'],
    ['Аккумулятор', 'Беспроводная зарядка', 'Qi 15 Вт'],
    ['Корпус', 'Материал', 'Титан'],
    ['Корпус', 'Защита от воды', 'IP68'],
    ['Корпус', 'Вес', '232 г'],
    ['Связь', 'SIM', 'nano-SIM + eSIM'],
    ['Связь', '5G', 'Да'],
    ['Связь', 'Wi-Fi', 'Wi-Fi 7'],
    ['Связь', 'Bluetooth', '5.3'],
    ['Связь', 'NFC', 'Да']
  ]);

  addProduct({
    name: 'Samsung Galaxy S24 256GB Onyx Black',
    slug: 'galaxy-s24-256-black',
    category_id: catIds['smartphones'],
    price: 79990,
    old_price: 89990,
    image: '/img/products/galaxy-s24-256-black.png',
    description: 'Компактный флагман Samsung с AI, чипом Exynos 2400 и камерой 50 Мп.',
    brand: 'Samsung'
  }, [
    ['Экран', 'Диагональ', '6.2"'],
    ['Экран', 'Тип матрицы', 'Dynamic AMOLED 2X'],
    ['Экран', 'Разрешение', '2340x1080'],
    ['Экран', 'Частота обновления', '120 Гц'],
    ['Производительность', 'Процессор', 'Exynos 2400'],
    ['Производительность', 'Оперативная память', '8 ГБ'],
    ['Производительность', 'Встроенная память', '256 ГБ'],
    ['Камера', 'Основная камера', '50 Мп + 12 Мп + 10 Мп'],
    ['Камера', 'Фронтальная камера', '12 Мп'],
    ['Камера', 'Оптический зум', '3x'],
    ['Аккумулятор', 'Ёмкость', '4000 мАч'],
    ['Аккумулятор', 'Быстрая зарядка', 'Да, 25 Вт'],
    ['Аккумулятор', 'Беспроводная зарядка', 'Qi 15 Вт'],
    ['Корпус', 'Материал', 'Алюминий + стекло'],
    ['Корпус', 'Защита от воды', 'IP68'],
    ['Корпус', 'Вес', '167 г'],
    ['Связь', 'SIM', 'nano-SIM + eSIM'],
    ['Связь', '5G', 'Да'],
    ['Связь', 'Wi-Fi', 'Wi-Fi 7'],
    ['Связь', 'Bluetooth', '5.3'],
    ['Связь', 'NFC', 'Да']
  ]);

  addProduct({
    name: 'Xiaomi 14 Ultra 512GB Black',
    slug: 'xiaomi-14-ultra-512-black',
    category_id: catIds['smartphones'],
    price: 109990,
    old_price: 119990,
    image: '/img/products/xiaomi-14-ultra-512-black.png',
    description: 'Камерофон Xiaomi с оптикой Leica, чипом Snapdragon 8 Gen 3 и зарядкой 90 Вт.',
    brand: 'Xiaomi'
  }, [
    ['Экран', 'Диагональ', '6.73"'],
    ['Экран', 'Тип матрицы', 'LTPO AMOLED'],
    ['Экран', 'Разрешение', '3200x1440'],
    ['Экран', 'Частота обновления', '120 Гц'],
    ['Производительность', 'Процессор', 'Snapdragon 8 Gen 3'],
    ['Производительность', 'Оперативная память', '16 ГБ'],
    ['Производительность', 'Встроенная память', '512 ГБ'],
    ['Камера', 'Основная камера', '50 Мп (Leica) + 50 Мп + 50 Мп + 50 Мп'],
    ['Камера', 'Фронтальная камера', '32 Мп'],
    ['Камера', 'Оптический зум', '5x'],
    ['Аккумулятор', 'Ёмкость', '5000 мАч'],
    ['Аккумулятор', 'Быстрая зарядка', 'Да, 90 Вт'],
    ['Аккумулятор', 'Беспроводная зарядка', 'Qi 50 Вт'],
    ['Корпус', 'Материал', 'Алюминий + кожа'],
    ['Корпус', 'Защита от воды', 'IP68'],
    ['Корпус', 'Вес', '224 г'],
    ['Связь', 'SIM', 'nano-SIM + nano-SIM'],
    ['Связь', '5G', 'Да'],
    ['Связь', 'Wi-Fi', 'Wi-Fi 7'],
    ['Связь', 'Bluetooth', '5.4'],
    ['Связь', 'NFC', 'Да']
  ]);

  /* ── Ноутбуки ── */

  addProduct({
    name: 'Apple MacBook Pro 14" M3 Pro 512GB Space Black',
    slug: 'macbook-pro-14-m3pro-512',
    category_id: catIds['laptops'],
    price: 219990,
    old_price: 239990,
    image: '/img/products/macbook-pro-14-m3pro-512.png',
    description: 'Профессиональный ноутбук Apple с чипом M3 Pro, дисплеем Liquid Retina XDR и 18 ГБ ОЗУ.',
    brand: 'Apple'
  }, [
    ['Экран', 'Диагональ', '14.2"'],
    ['Экран', 'Тип матрицы', 'Liquid Retina XDR (Mini-LED)'],
    ['Экран', 'Разрешение', '3024x1964'],
    ['Экран', 'Частота обновления', '120 Гц (ProMotion)'],
    ['Производительность', 'Процессор', 'Apple M3 Pro (11 ядер)'],
    ['Производительность', 'Оперативная память', '18 ГБ'],
    ['Производительность', 'Встроенная память', '512 ГБ SSD'],
    ['Производительность', 'Графика', 'Встроенная (14 ядер GPU)'],
    ['Аккумулятор', 'Ёмкость', '70 Вт·ч'],
    ['Аккумулятор', 'Время работы', 'До 17 часов'],
    ['Корпус', 'Материал', 'Алюминий'],
    ['Корпус', 'Вес', '1.61 кг'],
    ['Связь', 'Wi-Fi', 'Wi-Fi 6E'],
    ['Связь', 'Bluetooth', '5.3'],
    ['Порты', 'USB-C/Thunderbolt', '3x Thunderbolt 4'],
    ['Порты', 'HDMI', 'HDMI 2.1'],
    ['Порты', 'Разъём для наушников', '3.5 мм'],
    ['Порты', 'MagSafe', 'MagSafe 3']
  ]);

  addProduct({
    name: 'ASUS ROG Zephyrus G14 (2024) RTX 4060',
    slug: 'asus-rog-zephyrus-g14-2024',
    category_id: catIds['laptops'],
    price: 159990,
    old_price: 174990,
    image: '/img/products/asus-rog-zephyrus-g14-2024.png',
    description: 'Игровой ультрабук ASUS с AMD Ryzen 9, RTX 4060, OLED-экраном 14" и 32 ГБ ОЗУ.',
    brand: 'ASUS'
  }, [
    ['Экран', 'Диагональ', '14"'],
    ['Экран', 'Тип матрицы', 'OLED'],
    ['Экран', 'Разрешение', '2880x1800'],
    ['Экран', 'Частота обновления', '120 Гц'],
    ['Производительность', 'Процессор', 'AMD Ryzen 9 8945HS'],
    ['Производительность', 'Оперативная память', '32 ГБ DDR5'],
    ['Производительность', 'Встроенная память', '1 ТБ SSD'],
    ['Производительность', 'Графика', 'NVIDIA GeForce RTX 4060 8 ГБ'],
    ['Аккумулятор', 'Ёмкость', '73 Вт·ч'],
    ['Аккумулятор', 'Время работы', 'До 10 часов'],
    ['Корпус', 'Материал', 'Алюминий'],
    ['Корпус', 'Вес', '1.5 кг'],
    ['Связь', 'Wi-Fi', 'Wi-Fi 7'],
    ['Связь', 'Bluetooth', '5.4'],
    ['Порты', 'USB-C', '2x USB-C (1x Thunderbolt 4)'],
    ['Порты', 'USB-A', '1x USB 3.2'],
    ['Порты', 'HDMI', 'HDMI 2.1'],
    ['Порты', 'Разъём для наушников', '3.5 мм']
  ]);

  addProduct({
    name: 'Lenovo ThinkPad X1 Carbon Gen 12 i7 512GB',
    slug: 'thinkpad-x1-carbon-gen12',
    category_id: catIds['laptops'],
    price: 179990,
    old_price: 199990,
    image: '/img/products/thinkpad-x1-carbon-gen12.png',
    description: 'Бизнес-ультрабук Lenovo с Intel Core Ultra 7, 2.8K OLED-экраном 14" и весом 1.08 кг.',
    brand: 'Lenovo'
  }, [
    ['Экран', 'Диагональ', '14"'],
    ['Экран', 'Тип матрицы', 'OLED'],
    ['Экран', 'Разрешение', '2800x1800'],
    ['Экран', 'Частота обновления', '120 Гц'],
    ['Производительность', 'Процессор', 'Intel Core Ultra 7 155H'],
    ['Производительность', 'Оперативная память', '32 ГБ LPDDR5x'],
    ['Производительность', 'Встроенная память', '512 ГБ SSD'],
    ['Производительность', 'Графика', 'Intel Arc (встроенная)'],
    ['Аккумулятор', 'Ёмкость', '57 Вт·ч'],
    ['Аккумулятор', 'Время работы', 'До 15 часов'],
    ['Корпус', 'Материал', 'Углеродное волокно + магний'],
    ['Корпус', 'Вес', '1.08 кг'],
    ['Связь', 'Wi-Fi', 'Wi-Fi 7'],
    ['Связь', 'Bluetooth', '5.3'],
    ['Порты', 'USB-C/Thunderbolt', '2x Thunderbolt 4'],
    ['Порты', 'USB-A', '2x USB 3.2'],
    ['Порты', 'HDMI', 'HDMI 2.1'],
    ['Порты', 'Разъём для наушников', '3.5 мм']
  ]);

  /* ── Планшеты ── */

  addProduct({
    name: 'Apple iPad Pro 11" M4 256GB Space Black Wi-Fi',
    slug: 'ipad-pro-11-m4-256',
    category_id: catIds['tablets'],
    price: 109990,
    old_price: 119990,
    image: '/img/products/ipad-pro-11-m4-256.png',
    description: 'Тонкий планшет Apple с чипом M4, Ultra Retina XDR OLED и поддержкой Apple Pencil Pro.',
    brand: 'Apple'
  }, [
    ['Экран', 'Диагональ', '11"'],
    ['Экран', 'Тип матрицы', 'Ultra Retina XDR OLED'],
    ['Экран', 'Разрешение', '2420x1668'],
    ['Экран', 'Частота обновления', '120 Гц (ProMotion)'],
    ['Производительность', 'Процессор', 'Apple M4'],
    ['Производительность', 'Оперативная память', '8 ГБ'],
    ['Производительность', 'Встроенная память', '256 ГБ'],
    ['Камера', 'Основная камера', '12 Мп'],
    ['Камера', 'Фронтальная камера', '12 Мп (ландшафтная)'],
    ['Аккумулятор', 'Время работы', 'До 10 часов'],
    ['Корпус', 'Материал', 'Алюминий'],
    ['Корпус', 'Вес', '444 г'],
    ['Связь', 'Wi-Fi', 'Wi-Fi 6E'],
    ['Связь', 'Bluetooth', '5.3']
  ]);

  addProduct({
    name: 'Samsung Galaxy Tab S9 Ultra 256GB Graphite Wi-Fi',
    slug: 'galaxy-tab-s9-ultra-256',
    category_id: catIds['tablets'],
    price: 99990,
    old_price: 109990,
    image: '/img/products/galaxy-tab-s9-ultra-256.png',
    description: 'Большой планшет Samsung 14.6" с S Pen, Snapdragon 8 Gen 2 и Dynamic AMOLED 2X.',
    brand: 'Samsung'
  }, [
    ['Экран', 'Диагональ', '14.6"'],
    ['Экран', 'Тип матрицы', 'Dynamic AMOLED 2X'],
    ['Экран', 'Разрешение', '2960x1848'],
    ['Экран', 'Частота обновления', '120 Гц'],
    ['Производительность', 'Процессор', 'Snapdragon 8 Gen 2 for Galaxy'],
    ['Производительность', 'Оперативная память', '12 ГБ'],
    ['Производительность', 'Встроенная память', '256 ГБ'],
    ['Камера', 'Основная камера', '13 Мп + 8 Мп'],
    ['Камера', 'Фронтальная камера', '12 Мп + 12 Мп'],
    ['Аккумулятор', 'Время работы', 'До 14 часов'],
    ['Корпус', 'Материал', 'Алюминий'],
    ['Корпус', 'Вес', '732 г'],
    ['Корпус', 'Защита от воды', 'IP68'],
    ['Связь', 'Wi-Fi', 'Wi-Fi 6E'],
    ['Связь', 'Bluetooth', '5.3']
  ]);

  /* ── Наушники ── */

  addProduct({
    name: 'Apple AirPods Pro 2 (USB-C)',
    slug: 'airpods-pro-2-usbc',
    category_id: catIds['headphones'],
    price: 24990,
    old_price: 27990,
    image: '/img/products/airpods-pro-2-usbc.png',
    description: 'TWS-наушники Apple с активным шумоподавлением, адаптивным звуком и чипом H2.',
    brand: 'Apple'
  }, [
    ['Звук', 'Тип', 'TWS (внутриканальные)'],
    ['Звук', 'Активное шумоподавление', 'Да (адаптивное)'],
    ['Звук', 'Прозрачный режим', 'Да'],
    ['Звук', 'Пространственное аудио', 'Да (с трекингом головы)'],
    ['Звук', 'Чип', 'Apple H2'],
    ['Аккумулятор', 'Время работы (наушники)', 'До 6 часов'],
    ['Аккумулятор', 'Время работы (с кейсом)', 'До 30 часов'],
    ['Аккумулятор', 'Зарядка кейса', 'USB-C / MagSafe / Qi'],
    ['Связь', 'Bluetooth', '5.3'],
    ['Корпус', 'Защита от воды', 'IPX4'],
    ['Корпус', 'Вес наушника', '5.3 г']
  ]);

  addProduct({
    name: 'Sony WH-1000XM5 Black',
    slug: 'sony-wh1000xm5-black',
    category_id: catIds['headphones'],
    price: 34990,
    old_price: 39990,
    image: '/img/products/sony-wh1000xm5-black.png',
    description: 'Накладные наушники Sony с лучшим в классе шумоподавлением и 30 часов работы.',
    brand: 'Sony'
  }, [
    ['Звук', 'Тип', 'Накладные (полноразмерные)'],
    ['Звук', 'Активное шумоподавление', 'Да (8 микрофонов)'],
    ['Звук', 'Прозрачный режим', 'Да'],
    ['Звук', 'Пространственное аудио', 'Да (360 Reality Audio)'],
    ['Звук', 'Чип', 'Sony V1 + QN1'],
    ['Аккумулятор', 'Время работы', 'До 30 часов'],
    ['Аккумулятор', 'Быстрая зарядка', '3 мин = 3 часа'],
    ['Аккумулятор', 'Зарядка', 'USB-C'],
    ['Связь', 'Bluetooth', '5.2'],
    ['Связь', 'Кодеки', 'LDAC, AAC, SBC'],
    ['Корпус', 'Вес', '250 г'],
    ['Корпус', 'Складная конструкция', 'Нет (поворотные чашки)']
  ]);

  addProduct({
    name: 'Samsung Galaxy Buds3 Pro Black',
    slug: 'galaxy-buds3-pro-black',
    category_id: catIds['headphones'],
    price: 18990,
    old_price: 21990,
    image: '/img/products/galaxy-buds3-pro-black.png',
    description: 'TWS-наушники Samsung с ANC, 360 Audio и функциями Galaxy AI.',
    brand: 'Samsung'
  }, [
    ['Звук', 'Тип', 'TWS (внутриканальные)'],
    ['Звук', 'Активное шумоподавление', 'Да'],
    ['Звук', 'Прозрачный режим', 'Да'],
    ['Звук', 'Пространственное аудио', 'Да (360 Audio)'],
    ['Звук', 'Чип', 'Samsung'],
    ['Аккумулятор', 'Время работы (наушники)', 'До 7 часов'],
    ['Аккумулятор', 'Время работы (с кейсом)', 'До 30 часов'],
    ['Аккумулятор', 'Зарядка кейса', 'USB-C / Qi'],
    ['Связь', 'Bluetooth', '5.4'],
    ['Связь', 'Кодеки', 'Samsung Scalable, AAC, SBC'],
    ['Корпус', 'Защита от воды', 'IP57'],
    ['Корпус', 'Вес наушника', '5.4 г']
  ]);

  /* ── Умные часы ── */

  addProduct({
    name: 'Apple Watch Ultra 2 49mm Titanium',
    slug: 'apple-watch-ultra2-49mm',
    category_id: catIds['smartwatches'],
    price: 79990,
    old_price: 84990,
    image: '/img/products/apple-watch-ultra2-49mm.png',
    description: 'Премиальные умные часы Apple в титановом корпусе с ярким дисплеем и двухчастотным GPS.',
    brand: 'Apple'
  }, [
    ['Экран', 'Диагональ', '49 мм (1.93")'],
    ['Экран', 'Тип матрицы', 'OLED LTPO'],
    ['Экран', 'Яркость', '3000 нит'],
    ['Производительность', 'Процессор', 'Apple S9 SiP'],
    ['Производительность', 'Встроенная память', '64 ГБ'],
    ['Аккумулятор', 'Время работы', 'До 36 часов (72 ч в энергосберегающем)'],
    ['Датчики', 'Пульсометр', 'Да'],
    ['Датчики', 'ЭКГ', 'Да'],
    ['Датчики', 'Температура', 'Да'],
    ['Датчики', 'SpO2', 'Да'],
    ['Корпус', 'Материал', 'Титан'],
    ['Корпус', 'Защита от воды', 'WR100 / EN13319'],
    ['Корпус', 'Вес', '61.4 г'],
    ['Связь', 'Wi-Fi', 'Да'],
    ['Связь', 'Bluetooth', '5.3'],
    ['Связь', 'GPS', 'Двухчастотный L1+L5'],
    ['Связь', 'LTE', 'Да']
  ]);

  addProduct({
    name: 'Samsung Galaxy Watch 6 Classic 47mm Silver',
    slug: 'galaxy-watch6-classic-47mm',
    category_id: catIds['smartwatches'],
    price: 34990,
    old_price: 39990,
    image: '/img/products/galaxy-watch6-classic-47mm.png',
    description: 'Классические умные часы Samsung с вращающимся безелем, Wear OS и BioActive-датчиком.',
    brand: 'Samsung'
  }, [
    ['Экран', 'Диагональ', '47 мм (1.47")'],
    ['Экран', 'Тип матрицы', 'Super AMOLED'],
    ['Экран', 'Яркость', '2000 нит'],
    ['Производительность', 'Процессор', 'Exynos W930'],
    ['Производительность', 'Встроенная память', '16 ГБ'],
    ['Аккумулятор', 'Время работы', 'До 40 часов'],
    ['Датчики', 'Пульсометр', 'Да'],
    ['Датчики', 'ЭКГ', 'Да'],
    ['Датчики', 'Температура', 'Да'],
    ['Датчики', 'SpO2', 'Да'],
    ['Корпус', 'Материал', 'Нержавеющая сталь'],
    ['Корпус', 'Защита от воды', 'IP68 / 5 ATM'],
    ['Корпус', 'Вес', '59 г'],
    ['Связь', 'Wi-Fi', 'Да'],
    ['Связь', 'Bluetooth', '5.3'],
    ['Связь', 'GPS', 'Двухчастотный L1+L5'],
    ['Связь', 'LTE', 'Опционально']
  ]);

  /* ── Телевизоры ── */

  addProduct({
    name: 'Samsung QE65S95C 65" QD-OLED 4K',
    slug: 'samsung-s95c-65-oled',
    category_id: catIds['tvs'],
    price: 199990,
    old_price: 229990,
    image: '/img/products/samsung-s95c-65-oled.png',
    description: 'OLED-телевизор Samsung 65" с квантовыми точками, Neural Quantum 4K и 144 Гц.',
    brand: 'Samsung'
  }, [
    ['Экран', 'Диагональ', '65" (165 см)'],
    ['Экран', 'Тип матрицы', 'QD-OLED'],
    ['Экран', 'Разрешение', '3840x2160 (4K)'],
    ['Экран', 'Частота обновления', '144 Гц'],
    ['Экран', 'HDR', 'HDR10+ / Dolby Vision'],
    ['Производительность', 'Процессор', 'Neural Quantum 4K'],
    ['Производительность', 'ОС', 'Tizen 7.0'],
    ['Звук', 'Мощность', '60 Вт'],
    ['Звук', 'Dolby Atmos', 'Да'],
    ['Порты', 'HDMI', '4x HDMI 2.1'],
    ['Порты', 'USB', '2x USB'],
    ['Связь', 'Wi-Fi', 'Wi-Fi 5'],
    ['Связь', 'Bluetooth', '5.2'],
    ['Корпус', 'Вес', '16.4 кг']
  ]);

  addProduct({
    name: 'LG OLED55C3 55" OLED evo 4K',
    slug: 'lg-oled55c3-55',
    category_id: catIds['tvs'],
    price: 129990,
    old_price: 149990,
    image: '/img/products/lg-oled55c3-55.png',
    description: 'OLED-телевизор LG 55" с процессором a9 Gen 6 AI, Dolby Vision IQ и webOS 23.',
    brand: 'LG'
  }, [
    ['Экран', 'Диагональ', '55" (139 см)'],
    ['Экран', 'Тип матрицы', 'OLED evo'],
    ['Экран', 'Разрешение', '3840x2160 (4K)'],
    ['Экран', 'Частота обновления', '120 Гц'],
    ['Экран', 'HDR', 'Dolby Vision IQ / HDR10 Pro'],
    ['Производительность', 'Процессор', 'a9 Gen 6 AI'],
    ['Производительность', 'ОС', 'webOS 23'],
    ['Звук', 'Мощность', '40 Вт'],
    ['Звук', 'Dolby Atmos', 'Да'],
    ['Порты', 'HDMI', '4x HDMI 2.1'],
    ['Порты', 'USB', '3x USB'],
    ['Связь', 'Wi-Fi', 'Wi-Fi 6'],
    ['Связь', 'Bluetooth', '5.0'],
    ['Корпус', 'Вес', '14.7 кг']
  ]);
});

addAll();

console.log('База данных ТехноМир успешно создана и наполнена!');
console.log(`Путь к БД: ${dbPath}`);
db.close();

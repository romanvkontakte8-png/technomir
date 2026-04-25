/* ═══════════════════════════════════════════════════
   main.js — общие функции ТехноМир
   ═══════════════════════════════════════════════════ */

/* ── API: серверный режим, fetch или встроенные данные ── */
const API = {
  _serverMode: null,

  isFileProtocol() {
    return window.location.protocol === 'file:';
  },

  async check() {
    if (this._serverMode !== null) return this._serverMode;
    if (this.isFileProtocol()) { this._serverMode = false; return false; }
    try {
      const res = await fetch('/api/categories', { signal: AbortSignal.timeout(2000) });
      const ct = res.headers.get('content-type') || '';
      this._serverMode = res.ok && ct.includes('json');
    } catch { this._serverMode = false; }
    return this._serverMode;
  },

  async get(apiPath, staticPath) {
    const server = await this.check();
    if (server) return fetch(apiPath).then(r => r.json());
    /* Пробуем fetch (работает на http), иначе встроенные данные */
    try {
      return await fetch(staticPath).then(r => r.json());
    } catch {
      return this._getEmbedded(staticPath);
    }
  },

  _getEmbedded(path) {
    if (typeof STATIC_DATA === 'undefined') return [];
    if (path.includes('categories')) return STATIC_DATA.categories;
    if (path.includes('products.json')) return STATIC_DATA.products;
    const m = path.match(/product-(\d+)\.json/);
    if (m) return STATIC_DATA.details[m[1]] || null;
    return [];
  }
};

/* ── Тема (тёмная/светлая) ── */
const Theme = {
  KEY: 'technomir_theme',

  get() { return localStorage.getItem(this.KEY) || 'light'; },

  set(theme) {
    localStorage.setItem(this.KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  },

  toggle() {
    this.set(this.get() === 'dark' ? 'light' : 'dark');
  },

  init() {
    const theme = this.get();
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.addEventListener('click', () => this.toggle());
    }
  }
};

/* ── Авторизация ── */
const Auth = {
  TOKEN_KEY: 'technomir_token',
  USER_KEY: 'technomir_user',

  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  getUser() { try { return JSON.parse(localStorage.getItem(this.USER_KEY)); } catch { return null; } },

  login(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  updateUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    Cart.clear();
    window.location.href = 'index.html';
  },

  isLoggedIn() { return !!this.getToken(); },
  isAdmin() { const u = this.getUser(); return u && u.role === 'admin'; },

  headers() {
    const h = { 'Content-Type': 'application/json' };
    const t = this.getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  }
};

/* ── Корзина (localStorage) ── */
const Cart = {
  KEY: 'technomir_cart',

  get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; } },

  add(productId, name, price, image) {
    const items = this.get();
    const existing = items.find(i => i.product_id === productId);
    if (existing) { existing.quantity++; }
    else { items.push({ product_id: productId, name, price, image, quantity: 1 }); }
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateBadge();
  },

  remove(productId) {
    const items = this.get().filter(i => i.product_id !== productId);
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateBadge();
  },

  updateQty(productId, qty) {
    const items = this.get();
    const item = items.find(i => i.product_id === productId);
    if (item) { item.quantity = Math.max(1, qty); }
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateBadge();
  },

  clear() { localStorage.removeItem(this.KEY); this.updateBadge(); },
  count() { return this.get().reduce((s, i) => s + i.quantity, 0); },
  total() { return this.get().reduce((s, i) => s + i.price * i.quantity, 0); },

  updateBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) {
      const c = this.count();
      badge.textContent = c;
      badge.style.display = c > 0 ? '' : 'none';
    }
  }
};

const CompareList = {
  KEY: 'technomir_compare',

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch { return []; }
  },

  add(id) {
    const list = this.get();
    id = Number(id);
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(this.KEY, JSON.stringify(list));
    }
    this.updateBadge();
    return list;
  },

  remove(id) {
    let list = this.get();
    id = Number(id);
    list = list.filter(i => i !== id);
    localStorage.setItem(this.KEY, JSON.stringify(list));
    this.updateBadge();
    return list;
  },

  has(id) {
    return this.get().includes(Number(id));
  },

  clear() {
    localStorage.removeItem(this.KEY);
    this.updateBadge();
  },

  count() {
    return this.get().length;
  },

  updateBadge() {
    const badge = document.getElementById('compareBadge');
    if (badge) {
      const c = this.count();
      badge.textContent = c;
      badge.style.display = c > 0 ? '' : 'none';
    }
  }
};

/* Уведомления */
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/* Форматирование цены */
function formatPrice(price) {
  return Number(price).toLocaleString('ru-RU') + ' \u20BD';
}

/* Поиск */
function initSearch() {
  const input = document.getElementById('searchInput');
  const btn = document.getElementById('searchBtn');
  if (!input || !btn) return;

  function doSearch() {
    const q = input.value.trim();
    if (q) {
      window.location.href = 'catalog.html?search=' + encodeURIComponent(q);
    }
  }

  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

  const params = new URLSearchParams(window.location.search);
  if (params.get('search')) input.value = params.get('search');
}

/* Обновление шапки по авторизации */
function updateAuthUI() {
  const authBlock = document.getElementById('authBlock');
  if (!authBlock) return;
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    const balanceStr = typeof user.balance === 'number' ? formatPrice(user.balance) : '';
    let links = '';
    if (balanceStr) links += `<span class="header__balance" title="Баланс">${balanceStr}</span>`;
    links += `<a href="account.html">${user.name}</a>`;
    if (Auth.isAdmin()) links += ` <a href="admin.html" class="header__admin-link">Админ</a>`;
    links += ` <a href="#" onclick="Auth.logout();return false;" class="header__logout">Выйти</a>`;
    authBlock.innerHTML = links;
  } else {
    authBlock.innerHTML = '<a href="login.html">Войти</a>';
  }
}

/* Инициализация */
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  CompareList.updateBadge();
  Cart.updateBadge();
  updateAuthUI();
  initSearch();
});

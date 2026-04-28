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
    if (btn) btn.innerHTML = theme === 'dark' ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  },

  toggle() {
    this.set(this.get() === 'dark' ? 'light' : 'dark');
  },

  init() {
    const theme = this.get();
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.innerHTML = theme === 'dark' ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
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

  getQty(productId) {
    const item = this.get().find(i => i.product_id === productId);
    return item ? item.quantity : 0;
  },

  updateQty(productId, qty) {
    if (qty <= 0) { return this.remove(productId); }
    const items = this.get();
    const item = items.find(i => i.product_id === productId);
    if (item) { item.quantity = qty; }
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
  CAT_KEY: 'technomir_compare_cat',

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch { return []; }
  },

  getCategoryId() {
    const v = localStorage.getItem(this.CAT_KEY);
    return v ? Number(v) : null;
  },

  add(id, categoryId) {
    const list = this.get();
    id = Number(id);
    if (categoryId !== undefined) categoryId = Number(categoryId);

    if (list.length > 0 && categoryId !== undefined) {
      const currentCat = this.getCategoryId();
      if (currentCat !== null && currentCat !== categoryId) {
        return false;
      }
    }

    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(this.KEY, JSON.stringify(list));
      if (categoryId !== undefined && list.length === 1) {
        localStorage.setItem(this.CAT_KEY, String(categoryId));
      }
    }
    this.updateBadge();
    return list;
  },

  remove(id) {
    let list = this.get();
    id = Number(id);
    list = list.filter(i => i !== id);
    localStorage.setItem(this.KEY, JSON.stringify(list));
    if (list.length === 0) localStorage.removeItem(this.CAT_KEY);
    this.updateBadge();
    return list;
  },

  has(id) {
    return this.get().includes(Number(id));
  },

  clear() {
    localStorage.removeItem(this.KEY);
    localStorage.removeItem(this.CAT_KEY);
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

/* Экранирование HTML */
function escapeHtml(str) {
  return (str + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    if (!user) { Auth.logout(); return; }
    const balanceStr = typeof user.balance === 'number' ? formatPrice(user.balance) : '';
    let links = '';
    if (balanceStr) links += `<span class="header__balance" title="Баланс">${balanceStr}</span>`;
    links += `<a href="account.html">${escapeHtml(user.name)}</a>`;
    if (Auth.isAdmin()) links += ` <a href="admin.html" class="header__admin-link">Админ</a>`;
    links += ` <a href="#" onclick="Auth.logout();return false;" class="header__logout">Выйти</a>`;
    authBlock.innerHTML = links;
  } else {
    authBlock.innerHTML = '<a href="login.html" class="header__login-btn">Войти</a>';
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

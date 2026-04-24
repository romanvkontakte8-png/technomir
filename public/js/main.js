/* ═══════════════════════════════════════════════════
   main.js — общие функции ТехноМир
   ═══════════════════════════════════════════════════ */

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

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    Cart.clear();
    window.location.href = '/';
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
      window.location.href = '/?search=' + encodeURIComponent(q);
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
    let links = `<a href="/account.html">${user.name}</a>`;
    if (Auth.isAdmin()) links += ` <a href="/admin.html" class="header__admin-link">Админ</a>`;
    links += ` <a href="#" onclick="Auth.logout();return false;" class="header__logout">Выйти</a>`;
    authBlock.innerHTML = links;
  } else {
    authBlock.innerHTML = '<a href="/login.html">Войти</a>';
  }
}

/* Инициализация */
document.addEventListener('DOMContentLoaded', () => {
  CompareList.updateBadge();
  Cart.updateBadge();
  updateAuthUI();
  initSearch();
});

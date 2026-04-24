/* ═══════════════════════════════════════════════════
   main.js — общие функции ТехноМир
   ═══════════════════════════════════════════════════ */

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

/* Инициализация */
document.addEventListener('DOMContentLoaded', () => {
  CompareList.updateBadge();
  initSearch();
});

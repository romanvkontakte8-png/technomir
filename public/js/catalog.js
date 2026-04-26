/* ═══════════════════════════════════════════════════
   catalog.js — каталог товаров ТехноМир
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('productsGrid');
  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('emptyState');
  const categoriesList = document.getElementById('categoriesList');
  const pageTitle = document.getElementById('pageTitle');

  const params = new URLSearchParams(window.location.search);
  const categoryId = params.get('category') || '';
  const searchQuery = params.get('search') || '';

  /* Загрузка категорий */
  try {
    const cats = await API.get('/api/categories', 'data/categories.json');
    for (const cat of cats) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = 'catalog.html?category=' + cat.id;
      a.className = 'categories-nav__link';
      a.textContent = cat.name;
      a.dataset.category = cat.id;
      if (String(cat.id) === categoryId) {
        a.classList.add('active');
        document.querySelector('.categories-nav__link.active')?.classList.remove('active');
        a.classList.add('active');
        pageTitle.textContent = cat.name;
      }
      li.appendChild(a);
      categoriesList.appendChild(li);
    }
  } catch (e) {
    console.error('Ошибка загрузки категорий:', e);
  }

  /* Загрузка товаров */
  loading.style.display = 'block';
  try {
    if (searchQuery) {
      pageTitle.textContent = 'Результаты поиска: «' + searchQuery + '»';
    }

    const serverMode = await API.check();
    let products;
    if (serverMode) {
      let url = '/api/products?';
      if (categoryId) url += 'category_id=' + categoryId + '&';
      if (searchQuery) url += 'search=' + encodeURIComponent(searchQuery) + '&';
      products = await fetch(url).then(r => r.json());
    } else {
      try { products = await fetch('data/products.json').then(r => r.json()); }
      catch { products = (typeof STATIC_DATA !== 'undefined') ? STATIC_DATA.products : []; }
      if (categoryId) products = products.filter(p => String(p.category_id) === categoryId);
      if (searchQuery) products = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    loading.style.display = 'none';

    if (products.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    for (const product of products) {
      grid.appendChild(createProductCard(product));
    }
  } catch (e) {
    console.error('Ошибка загрузки товаров:', e);
    loading.textContent = 'Ошибка загрузки данных';
  }
});

function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  const isInCompare = CompareList.has(product.id);

  card.innerHTML = `
    <div class="product-card__img-wrap">
      <img class="product-card__img"
           src="${product.image || 'img/placeholder.png'}"
           alt="${product.name}"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2214%22>Нет фото</text></svg>'">
      <button class="product-card__compare-btn ${isInCompare ? 'active' : ''}"
              data-id="${product.id}" title="Добавить к сравнению">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>
        </svg>
      </button>
    </div>
    <div class="product-card__body">
      <div class="product-card__category">${product.category_name || ''}</div>
      <div class="product-card__title">
        <a href="product.html?id=${product.id}">${product.name}</a>
      </div>
      <div class="product-card__price-block">
        <span class="product-card__price">${formatPrice(product.price)}</span>
        ${product.old_price ? `<span class="product-card__old-price">${formatPrice(product.old_price)}</span>` : ''}
      </div>
      <div class="product-card__cart-controls" data-id="${product.id}"></div>
    </div>
  `;

  const compareBtn = card.querySelector('.product-card__compare-btn');
  compareBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(product.id, compareBtn);
  });

  renderCartControl(card, product);
  return card;
}

function renderCartControl(card, product) {
  const container = card.querySelector('.product-card__cart-controls');
  const qty = Cart.getQty(product.id);

  if (qty === 0) {
    container.innerHTML = `<button class="btn btn--primary btn--sm product-card__buy-btn">В корзину</button>`;
    container.querySelector('.product-card__buy-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      Cart.add(product.id, product.name, product.price, product.image);
      showToast('Товар добавлен в корзину');
      renderCartControl(card, product);
    });
  } else {
    container.innerHTML = `
      <div class="product-card__qty-row">
        <div class="product-card__qty-control">
          <button class="qty-btn qty-btn--minus">−</button>
          <span class="qty-value">${qty}</span>
          <button class="qty-btn qty-btn--plus">+</button>
        </div>
        <button class="btn btn--remove-all" title="Убрать из корзины">✕</button>
      </div>`;
    container.querySelector('.qty-btn--minus').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      Cart.updateQty(product.id, qty - 1);
      if (qty - 1 <= 0) showToast('Товар убран из корзины');
      renderCartControl(card, product);
    });
    container.querySelector('.qty-btn--plus').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      Cart.updateQty(product.id, qty + 1);
      renderCartControl(card, product);
    });
    container.querySelector('.btn--remove-all').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      Cart.remove(product.id);
      showToast('Товар убран из корзины');
      renderCartControl(card, product);
    });
  }
}

function toggleCompare(id, btn) {
  if (CompareList.has(id)) {
    CompareList.remove(id);
    btn.classList.remove('active');
    showToast('Товар убран из сравнения');
  } else {
    if (CompareList.count() >= 6) {
      showToast('Максимум 6 товаров для сравнения');
      return;
    }
    CompareList.add(id);
    btn.classList.add('active');
    showToast('Товар добавлен к сравнению');
  }
}

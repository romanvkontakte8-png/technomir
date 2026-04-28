/* ═══════════════════════════════════════════════════
   product.js — страница товара ТехноМир
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    window.location.href = 'catalog.html';
    return;
  }

  const loading = document.getElementById('loading');
  const productPage = document.getElementById('productPage');
  const specsSection = document.getElementById('specsSection');

  try {
    const product = await API.get('/api/products/' + productId, 'data/product-' + productId + '.json');

    document.title = product.name + ' — ТехноМир';

    /* Хлебные крошки */
    document.getElementById('breadcrumbCategory').innerHTML =
      `<a href="catalog.html?category=${product.category_id}">${product.category_name || 'Каталог'}</a>`;
    document.getElementById('breadcrumbProduct').textContent = product.name;

    /* Основная информация */
    const img = document.getElementById('productImage');
    img.src = product.image || '';
    img.alt = product.name;
    img.onerror = function() {
      this.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22><rect fill=%22%23f0f0f0%22 width=%22400%22 height=%22400%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2218%22>Нет фото</text></svg>';
    };

    document.getElementById('productTitle').textContent = product.name;
    document.getElementById('productBrand').textContent = product.brand || '';
    document.getElementById('productDesc').textContent = product.description || '';
    document.getElementById('productPrice').textContent = formatPrice(product.price);

    const oldPriceEl = document.getElementById('productOldPrice');
    if (product.old_price) {
      oldPriceEl.textContent = formatPrice(product.old_price);
    } else {
      oldPriceEl.style.display = 'none';
    }

    const stockEl = document.getElementById('productStock');
    if (product.in_stock) {
      stockEl.textContent = 'В наличии';
      stockEl.className = 'product-page__stock product-page__stock--in';
    } else {
      stockEl.textContent = 'Нет в наличии';
      stockEl.className = 'product-page__stock product-page__stock--out';
    }

    /* Кнопка «В корзину» с контролем количества */
    renderProductCartControl(product);

    /* Кнопка сравнения */
    const compareBtn = document.getElementById('compareBtn');
    if (CompareList.has(product.id)) {
      compareBtn.classList.add('active');
      compareBtn.querySelector('span') || (compareBtn.lastChild.textContent = ' В сравнении');
    }
    compareBtn.addEventListener('click', () => {
      if (CompareList.has(product.id)) {
        CompareList.remove(product.id);
        compareBtn.classList.remove('active');
        showToast('Товар убран из сравнения');
      } else {
        if (CompareList.count() >= 6) {
          showToast('Максимум 6 товаров для сравнения');
          return;
        }
        const result = CompareList.add(product.id, product.category_id);
        if (result === false) {
          showToast('Можно сравнивать только товары одной категории');
          return;
        }
        compareBtn.classList.add('active');
        showToast('Товар добавлен к сравнению');
      }
    });

    /* Характеристики */
    if (product.specs && product.specs.length > 0) {
      const container = document.getElementById('specsContainer');
      const groups = {};
      for (const spec of product.specs) {
        if (!groups[spec.spec_group]) groups[spec.spec_group] = [];
        groups[spec.spec_group].push(spec);
      }

      for (const [group, specs] of Object.entries(groups)) {
        const div = document.createElement('div');
        div.className = 'specs-group';
        div.innerHTML = `<div class="specs-group__title">${group}</div>`;

        const table = document.createElement('table');
        table.className = 'specs-table';
        for (const spec of specs) {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${spec.spec_name}</td><td>${spec.spec_value}</td>`;
          table.appendChild(tr);
        }
        div.appendChild(table);
        container.appendChild(div);
      }

      specsSection.style.display = 'block';
    }

    loading.style.display = 'none';
    productPage.style.display = 'grid';

  } catch (e) {
    console.error(e);
    loading.textContent = 'Товар не найден';
  }
});

function renderProductCartControl(product) {
  const container = document.getElementById('productCartControl');
  if (!container) return;
  const qty = Cart.getQty(product.id);

  if (qty === 0) {
    container.innerHTML = `<button class="btn btn--primary" id="addToCartBtn">В корзину</button>`;
    container.querySelector('#addToCartBtn').addEventListener('click', () => {
      Cart.add(product.id, product.name, product.price, product.image);
      showToast('Товар добавлен в корзину');
      renderProductCartControl(product);
    });
  } else {
    container.innerHTML = `
      <div class="product-page__qty-row">
        <div class="product-page__qty-control">
          <button class="qty-btn qty-btn--minus">−</button>
          <span class="qty-value">${qty}</span>
          <button class="qty-btn qty-btn--plus">+</button>
        </div>
        <button class="btn btn--remove-all btn--remove-all--lg" title="Убрать из корзины">✕</button>
      </div>`;
    container.querySelector('.qty-btn--minus').addEventListener('click', () => {
      Cart.updateQty(product.id, qty - 1);
      if (qty - 1 <= 0) showToast('Товар убран из корзины');
      renderProductCartControl(product);
    });
    container.querySelector('.qty-btn--plus').addEventListener('click', () => {
      Cart.updateQty(product.id, qty + 1);
      renderProductCartControl(product);
    });
    container.querySelector('.btn--remove-all').addEventListener('click', () => {
      Cart.remove(product.id);
      showToast('Товар убран из корзины');
      renderProductCartControl(product);
    });
  }
}

/* ═══════════════════════════════════════════════════
   cart.js — корзина и оформление заказа
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  renderCart();

  if (Auth.isLoggedIn()) {
    document.getElementById('checkoutForm').style.display = 'block';
    document.getElementById('needAuth').style.display = 'none';
  } else {
    document.getElementById('checkoutForm').style.display = 'none';
    document.getElementById('needAuth').style.display = 'block';
  }

  document.getElementById('checkoutForm').addEventListener('submit', placeOrder);
});

function renderCart() {
  const items = Cart.get();
  const emptyEl = document.getElementById('cartEmpty');
  const contentEl = document.getElementById('cartContent');
  const itemsEl = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');

  if (items.length === 0) {
    emptyEl.style.display = 'block';
    contentEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  contentEl.style.display = 'block';

  itemsEl.innerHTML = '';
  for (const item of items) {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img class="cart-item__img" src="${item.image || ''}" alt="${item.name}"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%23f0f0f0%22 width=%22100%22 height=%22100%22/></svg>'">
      <div class="cart-item__info">
        <div class="cart-item__name">${item.name}</div>
        <div class="cart-item__price">${formatPrice(item.price)}</div>
      </div>
      <div class="cart-item__qty">
        <button class="qty-btn" data-action="minus" data-id="${item.product_id}">−</button>
        <span>${item.quantity}</span>
        <button class="qty-btn" data-action="plus" data-id="${item.product_id}">+</button>
      </div>
      <div class="cart-item__subtotal">${formatPrice(item.price * item.quantity)}</div>
      <button class="cart-item__remove" data-id="${item.product_id}">&#10005;</button>
    `;
    itemsEl.appendChild(div);
  }

  totalEl.textContent = formatPrice(Cart.total());

  itemsEl.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const item = Cart.get().find(i => i.product_id === id);
      if (!item) return;
      if (btn.dataset.action === 'plus') Cart.updateQty(id, item.quantity + 1);
      else Cart.updateQty(id, item.quantity - 1);
      if (Cart.get().find(i => i.product_id === id)?.quantity < 1) Cart.remove(id);
      renderCart();
    });
  });

  itemsEl.querySelectorAll('.cart-item__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      Cart.remove(Number(btn.dataset.id));
      renderCart();
    });
  });
}

async function placeOrder(e) {
  e.preventDefault();
  const errEl = document.getElementById('formError');
  errEl.style.display = 'none';

  const items = Cart.get().map(i => ({ product_id: i.product_id, quantity: i.quantity }));
  if (items.length === 0) return;

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: Auth.headers(),
      body: JSON.stringify({
        items,
        address: document.getElementById('address').value,
        comment: document.getElementById('comment').value
      })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error;
      errEl.style.display = 'block';
      return;
    }

    Cart.clear();
    document.getElementById('cartContent').style.display = 'none';
    document.getElementById('orderSuccess').style.display = 'block';
    document.getElementById('orderNumber').textContent = '#' + data.order_id;
    document.getElementById('orderTotal').textContent = formatPrice(data.total);
  } catch (err) {
    errEl.textContent = 'Ошибка сервера';
    errEl.style.display = 'block';
  }
}

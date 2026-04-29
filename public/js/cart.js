/* ═══════════════════════════════════════════════════
   cart.js — корзина и оформление заказа
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  renderCart();

  if (Auth.isLoggedIn()) {
    document.getElementById('checkoutForm').style.display = 'block';
    document.getElementById('needAuth').style.display = 'none';
    loadBalance();
  } else {
    document.getElementById('checkoutForm').style.display = 'none';
    document.getElementById('needAuth').style.display = 'block';
  }

  document.getElementById('checkoutForm').addEventListener('submit', placeOrder);
});

async function loadBalance() {
  try {
    const res = await fetch('/api/balance', { headers: Auth.headers() });
    if (res.ok) {
      const data = await res.json();
      const el = document.getElementById('balanceInfo');
      if (el) {
        el.innerHTML = `Ваш баланс: <strong>${formatPrice(data.balance)}</strong>`;
        const total = Cart.total();
        if (data.balance < total) {
          const need = total - data.balance;
          el.innerHTML += `<br><span style="color:var(--danger)">Не хватает ${formatPrice(need)}</span>`;
          el.innerHTML += `<br><a href="account.html" class="btn btn--primary btn--sm" style="margin-top:8px">Пополнить баланс</a>`;
        }
      }
    }
  } catch {}
}

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
      <button class="cart-item__remove" data-id="${item.product_id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
    `;
    itemsEl.appendChild(div);
  }

  totalEl.textContent = formatPrice(Cart.total());

  if (Auth.isLoggedIn()) loadBalance();

  itemsEl.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const item = Cart.get().find(i => i.product_id === id);
      if (!item) return;
      const newQty = btn.dataset.action === 'plus' ? item.quantity + 1 : item.quantity - 1;
      Cart.updateQty(id, newQty);
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
      if (data.error === 'Недостаточно средств') {
        errEl.innerHTML = `${data.error}. Нужно: ${formatPrice(data.need)}, баланс: ${formatPrice(data.balance)}. <a href="account.html">Пополнить</a>`;
      } else {
        errEl.textContent = data.error;
      }
      errEl.style.display = 'block';
      return;
    }

    Cart.clear();
    document.getElementById('cartContent').style.display = 'none';
    document.getElementById('orderSuccess').style.display = 'block';
    document.getElementById('orderNumber').textContent = '#' + data.order_id;
    document.getElementById('orderTotal').textContent = formatPrice(data.total);

    const user = Auth.getUser();
    if (user) { user.balance = data.balance; Auth.updateUser(user); updateAuthUI(); }
  } catch (err) {
    errEl.textContent = 'Ошибка сервера';
    errEl.style.display = 'block';
  }
}

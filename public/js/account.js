/* ═══════════════════════════════════════════════════
   account.js — личный кабинет клиента
   ═══════════════════════════════════════════════════ */

const STATUS_LABELS = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  delivered: 'Доставлен',
  cancelled: 'Отменён'
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) { window.location.href = '/login.html'; return; }

  const user = Auth.getUser();
  document.getElementById('accountInfo').innerHTML = `
    <div class="account-card">
      <p><strong>Имя:</strong> ${user.name}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      ${user.phone ? `<p><strong>Телефон:</strong> ${user.phone}</p>` : ''}
      <p><strong>Роль:</strong> ${user.role === 'admin' ? 'Администратор' : 'Клиент'}</p>
    </div>
  `;

  await loadOrders();
});

async function loadOrders() {
  const loading = document.getElementById('loading');
  const emptyEl = document.getElementById('ordersEmpty');
  const listEl = document.getElementById('ordersList');

  try {
    const res = await fetch('/api/orders', { headers: Auth.headers() });
    if (!res.ok) throw new Error('Ошибка');
    const orders = await res.json();

    loading.style.display = 'none';

    if (orders.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }

    listEl.innerHTML = '';
    for (const order of orders) {
      const card = document.createElement('div');
      card.className = 'order-card';

      const itemsHTML = order.items.map(i => `
        <div class="order-item">
          <img src="${i.image || ''}" alt="${i.name}" class="order-item__img"
               onerror="this.style.display='none'">
          <span class="order-item__name">${i.name}</span>
          <span class="order-item__qty">${i.quantity} шт.</span>
          <span class="order-item__price">${formatPrice(i.price * i.quantity)}</span>
        </div>
      `).join('');

      const canCancel = order.status === 'new';

      card.innerHTML = `
        <div class="order-card__header">
          <span class="order-card__id">Заказ #${order.id}</span>
          <span class="order-card__date">${new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
          <span class="status-badge status--${order.status}">${STATUS_LABELS[order.status] || order.status}</span>
        </div>
        <div class="order-card__items">${itemsHTML}</div>
        <div class="order-card__footer">
          <span class="order-card__total">Итого: ${formatPrice(order.total)}</span>
          ${order.address ? `<span class="order-card__address">Адрес: ${order.address}</span>` : ''}
          ${canCancel ? `<button class="btn btn--danger btn--sm cancel-btn" data-id="${order.id}">Отменить заказ</button>` : ''}
        </div>
      `;

      listEl.appendChild(card);
    }

    listEl.querySelectorAll('.cancel-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Вы уверены, что хотите отменить заказ?')) return;
        try {
          const res = await fetch('/api/orders/' + btn.dataset.id + '/cancel', {
            method: 'PUT',
            headers: Auth.headers()
          });
          if (res.ok) { showToast('Заказ отменён'); loadOrders(); }
          else { const d = await res.json(); showToast(d.error); }
        } catch { showToast('Ошибка'); }
      });
    });

  } catch (e) {
    loading.textContent = 'Ошибка загрузки заказов';
  }
}

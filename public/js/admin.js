/* ═══════════════════════════════════════════════════
   admin.js — админ-панель ТехноМир
   ═══════════════════════════════════════════════════ */

const STATUS_LABELS = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  delivered: 'Доставлен',
  cancelled: 'Отменён'
};

let allOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
    window.location.href = '/login.html';
    return;
  }

  /* Табы */
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('ordersPanel').style.display = tab.dataset.tab === 'orders' ? '' : 'none';
      document.getElementById('usersPanel').style.display = tab.dataset.tab === 'users' ? '' : 'none';
      if (tab.dataset.tab === 'users') loadUsers();
    });
  });

  document.getElementById('statusFilter').addEventListener('change', () => renderOrders());

  await loadOrders();
});

async function loadOrders() {
  try {
    const res = await fetch('/api/admin/orders', { headers: Auth.headers() });
    if (!res.ok) throw new Error('Ошибка');
    allOrders = await res.json();
    document.getElementById('ordersLoading').style.display = 'none';
    renderOrders();
  } catch (e) {
    document.getElementById('ordersLoading').textContent = 'Ошибка загрузки';
  }
}

function renderOrders() {
  const filter = document.getElementById('statusFilter').value;
  const orders = filter ? allOrders.filter(o => o.status === filter) : allOrders;
  const listEl = document.getElementById('adminOrdersList');

  if (orders.length === 0) {
    listEl.innerHTML = '<p class="empty-state">Заказов не найдено</p>';
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

    card.innerHTML = `
      <div class="order-card__header">
        <span class="order-card__id">Заказ #${order.id}</span>
        <span class="order-card__date">${new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
        <span class="order-card__user">${order.user_name} (${order.user_email})</span>
        <span class="status-badge status--${order.status}">${STATUS_LABELS[order.status] || order.status}</span>
      </div>
      <div class="order-card__items">${itemsHTML}</div>
      <div class="order-card__footer">
        <span class="order-card__total">Итого: ${formatPrice(order.total)}</span>
        ${order.address ? `<span class="order-card__address">Адрес: ${order.address}</span>` : ''}
        <div class="order-card__actions">
          <label>Статус:</label>
          <select class="status-select" data-id="${order.id}">
            <option value="new" ${order.status === 'new' ? 'selected' : ''}>Новый</option>
            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Подтверждён</option>
            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Доставлен</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Отменён</option>
          </select>
        </div>
      </div>
    `;

    listEl.appendChild(card);
  }

  listEl.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      try {
        const res = await fetch('/api/admin/orders/' + sel.dataset.id + '/status', {
          method: 'PUT',
          headers: Auth.headers(),
          body: JSON.stringify({ status: sel.value })
        });
        if (res.ok) { showToast('Статус обновлён'); loadOrders(); }
        else { const d = await res.json(); showToast(d.error); }
      } catch { showToast('Ошибка'); }
    });
  });
}

async function loadUsers() {
  const loading = document.getElementById('usersLoading');
  const listEl = document.getElementById('adminUsersList');
  loading.style.display = 'block';

  try {
    const res = await fetch('/api/admin/users', { headers: Auth.headers() });
    if (!res.ok) throw new Error('Ошибка');
    const users = await res.json();
    loading.style.display = 'none';

    if (users.length === 0) {
      listEl.innerHTML = '<p>Нет пользователей</p>';
      return;
    }

    let html = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th><th>Имя</th><th>Email</th><th>Телефон</th>
            <th>Роль</th><th>Заказов</th><th>Сумма покупок</th><th>Дата регистрации</th>
          </tr>
        </thead>
        <tbody>
    `;
    for (const u of users) {
      html += `
        <tr>
          <td>${u.id}</td>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${u.phone || '—'}</td>
          <td><span class="role-badge role--${u.role}">${u.role === 'admin' ? 'Админ' : 'Клиент'}</span></td>
          <td>${u.order_count}</td>
          <td>${formatPrice(u.total_spent)}</td>
          <td>${new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
        </tr>
      `;
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;

  } catch (e) {
    loading.textContent = 'Ошибка загрузки';
  }
}

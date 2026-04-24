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
  if (!Auth.isLoggedIn()) { window.location.href = 'login.html'; return; }

  await loadProfile();
  initProfileEdit();
  initTopup();
  await loadOrders();
});

async function loadProfile() {
  try {
    const res = await fetch('/api/auth/me', { headers: Auth.headers() });
    if (!res.ok) throw new Error();
    const user = await res.json();
    Auth.updateUser(user);
    updateAuthUI();
    renderProfile(user);
    updateBalance(user.balance);
  } catch {
    const user = Auth.getUser();
    if (user) { renderProfile(user); updateBalance(user.balance || 0); }
  }
}

function renderProfile(user) {
  document.getElementById('profileView').innerHTML = `
    <p><strong>Имя:</strong> ${user.name}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    ${user.phone ? `<p><strong>Телефон:</strong> ${user.phone}</p>` : ''}
    <p><strong>Роль:</strong> ${user.role === 'admin' ? 'Администратор' : 'Клиент'}</p>
  `;
}

function updateBalance(balance) {
  document.getElementById('balanceDisplay').textContent = formatPrice(balance || 0);
}

function initProfileEdit() {
  const editBtn = document.getElementById('editProfileBtn');
  const formEl = document.getElementById('profileForm');
  const saveBtn = document.getElementById('saveProfileBtn');
  const cancelBtn = document.getElementById('cancelProfileBtn');

  editBtn.addEventListener('click', () => {
    const user = Auth.getUser();
    document.getElementById('profName').value = user.name || '';
    document.getElementById('profPhone').value = user.phone || '';
    document.getElementById('profPassword').value = '';
    formEl.style.display = 'block';
    editBtn.style.display = 'none';
  });

  cancelBtn.addEventListener('click', () => {
    formEl.style.display = 'none';
    editBtn.style.display = '';
  });

  saveBtn.addEventListener('click', async () => {
    const body = {};
    const name = document.getElementById('profName').value.trim();
    const phone = document.getElementById('profPhone').value.trim();
    const password = document.getElementById('profPassword').value;
    if (name) body.name = name;
    body.phone = phone;
    if (password) body.password = password;

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: Auth.headers(),
        body: JSON.stringify(body)
      });
      if (!res.ok) { const d = await res.json(); showToast(d.error); return; }
      const updated = await res.json();
      Auth.updateUser(updated);
      updateAuthUI();
      renderProfile(updated);
      formEl.style.display = 'none';
      editBtn.style.display = '';
      showToast('Профиль обновлён');
    } catch { showToast('Ошибка сохранения'); }
  });
}

function initTopup() {
  document.querySelectorAll('.topup-btn').forEach(btn => {
    btn.addEventListener('click', () => topup(parseInt(btn.dataset.amount)));
  });

  document.getElementById('topupBtn').addEventListener('click', () => {
    const val = parseInt(document.getElementById('topupAmount').value);
    if (val > 0) topup(val);
    else showToast('Введите сумму пополнения');
  });
}

async function topup(amount) {
  try {
    const res = await fetch('/api/balance/topup', {
      method: 'POST',
      headers: Auth.headers(),
      body: JSON.stringify({ amount })
    });
    if (!res.ok) { const d = await res.json(); showToast(d.error); return; }
    const data = await res.json();
    updateBalance(data.balance);
    const user = Auth.getUser();
    user.balance = data.balance;
    Auth.updateUser(user);
    updateAuthUI();
    showToast('Баланс пополнен на ' + formatPrice(amount));
    document.getElementById('topupAmount').value = '';
  } catch { showToast('Ошибка пополнения'); }
}

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
          if (res.ok) {
            showToast('Заказ отменён, средства возвращены');
            await loadProfile();
            loadOrders();
          }
          else { const d = await res.json(); showToast(d.error); }
        } catch { showToast('Ошибка'); }
      });
    });

  } catch (e) {
    loading.textContent = 'Ошибка загрузки заказов';
  }
}

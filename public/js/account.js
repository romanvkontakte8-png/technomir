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
  initProfileEditing();
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
    <p><strong>Почта:</strong> ${user.email}</p>
    <p><strong>Роль:</strong> ${user.role === 'admin' ? 'Администратор' : 'Клиент'}</p>
    ${user.role === 'admin' ? '<a href="admin.html" class="btn btn--primary" style="margin-top:12px;display:inline-block;">Админ-панель</a>' : ''}
  `;
}

function updateBalance(balance) {
  document.getElementById('balanceDisplay').textContent = formatPrice(balance || 0);
}

/* ───────── Редактирование профиля ───────── */

function initProfileEditing() {
  /* --- Имя --- */
  const editNameBtn = document.getElementById('editNameBtn');
  const nameGroup = document.getElementById('nameEditGroup');
  const saveNameBtn = document.getElementById('saveNameBtn');
  const cancelNameBtn = document.getElementById('cancelNameBtn');

  editNameBtn.addEventListener('click', () => {
    const user = Auth.getUser();
    document.getElementById('profName').value = user.name || '';
    nameGroup.style.display = 'block';
    editNameBtn.style.display = 'none';
  });

  cancelNameBtn.addEventListener('click', () => {
    nameGroup.style.display = 'none';
    editNameBtn.style.display = '';
  });

  saveNameBtn.addEventListener('click', async () => {
    const name = document.getElementById('profName').value.trim();
    if (!name) { showToast('Введите имя'); return; }

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: Auth.headers(),
        body: JSON.stringify({ name })
      });
      if (!res.ok) { const d = await res.json(); showToast(d.error); return; }
      const updated = await res.json();
      Auth.updateUser(updated);
      updateAuthUI();
      renderProfile(updated);
      nameGroup.style.display = 'none';
      editNameBtn.style.display = '';
      showToast('Имя обновлено');
    } catch { showToast('Ошибка сохранения'); }
  });

  /* --- Почта --- */
  const editEmailBtn = document.getElementById('editEmailBtn');
  const emailGroup = document.getElementById('emailEditGroup');
  const saveEmailBtn = document.getElementById('saveEmailBtn');
  const cancelEmailBtn = document.getElementById('cancelEmailBtn');
  const emailError = document.getElementById('emailError');

  editEmailBtn.addEventListener('click', () => {
    document.getElementById('profEmail').value = '';
    document.getElementById('emailConfirmPass').value = '';
    emailError.style.display = 'none';
    emailGroup.style.display = 'block';
    editEmailBtn.style.display = 'none';
  });

  cancelEmailBtn.addEventListener('click', () => {
    emailGroup.style.display = 'none';
    editEmailBtn.style.display = '';
  });

  saveEmailBtn.addEventListener('click', async () => {
    const newEmail = document.getElementById('profEmail').value.trim();
    const currentPass = document.getElementById('emailConfirmPass').value;
    emailError.style.display = 'none';

    if (!newEmail) { emailError.textContent = 'Введите новую почту'; emailError.style.display = 'block'; return; }
    if (!currentPass) { emailError.textContent = 'Введите текущий пароль'; emailError.style.display = 'block'; return; }

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: Auth.headers(),
        body: JSON.stringify({ email: newEmail, current_password: currentPass })
      });
      if (!res.ok) { const d = await res.json(); emailError.textContent = d.error; emailError.style.display = 'block'; return; }
      const updated = await res.json();
      Auth.updateUser(updated);
      updateAuthUI();
      renderProfile(updated);
      emailGroup.style.display = 'none';
      editEmailBtn.style.display = '';
      showToast('Почта обновлена');
    } catch { emailError.textContent = 'Ошибка сохранения'; emailError.style.display = 'block'; }
  });

  /* --- Пароль --- */
  const editPassBtn = document.getElementById('editPassBtn');
  const passGroup = document.getElementById('passEditGroup');
  const savePassBtn = document.getElementById('savePassBtn');
  const cancelPassBtn = document.getElementById('cancelPassBtn');
  const passError = document.getElementById('passError');

  editPassBtn.addEventListener('click', () => {
    document.getElementById('passOld').value = '';
    document.getElementById('passNew').value = '';
    document.getElementById('passNew2').value = '';
    passError.style.display = 'none';
    passGroup.style.display = 'block';
    editPassBtn.style.display = 'none';
  });

  cancelPassBtn.addEventListener('click', () => {
    passGroup.style.display = 'none';
    editPassBtn.style.display = '';
  });

  savePassBtn.addEventListener('click', async () => {
    const oldPass = document.getElementById('passOld').value;
    const newPass = document.getElementById('passNew').value;
    const newPass2 = document.getElementById('passNew2').value;
    passError.style.display = 'none';

    if (!oldPass) { passError.textContent = 'Введите текущий пароль'; passError.style.display = 'block'; return; }
    if (!newPass || newPass.length < 4) { passError.textContent = 'Новый пароль минимум 4 символа'; passError.style.display = 'block'; return; }
    if (newPass !== newPass2) { passError.textContent = 'Пароли не совпадают'; passError.style.display = 'block'; return; }

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: Auth.headers(),
        body: JSON.stringify({ password: newPass, current_password: oldPass })
      });
      if (!res.ok) { const d = await res.json(); passError.textContent = d.error; passError.style.display = 'block'; return; }
      passGroup.style.display = 'none';
      editPassBtn.style.display = '';
      showToast('Пароль изменён');
    } catch { passError.textContent = 'Ошибка сохранения'; passError.style.display = 'block'; }
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

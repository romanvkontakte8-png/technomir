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
let allUsers = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
    window.location.href = 'login.html';
    return;
  }

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

  const roleFilter = document.getElementById('roleFilter');
  const userSearch = document.getElementById('userSearch');
  if (roleFilter) roleFilter.addEventListener('change', () => renderUsers());
  if (userSearch) userSearch.addEventListener('input', () => renderUsers());

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
        <span class="order-card__user">${escapeHtml(order.user_name)} (${escapeHtml(order.user_email)})</span>
        <span class="status-badge status--${order.status}">${STATUS_LABELS[order.status] || order.status}</span>
      </div>
      <div class="order-card__items">${itemsHTML}</div>
      <div class="order-card__footer">
        <span class="order-card__total">Итого: ${formatPrice(order.total)}</span>
        ${order.address ? `<span class="order-card__address">Адрес: ${escapeHtml(order.address)}</span>` : ''}
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
  loading.style.display = 'block';

  try {
    const res = await fetch('/api/admin/users', { headers: Auth.headers() });
    if (!res.ok) throw new Error('Ошибка');
    allUsers = await res.json();
    loading.style.display = 'none';
    renderUsers();
  } catch (e) {
    loading.textContent = 'Ошибка загрузки';
  }
}

function renderUsers() {
  const listEl = document.getElementById('adminUsersList');
  const roleFilter = document.getElementById('roleFilter').value;
  const searchQuery = (document.getElementById('userSearch').value || '').trim().toLowerCase();

  let users = allUsers;
  if (roleFilter) users = users.filter(u => u.role === roleFilter);
  if (searchQuery) users = users.filter(u => u.name.toLowerCase().includes(searchQuery));

  if (users.length === 0) {
    listEl.innerHTML = '<p class="empty-state">Пользователей не найдено</p>';
    return;
  }

  let html = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>ID</th><th>Имя</th><th>Email</th><th>Телефон</th>
          <th>Роль</th><th>Баланс</th><th>Заказов</th><th>Сумма покупок</th><th>Действия</th>
        </tr>
      </thead>
      <tbody>
  `;
  for (const u of users) {
    html += `
      <tr>
        <td>${u.id}</td>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${u.phone ? escapeHtml(u.phone) : '—'}</td>
        <td><span class="role-badge role--${u.role}">${u.role === 'admin' ? 'Админ' : 'Клиент'}</span></td>
        <td>${formatPrice(u.balance || 0)}</td>
        <td>${u.order_count}</td>
        <td>${formatPrice(u.total_spent)}</td>
        <td><button class="btn btn--sm btn--outline edit-user-btn" data-id="${u.id}" data-name="${escapeHtml(u.name)}" data-email="${escapeHtml(u.email)}" data-phone="${escapeHtml(u.phone || '')}" data-role="${u.role}" data-balance="${u.balance || 0}">Редактировать</button></td>
      </tr>
    `;
  }
  html += '</tbody></table>';
  listEl.innerHTML = html;

  listEl.querySelectorAll('.edit-user-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset));
  });
}

function openEditModal(data) {
  let modal = document.getElementById('editUserModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'editUserModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <h2>Редактирование пользователя</h2>
        <div class="form-group"><label>Имя</label><input type="text" id="editName" class="form-input"></div>
        <div class="form-group"><label>Email</label><input type="email" id="editEmail" class="form-input"></div>
        <div class="form-group"><label>Телефон</label><input type="text" id="editPhone" class="form-input"></div>
        <div class="form-group"><label>Роль</label>
          <select id="editRole" class="form-input">
            <option value="client">Клиент</option>
            <option value="admin">Администратор</option>
          </select>
        </div>
        <div class="form-group"><label>Баланс</label><input type="number" id="editBalance" class="form-input" min="0"></div>
        <div class="form-group"><label>Новый пароль пользователя (оставьте пустым)</label><input type="password" id="editPassword" class="form-input"></div>
        <hr style="border-color:var(--border-color);margin:16px 0;">
        <div class="form-group"><label>Ваш пароль администратора *</label><input type="password" id="adminConfirmPass" class="form-input" placeholder="Введите свой пароль для подтверждения"></div>
        <div class="form-error" id="adminEditError" style="display:none"></div>
        <div class="modal-actions">
          <button class="btn btn--primary" id="saveUserBtn">Сохранить</button>
          <button class="btn btn--outline" id="closeModalBtn">Отмена</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('editName').value = data.name;
  document.getElementById('editEmail').value = data.email;
  document.getElementById('editPhone').value = data.phone;
  document.getElementById('editRole').value = data.role;
  document.getElementById('editBalance').value = data.balance;
  document.getElementById('editPassword').value = '';
  document.getElementById('adminConfirmPass').value = '';
  const adminErr = document.getElementById('adminEditError');
  if (adminErr) adminErr.style.display = 'none';
  modal.style.display = 'flex';
  modal.dataset.userId = data.id;

  document.getElementById('closeModalBtn').onclick = () => modal.style.display = 'none';
  document.getElementById('saveUserBtn').onclick = () => saveUser(data.id);
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
}

async function saveUser(userId) {
  const adminPass = document.getElementById('adminConfirmPass').value;
  const adminErr = document.getElementById('adminEditError');
  adminErr.style.display = 'none';

  if (!adminPass) {
    adminErr.textContent = 'Введите свой пароль администратора';
    adminErr.style.display = 'block';
    return;
  }

  const body = {
    name: document.getElementById('editName').value.trim(),
    email: document.getElementById('editEmail').value.trim(),
    phone: document.getElementById('editPhone').value.trim(),
    role: document.getElementById('editRole').value,
    balance: parseInt(document.getElementById('editBalance').value) || 0,
    admin_password: adminPass
  };
  const pw = document.getElementById('editPassword').value;
  if (pw) body.password = pw;

  try {
    const res = await fetch('/api/admin/users/' + userId, {
      method: 'PUT',
      headers: Auth.headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const d = await res.json();
      adminErr.textContent = d.error;
      adminErr.style.display = 'block';
      return;
    }
    document.getElementById('editUserModal').style.display = 'none';
    showToast('Пользователь обновлён');
    loadUsers();
  } catch {
    adminErr.textContent = 'Ошибка сохранения';
    adminErr.style.display = 'block';
  }
}

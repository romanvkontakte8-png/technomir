/* ═══════════════════════════════════════════════════
   compare.js — страница сравнения товаров ТехноМир
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  const ids = CompareList.get();
  if (ids.length === 0) return;

  loadComparison(ids);

  document.getElementById('showDiffOnly').addEventListener('change', (e) => {
    toggleDiffOnly(e.target.checked);
  });

  document.getElementById('clearCompare').addEventListener('click', () => {
    CompareList.clear();
    window.location.reload();
  });
});

async function loadComparison(ids) {
  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('emptyState');
  const controls = document.getElementById('compareControls');
  const wrapper = document.getElementById('compareWrapper');

  loading.style.display = 'block';
  emptyState.style.display = 'none';

  try {
    /* Загружаем данные каждого товара из статических JSON */
    const promises = ids.map(id => fetch('/data/product-' + id + '.json').then(r => r.json()));
    const products = await Promise.all(promises);

    if (products.length === 0) {
      loading.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    /* Группировка характеристик (аналог серверной логики) */
    const groupMap = {};
    for (const p of products) {
      if (!p.specs) continue;
      for (const s of p.specs) {
        if (!groupMap[s.spec_group]) groupMap[s.spec_group] = {};
        if (!groupMap[s.spec_group][s.spec_name]) groupMap[s.spec_group][s.spec_name] = {};
        groupMap[s.spec_group][s.spec_name][p.id] = s.spec_value;
      }
    }

    const specGroups = Object.entries(groupMap).map(([group, specs]) => ({
      group,
      rows: Object.entries(specs).map(([name, values]) => {
        const vals = Object.values(values);
        const different = vals.length > 1 && !vals.every(v => v === vals[0]);
        return { name, values, different };
      })
    }));

    renderCompareTable({ products, specGroups });

    loading.style.display = 'none';
    controls.style.display = 'flex';
    wrapper.style.display = 'block';

  } catch (e) {
    console.error(e);
    loading.textContent = 'Ошибка загрузки данных сравнения';
  }
}

function renderCompareTable(data) {
  const { products, specGroups } = data;
  const thead = document.getElementById('compareHead');
  const tbody = document.getElementById('compareBody');

  /* Шапка: товары */
  let headRow = '<tr><th></th>';
  for (const p of products) {
    headRow += `
      <th>
        <div class="compare-product-cell">
          <img src="${p.image || ''}" alt="${p.name}"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><rect fill=%22%23f0f0f0%22 width=%22120%22 height=%22120%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2212%22>Нет фото</text></svg>'">
          <div class="compare-product-cell__name">
            <a href="/product.html?id=${p.id}">${p.name}</a>
          </div>
          <div class="compare-product-cell__price">${formatPrice(p.price)}</div>
          <button class="compare-product-cell__remove" data-id="${p.id}">Убрать</button>
        </div>
      </th>`;
  }
  headRow += '</tr>';
  thead.innerHTML = headRow;

  /* Кнопки "Убрать" */
  thead.querySelectorAll('.compare-product-cell__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      CompareList.remove(Number(btn.dataset.id));
      const remaining = CompareList.get();
      if (remaining.length === 0) {
        window.location.reload();
      } else {
        loadComparison(remaining);
      }
    });
  });

  /* Тело: характеристики */
  let bodyHTML = '';

  for (const group of specGroups) {
    bodyHTML += `<tr class="compare-group-row"><td colspan="${products.length + 1}">${group.group}</td></tr>`;

    for (const row of group.rows) {
      const diffClass = row.different ? 'compare-diff' : '';
      bodyHTML += `<tr class="${diffClass}" data-different="${row.different}">`;
      bodyHTML += `<td>${row.name}</td>`;
      for (const p of products) {
        bodyHTML += `<td>${row.values[p.id] || '—'}</td>`;
      }
      bodyHTML += '</tr>';
    }
  }

  tbody.innerHTML = bodyHTML;
}

function toggleDiffOnly(showDiffOnly) {
  const rows = document.querySelectorAll('#compareBody tr[data-different]');
  rows.forEach(row => {
    if (showDiffOnly && row.dataset.different === 'false') {
      row.style.display = 'none';
    } else {
      row.style.display = '';
    }
  });
}

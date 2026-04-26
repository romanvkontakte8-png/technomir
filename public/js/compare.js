/* ═══════════════════════════════════════════════════
   compare.js — страница сравнения товаров ТехноМир
   ═══════════════════════════════════════════════════ */

/* Спеки где МЕНЬШЕ = лучше */
const LOWER_IS_BETTER = ['вес', 'вес наушника', 'цена'];

/* Извлечь число из строки: "12 Мп" → 12, "4 676 мА·ч" → 4676, "6.7\"" → 6.7 */
function extractNumber(str) {
  if (!str || str === '—') return null;
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  const m = cleaned.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

/* Определить рейтинг значений: кто лучше, кто хуже */
function rankValues(specName, valuesMap, productIds) {
  const nums = {};
  let allNumeric = true;
  let hasAny = false;

  for (const pid of productIds) {
    const v = valuesMap[pid];
    if (!v || v === '—') { allNumeric = false; continue; }
    const n = extractNumber(v);
    if (n === null) { allNumeric = false; }
    else { nums[pid] = n; hasAny = true; }
  }

  if (!hasAny || !allNumeric || Object.keys(nums).length < 2) return {};

  const values = Object.values(nums);
  const allSame = values.every(v => v === values[0]);
  if (allSame) return {};

  const lowerBetter = LOWER_IS_BETTER.some(s => specName.toLowerCase().includes(s));
  const best = lowerBetter ? Math.min(...values) : Math.max(...values);
  const worst = lowerBetter ? Math.max(...values) : Math.min(...values);

  const result = {};
  for (const [pid, n] of Object.entries(nums)) {
    if (n === best) result[pid] = 'best';
    else if (n === worst) result[pid] = 'worst';
    else result[pid] = 'mid';
  }
  return result;
}

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
    const serverMode = await API.check();
    let data;

    if (serverMode) {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) throw new Error('Ошибка загрузки');
      data = await res.json();
    } else {
      const promises = ids.map(id => API.get('/api/products/' + id, 'data/product-' + id + '.json'));
      const products = await Promise.all(promises);
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
          return { name, values, different: vals.length > 1 && !vals.every(v => v === vals[0]) };
        })
      }));
      data = { products, specGroups };
    }

    if (data.products.length === 0) {
      loading.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    renderCompareTable(data);

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
  const productIds = products.map(p => p.id);

  /* Подсчёт очков для итоговой оценки */
  const scores = {};
  for (const p of products) scores[p.id] = { wins: 0, losses: 0 };

  /* Шапка: товары */
  let headRow = '<tr><th></th>';
  for (const p of products) {
    headRow += `
      <th>
        <div class="compare-product-cell">
          <img src="${p.image || ''}" alt="${p.name}"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><rect fill=%22%23f0f0f0%22 width=%22120%22 height=%22120%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2212%22>Нет фото</text></svg>'">
          <div class="compare-product-cell__name">
            <a href="product.html?id=${p.id}">${p.name}</a>
          </div>
          <div class="compare-product-cell__price">${formatPrice(p.price)}</div>
          <button class="btn btn--primary compare-product-cell__cart" data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-price="${p.price}" data-image="${escapeHtml(p.image || '')}">В корзину</button>
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

  /* Кнопки "В корзину" */
  thead.querySelectorAll('.compare-product-cell__cart').forEach(btn => {
    btn.addEventListener('click', () => {
      Cart.add(Number(btn.dataset.id), btn.dataset.name, Number(btn.dataset.price), btn.dataset.image);
      showToast('Товар добавлен в корзину');
    });
  });

  /* Рейтинг цены */
  const priceMap = {};
  for (const p of products) priceMap[p.id] = String(p.price);
  const priceRank = rankValues('цена', priceMap, productIds);

  /* Тело: характеристики */
  let bodyHTML = '';

  /* Строка цены */
  bodyHTML += '<tr class="compare-price-row" data-different="true">';
  bodyHTML += '<td>Цена</td>';
  for (const p of products) {
    const rank = priceRank[p.id] || '';
    const cls = rank === 'best' ? 'cmp-best' : rank === 'worst' ? 'cmp-worst' : '';
    const icon = rank === 'best' ? '<span class="cmp-icon cmp-icon--best" title="Лучшая цена">&#9650;</span>' : rank === 'worst' ? '<span class="cmp-icon cmp-icon--worst" title="Выше цена">&#9660;</span>' : '';
    bodyHTML += `<td class="${cls}">${icon} ${formatPrice(p.price)}</td>`;
    if (rank === 'best') scores[p.id].wins++;
    if (rank === 'worst') scores[p.id].losses++;
  }
  bodyHTML += '</tr>';

  for (const group of specGroups) {
    bodyHTML += `<tr class="compare-group-row"><td colspan="${products.length + 1}">${group.group}</td></tr>`;

    for (const row of group.rows) {
      const diffClass = row.different ? 'compare-diff' : '';
      const ranks = row.different ? rankValues(row.name, row.values, productIds) : {};

      bodyHTML += `<tr class="${diffClass}" data-different="${row.different}">`;
      bodyHTML += `<td>${row.name}</td>`;

      for (const p of products) {
        const val = row.values[p.id] || '—';
        const rank = ranks[p.id] || '';
        const cls = rank === 'best' ? 'cmp-best' : rank === 'worst' ? 'cmp-worst' : '';
        const icon = rank === 'best' ? '<span class="cmp-icon cmp-icon--best">&#9650;</span>'
                   : rank === 'worst' ? '<span class="cmp-icon cmp-icon--worst">&#9660;</span>'
                   : '';
        bodyHTML += `<td class="${cls}">${icon} ${val}</td>`;

        if (rank === 'best') scores[p.id].wins++;
        if (rank === 'worst') scores[p.id].losses++;
      }
      bodyHTML += '</tr>';
    }
  }

  tbody.innerHTML = bodyHTML;

  /* Итоговая строка с оценкой */
  const maxWins = Math.max(...Object.values(scores).map(s => s.wins));
  let summaryRow = '<tr class="compare-summary-row"><td>Итоговая оценка</td>';
  for (const p of products) {
    const s = scores[p.id];
    const isBest = s.wins === maxWins && products.length > 1;
    const cls = isBest ? 'cmp-winner' : '';
    summaryRow += `<td class="${cls}">
      <div class="cmp-score">
        <span class="cmp-score__wins" title="Лучших характеристик">${s.wins}</span>
        <span class="cmp-score__sep">/</span>
        <span class="cmp-score__losses" title="Худших характеристик">${s.losses}</span>
      </div>
      ${isBest ? '<div class="cmp-badge">Лучший выбор</div>' : ''}
    </td>`;
  }
  summaryRow += '</tr>';
  tbody.insertAdjacentHTML('afterbegin', summaryRow);
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

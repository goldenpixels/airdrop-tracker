'use strict';

const STATUS_LABEL = {
  claimable: 'Bisa Diklaim',
  'closing-soon': 'Segera Berakhir',
  closed: 'Tutup',
};
const ENROLL_LABEL = { belum: 'Belum ikut', ikut: 'Ikut', klaim: 'Sudah klaim', lewat: 'Terlewat' };
const TASK_LABEL = { once: 'Sekali', daily: 'Harian', weekly: 'Mingguan' };

let state = null;
const $ = (id) => document.getElementById(id);

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

async function api(path, method, body) {
  const res = await fetch(path, {
    method: method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  } catch { return iso; }
}

function countdown(p) {
  if (!p.deadline) return 'Tanpa deadline';
  if (p.daysLeft === null || p.daysLeft === undefined) return '—';
  if (p.status === 'closed') return 'Sudah lewat';
  if (p.daysLeft === 0) return 'Hari ini!';
  return p.daysLeft + ' hari lagi';
}

// ---------------------------------------------------------------------------
async function load() {
  state = await api('/api/state');
  render();
}

function render() {
  renderRadar();
  renderAlerts();
  renderWallets();
  renderProjects();
  renderMatrix();
  renderCatalog();
  renderTasks();
  renderSettings();
  $('last-check').textContent = state.lastCheckAt
    ? 'Terakhir dicek: ' + new Date(state.lastCheckAt).toLocaleString('id-ID')
    : '';
}

function renderRadar() {
  const claimable = state.projects.filter((p) => p.status === 'claimable').length;
  const closing = state.projects.filter((p) => p.status === 'closing-soon').length;
  $('stat-claimable').textContent = claimable;
  $('stat-closing').textContent = closing;
  const open = state.projects
    .filter((p) => p.deadline && p.status !== 'closed')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  $('stat-nearest').textContent = open.length
    ? open[0].name + ' — ' + countdown(open[0])
    : '—';
}

function renderAlerts() {
  const unread = state.alerts.filter((a) => !a.read).length;
  $('alert-count').textContent = unread ? unread + ' belum dibaca' : 'tidak ada yang belum dibaca';
  const list = $('alerts-list');
  if (!state.alerts.length) {
    list.innerHTML = '<li class="muted">Belum ada alert. Tekan "Cek Status Sekarang" untuk memeriksa proyek & tugas.</li>';
    return;
  }
  list.innerHTML = state.alerts.map((a) => `
    <li class="alert ${a.read ? 'read' : 'unread'}">
      <span>${esc(a.message)}</span>
      <span class="muted small">${new Date(a.createdAt).toLocaleString('id-ID')}</span>
      ${a.read ? '' : `<button class="btn small" data-read-alert="${a.id}">Tandai dibaca</button>`}
    </li>`).join('');
}

function renderWallets() {
  const list = $('wallet-list');
  if (!state.wallets.length) {
    list.innerHTML = '<li class="muted">Belum ada wallet. Tambahkan alamat EVM kamu di atas.</li>';
    return;
  }
  list.innerHTML = state.wallets.map((w) => `
    <li>
      <strong>${esc(w.label)}</strong>
      <code>${esc(w.address)}</code>
      <button class="btn small danger" data-del-wallet="${w.id}">Hapus</button>
    </li>`).join('');
}

function renderProjects() {
  const list = $('project-list');
  if (!state.projects.length) {
    list.innerHTML = '<p class="muted">Belum ada proyek yang dilacak. Lacak dari katalog "Temukan" di bawah atau tambah sendiri.</p>';
    return;
  }
  list.innerHTML = state.projects.map((p) => `
    <article class="project-card">
      <div class="project-head">
        <strong>${esc(p.name)}</strong>
        <span class="badge badge-${p.status}">${STATUS_LABEL[p.status]}</span>
      </div>
      <p class="muted small">${esc(p.chain)} • Deadline: ${fmtDate(p.deadline)} UTC • ${countdown(p)}</p>
      <p class="small">🎁 ${esc(p.reward || '—')}</p>
      ${p.note ? `<p class="muted small">${esc(p.note)}</p>` : ''}
      <div class="project-actions">
        ${p.link ? `<a class="btn small" href="${esc(p.link)}" target="_blank" rel="noopener">🔗 Link resmi</a>` : ''}
        <button class="btn small danger" data-del-project="${p.id}">Hapus</button>
      </div>
    </article>`).join('');
}

function renderMatrix() {
  const head = $('matrix-head');
  const body = $('matrix-body');
  if (!state.wallets.length || !state.projects.length) {
    head.innerHTML = '';
    body.innerHTML = '<tr><td class="muted">Tambahkan minimal 1 wallet dan 1 proyek untuk melihat matriks.</td></tr>';
    return;
  }
  head.innerHTML = '<th>Wallet</th>' + state.projects.map((p) => `<th>${esc(p.name)}</th>`).join('');
  body.innerHTML = state.wallets.map((w) => {
    const cells = state.projects.map((p) => {
      const en = state.enrollments[w.id + ':' + p.id] || { status: 'belum', points: 0 };
      return `<td>
        <select data-enroll-status data-wallet="${w.id}" data-project="${p.id}">
          ${Object.entries(ENROLL_LABEL).map(([v, l]) => `<option value="${v}" ${en.status === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <input type="number" min="0" step="1" value="${en.points || 0}" placeholder="Poin"
          data-enroll-points data-wallet="${w.id}" data-project="${p.id}">
      </td>`;
    }).join('');
    return `<tr><td><strong>${esc(w.label)}</strong><br><code class="small">${esc(w.address.slice(0, 10))}…</code></td>${cells}</tr>`;
  }).join('');
}

function renderCatalog() {
  $('catalog-note').textContent = state.catalogNote || '';
  const tracked = new Set(state.projects.map((p) => p.catalogId).filter(Boolean));
  $('catalog-list').innerHTML = state.catalog.map((c) => {
    const isTracked = tracked.has(c.id);
    return `
    <article class="project-card">
      <div class="project-head">
        <strong>${esc(c.name)}</strong>
        <span class="badge badge-catalog">Katalog</span>
      </div>
      <p class="muted small">${esc(c.chain)} • Deadline: ${fmtDate(c.deadline)} UTC</p>
      <p class="small">🎁 ${esc(c.reward || '—')}</p>
      ${c.note ? `<p class="muted small">${esc(c.note)}</p>` : ''}
      <div class="project-actions">
        ${c.link ? `<a class="btn small" href="${esc(c.link)}" target="_blank" rel="noopener">🔗 Link resmi</a>` : ''}
        <button class="btn small primary" data-track="${c.id}" ${isTracked ? 'disabled' : ''}>
          ${isTracked ? '✓ Sudah dilacak' : '+ Lacak'}
        </button>
      </div>
    </article>`;
  }).join('');
}

function renderTasks() {
  const pending = state.tasks.filter((t) => !t.done);
  const done = state.tasks.filter((t) => t.done);
  const item = (t) => `
    <li>
      <label>
        <input type="checkbox" data-toggle-task="${t.id}" ${t.done ? 'checked' : ''}>
        <strong>${esc(t.title)}</strong>
      </label>
      <span class="muted small">${TASK_LABEL[t.type]}${t.dueDate ? ' • jatuh tempo ' + fmtDate(t.dueDate) : ''}</span>
      <button class="btn small danger" data-del-task="${t.id}">Hapus</button>
    </li>`;
  $('tasks-pending').innerHTML = pending.length ? pending.map(item).join('') : '<li class="muted">Tidak ada tugas pending.</li>';
  $('tasks-done').innerHTML = done.length ? done.map(item).join('') : '<li class="muted">Belum ada tugas selesai.</li>';
}

function renderSettings() {
  $('settings-status').textContent = state.settings.telegramBotTokenSet
    ? '✅ Token bot Telegram tersimpan (lokal saja). Chat ID: ' + (state.settings.telegramChatId || '—')
    : 'Token bot belum diisi — alert hanya tampil di dalam aplikasi.';
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------
document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  try {
    if (form.id === 'wallet-form') {
      await api('/api/wallets', 'POST', { address: $('wallet-address').value, label: $('wallet-label').value });
      form.reset();
      toast('Wallet ditambahkan.');
    } else if (form.id === 'project-form') {
      await api('/api/projects', 'POST', {
        name: $('project-name').value,
        chain: $('project-chain').value,
        deadline: $('project-deadline').value || null,
        link: $('project-link').value,
        reward: $('project-reward').value,
      });
      form.reset();
      toast('Proyek ditambahkan.');
    } else if (form.id === 'task-form') {
      await api('/api/tasks', 'POST', {
        title: $('task-title').value,
        type: $('task-type').value,
        dueDate: $('task-due').value || null,
      });
      form.reset();
      toast('Tugas ditambahkan.');
    } else if (form.id === 'settings-form') {
      const token = $('tg-token').value.trim();
      await api('/api/settings', 'POST', {
        telegramBotToken: token || undefined,
        telegramChatId: $('tg-chat').value.trim(),
      });
      $('tg-token').value = '';
      toast('Pengaturan disimpan (lokal saja).');
    }
    await load();
  } catch (err) {
    toast('Gagal: ' + err.message);
  }
});

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  try {
    if (btn.id === 'btn-check') {
      btn.disabled = true;
      btn.textContent = '⏳ Mengecek…';
      await api('/api/check', 'POST');
      toast('Status diperbarui.');
      await load();
      btn.disabled = false;
      btn.textContent = '🔄 Cek Status Sekarang';
    } else if (btn.id === 'btn-read-all') {
      await api('/api/alerts/read-all', 'POST');
      await load();
    } else if (btn.dataset.delWallet) {
      if (confirm('Hapus wallet ini?')) { await api('/api/wallets/' + btn.dataset.delWallet, 'DELETE'); await load(); }
    } else if (btn.dataset.delProject) {
      if (confirm('Hapus proyek ini dari lacak?')) { await api('/api/projects/' + btn.dataset.delProject, 'DELETE'); await load(); }
    } else if (btn.dataset.delTask) {
      await api('/api/tasks/' + btn.dataset.delTask, 'DELETE');
      await load();
    } else if (btn.dataset.track) {
      await api('/api/projects/track', 'POST', { catalogId: btn.dataset.track });
      toast('Proyek dilacak.');
      await load();
    } else if (btn.dataset.readAlert) {
      await api('/api/alerts/' + btn.dataset.readAlert + '/read', 'POST');
      await load();
    }
  } catch (err) {
    toast('Gagal: ' + err.message);
    if (btn.id === 'btn-check') { btn.disabled = false; btn.textContent = '🔄 Cek Status Sekarang'; }
  }
});

document.addEventListener('change', async (e) => {
  const el = e.target;
  try {
    if (el.dataset.toggleTask) {
      await api('/api/tasks/' + el.dataset.toggleTask + '/toggle', 'POST');
      await load();
    } else if (el.dataset.enrollStatus || el.dataset.enrollPoints) {
      const row = el.closest('td');
      const statusSel = row.querySelector('[data-enroll-status]');
      const pointsInput = row.querySelector('[data-enroll-points]');
      await api('/api/enrollments', 'POST', {
        walletId: statusSel.dataset.wallet,
        projectId: statusSel.dataset.project,
        status: statusSel.value,
        points: pointsInput.value,
      });
      await load();
    }
  } catch (err) {
    toast('Gagal: ' + err.message);
  }
});

load().catch((err) => {
  document.body.insertAdjacentHTML('beforeend', '<p style="color:red;padding:1rem">Gagal memuat data: ' + esc(err.message) + '</p>');
});

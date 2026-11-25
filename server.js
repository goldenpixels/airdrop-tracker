'use strict';
/**
 * Airdrop Tracker — standalone, Railway-deployable.
 * Node.js + Express, penyimpanan JSON file (data/data.json).
 * Tanpa API key eksternal, tanpa cek on-chain di v1, tanpa auto-claim,
 * tanpa koneksi wallet / signature. Hanya alamat publik (0x...).
 *
 * Env:
 *   PORT     — port HTTP (default 3000; Railway mengisi otomatis)
 *   DATA_DIR — folder penyimpanan data (default ./data;
 *              di Railway pasang Volume di /app/data lalu set DATA_DIR=/app/data)
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const VERSION = '1.0.0';

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Katalog Temukan — daftar awal airdrop populer November 2026.
// Sumber: liputan Bitrue & Bittime (Nov 2026) + airdrops.io.
// Tanggal & status BISA BERUBAH — selalu verifikasi di link resmi proyek.
// ---------------------------------------------------------------------------
const CATALOG = [
  {
    id: 'aster-stage6',
    name: 'Aster Stage 6',
    chain: 'BNB Chain',
    deadline: '2026-12-04T12:00:00Z',
    link: 'https://asterdex.com',
    reward: 'ASTER — 64 jt token (0,8% supply), min. 10.000 poin',
    note: 'Klaim 4 Nov – 4 Des 2026, 100% unlocked.',
  },
  {
    id: 'standx-dusd',
    name: 'StandX (DUSD)',
    chain: 'BNB Chain',
    deadline: '2026-12-31T08:00:00Z',
    link: 'https://standx.com/airdrop',
    reward: 'DUSD — sekali, tanpa lockup',
    note: 'Token dibatalkan; payout sekali dari sisa revenue. Yang tidak diklaim hangus.',
  },
  {
    id: 'grass-stage2',
    name: 'Grass Stage 2',
    chain: 'Solana',
    deadline: '2027-01-22T00:00:00Z',
    link: 'https://www.getgrass.io',
    reward: 'USDC (bukan GRASS)',
    note: 'Untuk penyedia bandwidth epoch 1–19.',
  },
  {
    id: 'predict-fun',
    name: 'Predict.fun',
    chain: 'BNB Chain',
    deadline: '2026-11-26T09:00:00Z',
    link: 'https://predict.fun',
    reward: 'PREDICT — pilih opsi klaim sebelum deadline',
    note: 'Opsi A: 35% langsung, 65% hangus. Opsi B: 100% setelah staking 1 tahun.',
  },
  {
    id: 'metric',
    name: 'Metric',
    chain: 'Multi-chain',
    deadline: null,
    link: 'https://airdrops.io/metric/',
    reward: 'Poin — referral & vault live',
    note: 'Kampanye poin masih berjalan, tanpa tanggal akhir tetap.',
  },
  {
    id: 'kalos',
    name: 'Kalos',
    chain: 'HyperEVM',
    deadline: null,
    link: 'https://www.kalos.fun',
    reward: '500 rb poin testnet dibagikan per hari',
    note: 'Testnet: NFT & aktivitas sosial dihitung; swap/LP/staking tidak.',
  },
  {
    id: 'fables',
    name: 'Fables',
    chain: '—',
    deadline: '2026-11-20T00:00:00Z',
    link: 'https://claim.fables.fi',
    reward: 'FABLES — klaim poin & redeem PROLOGUE',
    note: 'FABLES yang tidak diklaim tidak akan di-mint.',
  },
  {
    id: 'doppler-finance',
    name: 'Doppler Finance',
    chain: 'Base',
    deadline: '2026-11-28T12:00:00Z',
    link: 'https://airdrops.io/doppler-finance/',
    reward: 'XDP — Genesis Airdrop 100 jt (1% supply)',
    note: 'Klaim di jaringan Base.',
  },
  {
    id: 'monolith',
    name: 'Monolith',
    chain: '—',
    deadline: '2026-11-19T00:00:00Z',
    link: 'https://airdrops.io/monolith/',
    reward: 'Cek link resmi',
    note: 'Jendela klaim sudah lewat (per 19 Nov 2026).',
  },
  {
    id: 'zeru-finance',
    name: 'Zeru Finance',
    chain: '—',
    deadline: null,
    link: 'https://airdrops.io/zeru/',
    reward: 'Poin — kampanye masih berjalan',
    note: 'Proyek poin dari watchlist November 2026.',
  },
  {
    id: 'elysium',
    name: 'Elysium',
    chain: '—',
    deadline: null,
    link: 'https://airdrops.io/elysium/',
    reward: 'Poin — kampanye masih berjalan',
    note: 'Proyek poin dari watchlist November 2026.',
  },
];

const CATALOG_NOTE =
  'Daftar awal November 2026 — verifikasi tanggal, status, dan link resmi di kanal resmi proyek sebelum klaim.';

// ---------------------------------------------------------------------------
// Penyimpanan (JSON file)
// ---------------------------------------------------------------------------
function defaultState() {
  return {
    wallets: [], // { id, address, label, createdAt }
    projects: [], // { id, name, chain, deadline, link, reward, source, createdAt }
    enrollments: {}, // "walletId:projectId" -> { status, points }
    tasks: [], // { id, title, type: once|daily|weekly, dueDate, done, doneAt, createdAt }
    alerts: [], // { id, kind, ref, message, createdAt, read }
    settings: { telegramBotToken: '', telegramChatId: '' },
    lastCheckAt: null,
    createdAt: new Date().toISOString(),
  };
}

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return { ...defaultState(), ...raw };
    }
  } catch (e) {
    console.error('Gagal membaca data.json, mulai dari kosong:', e.message);
  }
  return defaultState();
}

function saveState() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

let state = loadState();

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const isEvmAddress = (a) => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a.trim());
const DAY_MS = 24 * 3600 * 1000;

function computeStatus(p) {
  if (!p.deadline) return 'claimable';
  const t = new Date(p.deadline).getTime();
  if (Number.isNaN(t)) return 'claimable';
  const diff = t - Date.now();
  if (diff <= 0) return 'closed';
  if (diff <= 7 * DAY_MS) return 'closing-soon';
  return 'claimable';
}

function daysLeft(p) {
  if (!p.deadline) return null;
  const diff = new Date(p.deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso;
  }
}

function addAlert(kind, ref, message) {
  const exists = state.alerts.some((a) => !a.read && a.kind === kind && a.ref === ref);
  if (exists) return;
  state.alerts.unshift({
    id: uid(),
    kind,
    ref,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  });
  if (state.alerts.length > 200) state.alerts.length = 200;
}

/** Hitung ulang status dari deadline + buat alert. Dipanggil tombol "Cek Status Sekarang". */
function recompute() {
  for (const p of state.projects) {
    const status = computeStatus(p);
    p.status = status;
    if (status === 'closing-soon') {
      addAlert(
        'deadline',
        `project:${p.id}`,
        `⏰ Deadline ${p.name} tinggal ${daysLeft(p)} hari lagi (${fmtDate(p.deadline)} UTC). Segera cek klaim di link resmi.`
      );
    } else if (status === 'claimable') {
      addAlert(
        'claimable',
        `project:${p.id}`,
        `✅ ${p.name} bisa diklaim / masih berjalan. Cek link resmi untuk detail klaim.`
      );
    }
  }
  for (const t of state.tasks) {
    if (t.done || !t.dueDate) continue;
    const diff = new Date(t.dueDate).getTime() - Date.now();
    if (diff <= DAY_MS) {
      const label = t.type === 'daily' ? 'harian' : t.type === 'weekly' ? 'mingguan' : 'sekali';
      addAlert('task', `task:${t.id}`, `📌 Tugas jatuh tempo: "${t.title}" (${label}).`);
    }
  }
  state.lastCheckAt = new Date().toISOString();
}

function publicState() {
  return {
    wallets: state.wallets,
    projects: state.projects.map((p) => ({
      ...p,
      status: computeStatus(p),
      daysLeft: daysLeft(p),
    })),
    enrollments: state.enrollments,
    tasks: state.tasks,
    alerts: state.alerts,
    settings: {
      telegramBotTokenSet: !!state.settings.telegramBotToken,
      telegramChatId: state.settings.telegramChatId || '',
    },
    catalog: CATALOG,
    catalogNote: CATALOG_NOTE,
    lastCheckAt: state.lastCheckAt,
    version: VERSION,
  };
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => res.json({ ok: true, version: VERSION }));

app.get('/api/state', (req, res) => res.json(publicState()));

app.get('/api/catalog', (req, res) => res.json({ catalog: CATALOG, note: CATALOG_NOTE }));

app.post('/api/check', (req, res) => {
  recompute();
  saveState();
  res.json(publicState());
});

// --- Wallets ---
app.post('/api/wallets', (req, res) => {
  const address = String(req.body.address || '').trim();
  const label = String(req.body.label || '').trim().slice(0, 60);
  if (!isEvmAddress(address)) {
    return res.status(400).json({ error: 'Alamat tidak valid. Pakai format EVM 0x + 40 karakter hex.' });
  }
  const dup = state.wallets.find((w) => w.address.toLowerCase() === address.toLowerCase());
  if (dup) return res.status(400).json({ error: 'Wallet ini sudah terdaftar.' });
  const wallet = { id: uid(), address, label: label || address.slice(0, 6) + '…' + address.slice(-4), createdAt: new Date().toISOString() };
  state.wallets.push(wallet);
  saveState();
  res.status(201).json(wallet);
});

app.delete('/api/wallets/:id', (req, res) => {
  const id = req.params.id;
  state.wallets = state.wallets.filter((w) => w.id !== id);
  for (const key of Object.keys(state.enrollments)) {
    if (key.startsWith(id + ':')) delete state.enrollments[key];
  }
  saveState();
  res.json({ ok: true });
});

// --- Projects ---
app.post('/api/projects/track', (req, res) => {
  const item = CATALOG.find((c) => c.id === req.body.catalogId);
  if (!item) return res.status(404).json({ error: 'Item katalog tidak ditemukan.' });
  const existing = state.projects.find((p) => p.catalogId === item.id);
  if (existing) return res.status(400).json({ error: 'Proyek ini sudah dilacak.' });
  const project = {
    id: uid(),
    catalogId: item.id,
    name: item.name,
    chain: item.chain,
    deadline: item.deadline,
    link: item.link,
    reward: item.reward,
    note: item.note,
    source: 'catalog',
    createdAt: new Date().toISOString(),
  };
  state.projects.push(project);
  saveState();
  res.status(201).json(project);
});

app.post('/api/projects', (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 120);
  if (!name) return res.status(400).json({ error: 'Nama proyek wajib diisi.' });
  const project = {
    id: uid(),
    catalogId: null,
    name,
    chain: String(req.body.chain || '—').trim().slice(0, 60),
    deadline: req.body.deadline ? new Date(req.body.deadline).toISOString() : null,
    link: String(req.body.link || '').trim().slice(0, 300),
    reward: String(req.body.reward || '').trim().slice(0, 200),
    note: '',
    source: 'custom',
    createdAt: new Date().toISOString(),
  };
  state.projects.push(project);
  saveState();
  res.status(201).json(project);
});

app.delete('/api/projects/:id', (req, res) => {
  const id = req.params.id;
  state.projects = state.projects.filter((p) => p.id !== id);
  for (const key of Object.keys(state.enrollments)) {
    if (key.endsWith(':' + id)) delete state.enrollments[key];
  }
  saveState();
  res.json({ ok: true });
});

// --- Enrollments (matriks wallet x proyek) ---
const ENROLL_STATUSES = ['belum', 'ikut', 'klaim', 'lewat'];
app.post('/api/enrollments', (req, res) => {
  const { walletId, projectId, status, points } = req.body;
  if (!state.wallets.some((w) => w.id === walletId)) return res.status(404).json({ error: 'Wallet tidak ditemukan.' });
  if (!state.projects.some((p) => p.id === projectId)) return res.status(404).json({ error: 'Proyek tidak ditemukan.' });
  if (!ENROLL_STATUSES.includes(status)) return res.status(400).json({ error: 'Status tidak valid.' });
  const pts = Math.max(0, Math.floor(Number(points) || 0));
  state.enrollments[`${walletId}:${projectId}`] = { status, points: pts };
  saveState();
  res.json({ ok: true });
});

// --- Tasks ---
const TASK_TYPES = ['once', 'daily', 'weekly'];
app.post('/api/tasks', (req, res) => {
  const title = String(req.body.title || '').trim().slice(0, 200);
  const type = TASK_TYPES.includes(req.body.type) ? req.body.type : 'once';
  if (!title) return res.status(400).json({ error: 'Judul tugas wajib diisi.' });
  const task = {
    id: uid(),
    title,
    type,
    dueDate: req.body.dueDate ? new Date(req.body.dueDate).toISOString() : null,
    done: false,
    doneAt: null,
    createdAt: new Date().toISOString(),
  };
  state.tasks.push(task);
  saveState();
  res.status(201).json(task);
});

app.post('/api/tasks/:id/toggle', (req, res) => {
  const task = state.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
  task.done = !task.done;
  task.doneAt = task.done ? new Date().toISOString() : null;
  saveState();
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  state.tasks = state.tasks.filter((t) => t.id !== req.params.id);
  saveState();
  res.json({ ok: true });
});

// --- Alerts ---
app.post('/api/alerts/:id/read', (req, res) => {
  const alert = state.alerts.find((a) => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert tidak ditemukan.' });
  alert.read = true;
  saveState();
  res.json({ ok: true });
});

app.post('/api/alerts/read-all', (req, res) => {
  for (const a of state.alerts) a.read = true;
  saveState();
  res.json({ ok: true });
});

// --- Settings (Telegram: token disimpan lokal saja, belum ada pengiriman) ---
app.get('/api/settings', (req, res) => {
  res.json({
    telegramBotTokenSet: !!state.settings.telegramBotToken,
    telegramChatId: state.settings.telegramChatId || '',
  });
});

app.post('/api/settings', (req, res) => {
  if (typeof req.body.telegramBotToken === 'string') {
    state.settings.telegramBotToken = req.body.telegramBotToken.trim().slice(0, 100);
  }
  if (typeof req.body.telegramChatId === 'string') {
    state.settings.telegramChatId = req.body.telegramChatId.trim().slice(0, 100);
  }
  saveState();
  res.json({ ok: true, telegramBotTokenSet: !!state.settings.telegramBotToken });
});

// --- 404 JSON untuk API ---
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
recompute();
saveState();

app.listen(PORT, HOST, () => {
  console.log(`Airdrop Tracker v${VERSION} jalan di http://${HOST}:${PORT}`);
  console.log(`Data tersimpan di ${DATA_FILE}`);
});

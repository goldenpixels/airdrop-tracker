# 🪂 Airdrop Tracker — Multi-Wallet + Alert

Tracker airdrop berbahasa Indonesia: lacak banyak wallet, pantau deadline klaim,
dapat alert otomatis. Dibangun sebagai versi standalone yang siap deploy di Railway
(dan siap dijadikan Railway Template).

> ⚠️ **Katalog "Temukan" adalah daftar awal airdrop November 2026**
> (Aster, StandX, Grass, Predict.fun, Metric, Kalos, Fables, Doppler, Monolith,
> Zeru, Elysium — dari liputan Bitrue/Bittime & airdrops.io).
> Tanggal dan status bisa berubah — **selalu verifikasi di link resmi proyek**
> sebelum klaim.

## Fitur

- **📡 Radar Klaim** — jumlah proyek yang bisa diklaim + deadline terdekat.
- **👛 Wallet** — tambah/hapus banyak alamat EVM publik (validasi format `0x` 42 karakter).
- **📌 Proyek** — daftar airdrop yang dilacak: nama, chain, status
  (Bisa Diklaim / Segera Berakhir / Tutup), hitung mundur deadline, link resmi, reward.
- **🔍 Temukan** — katalog 11 airdrop November 2026, dilacak sekali klik.
- **🧮 Matriks Wallet × Proyek** — status per wallet per proyek
  (Belum ikut / Ikut / Sudah klaim / Terlewat) + input poin.
- **✅ Tugas** — sekali / harian / mingguan, dengan checkbox, dikelompokkan
  belum selesai vs selesai.
- **🔔 Alert** — dibuat otomatis saat proyek bisa diklaim, deadline ≤ 7 hari,
  atau tugas jatuh tempo. Tombol **"Cek Status Sekarang"** menghitung ulang
  semua status dari data + deadline yang tersimpan.
- **✈️ Telegram (opsional)** — kolom token bot + chat ID. Token hanya tersimpan
  lokal di file data server dan **tidak dikirim ke mana pun**; pengiriman alert
  Telegram belum aktif di v1 (alert masih di dalam aplikasi).

## Yang TIDAK dilakukan app ini (sengaja)

- ❌ Tidak pernah meminta seed phrase / private key.
- ❌ Tidak ada koneksi wallet, tidak ada signature, tidak ada auto-claim.
- ❌ Tidak ada cek on-chain di v1 — status dihitung dari deadline katalog + data kamu.
- ❌ Tidak butuh API key eksternal apa pun.

## Jalankan lokal

```bash
npm install
npm start
# buka http://localhost:3000
```

Port bisa diubah lewat env `PORT`. Data tersimpan di `data/data.json`
(bisa diubah lewat env `DATA_DIR`).

## Deploy di Railway

1. Push repo ini ke GitHub.
2. Di Railway: **New Project → Deploy from GitHub repo** → pilih repo ini.
3. Railway otomatis mendeteksi Node.js (Nixpacks) dan menjalankan `npm start`.
   Tidak ada environment variable wajib — `PORT` diisi otomatis oleh Railway.
4. (Opsional tapi disarankan) Supaya data tidak hilang saat redeploy, tambahkan
   **Volume** di Railway dan mount ke `/app/data`, lalu set variable
   `DATA_DIR=/app/data`.
5. Buka URL yang diberikan Railway — tracker langsung bisa dipakai.
6. Untuk dijadikan template: di dashboard Railway, **Publish as Template**
   dari project ini.

## Struktur

```
.
├── package.json          # Express saja, tanpa native module
├── server.js             # Backend + API + katalog awal
├── public/
│   ├── index.html        # UI (Bahasa Indonesia)
│   ├── app.js            # Logika frontend (vanilla JS)
│   └── style.css
├── railway.json          # Nixpacks + start command + healthcheck
├── data/                 # data.json (dibuat otomatis saat jalan)
└── README.md
```

## API (ringkas)

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/health` | Healthcheck |
| GET | `/api/state` | Seluruh state (wallet, proyek + status, tugas, alert, katalog) |
| POST | `/api/check` | Hitung ulang status + buat alert |
| POST / DELETE | `/api/wallets` | Tambah / hapus wallet |
| POST | `/api/projects/track` | Lacak item katalog |
| POST / DELETE | `/api/projects` | Tambah proyek sendiri / hapus |
| POST | `/api/enrollments` | Set status + poin wallet × proyek |
| POST | `/api/tasks` | Tambah tugas |
| POST | `/api/tasks/:id/toggle` | Centang / batalkan tugas |
| DELETE | `/api/tasks/:id` | Hapus tugas |
| POST | `/api/alerts/:id/read`, `/api/alerts/read-all` | Tandai alert dibaca |
| GET / POST | `/api/settings` | Pengaturan Telegram (token disimpan lokal saja) |

## Lisensi

MIT

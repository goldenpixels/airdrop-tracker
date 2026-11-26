# Deploy and Host Airdrop Tracker on Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/i_Wrrx?utm_campaign=airdrop-tracker)

**Airdrop Tracker** is a multi-wallet airdrop tracker with alerts — track many
public wallet addresses, watch claim deadlines, manage tasks, and get alerts
when an airdrop becomes claimable. The interface is in Indonesian. One-click
deploy, no wallet connection, no seed phrase, no API key.

> ⚠️ The "Discover" catalog is a starter list of November 2026 airdrops
> (Aster, StandX, Grass, Predict.fun, Metric, Kalos, Fables, Doppler,
> Monolith, Zeru, Elysium — from Bitrue/Bittime & airdrops.io coverage).
> Dates and status can change — **always verify on the project's official
> links before claiming.**

## About Hosting Airdrop Tracker on Railway

Railway runs the tracker as a single Node.js service (Express, no native
modules, no build step). It binds `0.0.0.0` and reads `PORT` automatically.
Data is stored in a JSON file; attach a Railway Volume mounted at `/app/data`
and set `DATA_DIR=/app/data` so your wallets, projects, tasks and alerts
survive redeploys. A healthcheck on `/api/health` is configured in
`railway.json`. No environment variables are required.

## Why Deploy Airdrop Tracker on Railway

- **One click, no setup** — Nixpacks detects Node.js and runs `npm start`.
  No database, no API keys, no wallet connection.
- **Always on** — the tracker stays up so deadlines and alerts are checked on
  schedule.
- **Persistent data** — an optional volume keeps your data across deploys.
- **Free-plan friendly** — a tiny Node service that sleeps when idle and wakes
  on request.

## Common Use Cases

- **Multi-wallet airdrop hunting** — track the same airdrop across all your
  wallets in one matrix (Not joined / Joined / Claimed / Missed) with points
  per wallet.
- **Never miss a claim deadline** — the Claim Radar shows what is claimable
  now and the nearest deadline; alerts fire automatically when a project
  becomes claimable or a deadline is within 7 days.
- **Daily/weekly task checklists** — recurring airdrop tasks (check-ins,
  trades, social tasks) with checkboxes, grouped by done vs pending.
- **Discover new airdrops** — a starter catalog of November 2026 airdrops,
  trackable in one tap (always verify on official links first).

## Dependencies for Airdrop Tracker

- **Node.js 18+** (Railway provides it via Nixpacks).
- **Express** — the only runtime dependency (`npm install` fetches it; see
  `package.json`).
- **No database, no external API, no API key.** Data lives in
  `data/data.json` (or `$DATA_DIR/data.json`).
- **Optional:** a Railway Volume for persistence, and a Telegram bot token +
  chat ID for future alert delivery (alerts are in-app only in v1; the token
  is stored locally on the server and never sent anywhere).

## Features

- **📡 Claim Radar** — how many projects are claimable + nearest deadline.
- **👛 Wallets** — add/remove many public EVM addresses (validated as
  `0x` 42-character format).
- **📌 Projects** — tracked airdrops: name, chain, status (Claimable /
  Ending Soon / Closed), deadline countdown, official link, reward.
- **🔍 Discover** — catalog of 11 November 2026 airdrops, trackable in one tap.
- **🧮 Wallet × Project matrix** — status per wallet per project
  (Not joined / Joined / Claimed / Missed) + points input.
- **✅ Tasks** — one-time / daily / weekly, with checkboxes, grouped
  pending vs done.
- **🔔 Alerts** — created automatically when a project becomes claimable, a
  deadline is ≤ 7 days away, or a task is due. The **"Check Status Now"**
  button recalculates all statuses from the stored data + deadlines.

## What this app deliberately does NOT do

- ❌ Never asks for a seed phrase / private key.
- ❌ No wallet connection, no signatures, no auto-claiming.
- ❌ No on-chain checks in v1 — status is computed from the catalog
  deadlines + your data.
- ❌ No external API key needed.

## Run locally

```bash
npm install
npm start
# open http://localhost:3000
```

The port can be changed with the `PORT` env var. Data is stored in
`data/data.json` (overridable with the `DATA_DIR` env var).

## Deploy on Railway (manual)

1. Push this repo to GitHub.
2. In Railway: **New Project → Deploy from GitHub repo** → pick this repo.
3. Railway auto-detects Node.js (Nixpacks) and runs `npm start`.
   No required environment variables — Railway sets `PORT` automatically.
4. (Optional but recommended) So data survives redeploys, add a **Volume** in
   Railway mounted at `/app/data` and set the variable `DATA_DIR=/app/data`.
5. Open the URL Railway gives you — the tracker is ready to use.

## Structure

```
.
├── package.json          # Express only, no native modules
├── server.js             # Backend + API + starter catalog
├── public/
│   ├── index.html        # UI (Bahasa Indonesia)
│   ├── app.js            # Frontend logic (vanilla JS)
│   └── style.css
├── railway.json          # Nixpacks + start command + healthcheck
├── data/                 # data.json (created automatically at runtime)
└── README.md
```

## API (summary)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Healthcheck |
| GET | `/api/state` | Full state (wallets, projects + status, tasks, alerts, catalog) |
| POST | `/api/check` | Recalculate statuses + create alerts |
| POST / DELETE | `/api/wallets` | Add / remove a wallet |
| POST | `/api/projects/track` | Track a catalog item |
| POST / DELETE | `/api/projects` | Add your own project / remove one |
| POST | `/api/enrollments` | Set wallet × project status + points |
| POST | `/api/tasks` | Add a task |
| POST | `/api/tasks/:id/toggle` | Check / uncheck a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| POST | `/api/alerts/:id/read`, `/api/alerts/read-all` | Mark alerts read |
| GET / POST | `/api/settings` | Telegram settings (token stored locally only) |

## License

MIT

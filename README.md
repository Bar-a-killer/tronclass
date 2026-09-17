[中文](./README_zh-tw.md) | English

# TronClass API

An automated rollcall assistant. The core login and rollcall-solving logic builds on prior work by silvercow002 and rlongdragon — credit to the original authors.

> Script sources: [@silvercow002/tronclass-script](https://github.com/silvercow002/tronclass-script), [@rlongdragon/tronclass-api](https://github.com/rlongdragon/tronclass-api)
> OCR model from [AutoVerify](https://chromewebstore.google.com/detail/autoverify/jgcfgcdociopaedpeiacalnccfiaeeej?hl=en)

---

## ✨ Features

* Periodically scans for rollcalls within a configured time window and solves **number rollcalls** automatically
* Web UI (`client/`) for editing configuration and triggering the process manually
* Reports progress and errors to **Discord** via webhook

---

## 📁 Project Structure

* `src/` - TypeScript source for the core login/rollcall logic
* `dist/` - Compiled JavaScript output (after running `npm run build`)
* `maincode/` - Main entry point, scheduler (`scheduler.js`), Discord notifier, and the backend API (`server.js`)
* `maincode/yamls/` - Configuration directory; `config.yaml` is the file actually used at runtime (gitignored), `config_sample.yaml` is the template
* `client/` - Web UI source (React + Vite)
* `ocr/` - OCR model used to solve the NTOU TronClass login CAPTCHA
* `scripts/` - Helper scripts (e.g. the text behind `make help`)

---

## 🚀 Quick Start

### Option A: One-click start on Windows (recommended if you're not comfortable with the command line)

1. Install [Node.js](https://nodejs.org/en/download/)
2. Download or clone this repository
3. Double-click `tronclass.bat` in the project root

`tronclass.bat` installs dependencies for both the root project and `client/`, compiles the TypeScript backend, starts the backend API and the frontend dev server, and opens the web UI in your browser automatically. Closing the spawned command windows stops the services.

### Option B: Manual setup (macOS / Linux, or Windows users who prefer the CLI)

If you have `make` installed:

```bash
make install     # install dependencies for both the root project and client
make build       # compile TypeScript and build the frontend
```

Then create your local config from the template:

```bash
cp maincode/yamls/config_sample.yaml maincode/yamls/config.yaml
```

Without `make`, the equivalent npm commands work just as well:

```bash
npm install
cd client && npm install && cd ..
npm run build
npm run build:ui
```

### Running the services

| Scenario | Command |
| --- | --- |
| Backend API only | `make server` (equivalent to `npm run server`) |
| Frontend dev server only | `make ui` (equivalent to `npm run ui`) |
| Both, with the frontend exposed on your LAN (handy for testing from a phone) | `make lan` (equivalent to `npm run lan`) |
| Run the rollcall bot and scheduler as background PM2 processes | `make start` |

Once the backend is running, open the web UI in your browser to manage configuration and trigger the rollcall scripts manually.

---

## ⚙️ Configuration (`maincode/yamls/config.yaml`)

```yaml
tron:
  TRON_USER: "your-account"
  TRON_PASS: "your-password"
  TRON_BASE_URL: "https://tronclass.ntou.edu.tw"
  TRON_INTERVAL: 5000        # polling interval in ms, 10000-15000 recommended
scheduler:
  START_HOUR: 5              # hour the scheduler starts running (24h)
  STOP_HOUR: 18              # hour the scheduler stops running
  CHECK_INTERVAL: 15         # scheduler check interval, in minutes
webhook:
  webhook_url: "your-discord-webhook-url"
server:
  PORT: 3000                 # port the backend API listens on
  MODE: single               # single = self-hosted, no login (default); multi = multi-user login
```

See this [Discord webhook guide](https://ninglab.com/Discord-Webhook-bot/) if you need help setting one up.

You can also edit and save this file directly from the web UI's settings page instead of hand-editing the YAML.

### Changing the backend port

Edit `server.PORT` in `config.yaml` and restart the backend. The frontend calls the API using relative paths and, in production, is served by the same backend process (same origin), so no frontend changes are needed. In dev mode, `vite` reads the same config file at startup to decide where to proxy `/api` requests.

---

## 👥 Multi-user mode (login + admin panel)

The default `single` mode behaves exactly as before: no login, settings live in `config.yaml`, and `tronclass.bat`, `make start`, etc. keep working unchanged.

To let several people share one server, set `server.MODE` to `multi` in `config.yaml` (or set the env var `TRONCLASS_MODE=multi`) and restart the backend:

1. On first visit you'll be asked to create an **admin account**. Any Tronclass account, schedule and webhook already in `config.yaml` are imported into it.
2. The admin adds other users from the **Admin** page (there is no public sign-up) and hands out the initial password; users can change it after logging in.
3. Each user fills in their own Tronclass credentials, schedule and webhook on the dashboard, then clicks **Enable auto rollcall**.

How it works:

- Each user gets their own pm2 process `tc-<username>` (running `maincode/bot.js`), so users are isolated from each other.
- The backend checks every user's schedule once a minute and starts/stops their process, so **the backend must stay running**. Use `npm run server:start` to run it under pm2 (`npm run server:stop` to stop it).
- The admin panel shows each user's process status, last check, latest error and memory use, lets you view or clear each user's bot log, and has an audit log (logins, failed logins, config changes, start/stop, account management).
- Accounts, per-user settings and logs are stored in `maincode/data/` (gitignored). **Tronclass passwords are stored in plain text**, same as `config.yaml` in single mode, so lock down access to the server itself.
- Sessions use an HttpOnly cookie. 10 failed logins from the same IP or for the same account within 15 minutes trigger a temporary lockout. Behind a reverse proxy such as nginx, set `TRUST_PROXY=1` and serve over HTTPS.

---

## 🌐 Testing on your local network (e.g. from a phone)

```bash
make lan
```

This starts the backend and frontend together, with the frontend exposed to other devices on your network, and prints a reachable URL (`Network: http://<your-lan-ip>:5173/`). Press `Ctrl+C` to stop both at once.

For a production-style test (after `make build`), just run `make server` and open `http://<your-lan-ip>:<PORT>/` from another device — no separate frontend dev server needed.

---

## Usage Notes

Since **NTOU TronClass** added **reCAPTCHA** to its login page (as of *2025/10/13*), this version includes OCR-based text recognition to solve it. If you don't need OCR, you can refer to the previous version of `index.ts` and its `login` function — the login logic is modularized, so it can be swapped out.

## ⚠️ Warning

Although this project is open source, having too many people log in through it at the same time may put extra load on the school's systems, and further changes to the login flow could break it. Please use it responsibly, for occasional use rather than as a long-term substitute for attending class.

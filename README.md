# pango.fun

Static source bundle for the live `https://pango.fun` operator console.

## Contents

- `index.html` - main Pango-OS Hermes console UI.
- `login.html` - identity gate UI.
- `manifest.webmanifest` - PWA manifest.
- `sw.js` - service worker.
- `assets/pango-icon.svg` - PWA/icon asset.
- `dev-server.mjs` - local-only mock auth/API server for development.

## Local development

Do not open `index.html` directly. The app expects same-origin server routes
under `/api/pango/*`, so a plain static server will make login fail.

Run the local mock server:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:4173
```

By default, local development accepts any non-empty username and password.
To require a specific local credential, set:

```bash
PANGO_LOCAL_USER=operator PANGO_LOCAL_PASSWORD=local-password npm run dev
```

The local server is a mock. It provides cookie auth, CSRF, status, sessions,
chat streaming, tasks, config, approvals, and snapshot endpoints with in-memory
data only. It does not connect to the production Hermes gateway.

## Local UI with production VPS responses

To run the local UI while using the production pango.fun API/Hermes bridge:

```bash
npm run dev:prod
```

Open:

```text
http://127.0.0.1:4173
```

Log in with the same operator credential used on `https://pango.fun`. The local
server forwards `/api/pango/*` to `https://pango.fun`, keeps the production
cookie in memory only, and gives the browser a separate local HttpOnly cookie.
This makes chat/status/session/task responses come from the VPS while the static
files are served from your local checkout.

Equivalent explicit command:

```bash
PANGO_API_UPSTREAM=https://pango.fun npm run dev
```

Use this mode only on a trusted machine. It performs real authenticated
production requests, so write actions still hit the VPS.

## Backend contract

This repository contains only browser-facing static files. Runtime routes such as
`/api/pango/login`, `/api/pango/me`, `/api/pango/chat`, `/api/pango/tasks`,
`/api/pango/config`, and `/api/pango/status` are expected to be provided by the
server-side pango.fun gateway and Nginx auth layer.

Do not commit API keys, cookies, session files, `.env` files, Nginx configs,
systemd units, gateway snapshots, or deployment backups to this repository.

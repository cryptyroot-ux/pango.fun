# pango.fun

Static source bundle for the live `https://pango.fun` operator console.

## Contents

- `index.html` - main Pango-OS Hermes console UI.
- `login.html` - identity gate UI.
- `manifest.webmanifest` - PWA manifest.
- `sw.js` - service worker.
- `assets/pango-icon.svg` - PWA/icon asset.

## Backend contract

This repository contains only browser-facing static files. Runtime routes such as
`/api/pango/login`, `/api/pango/me`, `/api/pango/chat`, `/api/pango/tasks`,
`/api/pango/config`, and `/api/pango/status` are expected to be provided by the
server-side pango.fun gateway and Nginx auth layer.

Do not commit API keys, cookies, session files, `.env` files, Nginx configs,
systemd units, gateway snapshots, or deployment backups to this repository.

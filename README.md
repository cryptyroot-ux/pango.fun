# pango.fun

React Native + web source for the Pango-OS Hermes operator console.

The app is built with Expo so the same source can run on Android and web. The
production API remains the server-side pango.fun gateway at `https://pango.fun`.

## Contents

- `App.js` - Expo entry point.
- `src/PangoApp.js` - app orchestration for auth, tabs, refresh, and chat stream.
- `src/api/pangoApi.js` - API client and SSE stream handling.
- `src/components/` - shared UI components.
- `src/screens/` - Login, Chat, Observe, Tasks, and Config screens.
- `src/utils/` - small parsing helpers.
- `dev-server.mjs` - local-only mock/proxy server for development.
- `index.html`, `login.html`, `manifest.webmanifest`, `sw.js` - legacy static bundle kept for current server deployments until the Expo web export replaces it.

## Install

```bash
npm install
```

This project targets Expo SDK 55 because it supports the Node 20 runtime already
used on this machine. Upgrade Expo only after updating Node and testing Android
and web together.

## Android Development

Start Expo:

```bash
npm run android
```

Metro runs on port `8082` because `8081` is often already used on this machine.
If Expo Go cannot reload from the LAN URL, use tunnel mode:

```bash
npm run android:tunnel
```

The Voice tab uses native Android speech recognition through
`expo-speech-recognition`. Expo Go does not include that third-party native
module, so real listening requires a development build:

```bash
npm run android:devbuild
```

After the dev build is installed, run Metro normally with:

```bash
npm run start:clear
```

By default the native app uses the production API:

```text
https://pango.fun
```

Use your production operator credential on the login screen. The app expects the
gateway to set an HttpOnly cookie and return CSRF from `/api/pango/me`.

To point Android at a different API base:

```bash
EXPO_PUBLIC_PANGO_API_BASE=https://your-api-host.example npm run android
```

For an Android emulator talking to the local dev proxy, use:

```bash
EXPO_PUBLIC_PANGO_API_BASE=http://10.0.2.2:4173 npm run android
```

## Web Development

Start Expo web:

```bash
npm run web
```

If you need local web to talk to production pango.fun without CORS issues, run
the local production proxy in a second terminal:

```bash
npm run dev:prod
```

Then start Expo web with:

```bash
npm run web:prod
```

The proxy forwards `/api/pango/*` to `https://pango.fun`, keeps upstream cookies
in memory, and gives the local browser a separate dev cookie.

Build static web output:

```bash
npm run export:web
```

Deploy the generated web output to the pango.fun static root. On production web,
the app can use same-origin `/api/pango/*` behind Nginx.

## Local API Modes

Mock local API:

```bash
npm run dev:mock
```

Production proxy API:

```bash
npm run dev:prod
```

Do not run `dev-server.mjs` as production. It is only for local development and
testing.

## Backend Contract

Runtime routes are provided by the server-side pango.fun gateway and Nginx auth
layer:

- `POST /api/pango/login`
- `GET /api/pango/me`
- `POST /api/pango/chat/stream`
- `GET /api/pango/status`
- `GET /api/pango/sessions`
- `GET /api/pango/tasks`
- `GET /api/pango/config`
- `/api/pango/ops/*`

Production auth must use Secure HttpOnly cookies and CSRF via `X-Pango-CSRF` for
mutating requests.

Do not commit API keys, cookies, session files, `.env` files, Nginx configs,
systemd units, gateway snapshots, deployment backups, or production credentials
to this repository.

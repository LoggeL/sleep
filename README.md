# Nachtplan

An original, calm German sleep/bedtime calculator. **Live: https://sleep.logge.top**

Inspired by the general sleep-planning concept of sleepytime.cc; independently written code, visual design and assets. No copied branding or assets.

## Features

- **Aufstehen um** → chronological bedtime options; **Jetzt schlafen** and **Ins Bett um** → wake-up options.
- Three through six approximate cycles; 15-minute default falling-asleep buffer, configurable 0–60 minutes.
- Advanced cycle-length assumption 70–120 minutes, default 90. Marks options with 7–9 hours of sleep, not a personal recommendation.
- Separate estimated sleep and time in bed, explicit dates, past-time labels, live selected-plan countdown.
- Local `.ics` calendar export with UTC instants, escaping and RFC 5545 line folding. This is **not an alarm**.
- Validated share links and legacy `#sleep=36` support (00:36 bedtime, minutes after midnight). Canonical links include exact local date/time. “Now” links freeze the bedtime to minute precision.
- Device timezone displayed. Elapsed durations are calculated on real Date instants across midnight and DST. Spring-gap input is rejected; autumn repeated local times use the earlier occurrence (JavaScript Date compatible disambiguation). Recipients interpret shared times in **their device timezone**.
- Keyboard support, visible focus, semantic labels, reduced-motion support, responsive mobile layout.
- No runtime dependencies, remote fonts, third-party assets, APIs, accounts, cookies or analytics. Only non-sensitive preferences are saved in localStorage; dates/history are not persisted. Storage failure is non-fatal. A privacy dialog can clear preferences. Hosting may process necessary connection logs.

## Limits

This is a planning heuristic, **not sleep-stage prediction or medical advice**. Real cycles vary within and between nights. There is no promise of refreshed waking. Most adults generally need 7–9 hours; sufficient sleep and regularity matter more than hitting an alleged precise cycle boundary. Short options are shown for comparison, not endorsed. Persistent sleep difficulties warrant professional advice.

Dates are supported from 2000 through 2099. No server-side data is stored. The app defaults to German and the device timezone (including Europe/Berlin); native time/date input appearance follows the browser locale.

## Run locally

Node 24+ for tests. No build step is needed.

```sh
npm ci
npm test
npm start
# http://localhost:5187
```

## Browser verification

```sh
npx playwright install chromium
npm start # in another terminal, or run the Docker image below
npm run test:e2e
# Test production:
BASE_URL=https://sleep.logge.top npm run test:e2e
```

Tests cover all three modes, calendar download contents, share/reopen, storage, keyboard focus, mobile overflow, legacy links, invalid inputs, DST and an axe accessibility scan. Screenshots go into ignored `artifacts/`.

```sh
docker build -t nachtplan .
docker run --rm -p 5187:80 nachtplan
curl http://localhost:5187/healthz.json
```

## Deployment

Production is a Dokploy-managed GitHub application (`LoggeL/sleep`, `main`), built with the root Dockerfile, nginx on internal port 80, host `sleep.logge.top`, HTTPS/Let's Encrypt via the platform's ingress. No env vars or secrets required. `nginx.conf` replaces the default server and adds CSP/security headers and revalidation caching. The Docker image copies only the six public assets, not tests/source tooling. `/healthz.json` identifies the app version. Deploy a new main revision through Dokploy, then verify exact public asset checksums, health, TLS and browser tests; a successful push alone is not rollout proof.

## Development

- `core.js`: pure calculation, validation, link codec, preference validation, countdown and calendar serialization.
- `app.js`: small DOM controller; inputs and storage are validated; no user-provided HTML is injected.
- `index.html`, `style.css`, `icon.svg`: original responsive visual system.
- `core.test.js`: deterministic Node tests run under `Europe/Berlin`.
- `e2e/app.spec.js`: real Chromium + axe checks, reusable against production.

MIT licensed. No production npm dependencies.

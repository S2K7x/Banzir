# Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite | Auto-detected by Vercel, no config. |
| UI | React + TypeScript | Component model suits the builder, player, chat and theming. Types keep the program schema honest. |
| Storage | IndexedDB via Dexie | Asynchronous, large quota, indexed queries for history. |
| Validation | Zod, loaded on demand | One schema validates templates (in tests), backups and later AI output. It is only imported at runtime when a backup is restored, so it stays out of the main bundle. |
| PWA | vite-plugin-pwa (Workbox) | Offline shell, install prompt, update flow. |
| State | Dexie live queries + a tiny settings store | No state library. `App.tsx` runs one live query and passes data down. |
| Routing | None | Five tabs in React state; full-screen overlays push a history entry so the back button closes them. |
| Styling | One plain CSS file with custom properties | No CSS framework. |
| Charts | Plain HTML/CSS bars | Keep the bundle small. |
| Server | None, except one optional Vercel edge function for AI relay | Keeps deployment zero-config. |

No remote fonts, no analytics, no third-party scripts.

## Repository layout (as built)

```
index.html              applies the saved theme before first paint
vite.config.ts          Vite, React, PWA manifest and service worker, Vitest
/public                 icon.svg and generated PNG icons
/scripts/make-icons.mjs regenerates the PNG icons from icon.svg
/src
  main.tsx              entry: service worker registration, error boundary
  App.tsx               shell: one live query, tabs, overlays, lazy screens
  styles.css            tokens, ten themes, all component styles
  /lib
    schema.ts           Zod schemas and types (source of truth)
    constants.ts        plain value lists (no Zod, cheap to import)
    db.ts               Dexie tables, program state, active session
    settings.ts         device preferences in localStorage, units, formatting
    matcher.ts          fitting a template to a person (equipment, level, time)
    ranking.ts          ranking the built-in plans (loads the template data)
    edit.ts             pure program-editing operations for the builder
    programState.ts     week/phase/day from completed sessions, lighter weeks
    progression.ts      next-load and next-rep suggestions
    workout.ts          start/finish a workout, sound, wake lock
    stats.ts            weekly counts, streak, muscle sets, records
    backup.ts           JSON backup/restore, CSV export
    text.ts             every user-facing label and formatter
    themes.ts           theme preset list
    core.test.ts        unit tests
  /data
    exercises.ts        curated exercise library and ladders
    /templates          built-in programs (plain data via build.ts helpers)
  /ui                   kit.tsx (icons, ring, sheet, inputs), ErrorBoundary
  /features             onboarding, today, program, player, progress, coach, profile
/docs
```

/api/llm.ts            optional AI relay (Vercel function; also mounted by vite dev/preview)
/src/lib/coach         AI coach: providers, tools, prompt, agent loop, storage
/src/lib/body.ts       weigh-ins, 7-day trend
/src/lib/nutrition.ts  targets, safety rules, food log, corrections, Open Food Facts
/src/lib/running.ts    run log, heart-rate zones, Riegel, 10 % rule, GPX parser
/src/lib/fasting.ts    eating windows, fasting timer state, week summary, log
/src/lib/fastingSafety.ts  who fasting is not offered to (no imports, safe for the shell)

/e2e                   browser tests (Playwright, phone size, providers mocked); run.mjs runs them all
/scripts/a11y.mjs      axe-core audit of every screen in three themes
/scripts/contrast.mjs  WCAG contrast of every theme at every accent hue
/scripts/serve.mjs     serves dist/ with the vercel.json headers, to test the security policy
/scripts/screenshots.mjs  regenerates docs/screenshots/banzir.png
vercel.json            security headers and caching

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Type-check, then production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run e2e` | Every browser test against a fresh `vite preview` (build first) |
| `npm run a11y` | axe-core audit (needs the app on port 4173) |
| `npm run contrast` | Contrast of every theme and accent hue (app on port 4173) |
| `npm run serve` | Serve `dist/` with the production headers on port 4174 |
| `node scripts/screenshots.mjs` | Regenerate the README screenshot (app on port 4173) |
| `node scripts/make-icons.mjs` | Regenerate PNG icons (needs Playwright's Chromium) |

CI (`.github/workflows/ci.yml`) runs the unit tests and the build, then, in a
second job, installs Chromium and runs the browser tests, the axe audit and
the contrast check. Screenshots are uploaded when a browser test fails.

## Security headers (`vercel.json`)

- Content Security Policy: scripts only from the app itself plus the hash of
  the inline theme script in `index.html` (a unit test fails if they drift);
  styles only from the app; `connect-src 'self' https:` plus localhost, so any
  HTTPS AI provider or a local model server can be reached; no frames
  (`frame-ancestors 'none'`), no plugins, no form posts elsewhere.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` (the app
  address is not sent to AI providers or Open Food Facts),
  `Permissions-Policy` turning off camera, microphone, location, payment and
  USB (a barcode scanner would need `camera=(self)`),
  `Cross-Origin-Opener-Policy: same-origin`.
- Hashed assets are cached for a year; `sw.js` is always revalidated.
- Verified with `scripts/serve.mjs`: all browser tests, the mocked coach and
  offline mode pass under the policy, and an injected inline script is
  refused. Not yet checked on a real Vercel deployment.

## Bundle (2026-11-12, all modules)

First load is about 123 kB of gzipped JavaScript plus 5 kB of styles: the
entry chunk (React, Dexie, shell, Today) at 115 kB and exercise data at 7 kB.
Measure the sum of every script `index.html` loads, not the entry chunk
alone: the bundler moved React and Dexie from a shared chunk into the entry
chunk when the modules were added, and the entry grew from 79.5 to 115 kB
while the first load stayed at 123 kB.
Loaded on demand: onboarding (5 kB), templates and ranking (16 kB), the coach
(18 kB), the Food tab (5 kB), the fasting screen (4 kB), the running
screens (4 kB), the module cards on Today (only when the modules are on), the Anthropic SDK (84 kB, only when Claude is the provider), Zod
(28 kB, coach and backup restore), and 2-5 kB chunks for the other screens.
The service worker precaches everything.

## Data model (IndexedDB tables)

Built (Dexie database `banzir`, version 1):

| Table | Contents |
|---|---|
| `profile` | One row (`id: 'me'`): name, goal, level, equipment, weekly sessions, session length, age, sex, height, weight, health flags, reported ability. |
| `programs` | Programs in the schema of `docs/programs/schema.md`. |
| `sessions` | Completed workouts, indexed by date. |
| `kv` | `state` (active program id, completed session count, lighter week) and `active` (the in-progress workout, saved after every change so it survives a reload). |

Version 2 (2026-11-12) added:

| Table | Contents |
|---|---|
| `body` | One weigh-in per day: `{ date: 'YYYY-MM-DD', kg }`. |
| `foods` | Food log entries: id, date, time, name, kcal, protein, carbs, fat, grams, Open Food Facts code. |

and these `kv` keys: `nutrition.settings` (goal, pace, activity level,
correction, manual targets), `nutrition.favourites`, `nutrition.water`
(date → ml, last 90 days), `coach.config`, `coach.chat`, `coach.memory`.

Version 3 (2026-11-12) added:

| Table | Contents |
|---|---|
| `runs` | Runs: id, start time, seconds, metres, kind, average heart rate, effort, note, session id, source (manual, gpx, session). |
| `fasts` | Fasts: id, start, end (missing while running), feel 1-5, note. |

and the `kv` keys `running.settings` (measured maximum and resting heart
rate, recent 5 km time) and `fasting.settings` (eating window per weekday).

Device preferences (theme, accent, corners, units, timer and sound options,
last backup date, enabled modules) live in `localStorage` under `banzir.settings`, so the
theme can be applied synchronously before first paint.

Planned tables: `exercises` (user-created).

The backup file is one JSON document (`app: 'banzir'`, `format: 3`; formats 1
and 2 still restore) holding all tables plus the settings, without the AI
key. A key already on the device survives a restore. Restore validates it with the schema and
replaces local data. Add a Dexie version and a migration whenever a table or
stored shape changes, and bump `format` when the backup shape changes.

## Storage safety

- Safari applies a seven-day cap to script-writable storage for sites that are
  not installed; installed home-screen apps are exempt `[verified: web.dev,
  Apple forum]`. Onboarding must push "Add to Home Screen" and the app should
  detect standalone mode.
- Call `navigator.storage.persist()` and show the result in Settings → Data.
  Behaviour on iOS is inconsistent, so do not rely on it `[secondary]`.
- Backup reminder: if no export in 30 days and there is logged data, show a
  quiet prompt. Export uses the share sheet (the legacy app already does this).
- Detect an empty database on a device that previously had data (flag in
  `localStorage`) and offer "Restore from backup".
- Possible later: optional sync to the user's own storage (file in
  iCloud/Drive via the File System Access API where available, or the user's
  own Supabase project). Not in the first version.

## Deployment

- README carries a Vercel Deploy button:
  `https://vercel.com/new/clone?repository-url=<encoded repo URL>`.
  It clones the repo into the user's Git account and deploys it `[verified:
  Vercel docs]`.
- The repo can also be marked as a GitHub template (a repository setting).
- No environment variables. The AI key is entered in the app and stored on the
  device only.
- Works on any static host too (Netlify, Cloudflare Pages, GitHub Pages); only
  the AI relay is Vercel-specific and the app falls back to direct calls.

## Updates

Users get updates with GitHub's "Sync fork" button; Vercel redeploys
automatically. Because users never edit files, there are no merge conflicts.
The service worker shows "Update available" and reloads on confirmation.
Data migrations run on first launch of a new version. So far every Dexie
version only adds tables, so existing data is never rewritten; a version that
changes a stored shape must add a migration and a test, and should prompt for
a backup first (not built yet).

## AI relay (`/api/llm`)

Why it exists: provider support for direct browser calls is uneven.
- Anthropic allows browser calls when the request carries
  `anthropic-dangerous-direct-browser-access: true`. A preflight test on
  2026-11-12 returned `access-control-allow-origin: *` `[verified]`.
- OpenRouter is reported as browser-friendly `[secondary]`.
- OpenAI and Gemini: reports conflict; could not be tested from the build
  sandbox `[unverified]`.

Built as `api/llm.ts` (see `ai-coach.md`, "As built"). Original design:
- A small edge function that forwards the request body to an allow-listed
  provider host and streams the response back.
- The user's key travels in a request header and is never logged or stored.
- Allow-list of hosts only (no open proxy). Reject anything else.
- Client tries direct first for providers known to allow it, relay otherwise.
- Custom base URL option for OpenAI-compatible servers (Ollama, LM Studio).
  A local server is reached directly from the browser, not through the relay.

## Legacy app notes

`S2K7x/App-Sport/index.html` is a 287 KB single file: vanilla JS, data in
`localStorage` under `planche_os_*` keys, program text parsed from strings
such as `4 × 3-6 reps`. Banzir replaces string parsing with structured data.
A one-off importer for a legacy backup file is a nice-to-have for the owner.

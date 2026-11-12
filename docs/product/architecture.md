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

Planned and not there yet: nutrition, fasting and running modules.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Type-check, then production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `node scripts/make-icons.mjs` | Regenerate PNG icons (needs Playwright's Chromium) |

CI (`.github/workflows/ci.yml`) runs the tests and the build on every push.

## Bundle (2026-11-12, with the coach)

First load is about 128 kB gzipped: the main chunk (React, Dexie, shell,
Today) at 77 kB, shared exercise data and labels at 46 kB, styles at 5 kB.
Loaded on demand: onboarding (5 kB), templates and ranking (16 kB), the coach
(17 kB), the Anthropic SDK (84 kB, only when Claude is the provider), Zod
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

Device preferences (theme, accent, corners, units, timer and sound options,
last backup date) live in `localStorage` under `banzir.settings`, so the
theme can be applied synchronously before first paint.

Planned tables: `exercises` (user-created), `bodyLog`, `nutritionLog`,
`fastLog`, `coachMemory`, `chats`.

The backup file is one JSON document (`app: 'banzir'`, `format: 1`) holding
all tables plus the settings. Restore validates it with the schema and
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
- The repo is also marked as a GitHub template.
- No environment variables. The AI key is entered in the app and stored on the
  device only.
- Works on any static host too (Netlify, Cloudflare Pages, GitHub Pages); only
  the AI relay is Vercel-specific and the app falls back to direct calls.

## Updates

Users get updates with GitHub's "Sync fork" button; Vercel redeploys
automatically. Because users never edit files, there are no merge conflicts.
The service worker shows "Update available" and reloads on confirmation.
Data migrations run on first launch of a new version; always export a backup
automatically before a migration.

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

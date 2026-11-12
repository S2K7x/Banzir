# Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite | Auto-detected by Vercel, no config. |
| UI | React + TypeScript | Component model suits the builder, player, chat and theming. Types keep the program schema honest. |
| Storage | IndexedDB via Dexie | Asynchronous, large quota, indexed queries for history. |
| Validation | Zod | One schema validates templates, imports and AI output. |
| PWA | vite-plugin-pwa (Workbox) | Offline shell, install prompt, update flow. |
| State | Small store (Zustand) + Dexie live queries | No server state to manage. |
| Charts | Lightweight SVG charts written in-house or a small library | Keep the bundle small. |
| Server | None, except one optional Vercel edge function for AI relay | Keeps deployment zero-config. |

No remote fonts, no analytics, no third-party scripts.

## Repository layout (planned)

```
/src
  /app            routes, shell, tab bar
  /features
    /onboarding
    /program      builder, schema, template matching
    /player       workout player, timers
    /history      logs, charts, records
    /coach        AI chat, tools, memory
    /nutrition    optional module
    /fasting      optional module
    /settings     profile, themes, modules, data
  /data
    /templates    built-in programs as JSON
    /exercises    exercise library (from free-exercise-db) + Banzir additions
  /lib            db, units, progression engine, ai providers
  /theme          tokens, presets
/api
  llm.ts          optional edge relay for AI providers
/docs
```

## Data model (IndexedDB tables)

| Table | Contents |
|---|---|
| `profile` | Name, age, sex, height, weight, units, goal, level, equipment, schedule, injuries/limits, modules enabled. |
| `programs` | Programs in the schema of `docs/programs/schema.md`. One is active. |
| `exercises` | Library entries plus user-created exercises. |
| `sessions` | Completed workouts: date, program/day reference, sets performed, RPE, notes, duration. |
| `activeSession` | The in-progress workout, so it survives a reload. |
| `bodyLog` | Weight and optional measurements by date. |
| `nutritionLog`, `fastLog` | Optional modules. |
| `coachMemory` | Coach notes, conversation summaries (see `ai-coach.md`). |
| `chats` | Coach conversations. |
| `settings` | Theme, timers, sounds, AI provider and key. |
| `meta` | Schema version for migrations, last backup date. |

Every table has a version and Dexie migrations. The export file is a single
JSON document containing all tables plus the schema version.

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

Design:
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

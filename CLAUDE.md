# Banzir — project context

Read this file first in every session. It is the index to everything already
decided and researched, so nothing has to be redone.

## What Banzir is

An open-source, self-hosted workout app. Anyone forks the repo, deploys it to
Vercel in one click, and lands straight in an onboarding flow that builds a
training plan for their own goal. It is the generalised version of the owner's
personal app (`S2K7x/App-Sport`, "PLANCHE OS"), which is a single-user,
French, hardcoded calisthenics tracker.

Target user: anyone from complete beginner to advanced athlete, with any goal
(muscle, strength, calisthenics skills, running, fat loss, sport performance).

## Decisions already made (do not re-litigate)

| Topic | Decision |
|---|---|
| Stack | Vite + React + TypeScript, Dexie (IndexedDB), PWA plugin. No backend, no accounts, no env vars. No router, state library or CSS framework: keep the bundle small. |
| Hosting | Vercel, zero config. One optional edge function relays AI calls. |
| Language | English only at launch. Keep strings in one place so languages can be added later. |
| Licence | MIT. |
| Data | Local-first. All user data in the browser (IndexedDB) + JSON export/import. |
| Programs | Programs are data (JSON matching one schema), never code. Templates, user edits and AI output share the schema. Programs follow completed sessions, not weekdays. |
| Customisation | Users never edit the repo. Everything is configured in the app, so "Sync fork" updates never conflict. |
| AI coach | Optional, bring-your-own-key. OpenAI-compatible, Anthropic and Gemini adapters. Never required for onboarding. |
| Modules | Nutrition, fasting, running, body-weight tracking are optional modules toggled in onboarding/settings. |
| Units | kg/lb and km/mi, chosen in onboarding. |
| Social features | Out of scope. |

## Documentation map

Product
- `docs/product/vision.md` — goals, principles, competitors.
- `docs/product/architecture.md` — stack, data model, storage, deploy, updates.
- `docs/product/onboarding.md` — flow, questions, template matching.
- `docs/product/ai-coach.md` — providers, tools, memory design, safety.
- `docs/product/design.md` — design references, tokens, theme presets, components.
- `docs/product/features.md` — feature list, legacy app inventory, roadmap.

Programs
- `docs/programs/schema.md` — the program data schema (draft).
- `docs/programs/catalog.md` — every built-in template, specified.

Science (evidence base behind the templates and the coach)
- `docs/science/training-principles.md`
- `docs/science/strength-hypertrophy.md`
- `docs/science/calisthenics.md`
- `docs/science/running.md`
- `docs/science/nutrition-fat-loss.md`
- `docs/science/sport-specific.md`
- `docs/science/populations-safety.md`

Process
- `docs/research-log.md` — what was searched, when, what could not be verified.

## Status

- 2026-11-12: research and documentation written.
- 2026-11-12: first working version built (roadmap phases 1-3): onboarding,
  matcher, workout player, progression engine, history, 10 themes,
  backup/restore, offline support.
- 2026-11-12: program builder, saved programs and the calisthenics skill
  plans added (most of phase 4). 15 templates exist. All flows verified in a
  phone-sized browser.
- 2026-11-12: all 35 templates, focus questions for every goal, plan
  prerequisites, per-prescription history with 1RM-based load estimates.
- 2026-11-12: AI coach (phase 5): Claude via the Anthropic SDK, other
  providers via the OpenAI-compatible format and the `/api/llm` relay,
  tools, memory, proposals, summaries. Verified with mocked providers.
- 2026-11-12: body weight and nutrition modules (most of phase 6), with
  Open Food Facts search, weight-trend calorie corrections and safety rules.
- 2026-11-12: running and fasting modules (phase 6 done): run log, GPX
  import, heart-rate zones, race equivalents, the 10 % single-run limit;
  eating windows, fasting timer and log, opt-in with safety rules.
- 2026-11-12: phase 7 and release 1.0.0: accessibility pass (contrast in
  every theme and hue, axe clean, focus handling), security headers, browser
  tests and audits in CI, changelog. Next work: "Known gaps and next steps"
  in `docs/product/features.md`; record user-facing changes in `CHANGELOG.md`.

## Code map

Full layout and commands: `docs/product/architecture.md`.

- `src/lib/schema.ts` — the schema; source of truth for all stored shapes.
- `src/data/exercises.ts`, `src/data/templates/` — library and templates.
- `src/lib/matcher.ts` — fits a template to a profile; `src/lib/ranking.ts`
  ranks the built-in plans (kept apart so template data loads lazily).
- `src/lib/edit.ts` — pure program-editing operations used by the builder
  (`src/features/program/Builder.tsx`).
- `src/lib/programState.ts`, `src/lib/progression.ts` — where someone is in a
  program and what to suggest next.
- `src/features/*` — one folder per screen; `src/App.tsx` is the shell.
- `src/lib/coach/` — AI coach; `api/llm.ts` — relay for providers that block
  browser calls. Read `docs/product/ai-coach.md` ("As built") first.
- `src/lib/body.ts`, `src/lib/nutrition.ts`, `src/lib/running.ts`,
  `src/lib/fasting.ts` — optional modules; screens in `src/features/body`,
  `nutrition`, `running` and `fasting`. `src/lib/fastingSafety.ts` holds
  who fasting is not offered to.
- `src/lib/text.ts` — all user-facing labels (for future languages).
- `npm test` (Vitest), `npm run build` (type-check + build), `npm run dev`,
  `npm run e2e` (browser tests in `e2e/`), `npm run a11y`, `npm run contrast`.

## Working rules

- Update the relevant doc in the same change whenever a decision changes or new
  research is done. Add a dated line to `docs/research-log.md`.
- Every training or nutrition number shown to users must trace to a source in
  `docs/science/`. Each claim there carries a confidence tag:
  `[verified]` (source opened or abstract confirmed in a session),
  `[secondary]` (seen only through a summary), `[recall]` (from model
  knowledge, not re-checked). Upgrade tags when you verify; never present a
  `[recall]` number to users as established fact without checking it.
- The app gives training guidance, not medical advice. Follow the red-flag and
  disclaimer rules in `docs/science/populations-safety.md`.
- UI rules inherited from the legacy app: no emoji in the interface (SVG icons
  only), no remote fonts, works fully offline once installed.
- Do not copy third-party photos, logos or app designs into the repo. The
  design references are described in words in `docs/product/design.md`.
- Exercise data: use `yuhonas/free-exercise-db` (public domain). Do not import
  wger data (share-alike) or ExerciseDB media (unclear rights).
- The legacy app lives in `S2K7x/App-Sport` (`index.html`, `MonAppTacking.md`).
  Port ideas and logic from it; do not modify that repo for Banzir work.

## Engineering rules learned the hard way

- Before calling work done: `npm test`, `npm run build`, `npm run e2e`, then
  drive the changed flow in a browser (Playwright, phone viewport) and check
  for console errors. Add or extend a test in `e2e/` for a new flow. Unit
  tests alone missed two real bugs.
- Colour changes: run `npm run contrast` and `npm run a11y` (app served on
  port 4173), then look at screenshots in a light, a dark and the
  high-contrast theme. axe cannot judge text on gradients; the fasting hero
  shipped with invisible tiles in light themes until a screenshot showed it.
  Use `--accent-text` (not `--accent`) for accent-coloured text.
- `index.html`'s inline theme script is allowed by hash in `vercel.json`. A
  unit test fails when they drift: put the new hash in the policy.
- A React effect must return nothing or a cleanup function. Write
  `useEffect(() => { window.scrollTo(0, 0); }, [x])` with braces: newer
  browsers return a promise from `scrollTo`, which crashed the app.
- Timers compute from timestamps (`Date.now()`), never from tick counts, so
  they stay right when the phone locks.
- Import value lists from `src/lib/constants.ts` and types with `import type`
  from `schema.ts`; importing Zod at runtime pulls 27 kB gzipped into the
  main bundle.
- New screens are lazy-loaded in `App.tsx`. Check the build output sizes after
  adding a dependency.
- When a template or library exercise changes, keep item and exercise IDs
  stable: logged history refers to them.
- Any change to stored shapes needs a Dexie version bump and a migration, and
  the backup `format` number if the file shape changes.
- A screen that edits stored data keeps its own draft in state and writes
  through (see `Builder.tsx`). Editing from a live-query prop loses fast taps.
  Give such a screen a `key` on the record id so it remounts when the record
  changes; without it the builder once opened on the previous program.
- Day ids must be unique across the whole program, not just within a phase:
  the player looks a day up by id. A test enforces it for templates.
- When checking plans as a coach, print the fitted plan for a few typical
  people (beginner with a bar, intermediate, advanced) and read it. Two
  selection flaws were only visible that way.
- The coach's system prompt (`src/lib/coach/prompt.ts`) carries a summary
  of `docs/science/`. Change both together, and bump `PROMPT_VERSION` (or
  `TOOLS_VERSION` in tools.ts) whenever the prompt or a tool changes.
- Never edit or reorder coach history that has been sent: Claude rejects
  replayed thinking blocks after a prefix change. Append instead.
- Browser tests mock providers with Playwright routes (`api.anthropic.com`,
  `/api/llm`); the build sandbox cannot reach OpenAI or Gemini.
- Body weight is shown to one decimal (`showBodyWeight`); gym loads round to
  plates (`showWeight`). Mixing them showed 80.2 kg as 80.25.
- Optional-module cards on Today are lazy-loaded so people without the
  module do not pay for them in the main bundle.
- Measure the first load as the sum of every script `index.html` loads.
  The entry chunk alone jumped from 79.5 to 115 kB when the bundler merged a
  shared chunk into it, with no change in what loads at startup.
- Screens that depend on the time of day are tested with Playwright's
  `page.clock.setFixedTime` and a fixed `timezoneId`. Scope locators to
  `.overlay` or `.sheet`: cards behind an overlay have the same buttons.
- Think in every role before shipping a feature: engineer (tests, bundle),
  coach and scientist (is the prescription sensible for this level, is the
  claim sourced), nutritionist (safe floors), designer (thumb reach, contrast,
  all themes), researcher (log sources in `docs/research-log.md`).

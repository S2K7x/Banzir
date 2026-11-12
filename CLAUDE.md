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
| Stack | Vite + React + TypeScript, Dexie (IndexedDB), PWA plugin. No backend, no accounts, no env vars. |
| Hosting | Vercel, zero config. One optional edge function relays AI calls. |
| Language | English only at launch. Keep strings in one place so languages can be added later. |
| Licence | MIT. |
| Data | Local-first. All user data in the browser (IndexedDB) + JSON export/import. |
| Programs | Programs are data (JSON matching one schema), never code. Templates, user edits and AI output share the schema. |
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

- 2026-11-12: research and documentation written. No application code yet.
- Next step: scaffold the app (Vite/React/TS), implement the program schema,
  storage, onboarding and the first three templates. See the roadmap in
  `docs/product/features.md`.

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

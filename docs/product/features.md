# Features and roadmap

## Inventory of the legacy app (App-Sport, "PLANCHE OS")

Already built there and worth porting:

| Area | What exists |
|---|---|
| Workout player | Guided exercise by exercise; one row per set; auto rest timer read from the exercise; +15 s; beep, 3-2-1 countdown, vibration where supported; hold timer for isometrics that writes the time into the set; screen wake lock; resume an interrupted session. |
| Voice | Spoken exercise and set announcements (system speech synthesis). |
| Previous values | Last performance shown while logging. |
| Deload | One-tap deload week (about 40 % fewer sets), reminder every 5-6 weeks. |
| Readiness | "Traffic light" check before a session (sleep, HRV, joint pain) that trims a set per exercise. |
| Muscle map | SVG body showing muscles trained. |
| Heart-rate zones | Max HR (Tanaka 208 − 0.7 × age), resting HR, % max or Karvonen; zones shown on run sessions. |
| Running | Interval cycle, zone 2 runs, 5 km test, distance and time logging. |
| Nutrition | Journal with macros, protein-meal counter, water, supplements, recipes with favourites, goals from Mifflin-St Jeor, recents. |
| Weigh-ins | 7-day average vs previous 7 days; calories adjust by ±150 kcal at most every 2 weeks. |
| Fasting | Timer, schedule per day, weekly view, rating, log. |
| Import | Apple Health `export.xml`, `.gpx`, and a Shortcuts clipboard bridge; duplicate detection. |
| Settings | Profile, timers, sounds, theme auto/light/dark, 5 accents, backup/restore via share sheet, storage persistence. |
| Offline | Service worker caching the shell; network-first for navigation. |

Known platform limits recorded there: no Vibration API on iOS Safari; wake
lock works in installed apps from iOS 18.4; no background notifications
without a push server; a web app cannot read Apple Health directly.

## Feature list for Banzir

Core (version 1)
- Onboarding and template matching.
- Program schema, template library, program builder (edit days, exercises,
  sets, reps, rest, supersets, order).
- Exercise library with search, filters, instructions, images, substitutions,
  custom exercises.
- Workout player (ported and generalised): reps, weight, time, distance, RPE
  or RIR per set, supersets, notes, quick swap of an exercise.
- Progression engine: suggests the next load/reps/level from the last sessions
  (rules in `docs/science/training-principles.md`).
- History, personal records, charts (per exercise, weekly volume per muscle,
  adherence, body weight).
- Themes and appearance settings.
- Backup, restore, CSV export, install prompt.

Version 1.x
- AI coach with tools and memory.
- Deload scheduling and readiness check.
- Plate calculator, warm-up set calculator, 1RM estimate.
- Running module: plans, pace/heart-rate zones, run logging, GPX import.
- Body weight trend with adaptive calorie estimate.
- Nutrition and fasting modules (ported).
- Skill trees for calisthenics (visual progression ladders).
- Program share: export/import a program or theme as a file or link.

Later
- More languages.
- Optional sync to the user's own storage.
- Health data import (Apple Health export, Shortcuts bridge).
- Web Push reminders (needs a server; only if a zero-config route exists).

Not planned: accounts, social feed, leaderboards, hosted backend.

## Roadmap

| Phase | Deliverable |
|---|---|
| 0 | Research and docs (done 2026-11-12). |
| 1 | Scaffold; schema + Zod; Dexie; exercise library import; theme tokens with 3 presets. |
| 2 | Onboarding; template matching; first 3 templates (full body 3-day, beginner calisthenics, start running). |
| 3 | Workout player; history; progression engine; records. |
| 4 | Program builder; remaining templates; backup/export; install flow. |
| 5 | AI coach: providers, relay, tools, memory. |
| 6 | Modules: running, body weight, nutrition, fasting. Remaining themes. |
| 7 | Polish, accessibility pass, README with Deploy button, first release. |

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

| Phase | Deliverable | Status |
|---|---|---|
| 0 | Research and docs | Done 2026-11-12 |
| 1 | Scaffold; schema + Zod; Dexie; exercise library; theme tokens | Done 2026-11-12 (curated library of 127 exercises; all 10 themes) |
| 2 | Onboarding; template matching; first templates | Done 2026-11-12 |
| 3 | Workout player; history; progression engine; records | Done 2026-11-12 |
| 4 | Program builder; remaining templates; backup/export; install flow | Done 2026-11-12: builder, saved programs, all 35 templates, backup, restore, CSV, install card. |
| 5 | AI coach: providers, relay, tools, memory | Not started (Coach tab is a placeholder) |
| 6 | Modules: running, body weight, nutrition, fasting | Not started |
| 7 | Polish, accessibility pass, first release | Not started |

## What works today (2026-11-12)

- Onboarding: name, units, goal, level, push-up and pull-up ability,
  equipment, schedule, optional body data and health flags, ranked plan with
  preview, theme, install instructions. Every step can be skipped. A backup
  file can be restored from the first screen.
- Today: weekly ring, next session, resume in-progress workout, lighter-week
  suggestion, stats, goal-based tip, install and backup reminders.
- Program: plan overview, week navigation (repeat or skip), day lists, tap an
  exercise to swap it or move along its progression ladder, start any day.
- Program builder ("Edit plan"): rename the plan, sessions per week,
  lighter-week frequency; per day: rename, reorder, duplicate, delete, add;
  per exercise: sets, rep or hold range, duration, interval rounds and segment
  lengths, rest, change exercise or ladder step, reorder, remove; exercise
  picker with search, category chips and an equipment filter. Changes save
  automatically. Editing is locked while a workout is in progress.
- Plans: ranked ready-made plans, "New program" from scratch, "Copy current
  plan", and a list of your own programs to switch back to or delete. An
  unedited ready-made plan is removed when you switch away; edited and
  self-made ones are kept.
- Plans: 35 built-in plans across all seven goals. Onboarding asks "What do
  you want most?" for every goal (skill, race distance, sport, express,
  senior, mobility, low-impact, home) and how long a runner can already run.
- Calisthenics: a "What do you want most?" question (all-round, first
  pull-up, handstand, planche, front lever, muscle-up) picks the skill plan;
  skill plans above the person's level are not recommended first.
- Player: per-set logging with weight carry-down, last-time values, load and
  rep suggestions, ladder "move up" button, automatic rest timer with +15 s,
  hold stopwatch, countdown and interval timers with beeps (timestamp-based,
  so they survive a locked screen), add/remove sets, swap, pause and resume,
  finish with effort and note, summary screen, screen wake lock.
- Progress: sessions per week, sets per muscle this week, personal bests,
  history with detail and delete.
- Profile: edit profile and plan, 10 themes, accent hue, corner style, units,
  timer/sound/wake-lock toggles, backup, restore, CSV export, storage
  protection status, erase everything, install card, disclaimer.
- Offline: verified with the network disabled (shell, all tabs, player).

## Known gaps and next steps

1. Builder gaps: create interval sessions and supersets from scratch, edit
   warm-up/cool-down membership directly, multi-phase editing in one view,
   per-item progression rule and effort target, undo.
2. More plans: kettlebell-only, travel, powerlifting meet prep, swimming,
   cycling, postpartum return, more sports (needs analysis first).
3. Full exercise database import (free-exercise-db) with images and
   instructions, loaded on demand.
4. AI coach (phase 5).
5. Modules: body weight and adaptive calories, running (distance, pace,
   heart-rate zones), nutrition, fasting.
6. Readiness check, plate calculator, warm-up sets, per-exercise charts.
7. Supersets as a player mode; voice announcements (legacy app has them).
8. Accessibility pass (contrast check of every theme, screen-reader labels),
   and tests for the React screens.
9. Preferred training weekdays and reminders.
10. Legacy App-Sport backup importer.

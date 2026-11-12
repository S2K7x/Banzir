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
| 5 | AI coach: providers, relay, tools, memory | Done 2026-11-12 (see `ai-coach.md`, "As built") |
| 6 | Modules: running, body weight, nutrition, fasting | Done 2026-11-12 |
| 7 | Polish, accessibility pass, first release | Done 2026-11-12: version 1.0.0 |

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
- Coach: bring-your-own-key chat with Claude, OpenAI, Gemini, OpenRouter,
  Groq, Mistral or any OpenAI-compatible server; reads the plan and log,
  remembers notes, proposes plan changes as cards to accept or dismiss.
- Body weight (optional module): morning weigh-in card on Today, weight card
  on Progress with latest, 7-day average, weekly rate, chart and history.
- Nutrition (optional module, Food tab): calorie and macro targets from
  Mifflin-St Jeor, activity level, goal and pace, with safety rules (no
  deficit under 18, in pregnancy or when underweight; deficit at most 25 %;
  floors of 1200/1500 kcal); food log by day with Open Food Facts search,
  recents, favourites and manual entry; protein-rich meal count; water;
  weight-trend calorie corrections (±150 kcal, at most every 14 days); a
  warning when weight falls faster than 1 % a week for two weeks.
- Running (optional module): run log on Progress (week totals, 8-week chart,
  history, edit and delete), manual entry with pace, GPX import with
  duplicate detection and merge into a run session, heart-rate zones (age
  estimate or measured maximum, resting rate for reserve-based zones), race
  equivalents and training paces from a 5 km time, the 10 % single-run limit
  on Today and as a warning when logging; run sessions in the player ask for
  distance and heart rate and go into the log; zone targets show bpm.
- Fasting (optional module, opt-in only): eating window per weekday with
  12:12, 14:10 and 16:8 presets; Today card and full screen with a live
  timer, "start since the planned close" for a forgotten button, end, 1-5
  rating, week chart against the plan, 10-day log with one-tap confirmation
  of planned fasts, edit and delete; a logged meal ends a running fast; not
  offered under 18, in pregnancy or when underweight.
- Modules are chosen in onboarding (preselected from the goal, never fasting)
  and in Profile. The coach reads all four and can propose nutrition targets.
- Offline: verified with the network disabled (shell, all tabs, player).
- Accessibility (1.0.0): WCAG 2.1 AA contrast in every theme at every accent
  hue, no axe violations on any screen, keyboard focus kept inside dialogs,
  landmarks, reduced motion. Privacy note in Profile.
- Release engineering (1.0.0): security headers, 11 browser tests, axe and
  contrast checks in CI, changelog, README screenshot.

## Known gaps and next steps

1. Builder gaps: create interval sessions and supersets from scratch, edit
   warm-up/cool-down membership directly, multi-phase editing in one view,
   per-item progression rule and effort target, undo.
2. More plans: kettlebell-only, travel, powerlifting meet prep, swimming,
   cycling, postpartum return, more sports (needs analysis first).
3. Full exercise database import (free-exercise-db) with images and
   instructions, loaded on demand.
4. Coach follow-ups: automatic weekly review (opt-in), several saved
   conversations, effort setting per provider.
5. Module follow-ups: barcode scanning for food (BarcodeDetector where
   available), editing a logged food, meal templates, flagging meals outside
   the eating window, per-run pace splits and a map from GPX, TCX/FIT import,
   updating the 5 km time from a logged race automatically.
6. Readiness check, plate calculator, warm-up sets, per-exercise charts.
7. Supersets as a player mode; voice announcements (legacy app has them).
8. Accessibility follow-ups: a real VoiceOver and TalkBack session, 200 %
   text zoom, announcing timer milestones to screen readers.
9. Preferred training weekdays and reminders.
10. Legacy App-Sport backup importer.

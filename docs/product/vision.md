# Vision

## Goal

A person with no coding knowledge should be able to:

1. Click "Deploy" in the README (or fork and import into Vercel).
2. Open their new URL on a phone and add it to the home screen.
3. Answer a handful of questions.
4. Start a first workout from a plan that fits their goal, level and equipment.

Total time from repo to first set: a few minutes. No account, no database, no
environment variable, no file to edit.

## Principles

1. **Plug and play.** Zero configuration to get a working app.
2. **Programs are data.** One schema for built-in templates, user-built
   programs and AI-generated programs.
3. **Local-first and private.** Data stays on the device. Export is one tap.
4. **Fastest path to the first completed workout.** Onboarding is short and
   skippable; everything else can be configured later.
5. **Evidence-based by default, editable always.** Templates follow
   `docs/science/`, but every set, rep and exercise can be changed.
6. **Useful without AI.** The coach is an optional layer; the logging,
   progression and templates work on their own.
7. **Versatile.** Modules, themes and units adapt the app to the person.

## Who it serves

| Level | What they need from the app |
|---|---|
| Beginner | A plan chosen for them, exercise instructions, simple progression, small wins. |
| Intermediate | Progression suggestions, volume tracking, plateaus spotted, deloads. |
| Advanced / athlete | Full program builder, periodisation blocks, RPE/RIR, detailed history, export. |

## What existing products do (and where Banzir differs)

Self-hosted and open source
- **wger** — mature Django app with routines, nutrition (Open Food Facts) and
  an API. Needs Docker and a server. AGPL.
- **workout.cool** — open-source web app for building routines. Needs a
  database.
- **LiftTrace**, **Lyftr** — newer self-hosted trackers, Docker-based.

All of these need a server and a database. Banzir needs neither, which is what
makes one-click deployment possible.

Commercial
- **Hevy** — fast logging, plate calculator, RPE, CSV export, social feed,
  AI-assisted programming in the paid tier.
- **Strong** — minimal, fast logger. Often criticised for no social features.
- **Fitbod** — generates and adapts workouts from recent training data.

Recurring user wants across reviews: fast logging, previous values visible,
generous free tier, data export, some guidance on progression. Social and AI
programming divide opinion, so Banzir keeps AI optional and skips social.

Sources: see `docs/research-log.md` (section "Product research").

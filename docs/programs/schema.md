# Program schema (v1, implemented)

One schema for built-in templates, user programs and, later, AI-generated
programs. **The source of truth is `src/lib/schema.ts`** (Zod schemas and the
TypeScript types inferred from them). This document explains the model; change
both together.

## Model

```
Program
  goal, level, daysPerWeek, daysRange, sessionMinutes, loops
  progression (default rule), deloadEveryWeeks
  phases[]
    weeks
    days[]            DayTemplate
      kind, focus, notes
      blocks[]        warmup | main | superset | cooldown
        items[]       Item
          exerciseId, alternatives[], priority (1-3)
          prescription, restSeconds, cue, progression (override)
    rotation[]        order in which day ids are done
```

### Sessions, not weekdays

A program is not pinned to weekdays. The app counts completed sessions
(`ProgramState.completed`) and derives everything from that
(`src/lib/programState.ts`):

- week = `floor(completed / daysPerWeek)`
- phase = the phase containing that week (wrapping when `loops` is true)
- next day = `phase.rotation[sessionsInPhase % rotation.length]`

So an A/B program done three times a week alternates A-B-A, B-A-B; a missed
Monday shifts nothing; "repeat a week" is just moving `completed` back.
`daysRange` says how many weekly sessions the template still works with; the
matcher clamps the person's choice into it.

`loops: false` programs (for example the nine-week running plan) end; the
Today screen then offers to choose the next plan.

### Prescriptions

| mode | Fields | Logged as |
|---|---|---|
| `reps` | `sets`, `reps: [lo, hi]`, optional `target` effort | reps (and kg for loaded exercises) per set |
| `hold` | `sets`, `seconds: [lo, hi]` | seconds per set; a stopwatch can fill it |
| `time` | `seconds`, optional `target` | one countdown |
| `intervals` | `reps`, `segments[] { label, seconds, kind: work/rest }`, optional `target` | one sequence timer; work seconds are logged |

`target` effort is one of `rir`, `rpe`, `hrZone`, `pace`.

Some drills carry their own rep range (`Exercise.range`, for example pull-up
negatives 3-5). `rx(item)` in `src/data/exercises.ts` returns the prescription
as it should be done; every screen and the progression engine use it.

### Progression rules

| type | Behaviour (`src/lib/progression.ts`) |
|---|---|
| `linear` | All sets reach the top of the range → add `stepKg`. Two sessions below the bottom of the range at the same load → drop 10 %. |
| `double` | Add reps until every set reaches the top, then add `stepKg` and restart at the bottom. |
| `variation` | Bodyweight ladders: meet the top of the range in two sessions → offer the next exercise on the ladder. |
| `none` | Repeat. |

Holds progress in seconds the same way. An item rule overrides the program
default.

### Lighter weeks

`deloadEveryWeeks` makes the Today screen suggest a lighter week. If the
person accepts, `lighten(day)` halves the sets of reps and hold items for that
week. It is never applied automatically.

## Exercises

`src/data/exercises.ts` holds a curated library: every exercise the templates
use plus substitutes for each movement slot and equipment set.

```
Exercise
  id, name, slot, primary[], secondary[]
  equipment[]   every item is required; empty = none
  level, logType (weight_reps | reps | hold | time | distance)
  unilateral, cue, range
  ladder, step  position on a bodyweight progression ladder
```

Ladders in the library: `pushup`, `pullup`, `dip`, `hspu`, `row`, `squat`,
`bridge`.

Volume charts count 1 set for `primary` muscles and 0.5 for `secondary`.

## Fitting a template to a person (`src/lib/matcher.ts`)

1. For each item, pick the first usable option at the person's level: the
   template's exercise, then its `alternatives`. "Usable" means the equipment
   is available and the log type suits the prescription mode.
2. Otherwise step down the same ladder (pull-up → pull-up negative).
3. Otherwise take the best exercise in the same slot, then in a related slot
   (vertical ↔ horizontal pull, squat ↔ single-leg).
4. With the `variation` rule, ladder exercises start at the rung matching the
   reported push-up and pull-up ability.
5. Trim to the available time by dropping priority 3 items, then priority 2.
   Priority 1 items are never dropped for time.
6. Rank templates by goal, level, weekly sessions, equipment fit and session
   length. A health flag caps the level at beginner.

## Logged data

```
Session { id, date, programId, dayId, dayName, durationSeconds, entries[], effort, note }
Entry   { itemId, exerciseId, sets[] }
SetLog  { reps, kg, seconds, meters, rir, done }
```

Weights are always stored in kilograms and converted for display.

## Rules

- IDs are stable strings. Template item IDs are generated as
  `day.block.index.exerciseId` and must not change between versions, so
  history keeps matching.
- Templates are written with the small constructors in
  `src/data/templates/build.ts`; their output is plain data. A unit test
  validates every template and every instantiated program against the schema.
- A program must validate before it is saved, whatever its source (restore
  from backup already validates).

## Not implemented yet (from the first draft)

- `distance` prescriptions and pace targets from a stored 5 km time.
- Per-week overrides inside a phase (the running plan uses one phase per week
  instead).
- Percent-of-1RM loads and explicit `Load` objects (the engine suggests loads
  from history).
- Supersets and circuits as a player mode (the block type exists; items are
  shown one after another).
- A `sport` field, tags-based filtering, and program sharing by file or link.
- The full `yuhonas/free-exercise-db` import as a lazily loaded search index
  for the program builder.

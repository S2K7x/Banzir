# Template catalog

Specification of every built-in program. Each will become a JSON file in
`src/data/templates/` matching `schema.md`. Evidence for the choices is in
`docs/science/`. Notation: sets × reps (or seconds); RIR = reps in reserve.

Status: all 35 are implemented in `src/data/templates/` (2026-11-12), split
by family: `strength.ts`, `general.ts`, `skills.ts`, `bodyweight-running.ts`,
`running.ts`, `sport.ts`. Exercise lists name the default; the matcher
substitutes by movement slot, equipment and level. Where code and this
document differ, the code is current.

Differences from the specification below, decided while building:
- Running plans are prescribed in minutes, not kilometres, so they work at
  any pace and without GPS. Long runs follow the 10 % rule, which a unit test
  checks; every fourth week is lighter. Peak long runs: 5 km 50 min, 10 km
  75 min, half 105 min, marathon about 2 h 30 (148 min).
- Distance plans state a prerequisite in minutes of continuous running
  (5 km: 20, 10 km and half: 30, marathon: 60). The 5 km plan is tagged
  beginner, 10 km, half and marathon intermediate.
- `run-strength-addon` and `mob-daily` are standalone plans because add-ons
  are not implemented. `mob-daily` is never recommended first unless the
  person asks for mobility only.
- `str-4-block` is 3 + 1 lighter + 3 + 1 lighter + 3 + test week. Loads at
  each phase change are estimated from the best recent set (Epley).
- `str-4-undulating` trains each lift heavy once and for volume once; the two
  keep separate histories (history is matched by prescription).
- Sport plans are tagged beginner so everyone can get them; heavy lifts swap
  to bodyweight versions with 8-12 reps when there is no equipment.
- `cal-handstand` is a full 4-day plan (handstand practice opens every
  session), not a stackable add-on, because add-ons are not implemented.
- `cal-6-planche-os` converts the legacy distances to time: 4 x 4 min hard /
  2.5 min jog, 6 x 90 s fast / 75 s jog, 8 x 45 s uphill / 90 s jog, and a
  35 min zone-2 run with 4 strides. Each of the three weeks is its own phase,
  so the run cycle repeats every three weeks. The 5 km test and the optional
  evening handstand micro-doses are not included yet.
- Skill plans start at tuck planche / tuck front lever; anyone weaker or
  stronger changes the step from the exercise's progression ladder.

## Index

| ID | Name | Goal | Level | Days | Equipment |
|---|---|---|---|---|---|
| `gf-2-express` | Express full body | General fitness | Beginner | 2 | Any |
| `gf-3-start` | Start here | General fitness | Beginner | 3 | None / dumbbells |
| `gf-4-hybrid` | Strong and fit | General fitness | Intermediate | 4 | Gym or home |
| `gf-senior` | Strong for life | General fitness | Beginner 60+ | 2-3 | Minimal |
| `mus-3-fullbody` | Full body foundations | Muscle | Beginner | 3 | Gym |
| `mus-3-home` | Home dumbbell builder | Muscle | Beginner-Int | 3 | Dumbbells, bench |
| `mus-4-upperlower` | Upper / Lower | Muscle | Intermediate | 4 | Gym |
| `mus-5-ulppl` | Five-day hybrid split | Muscle | Intermediate | 5 | Gym |
| `mus-6-ppl` | Push Pull Legs | Muscle | Int-Advanced | 6 | Gym |
| `str-3-linear` | Strength basics | Strength | Beginner | 3 | Barbell |
| `str-4-undulating` | Strength builder | Strength | Intermediate | 4 | Barbell |
| `str-4-block` | Peak strength (12-week block) | Strength | Advanced | 4 | Barbell |
| `cal-3-foundation` | Calisthenics foundations | Calisthenics | Beginner | 3 | Bar (optional rings) |
| `cal-first-pullup` | First pull-up | Calisthenics | Beginner | 3 | Bar, band |
| `cal-4-intermediate` | Skills and strength | Calisthenics | Intermediate | 4 | Bar, parallettes/rings |
| `cal-handstand` | Handstand add-on | Calisthenics | Any | 4-6 short | Wall |
| `cal-planche` | Planche focus | Calisthenics | Int-Advanced | 4 | Parallettes, rings |
| `cal-frontlever` | Front lever focus | Calisthenics | Int-Advanced | 4 | Bar/rings |
| `cal-muscleup` | Muscle-up focus | Calisthenics | Intermediate | 3-4 | Bar/rings |
| `cal-6-planche-os` | Planche + HSPU + running (legacy) | Calisthenics | Advanced | 6 | Rings, parallettes |
| `run-start` | Start running (0 to 30 min) | Running | Beginner | 3 | None |
| `run-5k` | 5 km improver | Running | Beg-Int | 3-4 | None |
| `run-10k` | 10 km | Running | Intermediate | 4 | None |
| `run-half` | Half marathon | Running | Intermediate | 4-5 | None |
| `run-marathon` | Marathon | Running | Int-Advanced | 4-6 | None |
| `run-strength-addon` | Strength for runners | Running add-on | Any | 1-2 | Minimal |
| `fat-3-lift-walk` | Lean down: lift and walk | Fat loss | Beginner | 3 + steps | Any |
| `fat-4-mixed` | Lean down: lift and condition | Fat loss | Intermediate | 4 | Gym or home |
| `fat-home-lowimpact` | Low-impact start | Fat loss | Beginner, higher weight | 3 | None / bands |
| `spt-boxing` | Boxing support | Sport | Any | 2-3 | Gym, bag optional |
| `spt-tennis` | Tennis support | Sport | Any | 2-3 | Gym or bands |
| `spt-soccer` | Soccer support | Sport | Any | 2-3 | Gym or minimal |
| `spt-basketball` | Basketball support | Sport | Any | 2-3 | Gym |
| `spt-athlete-general` | General athlete | Sport | Any | 3 | Gym |
| `mob-daily` | Daily mobility add-on | Add-on | Any | 10 min | None |

Add-ons can be stacked on any program by the matcher (secondary goal).

---

## General fitness

### `gf-2-express`
Two full-body sessions, about 30 min. One hard set of 6-12 after one warm-up
set, 1-2 RIR. Squat pattern, push, row, hinge, overhead press or pull-down,
core carry. Double progression. Plus a weekly activity target of 150 min
moderate movement.

### `gf-3-start`
Three alternating full-body days (A/B), 35-45 min, first two weeks at 3-4 RIR.

| A | B |
|---|---|
| Goblet squat 3 × 8-12 | Split squat 3 × 8-12/side |
| Push-up (incline as needed) 3 × 6-12 | Dumbbell overhead press 3 × 8-12 |
| One-arm dumbbell row 3 × 8-12 | Band pull-down or inverted row 3 × 8-12 |
| Hip hinge / dumbbell RDL 2 × 10-12 | Glute bridge → hip thrust 2 × 10-15 |
| Plank 3 × 20-45 s | Dead bug 3 × 8/side |
| Brisk walk 10 min | Brisk walk 10 min |

Bodyweight-only variant swaps to squat, push-up ladder, towel/table row,
single-leg hip hinge. Step goal on off days.

### `gf-4-hybrid`
Upper strength, lower strength, easy cardio 30-45 min (zone 2), mixed day
(full-body circuit + intervals 6 × 1 min hard / 1 min easy). Meets WHO targets.

### `gf-senior`
Two or three sessions: sit-to-stand, step-up, wall or incline push-up, band
row, hip hinge, loaded carry, calf raise, balance drills (tandem stance,
single-leg stand), 1-3 × 8-12, fast intent on the way up. Daily walk.

---

## Muscle

Shared rules: 6-15 reps mostly, compounds 1-3 RIR, isolation 0-2 RIR, rest 2-3
min compounds and 60-90 s isolation, each muscle twice a week where possible,
double progression, deload suggestion every 5-7 weeks.

### `mus-3-fullbody` (about 9-11 weekly sets per muscle)

| A | B | C |
|---|---|---|
| Squat 3 × 6-10 | Romanian deadlift 3 × 8-10 | Leg press 3 × 10-12 |
| Bench press 3 × 6-10 | Overhead press 3 × 6-10 | Incline dumbbell press 3 × 8-12 |
| Lat pull-down 3 × 8-12 | Barbell or cable row 3 × 8-12 | Pull-up / assisted 3 × 6-10 |
| Leg curl 2 × 10-15 | Split squat 2 × 8-12 | Seated row 2 × 10-12 |
| Lateral raise 2 × 12-15 | Curl 2 × 10-12 | Triceps push-down 2 × 10-12 |
| Calf raise 2 × 10-15 | Plank 3 × 30-60 s | Hanging knee raise 3 × 8-12 |

### `mus-3-home`
Same structure with dumbbells and a bench: goblet squat, DB RDL, Bulgarian
split squat, DB bench/floor press, DB shoulder press, DB row, pull-up or band
pull-down, lateral raise, curls, overhead triceps extension, calf raise. When
dumbbells are light: slower tempo, pauses, higher reps (up to 20-30), unilateral
versions.

### `mus-4-upperlower` (about 12-16 weekly sets per muscle)

| Upper A | Lower A | Upper B | Lower B |
|---|---|---|---|
| Bench press 4 × 6-8 | Squat 4 × 6-8 | Overhead press 4 × 6-8 | Deadlift or RDL 3 × 6-8 |
| Barbell row 4 × 6-10 | RDL 3 × 8-10 | Pull-up 4 × 6-10 | Leg press 3 × 10-12 |
| Incline DB press 3 × 8-12 | Leg press 3 × 10-12 | DB bench 3 × 8-12 | Bulgarian split squat 3 × 8-12 |
| Lat pull-down 3 × 10-12 | Leg curl 3 × 10-15 | Cable row 3 × 10-12 | Leg extension 3 × 12-15 |
| Lateral raise 3 × 12-15 | Calf raise 3 × 10-15 | Rear delt fly 3 × 12-15 | Seated calf raise 3 × 12-15 |
| Triceps + curl superset 3 × 10-12 | Ab wheel / leg raise 3 × 8-12 | Incline curl + triceps 3 × 10-15 | Plank / cable crunch 3 sets |

### `mus-5-ulppl`
Upper, Lower, rest, Push, Pull, Legs. Upper/Lower heavier (6-10 reps),
Push/Pull/Legs lighter (10-15 reps).

### `mus-6-ppl` (about 14-20 weekly sets per muscle)
Push (bench, incline DB press, overhead press, lateral raise, triceps × 2),
Pull (pull-up, row, pull-down, rear delt, curl × 2), Legs (squat or leg press,
RDL, split squat, leg curl, leg extension, calves, abs), repeated with
variation: first half strength-biased (5-8 reps on the first lift), second half
volume-biased (10-15).

---

## Strength

### `str-3-linear`
Three days alternating A/B. A: squat 3 × 5, bench 3 × 5, row 3 × 5-8. B: squat
3 × 5, overhead press 3 × 5, deadlift 1-2 × 5, pull-ups 3 × max−2. Add load
every session (2.5-5 kg lower, 1-2.5 kg upper); after two failed sessions
reduce 10 %. Accessories 2 × 8-12 optional. Rest 3-5 min on main lifts.

### `str-4-undulating`
Upper/lower split, each main lift twice a week: one heavy day (4 × 3-5 at about
80-87 %, 2-3 RIR) and one volume day (4 × 6-8 at about 70-77 %). Weekly load
increases; accessories 2-3 × 8-12. Deload in week 5.

### `str-4-block`
Twelve weeks: accumulation (weeks 1-4, 4-5 × 6-8, 3 RIR), intensification
(5-8, 4-5 × 3-5, 2 RIR), realisation (9-11, 3-4 × 1-3, 1-2 RIR), test week 12.
Deloads at weeks 4 and 8. Uses estimated 1RM from the log.

---

## Calisthenics

Shared rules: skill work first, straight-arm holds stop before form breaks,
progress to the next variation after meeting the standard in two sessions,
pulling volume ≥ pushing volume, wrist and shoulder prep in every warm-up.

### `cal-3-foundation`
Three full-body days, 40-50 min.

| Slot | Work | Progression ladder |
|---|---|---|
| Warm-up | Wrists, shoulders, scapular pulls, 5 min wall handstand practice | — |
| Push | 3 × 5-12 | Push-up ladder |
| Pull | 3 × 5-10 | Pull-up ladder (rows on alternate days) |
| Legs | 3 × 8-12 | Squat ladder |
| Dip / pike push-up | 3 × 5-10 | Dip ladder / HSPU ladder |
| Hinge | 3 × 8-12 | Glute bridge → single-leg hip thrust → Nordic |
| Core | 3 × 20-45 s | Hollow hold, L-sit ladder |

Exit standard: foundations table in `docs/science/calisthenics.md`.

### `cal-first-pullup`
Three days: dead hangs 3 × 20-40 s, scapular pulls 3 × 8, negatives 4 × 3-5 (5 s
down), band-assisted pull-ups 3 × 5-8, inverted rows 3 × 8-12, plus push and
leg basics. Weekly test of one unassisted rep.

### `cal-4-intermediate`
Day 1 push + handstand, day 2 pull + front lever, day 3 legs + core, day 4
mixed skills. Example day 1: handstand 10 min, pike/wall HSPU 4 × 4-8, dips
4 × 6-10, pseudo planche push-up 3 × 6-10, tuck planche 5 × 6-10 s, lateral
raise or band work, wrist cool-down.

### `cal-handstand` (add-on)
5-10 min, 4-6 days a week: wrist prep, chest-to-wall holds (accumulate 60-120
s), balance drill (toe pulls / heel pulls), 5-10 freestanding attempts. Level
gates from the handstand ladder.

### `cal-planche`
Four days: two planche days 72 h apart (one heavy: holds at current and next
progression 5 × 5-10 s, pseudo planche push-ups, lean-to-tuck negatives, dips;
one volume: 60 s total hold time, pike/wall HSPU, ring push-ups), one pull day
(pull-ups, rows, front lever work, external rotation), one legs day. Phases
follow the ladder (lean → tuck → advanced tuck → straddle → full).

### `cal-frontlever`
Mirror of the planche plan: two lever days 72 h apart (holds 5 × 6-10 s, front
lever raises/negatives, tuck lever rows, weighted pull-ups), one push day, one
legs day; dragon flags and hollow work for the core.

### `cal-muscleup`
Explosive chest-to-bar pulls 4 × 3-5, false-grip hangs 4 × 10-15 s, transition
drills 3 × 3-5, slow negatives 3 × 3, straight-bar or ring dips 3 × 6-10, rows.
Prerequisite check in onboarding.

### `cal-6-planche-os`
The owner's programme from `App-Sport/MonAppTacking.md`, translated to English
and to the schema: A push strength, quality run (3-week interval cycle), B pull
+ muscle-up, C planche volume, easy zone-2 run, D legs + handstand, rest day
with a walk. Rest day and weekday mapping are editable.

---

## Running

Shared rules: about 80 % of time easy; long run never more than 10 % beyond
the longest run of the last 30 days; lighter week every fourth week; paces by
RPE/heart rate or from a recent 5 km time.

### `run-start` (9 weeks, 3 sessions)
5 min walk warm-up and cool-down every session.

| Week | Session (repeat 3×/week) |
|---|---|
| 1 | 8 × (1 min run / 1.5 min walk) |
| 2 | 6 × (1.5 min run / 2 min walk) |
| 3 | 2 × (1.5 min run, 1.5 walk, 3 run, 3 walk) |
| 4 | 3 min run, 1.5 walk, 5 run, 2.5 walk, 3 run, 1.5 walk, 5 run |
| 5 | 8 min run, 3 walk, 8 run |
| 6 | 12 min run, 2 walk, 10 run |
| 7 | 25 min continuous |
| 8 | 28 min continuous |
| 9 | 30 min continuous |

Follows the widely used nine-week run-walk structure with Banzir's own
progression in the middle weeks; any week can be repeated from the Program tab.

### `run-5k` (8 weeks)
Three runs: easy 25-40 min + strides; quality (alternating 5 × 3 min at RPE
8 with 2 min jog, and 20 min tempo); long 40-60 min. Optional fourth easy run.
5 km test in weeks 1 and 8.

### `run-10k` (10 weeks)
Four runs: easy, tempo (2 × 10 → 30 min continuous), intervals (5 × 1000 m or
4 × 4 min), long (8 → 14-16 km).

### `run-half` (12 weeks)
Four to five runs: two easy, tempo/threshold, long run building to 18-20 km
with race-pace segments in the last 5 weeks, optional intervals. Two-week taper.

### `run-marathon` (16-18 weeks)
Four to six runs: easy volume, medium-long run, threshold session, long run to
30-32 km with marathon-pace blocks, lighter weeks every fourth, three-week
taper. Fuel practice notes on long runs (30-60 g carbohydrate per hour).

### `run-strength-addon`
One or two 25-30 min sessions: split squat 3 × 6-8, RDL or hip thrust 3 × 6-8,
calf raise straight and bent knee 3 × 10-15, Nordic or hamstring bridge 2 ×
4-8, side plank 2 × 30 s, pogo jumps 2 × 15, skips.

---

## Fat loss

Shared rules: resistance training is the base (it protects muscle); daily step
goal; cardio as a tool, not punishment; nutrition module suggested with a
moderate deficit and protein 2.0 g/kg; target 0.5-1 % of body weight per week.

### `fat-3-lift-walk`
`gf-3-start` or `mus-3-fullbody` (by equipment) + step goal starting from the
person's current average + 2,000, towards 7,000-10,000.

### `fat-4-mixed`
Two full-body strength days, one interval day (for example 8 × 1 min hard / 1
min easy on any machine or hill), one easy cardio day 30-45 min. Step goal.

### `fat-home-lowimpact`
Three sessions of joint-friendly strength (sit-to-stand, incline push-up, band
row, hip bridge, step-up, carries) in circuits with rests, plus daily walking
in short bouts building to 30 min. No jumping; run-walk only later if wanted.

---

## Sport support

Shared structure: two strength/power days in season, three off season; each
session = warm-up with prevention work, power (jumps/throws) fresh, strength
(3-4 lifts), conditioning matched to the sport or left to practice.

### `spt-boxing`
- Day 1: trap-bar deadlift or squat 4 × 3-5, split squat 3 × 6-8, push-up/bench
  3 × 5-8, pull-up 3 × 5-8, rotational med-ball throw 4 × 4/side, neck and
  shoulder prehab.
- Day 2: jump squat or broad jump 4 × 3, landmine press 3 × 6/side, row 3 ×
  8, hip thrust 3 × 8, anti-rotation core, carries.
- Conditioning (optional third day): 6-8 rounds of 3 min / 1 min rest (bag,
  rope, shadow, bike); one easy aerobic session.

### `spt-tennis`
- Day 1: lateral bounds 3 × 5/side, split squat 3 × 6-8, RDL 3 × 6-8, one-arm
  row 3 × 8, rotational med-ball throw 3 × 5/side, external rotation 2 × 15.
- Day 2: split-step jumps, lateral lunge 3 × 8, hip thrust 3 × 8, pull-down
  3 × 8-10, overhead med-ball slam 3 × 6, anti-rotation press, wrist/forearm
  work, calf raises.
- Conditioning: 2-3 sets of 8 × (10 s hard movement / 20 s rest).

### `spt-soccer`
- Warm-up (every session and before practice): running drills, balance,
  squats/lunges, Nordic curl 2-3 × 4-8, Copenhagen plank 2 × 15-20 s, jumps,
  cuts.
- Day 1: squat or split squat 3-4 × 4-6, hip thrust 3 × 6-8, calf raise, core.
- Day 2: sprints 6 × 20-30 m full rest, RDL 3 × 6, single-leg work, upper body
  push/pull 3 × 6-10.
- Conditioning (off-season): 4 × 4 min at RPE 8-9 with 3 min easy, or 2 × 8
  min of 15 s on / 15 s off.

### `spt-basketball`
Landing mechanics and jumps (box jump, depth drop → depth jump progression),
squat 4 × 4-6, RDL, split squat, calf and patellar-tendon loading (slow heavy
or isometric), upper push/pull, ankle balance, repeated-sprint conditioning
(10 × 15 s / 30 s).

### `spt-athlete-general`
Three days for any field or court sport: day 1 lower strength + sprints, day 2
upper strength + throws, day 3 full-body power + conditioning.

---

## Add-on

### `mob-daily`
Ten minutes: hips (90/90, couch stretch), thoracic rotation, shoulders (wall
slides, hang), ankles, hamstrings. Holds 30-60 s; after training or on rest
days, not before heavy lifting.

---

## To specify later

Kettlebell-only program, travel/hotel program, powerlifting meet prep,
swimming and cycling plans, postpartum return, programs for more sports
(needs analysis first in `docs/science/sport-specific.md`).

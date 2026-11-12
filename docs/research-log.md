# Research log

Dated record of what was researched, where it was written down, and what
could not be verified. Add an entry whenever new research is done.

## 2026-11-12 — initial research

### Method and limits

- Web search summaries plus a few direct page reads. Most "verified" items
  were confirmed from abstracts or official summaries, not full texts.
- The working sandbox blocks many hosts. Could not open:
  `blog.kowalczyk.info`, `api.openai.com`, `openrouter.ai`, `api.groq.com`,
  `api.mistral.ai` (connection refused by the network policy).
- Several numbers in `docs/science/` come from model knowledge and are tagged
  `[recall]`. Verify them before they appear in the app as facts.

### Product research → `docs/product/`

Findings
- Open-source trackers (wger, workout.cool, LiftTrace, Lyftr) all need a
  server and database.
- Commercial apps: users value fast logging, visible previous values, export,
  progression guidance.
- Onboarding: median about 5 quiz screens; fastest path to first workout.
- Storage: Safari seven-day eviction unless installed; IndexedDB over
  localStorage.
- Vercel Deploy button clones and deploys a repository.
- Theming: semantic tokens, `data-theme`, OKLCH, `color-mix()`.
- Exercise data: `yuhonas/free-exercise-db` is public domain (Unlicense), 800+
  exercises, images referenced by relative path.

Sources
- https://selfhostyourself.com/alternative-to/strong-workout-tracker
- https://alternativeto.net/software/lifttrace/about/
- https://setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026
- https://fitbod.me/blog/best-workout-tracker-apps-for-2026/
- https://www.lazyweb.com/research/how-many-quiz-questions-health-fitness-apps
- https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0
- https://www.appalize.com/blog/app-marketing/mobile-app-onboarding-best-practices-that-reduce-churn
- https://web.dev/articles/storage-for-the-web
- https://developer.apple.com/forums/thread/710157
- https://vercel.com/docs/deploy-button/source
- https://web.dev/articles/baseline-in-action-color-theme
- https://github.com/yuhonas/free-exercise-db

### AI → `docs/product/ai-coach.md`, `architecture.md`

Findings
- Anthropic API accepts browser requests with the
  `anthropic-dangerous-direct-browser-access` header; preflight tested from the
  sandbox returned `access-control-allow-origin: *`.
- OpenRouter reported browser-friendly; OpenAI and Gemini reports conflict.
- Memory patterns: core / recall / archival (Letta), retrieve-reason-write
  (Mem0); design forgetting deliberately.

Sources
- https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access
- https://tools.simonwillison.net/cors-chat
- https://discuss.ai.google.dev/t/gemini-api-cors-error-with-openai-compatability/58619
- https://community.openai.com/t/has-the-cors-policy-changed-responses-api/1372791
- https://mem0.ai/blog/how-to-create-ai-agents-with-long-term-memory
- https://mcp.directory/blog/mem0-vs-letta-vs-zep-vs-cognee-2026

Open
- Test direct browser calls to OpenAI, Gemini (native and OpenAI-compatible)
  and OpenRouter from a real browser; decide per provider whether the relay is
  needed.

### Design → `docs/product/design.md`

- Three reference designs supplied by the owner, described in words.
- Not stored in the repo (third-party work).

### Training science → `docs/science/`

Topics covered: general principles, hypertrophy, strength, calisthenics
skills, running, nutrition and fat loss, sport support (boxing, tennis,
soccer, basketball, grappling), special populations and safety. Sources are
listed at the end of each file.

Open items to verify (currently `[recall]` or `[secondary]`)
- WHO 2020 activity guideline wording.
- Schoenfeld 2017 low- vs high-load hypertrophy result (primary paper).
- Protein upper bound 2.2 g/kg (Morton 2018 CI) and 2.3-3.1 g/kg FFM in a
  deficit (Helms 2014).
- Rate-of-gain recommendation (Slater 2019) and rate-of-loss (Helms 2014).
- Carbohydrate bands (Burke 2011), creatine and caffeine doses (ISSN stands).
- HIIT vs steady-state fat loss equivalence.
- Minimal-dose strength training (Iversen 2021).
- Soccer match running demands.
- Copenhagen adduction and groin injury evidence.
- Plyometric contact-count guidance for beginners.
- Hold-time standards for calisthenics (coaching sources; check Overcoming
  Gravity).
- Taper and pace-equivalence formulas for running.

Not yet researched
- Swimming, cycling, climbing and other sports.
- Mobility/flexibility training evidence in depth.
- Behaviour change and habit formation for adherence (streaks, reminders).
- Kettlebell-only and travel programs.
- Postpartum return to training.

### Legacy app review → `docs/product/features.md`

Read `S2K7x/App-Sport` (`index.html`, `MonAppTacking.md`, `manifest.json`,
`sw.js`). Feature inventory and platform limits recorded.

## 2026-11-12 — build session: verification pass and engineering findings

### Science claims re-checked → tags upgraded in `docs/science/`

| Claim | Result | Source |
|---|---|---|
| WHO 2020: 150-300 min moderate or 75-150 min vigorous per week | Verified (abstract). The "2 or more days" strength frequency was not in the abstract; still recall. | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7719906/ |
| Low vs high load: similar growth, heavier better for 1RM | Verified (abstract): 21 studies, sets to failure, split at 60 % 1RM. | https://pubmed.ncbi.nlm.nih.gov/28834797/ |
| Fat loss at 0.5-1 % body weight per week; protein 2.3-3.1 g/kg lean mass in a deficit; fat 15-30 % of calories | Verified (abstract). Written for lean bodybuilders; protein is per kg of lean mass. | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4033492/ |
| Carbohydrate bands 3-5 / 5-7 / 6-10 / 8-12 g/kg | Secondary: reproduced in later tables; sources adapt the bands slightly differently. | https://pmc.ncbi.nlm.nih.gov/articles/PMC6950062/table/nutrients-11-03017-t002 |
| Creatine 3-5 g/day; loading about 20 g/day for 5-7 days | Secondary (not from the stand's own text). | https://pubmed.ncbi.nlm.nih.gov/28615996/ |
| Caffeine 3-6 mg/kg | Dose still unverified; timing "60 min before" is secondary. | https://pmc.ncbi.nlm.nih.gov/articles/PMC7777221 |
| Minimal-dose training | Verified (abstract): at least 4 weekly sets per muscle at 6-15 RM, multi-joint lifts, supersets/drop sets halve time. | https://pubmed.ncbi.nlm.nih.gov/34125411/ |
| Max heart rate = 208 − 0.7 × age | Verified (Tanaka 2001). Large individual error. | https://webs.um.es/jlyuste/documts/tanaka.pdf |
| Epley 1RM estimate | Secondary: fine to about 10 reps, error can exceed 10 %. No authoritative validation found. | https://www.topendsports.com/testing/calculators/1repmax.htm |
| Copenhagen adduction prevents groin problems | Verified (abstract): 41 % lower risk, OR 0.59, 35 teams. | https://researchprofiles.ku.dk/da/publications/the-adductor-strengthening-programme-prevents-groin-problems-amon/ |
| Soccer running demands | High-speed 618-1,001 m and sprint 153-295 m per match verified (abstract). Total distance 10-12 km still recall. | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9968809/ |
| Intervals vs steady cardio for fat loss | Verified (abstracts): no meaningful difference (Keating 2017; Steele 2021). Viana 2019 claimed an interval advantage and is disputed. | https://read.qxmd.com/read/28513103 ; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8619923/ |

Still open from the earlier list: WHO strength frequency wording, rate-of-gain
recommendation (Slater 2019), caffeine dose, soccer total distance,
plyometric contact counts, calisthenics hold standards (Overcoming Gravity),
taper and pace-equivalence formulas.

### Coaching decisions made while building (not from new research)

- The basic barbell lifts (squat, bench, deadlift, press, row, RDL, hip
  thrust) are tagged beginner so novice barbell programs keep them. Pull-ups
  are intermediate: a beginner gets the lat pull-down, or pull-up negatives
  when only a bar is available, unless they report 5 or more pull-ups.
- Negatives and scapular drills carry their own rep range (3-5, 8-12), so a
  program's 5-10 range is not applied to them.
- The running plan's weeks 5 and 6 use Banzir's own steps (8/3/8 min, then
  12/2/10 min) between the run-walk weeks and 25 minutes continuous.
- First-session guidance is "pick a load you could lift about top-of-range + 2
  times", consistent with the 2-4 reps-in-reserve start for beginners.

### Engineering findings

- Tool versions used: Vite 8, React 19, Dexie 4, Zod 4, vite-plugin-pwa 2,
  Vitest 5, TypeScript 7. All worked together without configuration issues.
- `window.scrollTo()` returns a promise in the Chromium used for testing;
  returning it from a React effect throws "x is not a function" on cleanup.
- Zod 4 adds about 27 kB gzipped; it is now loaded only when restoring a
  backup.
- `raw.githubusercontent.com` is reachable from the build sandbox, so the
  free-exercise-db import script can be written and run here.
- A newly erased or new device had no way to restore a backup; the welcome
  screen now offers it.
- Not yet tested on a real iPhone or Android device: install flow, wake lock,
  audio beeps after screen lock, share-sheet backup.

## 2026-11-12 — builder and calisthenics plans

No new web research in this step; the plans apply
`docs/science/calisthenics.md` and the legacy programme.

Coaching decisions
- Skill plans put the skill first in the session, hold 5-10 s (strength day)
  or about 60 s in total (volume day), and leave about 72 h between the two
  days for the same skill.
- Every planche plan has a pulling day with rows and external rotation, and
  every front lever or muscle-up plan has pushing work.
- A beginner who asks for planche, front lever or muscle-up is started on
  foundations; the skill plan stays in the list of other plans.
- The pseudo planche push-up is tagged intermediate (the lean is scalable),
  so planche plans keep it for intermediates.
- Someone reporting 30+ push-ups or 12+ pull-ups is not capped by those
  numbers; someone reporting fewer is.
- A plan's named drill is kept even when demanding if nothing easier exists
  on its ladder (muscle-up negatives), instead of being replaced by an
  unrelated exercise from the same slot.
- Rings count as a pull-up bar.

Open questions for a later research pass
- Hold-time and rep standards for each ladder step (currently coaching
  convention; check Overcoming Gravity).
- Time equivalents chosen for the legacy distance intervals.
- Whether a handstand micro-dose add-on on run days is worth modelling.

Engineering findings
- Text that lives in an input's value is not in `innerText`; browser checks
  must read input values.
- Lazy-loaded tabs and live queries need an explicit wait in browser tests.

## 2026-11-12 — remaining 20 plans

No new web research; the plans apply the existing `docs/science/` files.

Coaching decisions
- Runs in minutes, long runs within 10 % of the longest of the previous four
  weeks (Frandsen 2025), every fourth week lighter, 75 %+ of running time
  easy. Both rules are unit tests over every distance plan.
- Prerequisites in minutes of continuous running: 5 km 20, 10 km 30, half
  30, marathon 60. Someone below is recommended the plan before it.
- The Nordic curl is tagged beginner with a partial-range cue: injury
  prevention programmes in amateur football use it at all levels, so it must
  not be swapped away for beginners.
- Senior plan: sit-to-stand with fast intent, balance holds next to a
  support, carries, daily walk (NSCA older adults position). Pike push-ups
  are never substituted in.
- Low-impact plan: no jumps; recommended first for a BMI of 30 or more or a
  joint flag.
- Strength block: 3 + 1 lighter + 3 + 1 lighter + 3 + test week; heavy and
  volume work keep separate histories; phase changes start from an Epley
  estimate.
- A heavy lift that becomes a bodyweight exercise moves to 8-12 reps.

Engineering findings
- Weekly-phase plans broke when the person chose a different number of
  sessions (Planche OS with 5 days never reached its sixth session). Such
  plans now have a fixed session count, enforced by a test.
- Moving ranking out of the matcher and lazy-loading onboarding cut the main
  bundle from 97 kB to 77 kB gzipped.

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

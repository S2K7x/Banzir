# AI coach

## As built (2026-11-12)

Code: `src/lib/coach/` (types, providers, tools, prompt, agent, store, draft)
and `src/features/coach/` (Coach, Setup, Markdown). Relay: `api/llm.ts`.
Tests: `src/lib/coach/coach.test.ts`.

Decisions that differ from or refine the design below:
- **Two wire formats, not three.** Claude uses the official
  `@anthropic-ai/sdk` from the browser (`dangerouslyAllowBrowser`, which sends
  the direct-browser-access header). Everything else, Gemini included, uses
  the OpenAI-compatible chat completions format. Gemini goes through its
  OpenAI-compatible endpoint; its thought signatures arrive as extra fields
  on tool calls and are replayed unchanged.
- **Transport.** Claude and OpenRouter are called directly. OpenAI, Gemini,
  Groq and Mistral block browser calls, so they go through `/api/llm`, a
  Vercel function that forwards to an allow-list of hosts and paths, streams
  the answer back and stores nothing. The same handler is mounted in
  `vite dev` and `vite preview`. "Other (OpenAI-compatible)" (Ollama, LM
  Studio) is called directly at the address the person enters.
- **Models.** Claude defaults to `claude-opus-5-5`; for other providers the
  model list is fetched from the provider after the key is entered, so no
  model names are hard-coded.
- **Claude request shape.** Streaming via `client.beta.messages.stream`,
  `max_tokens` 32000, `output_config.effort: "medium"` on current models,
  server-side refusal fallbacks (`fallbacks: "default"`, beta
  `server-side-fallback-2026-07-01`) on Opus 5 / 5.5, Fable 5.1 / 5.2 and
  Sonnet 5.5, `eager_input_streaming` on every tool with Zod validation of
  every input before it runs, prompt caching on the system prompt plus
  top-level automatic caching.
- **Frozen prefix.** Current Claude models bind thinking blocks to the
  exact conversation prefix (system prompt, tools, earlier messages). So the
  system prompt and tool set are frozen per conversation (`PROMPT_VERSION`),
  assistant turns are replayed as the provider returned them, and changing
  context (date, profile, plan position, memory, decisions on proposals) is
  appended to the next user message as an `<app_context>` block only when it
  changed. Bump `PROMPT_VERSION` / `TOOLS_VERSION` when the prompt or tools
  change: running conversations then continue without their thinking blocks.
- **Summary.** When the history sent per turn passes about 60,000 characters,
  older turns are summarised by the model into bullet points, the last four
  exchanges are kept, and kept turns are replayed without thinking blocks
  (allowed by the API). The full history stays visible in the app.
- **Memory.** Notes (max 60, 300 characters each) in `kv` `coach.memory`,
  listed in Coach settings with delete and "Forget everything". Saved by the
  model with `save_memory`; shown in the context with their ids.
- **Proposals.** `propose_program_change` (swap, ladder step everywhere,
  sets/reps/hold/duration/rest, add, remove, rename day),
  `propose_new_program`, `propose_plan_switch`, `propose_lighter_week`. Each
  is validated when proposed (the model gets a readable error to correct)
  and re-applied against the current plan on acceptance. The decision is
  told to the model with the next message.
- **Read tools.** `get_profile`, `get_program` (with item and day ids),
  `get_recent_sessions`, `get_exercise_history`, `get_stats`,
  `search_exercises`, `list_plans`, and (when the modules are on)
  `get_body_weight`, `get_nutrition`, `get_runs` and `get_fasting`.
  `propose_nutrition_targets` goes through the same safety rules as the
  Food tab. `get_fasting` refuses for people fasting is not offered to.
  The context block carries one line per module that is on. Tools version
  `t3`, prompt version `p2` (adds fasting and heart-rate evidence).
- **Key handling.** Stored in `kv` `coach.config` on the device; always
  stripped from backup files (no opt-in). "Disconnect" removes it.
- **Entry points.** Coach tab; "Ask your coach" on Today; "Review it with
  the coach" after a workout (pre-fills a question, does not send it).
- **Not built yet.** Automatic post-workout and weekly reviews (they would
  spend the person's credit without a tap), a per-provider effort or
  thinking-display setting, multiple saved conversations.

---

Optional. The user brings their own key. Without a key the tab explains what
the coach does and how to get a key from each provider.

## Providers

Three wire formats cover every provider the owner named:

| Adapter | Providers |
|---|---|
| OpenAI-compatible chat completions | OpenAI, OpenRouter, Groq, Mistral, Together, local Ollama / LM Studio, any custom base URL |
| Anthropic Messages | Claude models |
| Gemini native | Google AI Studio keys |

One internal interface: `chat({ messages, tools, stream })` returning text
deltas and tool calls. Each adapter maps tool definitions and tool results to
its format. Settings: provider, key, model (free text with suggestions),
optional base URL, "Test connection" button.

Transport: see "AI relay" in `architecture.md`.

Key handling: stored only in IndexedDB on the device, never in the export file
unless the user ticks "include API key", never sent anywhere except the chosen
provider (directly or through the user's own relay).

## What the coach can do

Tools (function calling). Read tools run freely; write tools produce a
proposal the user must accept.

Read
- `get_profile()` — goal, level, equipment, schedule, limits.
- `get_program()` — active program.
- `get_recent_sessions(n | dateRange)` — logged workouts with sets, RPE, notes.
- `get_exercise_history(exerciseId, n)` — progression for one exercise.
- `get_stats(range)` — weekly volume per muscle, adherence, records, body
  weight trend, running volume.
- `search_exercises(query, filters)` — the library, respecting equipment.
- `get_nutrition_summary(range)` — if the module is on.

Write (always shown as a card with Accept / Edit / Dismiss)
- `propose_program_change(patch)` — swap, add, remove, change sets/reps.
- `propose_new_program(program)` — a full program in the schema.
- `propose_deload(week)`.
- `save_memory(note)` / `forget_memory(id)` — visible in Settings → Coach
  memory; saved silently but always listed and editable.
- `set_goal(goal, target, date)`.

All program output is validated with the same Zod schema as templates. On
validation failure the error is returned to the model once for a retry.

Proactive moments (only when a key is set and the user enabled them)
- Post-workout check-in: two lines on what went well and one suggestion.
- Weekly review: adherence, volume, records, one proposed change.
- Plateau or missed-sessions nudge.

## Memory design

Three layers, modelled on the core / recall / archival split used by Letta
(MemGPT) and the retrieve-reason-write loop described by Mem0 `[secondary]`.

1. **Core memory (always in the prompt, ~1-2k tokens).**
   The profile plus "coach notes": durable facts such as goals, injuries,
   preferences, what worked and what did not. The model edits it through
   `save_memory` / `forget_memory`. The user can read and edit every line.
2. **Structured recall (queried on demand).**
   The workout log, body log and program are the real long-term memory. The
   model reads them through tools, so no vector database is needed and nothing
   is hallucinated from stale summaries.
3. **Conversation summary (rolling).**
   When a chat grows past a token budget, older turns are summarised into a
   few bullet points stored in `coachMemory`; the last few turns stay
   verbatim. Past chats remain browsable.

Rules
- Write memory when a stable fact appears (an injury, a preference, a
  decision), not for one-off details.
- Each memory has a date and source chat; newer facts replace older
  conflicting ones.
- "Forget" is a first-class action. The user can wipe all memory.

## System prompt outline

- Role: a knowledgeable, encouraging, honest coach for this one person.
- Ground rules: use tools for facts about the user; never invent logged data;
  say when evidence is weak; small changes over rewrites; ask before changing
  the program.
- Evidence rules: follow `docs/science/` summaries (a condensed version is
  shipped in the prompt).
- Safety rules (below).
- Core memory block, today's date, units.

## Safety

- Not a medical professional. For pain that is sharp, persistent, or involves
  numbness, chest pain, dizziness or fainting: advise stopping and seeing a
  professional. Do not diagnose.
- No extreme diets, no rapid weight-cut protocols, no advice below safe energy
  intake; watch for signs of low energy availability (see
  `docs/science/nutrition-fat-loss.md`).
- No drug or prohibited-substance guidance.
- Minors: conservative guidance, encourage supervision.
- Program changes are proposals; nothing is applied without the user's tap.

## Cost and privacy notes for users

Shown in the coach setup screen: the key is yours, usage is billed by your
provider, your training data is sent to that provider when you chat, nothing
is sent to the Banzir authors.

Sources: see `docs/research-log.md` (section "AI").

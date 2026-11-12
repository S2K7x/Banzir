# AI coach

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

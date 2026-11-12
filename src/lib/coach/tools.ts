import { z } from 'zod';
import { EXERCISES, findExercise, getExercise, rx } from '../../data/exercises';
import { getTemplate } from '../../data/templates';
import { activateProgram, db, getState, saveProgram, setState } from '../db';
import { addDay, addItem, blankProgram, removeItem, renameDay, replaceExercise, setExercise, updateItem } from '../edit';
import { GOALS, SLOTS } from '../constants';
import { canDo, equipmentSet, instantiate, uid } from '../matcher';
import { position } from '../programState';
import { e1rm, historyFor } from '../progression';
import { rankTemplates } from '../ranking';
import { Program as ProgramSchema, type Item, type Prescription, type Profile, type Program, type Session } from '../schema';
import { muscleSets, records, sessionsInWeek, weekStreak, weeklyCounts } from '../stats';
import { describe as describeRx } from '../text';
import { addDays, dayKey, trend } from '../body';
import { getNutritionSettings, saveNutritionSettings, targets as nutritionTargets, totals, type NutritionSettings } from '../nutrition';
import { getSettings } from '../settings';
import { addMemory, removeMemory } from './store';
import type { Proposal, ToolResult, ToolSpec } from './types';

/**
 * The coach's tools. Read tools answer from the training log on this device.
 * Write tools never change the plan directly: they validate the change now and
 * return a proposal the person accepts or dismisses. Memory notes are saved
 * straight away but are always visible and removable in the coach settings.
 */

type Data = { profile: Profile | undefined; program: Program | undefined; sessions: Session[] };

async function load(): Promise<Data> {
  const [profile, state, sessions] = await Promise.all([db.profile.get('me'), getState(), db.sessions.orderBy('date').toArray()]);
  const program = state ? await db.programs.get(state.programId) : undefined;
  return { profile, program, sessions };
}

const roundKg = (kg: number) => Math.round(kg * 10) / 10;

function setText(ex: ReturnType<typeof getExercise>, s: Session['entries'][number]['sets'][number]): string {
  if (ex.logType === 'weight_reps') return `${s.kg ?? 0}kg×${s.reps ?? 0}`;
  if (s.reps != null) return `${s.reps}`;
  return `${s.seconds ?? 0}s`;
}

function itemsOf(program: Program): { item: Item; dayId: string; dayName: string }[] {
  return program.phases.flatMap((ph) => ph.days.flatMap((d) => d.blocks.flatMap((b) => b.items.map((item) => ({ item, dayId: d.id, dayName: d.name })))));
}

/* ---------- Prescription changes shared by the write tools ---------- */

const Dose = z.object({
  sets: z.number().int().min(1).max(12).optional(),
  repsMin: z.number().int().min(1).max(100).optional(),
  repsMax: z.number().int().min(1).max(100).optional(),
  holdMin: z.number().int().min(3).max(600).optional().describe('Seconds, for holds such as planks.'),
  holdMax: z.number().int().min(3).max(600).optional(),
  minutes: z.number().min(1).max(300).optional().describe('For timed work such as a run.'),
  restSeconds: z.number().int().min(0).max(600).optional(),
});
type Dose = z.infer<typeof Dose>;

function applyDose(p: Prescription, d: Dose): Prescription {
  if (p.mode === 'reps') {
    const lo = d.repsMin ?? p.reps[0];
    const hi = Math.max(lo, d.repsMax ?? (d.repsMin != null ? Math.max(d.repsMin, p.reps[1]) : p.reps[1]));
    return { ...p, sets: d.sets ?? p.sets, reps: [lo, hi] };
  }
  if (p.mode === 'hold') {
    const lo = d.holdMin ?? p.seconds[0];
    const hi = Math.max(lo, d.holdMax ?? p.seconds[1]);
    return { ...p, sets: d.sets ?? p.sets, seconds: [lo, hi] };
  }
  if (p.mode === 'time') return { ...p, seconds: d.minutes != null ? Math.round(d.minutes * 60) : p.seconds };
  return p;
}

const ChangeOp = z.discriminatedUnion('op', [
  z.object({ op: z.literal('swap_exercise'), itemId: z.string(), exerciseId: z.string(), everywhere: z.boolean().optional().describe('Change every use of the exercise in the plan, for example a step on a progression ladder.') }),
  z.object({ op: z.literal('set_dose'), itemId: z.string() }).extend(Dose.shape),
  z.object({ op: z.literal('add_exercise'), dayId: z.string(), exerciseId: z.string() }).extend(Dose.shape),
  z.object({ op: z.literal('remove_exercise'), itemId: z.string() }),
  z.object({ op: z.literal('rename_day'), dayId: z.string(), name: z.string().min(1).max(60) }),
]);
type ChangeOp = z.infer<typeof ChangeOp>;

/** Applies plan changes, throwing a readable error the model can correct. Returns the new plan and a line per change. */
export function applyChanges(program: Program, ops: ChangeOp[]): { program: Program; lines: string[] } {
  let p = program;
  const lines: string[] = [];
  const findItem = (itemId: string) => {
    const hit = itemsOf(p).find((x) => x.item.id === itemId);
    if (!hit) throw new Error(`No exercise with itemId "${itemId}" in the plan. Call get_program for the ids.`);
    return hit;
  };
  const exercise = (id: string) => {
    const ex = findExercise(id);
    if (!ex) throw new Error(`Unknown exerciseId "${id}". Use search_exercises to find valid ids.`);
    return ex;
  };
  for (const op of ops) {
    if (op.op === 'swap_exercise') {
      const { item, dayName } = findItem(op.itemId);
      const ex = exercise(op.exerciseId);
      const from = getExercise(item.exerciseId).name;
      p = op.everywhere ? replaceExercise(p, item.exerciseId, ex.id) : setExercise(p, item.id, ex.id);
      lines.push(`${from} → ${ex.name}${op.everywhere ? ' (everywhere in the plan)' : ` (${dayName})`}`);
    } else if (op.op === 'set_dose') {
      const { item, dayName } = findItem(op.itemId);
      const before = describeRx(rx(item));
      const prescription = applyDose(item.prescription, op);
      p = updateItem(p, item.id, { prescription, ...(op.restSeconds != null ? { restSeconds: op.restSeconds } : {}) });
      const after = describeRx(rx({ ...item, prescription }));
      lines.push(`${getExercise(item.exerciseId).name} (${dayName}): ${before} → ${after}${op.restSeconds != null ? `, rest ${op.restSeconds} s` : ''}`);
    } else if (op.op === 'add_exercise') {
      const ex = exercise(op.exerciseId);
      const day = p.phases.flatMap((ph) => ph.days).find((d) => d.id === op.dayId);
      if (!day) throw new Error(`No day with dayId "${op.dayId}". Call get_program for the ids.`);
      const before = new Set(itemsOf(p).map((x) => x.item.id));
      p = addItem(p, op.dayId, ex);
      const added = itemsOf(p).find((x) => !before.has(x.item.id))!.item;
      p = updateItem(p, added.id, { prescription: applyDose(added.prescription, op), ...(op.restSeconds != null ? { restSeconds: op.restSeconds } : {}) });
      const now = itemsOf(p).find((x) => x.item.id === added.id)!.item;
      lines.push(`Add ${ex.name} ${describeRx(rx(now))} to ${day.name}`);
    } else if (op.op === 'remove_exercise') {
      const { item, dayName } = findItem(op.itemId);
      p = removeItem(p, item.id);
      lines.push(`Remove ${getExercise(item.exerciseId).name} from ${dayName}`);
    } else {
      const day = p.phases.flatMap((ph) => ph.days).find((d) => d.id === op.dayId);
      if (!day) throw new Error(`No day with dayId "${op.dayId}".`);
      p = renameDay(p, op.dayId, op.name);
      lines.push(`Rename ${day.name} to ${op.name}`);
    }
  }
  const check = ProgramSchema.safeParse(p);
  if (!check.success) throw new Error(`The changed plan is not valid: ${check.error.issues[0]?.message ?? 'unknown problem'}.`);
  return { program: check.data, lines };
}

const NewProgram = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(300).optional(),
  goal: z.enum(GOALS),
  daysPerWeek: z.number().int().min(1).max(7),
  days: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        exercises: z.array(z.object({ exerciseId: z.string() }).extend(Dose.shape)).min(1).max(14),
      }),
    )
    .min(1)
    .max(7),
});

export function buildProgram(input: z.infer<typeof NewProgram>, profile: Profile | undefined): { program: Program; lines: string[] } {
  let p = blankProgram(input.name, input.goal, input.daysPerWeek);
  p = { ...p, source: 'coach', level: profile?.level ?? 'beginner', description: input.description || 'Built with your coach.' };
  const phaseId = p.phases[0].id;
  const lines: string[] = [];
  input.days.forEach((d, i) => {
    if (i > 0) p = addDay(p, phaseId, d.name);
    const day = p.phases[0].days[i];
    p = renameDay(p, day.id, d.name);
    for (const e of d.exercises) {
      const ex = findExercise(e.exerciseId);
      if (!ex) throw new Error(`Unknown exerciseId "${e.exerciseId}". Use search_exercises to find valid ids.`);
      const before = new Set(itemsOf(p).map((x) => x.item.id));
      p = addItem(p, day.id, ex);
      const added = itemsOf(p).find((x) => !before.has(x.item.id))!.item;
      p = updateItem(p, added.id, { prescription: applyDose(added.prescription, e), ...(e.restSeconds != null ? { restSeconds: e.restSeconds } : {}) });
    }
    const built = p.phases[0].days[i];
    lines.push(`${d.name}: ${built.blocks.flatMap((b) => b.items).map((it) => `${getExercise(it.exerciseId).name} ${describeRx(rx(it))}`).join(', ')}`);
  });
  const check = ProgramSchema.safeParse(p);
  if (!check.success) throw new Error(`The plan is not valid: ${check.error.issues[0]?.message ?? 'unknown problem'}.`);
  return { program: check.data, lines };
}

/* ---------- Tool definitions ---------- */

type Ctx = { proposals: Proposal[] };
type Def<S extends z.ZodType> = { name: string; description: string; input: S; run: (input: z.infer<S>, ctx: Ctx) => Promise<unknown> };
const def = <S extends z.ZodType>(d: Def<S>) => d;

const empty = z.object({});

const TOOLS = [
  def({
    name: 'get_profile',
    description: 'The person: goal, focus, level, schedule, equipment, body data, health flags and reported ability.',
    input: empty,
    run: async () => {
      const { profile } = await load();
      return profile ?? { note: 'No profile yet.' };
    },
  }),
  def({
    name: 'get_program',
    description: 'The active plan: where the person is in it, and every day of the current phase with dayId, itemId, exerciseId and prescription. Use these ids for proposals.',
    input: empty,
    run: async () => {
      const { program } = await load();
      const state = await getState();
      if (!program || !state) return { note: 'No active plan.' };
      const pos = position(program, state.completed);
      return {
        name: program.name,
        goal: program.goal,
        level: program.level,
        source: program.source,
        daysPerWeek: program.daysPerWeek,
        week: pos.week + 1,
        totalWeeks: program.loops ? 'repeats' : pos.totalWeeks,
        phase: pos.phase.name,
        finished: pos.finished,
        nextDay: pos.day.name,
        lighterWeekThisWeek: state.lightWeek === pos.week,
        lighterWeekSuggested: pos.deloadSuggested,
        days: pos.phase.days.map((d) => ({
          dayId: d.id,
          name: d.name,
          items: d.blocks.flatMap((b) =>
            b.items.map((i) => ({ itemId: i.id, exerciseId: i.exerciseId, name: getExercise(i.exerciseId).name, block: b.type, prescription: describeRx(rx(i)), restSeconds: i.restSeconds })),
          ),
        })),
        otherPhases: program.phases.length > 1 ? program.phases.map((p) => `${p.name} (${p.weeks} wk)`) : undefined,
      };
    },
  }),
  def({
    name: 'get_recent_sessions',
    description: 'The most recent logged workouts, newest first, with every set.',
    input: z.object({ limit: z.number().int().min(1).max(20).optional() }),
    run: async ({ limit }) => {
      const { sessions } = await load();
      const recent = sessions.slice(-(limit ?? 5)).reverse();
      if (!recent.length) return { note: 'No workouts logged yet.' };
      return recent.map((s) => ({
        date: s.date.slice(0, 10),
        session: s.dayName,
        minutes: Math.round(s.durationSeconds / 60),
        effort: s.effort,
        note: s.note,
        exercises: s.entries.map((e) => {
          const ex = findExercise(e.exerciseId);
          return { name: ex?.name ?? e.exerciseId, exerciseId: e.exerciseId, sets: ex ? e.sets.map((x) => setText(ex, x)).join(', ') : '' };
        }),
      }));
    },
  }),
  def({
    name: 'get_exercise_history',
    description: 'Every logged session of one exercise, newest first, with the best estimated one-rep max for loaded lifts.',
    input: z.object({ exerciseId: z.string(), limit: z.number().int().min(1).max(30).optional() }),
    run: async ({ exerciseId, limit }) => {
      const ex = findExercise(exerciseId);
      if (!ex) throw new Error(`Unknown exerciseId "${exerciseId}".`);
      const { sessions } = await load();
      const dates = new Map(sessions.flatMap((s) => s.entries.map((e) => [e, s.date] as const)));
      const entries = historyFor(exerciseId, sessions).slice(0, limit ?? 10);
      const best = Math.max(0, ...entries.flatMap((e) => e.sets.map((s) => (s.kg && s.reps ? e1rm(s.kg, s.reps) : 0))));
      return {
        exercise: ex.name,
        logType: ex.logType,
        estimatedOneRepMaxKg: best ? roundKg(best) : undefined,
        sessions: entries.map((e) => ({ date: dates.get(e)?.slice(0, 10), sets: e.sets.filter((s) => s.done).map((s) => setText(ex, s)).join(', ') })),
      };
    },
  }),
  def({
    name: 'get_stats',
    description: 'Training overview: sessions per week, weekly target and streak, hard sets per muscle this week, personal bests, totals.',
    input: z.object({ weeks: z.number().int().min(1).max(26).optional() }),
    run: async ({ weeks }) => {
      const { sessions, program, profile } = await load();
      const target = program?.daysPerWeek ?? profile?.daysPerWeek ?? 3;
      return {
        totalSessions: sessions.length,
        weeklyTarget: target,
        weekStreak: weekStreak(sessions, target),
        sessionsPerWeek: weeklyCounts(sessions, weeks ?? 8),
        setsPerMuscleThisWeek: muscleSets(sessionsInWeek(sessions)),
        personalBests: records(sessions)
          .slice(0, 12)
          .map((r) => ({ exercise: r.name, best: r.label, date: r.date.slice(0, 10) })),
      };
    },
  }),
  def({
    name: 'search_exercises',
    description: 'Find exercises in the library by words in the name or muscle, and by movement slot. Only exercises from this library can be used in plans.',
    input: z.object({
      query: z.string().optional(),
      slot: z.enum(SLOTS).optional(),
      onlyMyEquipment: z.boolean().optional().describe('Defaults to true.'),
      limit: z.number().int().min(1).max(40).optional(),
    }),
    run: async ({ query, slot, onlyMyEquipment, limit }) => {
      const { profile } = await load();
      const eq = equipmentSet(profile?.equipment ?? []);
      const words = (query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
      return EXERCISES.filter(
        (e) =>
          (!slot || e.slot === slot) &&
          (onlyMyEquipment === false || canDo(e, eq)) &&
          words.every((w) => e.name.toLowerCase().includes(w) || e.primary.some((m) => m.includes(w)) || e.id.includes(w)),
      )
        .slice(0, limit ?? 15)
        .map((e) => ({ exerciseId: e.id, name: e.name, slot: e.slot, primary: e.primary, equipment: e.equipment, level: e.level, logType: e.logType, ladder: e.ladder, step: e.step }));
    },
  }),
  def({
    name: 'list_plans',
    description: 'Built-in plans, best fit for this person first. Use with propose_plan_switch.',
    input: z.object({ goal: z.enum(GOALS).optional() }),
    run: async ({ goal }) => {
      const { profile } = await load();
      if (!profile) return { note: 'No profile yet.' };
      return rankTemplates(profile)
        .filter((m) => !goal || m.template.goal === goal)
        .slice(0, 12)
        .map((m) => ({ templateId: m.template.id, name: m.template.name, goal: m.template.goal, level: m.template.level, daysPerWeek: m.program.daysPerWeek, description: m.template.description }));
    },
  }),
  def({
    name: 'get_body_weight',
    description: 'Weigh-ins (kg), the 7-day average and the weekly rate of change in % of body weight. Only when the body weight module is on.',
    input: z.object({ days: z.number().int().min(7).max(180).optional() }),
    run: async ({ days }) => {
      if (!getSettings().modules.body) return { note: 'The body weight module is off. The person can turn it on in Profile.' };
      const entries = await db.body.orderBy('date').toArray();
      const from = addDays(dayKey(), -(days ?? 28));
      const t = trend(entries);
      return {
        weighIns: entries.filter((e) => e.date >= from).map((e) => ({ date: e.date, kg: e.kg })),
        latestKg: t.latest?.kg,
        sevenDayAverageKg: t.average != null ? roundKg(t.average) : undefined,
        weeklyRatePct: t.weeklyRatePct != null ? Math.round(t.weeklyRatePct * 100) / 100 : undefined,
        note: t.weeklyRatePct == null ? 'Not enough weigh-ins for a trend (3 per week for 2 weeks).' : undefined,
      };
    },
  }),
  def({
    name: 'get_nutrition',
    description: "The person's nutrition targets and settings, and the food logged per day (totals and items). Only when the nutrition module is on.",
    input: z.object({ days: z.number().int().min(1).max(30).optional() }),
    run: async ({ days }) => {
      if (!getSettings().modules.nutrition) return { note: 'The nutrition module is off. The person can turn it on in Profile.' };
      const { profile } = await load();
      const settings = await getNutritionSettings(profile);
      const t = nutritionTargets(profile, settings);
      const from = addDays(dayKey(), -((days ?? 7) - 1));
      const foods = await db.foods.where('date').aboveOrEqual(from).sortBy('date');
      const byDay = new Map<string, typeof foods>();
      for (const f of foods) byDay.set(f.date, [...(byDay.get(f.date) ?? []), f]);
      return {
        settings: { goal: settings.goal, ratePctPerWeek: settings.ratePct, activityLevel: settings.pal, correctionKcal: settings.adjustKcal, manualKcal: settings.manualKcal, manualProtein: settings.manualProtein },
        targets: { kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat, maintenance: t.maintenance, safetyNotes: t.notes, missingProfileData: t.missing },
        days: [...byDay.entries()].map(([date, list]) => ({ date, ...totals(list, profile?.weightKg), items: list.map((f) => `${f.time} ${f.name}${f.grams ? ` ${f.grams}g` : ''}: ${f.kcal} kcal, P ${f.protein ?? '?'}`) })),
        unloggedDays: (days ?? 7) - byDay.size,
      };
    },
  }),
  def({
    name: 'propose_nutrition_targets',
    description: 'Propose new nutrition settings: goal (lose, maintain, gain), pace in % of body weight per week (lose -0.25 to -1, gain 0.1 to 0.5), and optionally fixed calories or protein. The app applies its safety rules (no deficit under 18, in pregnancy or when underweight; calorie floors). Nothing changes until the person accepts.',
    input: z.object({
      reason: z.string().min(3).max(200),
      goal: z.enum(['lose', 'maintain', 'gain']),
      ratePct: z.number().min(-1).max(0.5).optional(),
      manualKcal: z.number().int().min(1200).max(6000).optional(),
      manualProtein: z.number().int().min(40).max(300).optional(),
    }),
    run: async ({ reason, goal, ratePct, manualKcal, manualProtein }, ctx) => {
      const { profile } = await load();
      const current = await getNutritionSettings(profile);
      const next: NutritionSettings = { ...current, goal, ratePct: goal === 'maintain' ? 0 : (ratePct ?? (goal === 'lose' ? -0.5 : 0.25)), manualKcal, manualProtein, adjustKcal: 0, adjustedAt: undefined };
      if (next.goal === 'lose' && next.ratePct > 0) throw new Error('A losing pace must be negative.');
      if (next.goal === 'gain' && next.ratePct < 0) throw new Error('A gaining pace must be positive.');
      const t = nutritionTargets(profile, next);
      const lines = [
        `Goal: ${t.goal}${t.goal !== 'maintain' ? `, ${t.ratePct > 0 ? '+' : ''}${t.ratePct} % a week` : ''}`,
        t.kcal ? `About ${t.kcal} kcal and ${t.protein} g protein a day` : 'Targets need age, sex, height and weight in the profile',
        ...t.notes,
      ];
      ctx.proposals.push({ id: uid('pr'), kind: 'nutrition_targets', title: reason, lines, payload: next, status: 'pending' });
      return { proposed: true, resultingTargets: { kcal: t.kcal, protein: t.protein, goal: t.goal }, notes: t.notes, note: 'Shown to the person as a card to accept or dismiss.' };
    },
  }),
  def({
    name: 'save_memory',
    description: 'Remember a durable fact for future conversations: a goal, an injury or limitation, a preference, a decision, what worked or did not. One short fact per call. Not for one-off details.',
    input: z.object({ text: z.string().min(3).max(300) }),
    run: async ({ text }) => ({ saved: (await addMemory(text)).id }),
  }),
  def({
    name: 'forget_memory',
    description: 'Remove a saved note that is wrong or out of date. Ids are in the coach notes in the app context.',
    input: z.object({ id: z.string() }),
    run: async ({ id }) => ((await removeMemory(id)) ? { removed: id } : { note: `No note with id ${id}.` }),
  }),
  def({
    name: 'propose_program_change',
    description:
      'Propose changes to the active plan: swap an exercise (optionally everywhere, for a ladder step), change sets, reps, hold time, duration or rest, add or remove an exercise, rename a day. Nothing changes until the person accepts the card. Use ids from get_program and exercise ids from search_exercises.',
    input: z.object({ summary: z.string().min(3).max(200).describe('One sentence: what and why.'), changes: z.array(ChangeOp).min(1).max(12) }),
    run: async ({ summary, changes }, ctx) => {
      const { program } = await load();
      if (!program) throw new Error('There is no active plan to change.');
      const { lines } = applyChanges(program, changes);
      ctx.proposals.push({ id: uid('pr'), kind: 'program_change', title: summary, lines, payload: changes, status: 'pending' });
      return { proposed: true, changes: lines, note: 'Shown to the person as a card to accept or dismiss. Do not repeat the list in full.' };
    },
  }),
  def({
    name: 'propose_new_program',
    description: 'Propose a complete new plan built from library exercises. It replaces the active plan only if the person accepts. Prefer list_plans and propose_plan_switch when a built-in plan fits.',
    input: z.object({ summary: z.string().min(3).max(200) }).extend(NewProgram.shape),
    run: async ({ summary, ...input }, ctx) => {
      const { profile } = await load();
      const { program, lines } = buildProgram(input, profile);
      ctx.proposals.push({ id: uid('pr'), kind: 'new_program', title: summary, lines: [`${program.name}, ${program.daysPerWeek} days a week`, ...lines], payload: program, status: 'pending' });
      return { proposed: true, days: lines.length, note: 'Shown to the person as a card to accept or dismiss.' };
    },
  }),
  def({
    name: 'propose_plan_switch',
    description: 'Propose switching to a built-in plan (templateId from list_plans). History is kept; progress through the new plan starts at week 1.',
    input: z.object({ templateId: z.string(), reason: z.string().min(3).max(200) }),
    run: async ({ templateId, reason }, ctx) => {
      const template = getTemplate(templateId);
      if (!template) throw new Error(`Unknown templateId "${templateId}". Call list_plans.`);
      ctx.proposals.push({ id: uid('pr'), kind: 'plan_switch', title: reason, lines: [`Switch to ${template.name}`, template.description], payload: templateId, status: 'pending' });
      return { proposed: true, note: 'Shown to the person as a card to accept or dismiss.' };
    },
  }),
  def({
    name: 'propose_lighter_week',
    description: 'Propose making the current week lighter: about half the sets at the same loads, for recovery.',
    input: z.object({ reason: z.string().min(3).max(200) }),
    run: async ({ reason }, ctx) => {
      ctx.proposals.push({ id: uid('pr'), kind: 'lighter_week', title: reason, lines: ['This week: about half the sets, same weights'], payload: null, status: 'pending' });
      return { proposed: true, note: 'Shown to the person as a card to accept or dismiss.' };
    },
  }),
];

/** Bump when tool names, descriptions or schemas change: running conversations then drop their thinking blocks. */
export const TOOLS_VERSION = 't2';

export const TOOL_SPECS: ToolSpec[] = TOOLS.map((t) => {
  const schema = z.toJSONSchema(t.input) as Record<string, unknown>;
  delete schema.$schema;
  return { name: t.name, description: t.description, schema };
});

export const READ_TOOLS = new Set(['get_profile', 'get_program', 'get_recent_sessions', 'get_exercise_history', 'get_stats', 'search_exercises', 'list_plans', 'get_body_weight', 'get_nutrition']);

/** Validates and runs one tool call. Errors become `isError` results the model can correct. */
export async function runTool(call: { id: string; name: string; input: unknown }, ctx: Ctx): Promise<ToolResult> {
  const tool = TOOLS.find((t) => t.name === call.name);
  if (!tool) return { id: call.id, name: call.name, content: `Unknown tool ${call.name}.`, isError: true };
  const parsed = tool.input.safeParse(call.input ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { id: call.id, name: call.name, content: `Invalid input: ${issue?.path.join('.') || 'input'}: ${issue?.message ?? 'not valid'}.`, isError: true };
  }
  try {
    // Each tool's input type matches its own schema; the union of tools hides that from TypeScript.
    const result = await (tool.run as (i: unknown, c: Ctx) => Promise<unknown>)(parsed.data, ctx);
    return { id: call.id, name: call.name, content: JSON.stringify(result) };
  } catch (e) {
    return { id: call.id, name: call.name, content: e instanceof Error ? e.message : 'The tool failed.', isError: true };
  }
}

/* ---------- Accepting proposals ---------- */

export async function acceptProposal(proposal: Proposal): Promise<void> {
  const { program, profile } = await load();
  if (proposal.kind === 'program_change') {
    if (!program) throw new Error('There is no active plan any more.');
    const { program: next } = applyChanges(program, proposal.payload as ChangeOp[]);
    await saveProgram({ ...next, source: next.source === 'template' ? 'user' : next.source });
  } else if (proposal.kind === 'new_program') {
    const p = ProgramSchema.parse(proposal.payload);
    await activateProgram({ ...p, id: uid('p') });
  } else if (proposal.kind === 'plan_switch') {
    const template = getTemplate(String(proposal.payload));
    if (!template || !profile) throw new Error('This plan is not available.');
    await activateProgram(instantiate(template, profile).program);
  } else if (proposal.kind === 'nutrition_targets') {
    await saveNutritionSettings(proposal.payload as NutritionSettings);
  } else {
    const state = await getState();
    if (!state || !program) throw new Error('There is no active plan.');
    await setState({ ...state, lightWeek: position(program, state.completed).week });
  }
}

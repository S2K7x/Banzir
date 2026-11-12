import { z } from 'zod';
import { EQUIPMENT, GOALS, LEVELS, MUSCLES, SLOTS } from './constants';

export { EQUIPMENT, GOALS, LEVELS, MUSCLES, SLOTS };

/**
 * The single program schema shared by built-in templates, user programs and
 * (later) AI-generated programs. Reference: docs/programs/schema.md.
 */

export const Goal = z.enum(GOALS);
export type Goal = z.infer<typeof Goal>;

export const Level = z.enum(LEVELS);
export type Level = z.infer<typeof Level>;

export const Equipment = z.enum(EQUIPMENT);
export type Equipment = z.infer<typeof Equipment>;

export const Slot = z.enum(SLOTS);
export type Slot = z.infer<typeof Slot>;

export const Muscle = z.enum(MUSCLES);
export type Muscle = z.infer<typeof Muscle>;

export const LogType = z.enum(['weight_reps', 'reps', 'hold', 'time', 'distance']);
export type LogType = z.infer<typeof LogType>;

export const Exercise = z.object({
  id: z.string(),
  name: z.string(),
  slot: Slot,
  primary: z.array(Muscle),
  secondary: z.array(Muscle).default([]),
  /** Every item listed is required. Empty = no equipment. */
  equipment: z.array(Equipment).default([]),
  level: Level,
  logType: LogType,
  unilateral: z.boolean().optional(),
  cue: z.string().optional(),
  /** Rep range that replaces the program's when this drill is used (negatives, scapular work). */
  range: z.tuple([z.number().positive(), z.number().positive()]).optional(),
  ladder: z.string().optional(),
  step: z.number().optional(),
});
export type Exercise = z.infer<typeof Exercise>;

const range = z.tuple([z.number().positive(), z.number().positive()]);

export const Effort = z.discriminatedUnion('type', [
  z.object({ type: z.literal('rir'), value: z.tuple([z.number(), z.number()]) }),
  z.object({ type: z.literal('rpe'), value: z.tuple([z.number(), z.number()]) }),
  z.object({ type: z.literal('hrZone'), value: z.number().min(1).max(5) }),
  z.object({ type: z.literal('pace'), ref: z.enum(['easy', 'threshold', '5k', '10k', 'race']) }),
]);
export type Effort = z.infer<typeof Effort>;

export const Segment = z.object({
  label: z.string(),
  seconds: z.number().positive(),
  /** 'work' segments count as training time; 'rest' segments do not. */
  kind: z.enum(['work', 'rest']).default('work'),
});
export type Segment = z.infer<typeof Segment>;

export const Prescription = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('reps'), sets: z.number().int().positive(), reps: range, target: Effort.optional() }),
  z.object({ mode: z.literal('hold'), sets: z.number().int().positive(), seconds: range }),
  z.object({ mode: z.literal('time'), seconds: z.number().positive(), target: Effort.optional() }),
  z.object({
    mode: z.literal('intervals'),
    reps: z.number().int().positive(),
    segments: z.array(Segment).min(1),
    target: Effort.optional(),
  }),
]);
export type Prescription = z.infer<typeof Prescription>;

export const ProgressionRule = z.discriminatedUnion('type', [
  /** Add load every session the top of the range is reached on all sets. */
  z.object({ type: z.literal('linear'), stepKg: z.number().positive() }),
  /** Add reps to the top of the range, then add load and restart at the bottom. */
  z.object({ type: z.literal('double'), stepKg: z.number().positive() }),
  /** Bodyweight ladders: meet the top of the range, then move to the next variation. */
  z.object({ type: z.literal('variation') }),
  z.object({ type: z.literal('none') }),
]);
export type ProgressionRule = z.infer<typeof ProgressionRule>;

export const Item = z.object({
  id: z.string(),
  exerciseId: z.string(),
  /** Explicit substitutes, tried in order before the slot-based search. */
  alternatives: z.array(z.string()).optional(),
  /** 1 = core, 3 = dropped first when a session must be shortened. */
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  prescription: Prescription,
  restSeconds: z.number().nonnegative().optional(),
  cue: z.string().optional(),
  progression: ProgressionRule.optional(),
});
export type Item = z.infer<typeof Item>;

export const Block = z.object({
  id: z.string(),
  type: z.enum(['warmup', 'main', 'superset', 'cooldown']),
  items: z.array(Item).min(1),
});
export type Block = z.infer<typeof Block>;

export const DayTemplate = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['strength', 'skill', 'run', 'conditioning', 'mobility', 'mixed']),
  focus: z.array(z.string()).default([]),
  /** May be empty while a day is being built. */
  blocks: z.array(Block),
  notes: z.string().optional(),
});
export type DayTemplate = z.infer<typeof DayTemplate>;

export const Phase = z.object({
  id: z.string(),
  name: z.string(),
  weeks: z.number().int().positive(),
  days: z.array(DayTemplate).min(1),
  /** Order in which day templates are done. Sessions walk through it and wrap. */
  rotation: z.array(z.string()).min(1),
});
export type Phase = z.infer<typeof Phase>;

export const Program = z
  .object({
    id: z.string(),
    schemaVersion: z.literal(1),
    name: z.string(),
    description: z.string(),
    source: z.enum(['template', 'user', 'coach']),
    templateId: z.string().optional(),
    goal: Goal,
    level: Level,
    /** Sessions per week the program is written for. */
    daysPerWeek: z.number().int().min(1).max(7),
    /** Range of weekly sessions it still works with. */
    daysRange: z.tuple([z.number().int(), z.number().int()]),
    sessionMinutes: z.number().positive(),
    /** True when the phases repeat forever instead of ending. */
    loops: z.boolean(),
    phases: z.array(Phase).min(1),
    progression: ProgressionRule,
    deloadEveryWeeks: z.number().int().positive().optional(),
    /** Equipment the plan makes no sense without (a front lever plan needs a bar). */
    requires: z.array(Equipment).default([]),
    tags: z.array(z.string()).default([]),
    sources: z.array(z.string()).default([]),
  })
  .superRefine((p, ctx) => {
    for (const phase of p.phases) {
      const ids = new Set(phase.days.map((d) => d.id));
      for (const r of phase.rotation) {
        if (!ids.has(r)) ctx.addIssue({ code: 'custom', message: `rotation references unknown day "${r}" in phase "${phase.id}"` });
      }
    }
  });
export type Program = z.infer<typeof Program>;

/* ---------- Logged data ---------- */

export const SetLog = z.object({
  reps: z.number().optional(),
  kg: z.number().optional(),
  seconds: z.number().optional(),
  meters: z.number().optional(),
  rir: z.number().optional(),
  done: z.boolean(),
});
export type SetLog = z.infer<typeof SetLog>;

export const Entry = z.object({
  itemId: z.string().optional(),
  exerciseId: z.string(),
  sets: z.array(SetLog),
});
export type Entry = z.infer<typeof Entry>;

export const Session = z.object({
  id: z.string(),
  date: z.string(),
  programId: z.string().optional(),
  dayId: z.string().optional(),
  dayName: z.string(),
  durationSeconds: z.number(),
  entries: z.array(Entry),
  effort: z.number().optional(),
  note: z.string().optional(),
});
export type Session = z.infer<typeof Session>;

export const Profile = z.object({
  id: z.literal('me'),
  name: z.string().default(''),
  goal: Goal,
  level: Level,
  equipment: z.array(Equipment),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionMinutes: z.number(),
  age: z.number().optional(),
  sex: z.enum(['male', 'female']).optional(),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
  /** Health flags from onboarding; any entry triggers the conservative path. */
  flags: z.array(z.string()).default([]),
  /** Self-reported ability, used to pick calisthenics starting steps. */
  ability: z.object({ pushups: z.number().optional(), pullups: z.number().optional() }).default({}),
  /** What they want most within the goal, for example 'planche'. Matches template tags. */
  focus: z.string().optional(),
  createdAt: z.string(),
});
export type Profile = z.infer<typeof Profile>;

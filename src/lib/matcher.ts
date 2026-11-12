import { EXERCISES, findExercise, getExercise, ladderSteps } from '../data/exercises';
import { TEMPLATES } from '../data/templates';
import { LEVELS } from './constants';
import type { DayTemplate, Equipment, Exercise, Goal, Item, Level, Prescription, Profile, Program, Slot } from './schema';

/** Turns a template into a program that fits one person: equipment, time, starting level. */

export const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function canDo(ex: Exercise, eq: ReadonlySet<Equipment>): boolean {
  return ex.equipment.every((e) => eq.has(e));
}

/** Which log types can satisfy a prescription mode. */
function compatible(mode: Prescription['mode'], ex: Exercise): boolean {
  if (mode === 'reps') return ex.logType === 'reps' || ex.logType === 'weight_reps';
  if (mode === 'hold') return ex.logType === 'hold' || ex.logType === 'time';
  return ex.logType === 'time';
}

/** Slots that can stand in for each other when nothing in the slot is possible. */
const RELATED: Partial<Record<Slot, Slot[]>> = {
  pull_v: ['pull_h'],
  pull_h: ['pull_v'],
  push_v: ['push_h'],
  push_h: ['push_v'],
  squat: ['single_leg'],
  single_leg: ['squat'],
  carry: ['core'],
};

const levelIndex = (l: Level) => LEVELS.indexOf(l);

function bestInSlot(slot: Slot, original: Exercise, mode: Prescription['mode'], eq: ReadonlySet<Equipment>, level: Level): Exercise | undefined {
  const candidates = EXERCISES.filter((e) => e.slot === slot && e.id !== original.id && canDo(e, eq) && compatible(mode, e));
  let best: Exercise | undefined;
  let bestScore = -Infinity;
  for (const c of candidates) {
    let score = 0;
    if (c.logType === original.logType) score += 4;
    score -= 2 * Math.abs(levelIndex(c.level) - levelIndex(original.level));
    if (levelIndex(c.level) > levelIndex(level)) score -= 6;
    score += c.equipment.length; // prefer loadable options over bodyweight when both exist
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

/** Starting rung on a bodyweight ladder from what the person says they can do. */
function ladderStartStep(ladder: string, profile: Profile): number | undefined {
  const { pushups, pullups } = profile.ability;
  if (ladder === 'pushup' && pushups != null) {
    if (pushups <= 0) return 1;
    if (pushups <= 5) return 2;
    if (pushups <= 15) return 3;
    if (pushups <= 29) return 4;
    return 5;
  }
  if (ladder === 'pullup') {
    if (pullups == null) return profile.level === 'beginner' ? 3 : undefined;
    if (pullups <= 0) return 3;
    if (pullups <= 4) return 4;
    if (pullups <= 11) return 5;
    return 6;
  }
  return undefined;
}

export type Fit = { item: Item; swapped: boolean } | null;

export function fitItem(item: Item, profile: Profile, programRule: Program['progression']): Fit {
  const eq = new Set(profile.equipment);
  const mode = item.prescription.mode;
  const ex = getExercise(item.exerciseId);
  const rule = item.progression ?? programRule;

  // Bodyweight ladders start where the person is, not where the template is.
  if (rule.type === 'variation' && ex.ladder) {
    const start = ladderStartStep(ex.ladder, profile);
    if (start != null) {
      const steps = ladderSteps(ex.ladder).filter((s) => (s.step ?? 0) <= start && canDo(s, eq) && compatible(mode, s));
      const pick = steps[steps.length - 1];
      if (pick) return { item: { ...item, exerciseId: pick.id, cue: pick.id === ex.id ? item.cue : undefined }, swapped: false };
    }
  }

  // Order of preference: the template's own choices at the person's level, then
  // an easier rung of the same ladder, then anything else in the movement slot.
  const named: Exercise[] = [ex];
  for (const altId of item.alternatives ?? []) {
    const alt = findExercise(altId);
    if (alt) named.push(alt);
  }
  const usable = (e: Exercise) => canDo(e, eq) && compatible(mode, e);
  const startOf = (e: Exercise) => (e.ladder ? ladderStartStep(e.ladder, profile) : undefined);
  const tooHard = (e: Exercise) => {
    const start = startOf(e);
    return start != null ? (e.step ?? 0) > start : levelIndex(e.level) > levelIndex(profile.level);
  };
  const use = (pick: Exercise): Fit => (pick.id === ex.id ? { item, swapped: false } : { item: { ...item, exerciseId: pick.id, cue: undefined }, swapped: true });

  const atLevel = named.find((e) => usable(e) && !tooHard(e));
  if (atLevel) return use(atLevel);

  for (const e of named) {
    if (!usable(e) || !e.ladder) continue;
    const start = startOf(e);
    const easier = ladderSteps(e.ladder).filter((s) => usable(s) && s.slot === e.slot && (start != null ? (s.step ?? 0) <= start : levelIndex(s.level) <= levelIndex(profile.level)));
    if (easier.length) return use(easier[easier.length - 1]);
  }

  for (const slot of [ex.slot, ...(RELATED[ex.slot] ?? [])]) {
    const sub = bestInSlot(slot, ex, mode, eq, profile.level);
    if (sub) return use(sub);
  }
  const hard = named.find(usable);
  return hard ? use(hard) : null;
}

/** Rough session length in minutes, used to trim to the time the person has. */
export function estimateMinutes(day: DayTemplate): number {
  let seconds = 0;
  for (const block of day.blocks) {
    for (const item of block.items) {
      const p = item.prescription;
      const rest = item.restSeconds ?? 60;
      if (p.mode === 'reps') {
        const ex = findExercise(item.exerciseId);
        seconds += p.sets * ((ex?.unilateral ? 70 : 45) + rest);
      } else if (p.mode === 'hold') {
        seconds += p.sets * ((p.seconds[0] + p.seconds[1]) / 2 + rest);
      } else if (p.mode === 'time') {
        seconds += p.seconds;
      } else {
        seconds += p.reps * p.segments.reduce((a, s) => a + s.seconds, 0);
      }
    }
  }
  return Math.round(seconds / 60);
}

function trimDay(day: DayTemplate, minutes: number): DayTemplate {
  let current = day;
  for (const priority of [3, 2] as const) {
    while (estimateMinutes(current) > minutes + 5) {
      let removed = false;
      const blocks = [...current.blocks].reverse().map((b) => {
        if (removed) return b;
        const idx = b.items.map((i) => i.priority).lastIndexOf(priority);
        if (idx === -1) return b;
        removed = true;
        return { ...b, items: b.items.filter((_, i) => i !== idx) };
      });
      if (!removed) break;
      current = { ...current, blocks: blocks.reverse().filter((b) => b.items.length > 0) };
    }
  }
  return current;
}

export type Instance = { program: Program; swaps: number; droppedCore: number };

export function instantiate(template: Program, profile: Profile): Instance {
  let swaps = 0;
  let droppedCore = 0;
  const phases = template.phases.map((phase) => ({
    ...phase,
    days: phase.days.map((day) => {
      const blocks = day.blocks
        .map((block) => ({
          ...block,
          items: block.items.flatMap((item) => {
            const fit = fitItem(item, profile, template.progression);
            if (!fit) {
              if (item.priority === 1) droppedCore++;
              return [];
            }
            if (fit.swapped) swaps++;
            return [fit.item];
          }),
        }))
        .filter((b) => b.items.length > 0);
      return trimDay({ ...day, blocks }, profile.sessionMinutes);
    }),
  }));
  const [min, max] = template.daysRange;
  const program: Program = {
    ...template,
    id: uid('p'),
    source: 'template',
    templateId: template.id,
    daysPerWeek: Math.min(max, Math.max(min, profile.daysPerWeek)),
    phases,
  };
  return { program, swaps, droppedCore };
}

const RELATED_GOALS: Partial<Record<Goal, Partial<Record<Goal, number>>>> = {
  fat_loss: { general_fitness: 45, muscle: 30 },
  general_fitness: { fat_loss: 35, muscle: 30, calisthenics: 20 },
  muscle: { strength: 40, general_fitness: 30 },
  strength: { muscle: 40 },
  calisthenics: { general_fitness: 25 },
  sport: { strength: 30, general_fitness: 30 },
  running: { general_fitness: 10 },
};

export type Match = Instance & { template: Program; score: number };

export function rankTemplates(profile: Profile): Match[] {
  const cautious = profile.flags.length > 0;
  return TEMPLATES.map((template) => {
    const inst = instantiate(template, profile);
    let score = template.goal === profile.goal ? 100 : (RELATED_GOALS[profile.goal]?.[template.goal] ?? 0);
    const diff = levelIndex(template.level) - levelIndex(cautious ? 'beginner' : profile.level);
    score += diff > 0 ? -40 * diff : 20 + 8 * diff;
    const [min, max] = template.daysRange;
    const d = profile.daysPerWeek;
    if (d >= min && d <= max) score += 15 + (d === template.daysPerWeek ? 5 : 0);
    else score -= 10 * Math.min(Math.abs(d - min), Math.abs(d - max));
    score -= 30 * inst.droppedCore + 2 * inst.swaps;
    score -= Math.abs(template.sessionMinutes - profile.sessionMinutes) / 5;
    return { ...inst, template, score };
  }).sort((a, b) => b.score - a.score);
}

/** Exercises that could replace one in a program, for the quick-swap sheet. */
export function swapOptions(item: Item, profile: Profile): Exercise[] {
  const eq = new Set(profile.equipment);
  const ex = getExercise(item.exerciseId);
  const slots = [ex.slot, ...(RELATED[ex.slot] ?? [])];
  return EXERCISES.filter((e) => e.id !== ex.id && slots.includes(e.slot) && canDo(e, eq) && compatible(item.prescription.mode, e)).sort(
    (a, b) => slots.indexOf(a.slot) - slots.indexOf(b.slot) || levelIndex(a.level) - levelIndex(b.level),
  );
}

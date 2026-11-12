import { EXERCISES, findExercise, getExercise, ladderSteps } from '../data/exercises';
import { TEMPLATES } from '../data/templates';
import { LEVELS } from './constants';
import type { DayTemplate, Equipment, Exercise, Goal, Item, Level, Prescription, Profile, Program, Slot } from './schema';

/** Turns a template into a program that fits one person: equipment, time, starting level. */

export const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function canDo(ex: Exercise, eq: ReadonlySet<Equipment>): boolean {
  return ex.equipment.every((e) => eq.has(e));
}

/** What the person can actually use. Rings hang from something, so they also cover bar work. */
export function equipmentSet(equipment: Equipment[]): Set<Equipment> {
  const set = new Set(equipment);
  if (set.has('rings')) set.add('pullup_bar');
  return set;
}

/** Which log types can satisfy a prescription mode. */
export function compatible(mode: Prescription['mode'], ex: Exercise): boolean {
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
  rotation: ['core'],
  balance: ['core'],
  neck: ['core'],
  grip: ['carry', 'arm_flex'],
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

/**
 * What the person told us about a ladder. `step` is the rung that matches their
 * numbers; `open` means they are in the top bucket, so harder rungs are not ruled out.
 */
function ladderAbility(ladder: string, profile: Profile): { step: number; open: boolean } | undefined {
  const { pushups, pullups } = profile.ability;
  if (ladder === 'pushup' && pushups != null) {
    if (pushups <= 0) return { step: 1, open: false };
    if (pushups <= 5) return { step: 2, open: false };
    if (pushups <= 15) return { step: 3, open: false };
    if (pushups <= 29) return { step: 4, open: false };
    return { step: 5, open: true };
  }
  if (ladder === 'pullup') {
    if (pullups == null) return profile.level === 'beginner' ? { step: 3, open: false } : undefined;
    if (pullups <= 0) return { step: 3, open: false };
    if (pullups <= 4) return { step: 4, open: false };
    if (pullups <= 11) return { step: 5, open: false };
    return { step: 6, open: true };
  }
  return undefined;
}

export type Fit = { item: Item; swapped: boolean } | null;

export function fitItem(item: Item, profile: Profile, programRule: Program['progression']): Fit {
  const eq = equipmentSet(profile.equipment);
  const mode = item.prescription.mode;
  const ex = getExercise(item.exerciseId);
  const rule = item.progression ?? programRule;

  const usable = (e: Exercise) => canDo(e, eq) && compatible(mode, e);
  const tooHard = (e: Exercise) => {
    const ability = e.ladder ? ladderAbility(e.ladder, profile) : undefined;
    if (ability && !ability.open) return (e.step ?? 0) > ability.step;
    return levelIndex(e.level) > levelIndex(profile.level);
  };
  const use = (pick: Exercise): Fit => (pick.id === ex.id ? { item, swapped: false } : { item: { ...item, exerciseId: pick.id, cue: undefined }, swapped: true });
  /** Highest usable rung of the same ladder and slot that is not too hard. */
  const easierRung = (e: Exercise) => {
    if (!e.ladder) return undefined;
    const rungs = ladderSteps(e.ladder).filter((s) => usable(s) && s.slot === e.slot && (s.step ?? 0) <= (e.step ?? 0) && !tooHard(s));
    return rungs[rungs.length - 1];
  };

  // Progressing ladders start where the person is: move up when they report more than the template assumes.
  if (rule.type === 'variation' && ex.ladder) {
    const ability = ladderAbility(ex.ladder, profile);
    if (ability && ability.step > (ex.step ?? 0)) {
      const rungs = ladderSteps(ex.ladder).filter((s) => usable(s) && s.slot === ex.slot && (s.step ?? 0) <= ability.step);
      const pick = rungs[rungs.length - 1];
      if (pick) return { item: pick.id === ex.id ? item : { ...item, exerciseId: pick.id, cue: undefined }, swapped: false };
    }
    // ...and step down the same ladder, rather than to an alternative, when it is too hard.
    if (usable(ex) && tooHard(ex)) {
      const rung = easierRung(ex);
      if (rung) return { item: { ...item, exerciseId: rung.id, cue: undefined }, swapped: false };
    }
  }

  // Order of preference: the template's own choices at the person's level, an
  // easier rung of the same ladder, the template's choice even if demanding,
  // then anything else in the movement slot.
  const named: Exercise[] = [ex];
  for (const altId of item.alternatives ?? []) {
    const alt = findExercise(altId);
    if (alt) named.push(alt);
  }

  const atLevel = named.find((e) => usable(e) && !tooHard(e));
  if (atLevel) return use(atLevel);

  for (const e of named) {
    if (!usable(e)) continue;
    const rung = easierRung(e);
    if (rung) return use(rung);
  }

  const demanding = named.find(usable);
  if (demanding) return use(demanding);

  for (const slot of [ex.slot, ...(RELATED[ex.slot] ?? [])]) {
    const sub = bestInSlot(slot, ex, mode, eq, profile.level);
    if (sub) return use(sub);
  }
  return null;
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
    const eq = equipmentSet(profile.equipment);
    if (template.requires.some((e) => !eq.has(e))) score -= 120;
    if (profile.focus && template.tags.includes(profile.focus)) score += 35;
    // Add-ons (daily mobility) only come first when asked for by name.
    if (template.tags.includes('addon') && !(profile.focus && template.tags.includes(profile.focus))) score -= 80;
    // Things the plan assumes you can already do. Unknown means not penalised,
    // except that a running beginner who did not answer is assumed to be starting out.
    const able = { ...profile.ability };
    if (able.runMinutes == null && profile.goal === 'running' && profile.level === 'beginner') able.runMinutes = 0;
    for (const [k, need] of Object.entries(template.prerequisites ?? {}) as [keyof typeof able, number | undefined][]) {
      const have = able[k];
      if (need != null && have != null && have < need) score -= 60;
    }
    if ((profile.age ?? 0) >= 60 && template.tags.includes('senior')) score += 30;
    const bmi = profile.weightKg && profile.heightCm ? profile.weightKg / (profile.heightCm / 100) ** 2 : 0;
    if ((bmi >= 30 || profile.flags.includes('joint')) && template.tags.includes('low-impact')) score += 25;
    score -= Math.abs(template.sessionMinutes - profile.sessionMinutes) / 5;
    return { ...inst, template, score };
  }).sort((a, b) => b.score - a.score);
}

/** Exercises that could replace one in a program, for the quick-swap sheet. */
export function swapOptions(item: Item, profile: Profile): Exercise[] {
  const eq = equipmentSet(profile.equipment);
  const ex = getExercise(item.exerciseId);
  const slots = [ex.slot, ...(RELATED[ex.slot] ?? [])];
  return EXERCISES.filter((e) => e.id !== ex.id && slots.includes(e.slot) && canDo(e, eq) && compatible(item.prescription.mode, e)).sort(
    (a, b) => slots.indexOf(a.slot) - slots.indexOf(b.slot) || levelIndex(a.level) - levelIndex(b.level),
  );
}

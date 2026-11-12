import { EXERCISES, findExercise, getExercise, ladderSteps } from '../data/exercises';
import { LEVELS } from './constants';
import type { DayTemplate, Equipment, Exercise, Item, Level, Prescription, Profile, Program, Slot } from './schema';

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

export const levelIndex = (l: Level) => LEVELS.indexOf(l);

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

/**
 * Picks the exercise for one template item. `taken` holds exercises already in
 * the same session: a substitute that repeats one is avoided when anything else fits.
 */
export function fitItem(item: Item, profile: Profile, programRule: Program['progression'], taken: ReadonlySet<string> = new Set()): Fit {
  return chooseExercise(item, profile, programRule, taken) ?? chooseExercise(item, profile, programRule, new Set());
}

function chooseExercise(item: Item, profile: Profile, programRule: Program['progression'], taken: ReadonlySet<string>): Fit {
  const eq = equipmentSet(profile.equipment);
  const mode = item.prescription.mode;
  const ex = getExercise(item.exerciseId);
  const rule = item.progression ?? programRule;

  const usable = (e: Exercise) => canDo(e, eq) && compatible(mode, e) && (e.id === ex.id || !taken.has(e.id));
  const tooHard = (e: Exercise) => {
    const ability = e.ladder ? ladderAbility(e.ladder, profile) : undefined;
    if (ability && !ability.open) return (e.step ?? 0) > ability.step;
    return levelIndex(e.level) > levelIndex(profile.level);
  };
  const use = (pick: Exercise): Fit => {
    if (pick.id === ex.id) return { item, swapped: false };
    let prescription = item.prescription;
    // A heavy, low-rep lift swapped for a bodyweight one needs more reps to be a hard set.
    if (prescription.mode === 'reps' && ex.logType === 'weight_reps' && pick.logType === 'reps' && !pick.range && prescription.reps[1] < 8) {
      prescription = { ...prescription, reps: [8, 12] };
    }
    return { item: { ...item, exerciseId: pick.id, cue: undefined, prescription }, swapped: true };
  };
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

/**
 * When substitution leaves the same exercise twice in a session (only one
 * option fits the equipment), the repeat is folded into the first one: extra
 * sets for core work, dropped when it was optional. Repeats written into the
 * template on purpose are kept.
 */
function mergeRepeats(original: DayTemplate, day: DayTemplate): DayTemplate {
  const intended = original.blocks.flatMap((b) => b.items.map((i) => i.exerciseId)).filter((id, i, a) => a.indexOf(id) !== i);
  const first = new Map<string, Item>();
  const extra = new Map<string, number>();
  const blocks = day.blocks
    .map((b) => ({
      ...b,
      items: b.items.filter((i) => {
        const seen = first.get(i.exerciseId);
        if (!seen || intended.includes(i.exerciseId)) {
          if (!seen) first.set(i.exerciseId, i);
          return true;
        }
        const p = i.prescription;
        if (i.priority === 1 && (p.mode === 'reps' || p.mode === 'hold')) extra.set(seen.id, (extra.get(seen.id) ?? 0) + p.sets);
        return false;
      }),
    }))
    .filter((b) => b.items.length > 0);
  if (!extra.size) return { ...day, blocks };
  return {
    ...day,
    blocks: blocks.map((b) => ({
      ...b,
      items: b.items.map((i) => {
        const more = extra.get(i.id);
        const p = i.prescription;
        return more && (p.mode === 'reps' || p.mode === 'hold') ? { ...i, prescription: { ...p, sets: Math.min(6, p.sets + more) } } : i;
      }),
    })),
  };
}

export type Instance = { program: Program; swaps: number; droppedCore: number };

export function instantiate(template: Program, profile: Profile): Instance {
  let swaps = 0;
  let droppedCore = 0;
  const phases = template.phases.map((phase) => ({
    ...phase,
    days: phase.days.map((day) => {
      const taken = new Set<string>();
      const blocks = day.blocks
        .map((block) => ({
          ...block,
          items: block.items.flatMap((item) => {
            const fit = fitItem(item, profile, template.progression, taken);
            if (fit) taken.add(fit.item.exerciseId);
            if (!fit) {
              if (item.priority === 1) droppedCore++;
              return [];
            }
            if (fit.swapped) swaps++;
            return [fit.item];
          }),
        }))
        .filter((b) => b.items.length > 0);
      return trimDay(mergeRepeats(day, { ...day, blocks }), profile.sessionMinutes);
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

/** Exercises that could replace one in a program, for the quick-swap sheet. */
export function swapOptions(item: Item, profile: Profile): Exercise[] {
  const eq = equipmentSet(profile.equipment);
  const ex = getExercise(item.exerciseId);
  const slots = [ex.slot, ...(RELATED[ex.slot] ?? [])];
  return EXERCISES.filter((e) => e.id !== ex.id && slots.includes(e.slot) && canDo(e, eq) && compatible(item.prescription.mode, e)).sort(
    (a, b) => slots.indexOf(a.slot) - slots.indexOf(b.slot) || levelIndex(a.level) - levelIndex(b.level),
  );
}

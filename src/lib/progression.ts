import { ladderSteps } from '../data/exercises';
import type { Entry, Exercise, Item, Program, ProgressionRule, Session, SetLog } from './schema';

/**
 * Suggests what to do next for one exercise from the last logged sessions.
 * Rules: docs/science/training-principles.md §4.
 */

export type Suggestion = {
  kg?: number;
  reps?: number;
  seconds?: number;
  note: string;
  /** Next ladder exercise to move up to, when the standard has been met twice. */
  advanceTo?: string;
};

const done = (e: Entry): SetLog[] => e.sets.filter((s) => s.done);

/** Most recent entries for an exercise, newest first. */
export function historyFor(exerciseId: string, sessions: Session[]): Entry[] {
  const out: Entry[] = [];
  for (const s of [...sessions].sort((a, b) => b.date.localeCompare(a.date))) {
    for (const e of s.entries) {
      if (e.exerciseId === exerciseId && done(e).length > 0) out.push(e);
    }
  }
  return out;
}

/** Ids of the items in a program that prescribe the same thing: same exercise, mode and range. */
export function similarItemIds(program: Program | undefined, item: Item): Set<string> {
  const ids = new Set([item.id]);
  const key = (i: Item) => {
    const p = i.prescription;
    return `${i.exerciseId}|${p.mode}|${p.mode === 'reps' ? p.reps.join('-') : p.mode === 'hold' ? p.seconds.join('-') : ''}`;
  };
  const k = key(item);
  for (const ph of program?.phases ?? []) for (const d of ph.days) for (const b of d.blocks) for (const i of b.items) if (key(i) === k) ids.add(i.id);
  return ids;
}

export type History = { entries: Entry[]; matched: boolean };

/**
 * History for one prescribed item. Entries logged for the same prescription come
 * first; when there are none (a new rep range, a new plan) every entry for the
 * exercise is returned and `matched` is false, so loads are re-estimated.
 */
export function historyForItem(item: Item, sessions: Session[], program: Program | undefined): History {
  const all = historyFor(item.exerciseId, sessions);
  const ids = similarItemIds(program, item);
  const same = all.filter((e) => e.itemId && ids.has(e.itemId));
  return same.length ? { entries: same, matched: true } : { entries: all, matched: false };
}

const roundKg = (kg: number) => Math.round(kg * 2) / 2;
/** Rounds a calculated load down to a weight that exists: 2.5 kg steps on a barbell, 1 kg otherwise. */
const loadable = (kg: number, ex: Exercise) => {
  const step = ex.equipment.includes('barbell') ? 2.5 : 1;
  return Math.max(step, Math.floor(kg / step) * step);
};

function metTop(entry: Entry, sets: number, top: number, key: 'reps' | 'seconds'): boolean {
  const d = done(entry);
  return d.length >= sets && d.every((s) => (s[key] ?? 0) >= top);
}

export function suggest(
  item: Item,
  exercise: Exercise,
  rule: ProgressionRule,
  history: Entry[],
  usable: (e: Exercise) => boolean = () => true,
  /** False when the history comes from a different prescription of the same exercise. */
  matched = true,
): Suggestion {
  const base = item.prescription;
  const p = base.mode === 'reps' && exercise.range ? { ...base, reps: exercise.range } : base;
  if (p.mode !== 'reps' && p.mode !== 'hold') return { note: '' };
  const [lo, hi] = p.mode === 'reps' ? p.reps : p.seconds;
  const key = p.mode === 'reps' ? 'reps' : 'seconds';
  const unit = p.mode === 'reps' ? 'reps' : 's';
  const last = history[0];

  if (!last) {
    if (exercise.logType === 'weight_reps') {
      return { reps: lo, note: `First time: pick a load you could lift about ${hi + 2} times, and stop at ${lo === hi ? lo : `${lo}-${hi}`}.` };
    }
    return { [key]: lo, note: `First time: aim for ${lo === hi ? lo : `${lo}-${hi}`} ${unit} with clean form.` };
  }

  const lastSets = done(last);
  const lastMin = Math.min(...lastSets.map((s) => s[key] ?? 0));
  const top = metTop(last, p.sets, hi, key);

  if (exercise.logType === 'weight_reps' && p.mode === 'reps') {
    if (!matched) {
      // A different rep range: estimate the load from the best recent set (Epley).
      const best = Math.max(0, ...history.slice(0, 3).flatMap((e) => done(e).map((s) => (s.kg && s.reps ? e1rm(s.kg, s.reps) : 0))));
      if (best > 0) {
        const t = item.prescription.mode === 'reps' ? item.prescription.target : undefined;
        const rir = t?.type === 'rir' ? (t.value[0] + t.value[1]) / 2 : 2;
        const reps = Math.round((lo + hi) / 2);
        return { kg: loadable(best / (1 + (reps + rir) / 30), exercise), reps, note: 'New rep range: the starting weight is estimated from your recent sets. Adjust it if the first set feels off.' };
      }
    }
    const kg = Math.max(...lastSets.map((s) => s.kg ?? 0));
    if (rule.type === 'none') return { kg, reps: Math.min(hi, Math.max(lo, lastMin)), note: 'Repeat last time.' };
    const step = rule.type === 'linear' || rule.type === 'double' ? rule.stepKg : 2.5;
    if (top) return { kg: roundKg(kg + step), reps: lo, note: `You hit ${hi} on every set. The weight goes up one step.` };
    if (rule.type === 'linear') {
      const prev = history[1];
      const missedTwice = lastMin < lo && prev && Math.min(...done(prev).map((s) => s.reps ?? 0)) < lo && Math.max(...done(prev).map((s) => s.kg ?? 0)) >= kg;
      if (missedTwice) return { kg: roundKg(kg * 0.9), reps: hi, note: 'Two missed sessions at this weight. It drops by 10 % so you can build back up.' };
      return { kg, reps: hi, note: `Same load. Get all ${p.sets} sets of ${hi}.` };
    }
    return { kg, reps: Math.min(hi, Math.max(lo, lastMin + 1)), note: `Same load. Add a rep where you can, up to ${hi}.` };
  }

  // Bodyweight reps and holds.
  if (top && rule.type === 'variation' && exercise.ladder) {
    const prev = history[1];
    const steps = ladderSteps(exercise.ladder);
    const next = steps.find((s) => (s.step ?? 0) > (exercise.step ?? 0) && s.logType === exercise.logType && usable(s));
    if (next && prev && metTop(prev, p.sets, hi, key)) {
      return { [key]: hi, advanceTo: next.id, note: `Standard met twice. Ready to move up to ${next.name}.` };
    }
    if (next) return { [key]: hi, note: `Top of the range reached. Do it once more, then move up to ${next.name}.` };
  }
  if (top) return { [key]: hi, note: `Top of the range. Slow the tempo or add a set to keep progressing.` };
  const bump = p.mode === 'hold' ? Math.max(2, Math.round((hi - lo) / 5)) : 1;
  return { [key]: Math.min(hi, Math.max(lo, lastMin + bump)), note: `Last time ${lastMin} ${unit}. Aim a little higher on each set.` };
}

/** Estimated one-rep maximum (Epley). */
export function e1rm(kg: number, reps: number): number {
  return reps <= 1 ? kg : kg * (1 + reps / 30);
}

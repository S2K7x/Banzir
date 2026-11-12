import { ladderSteps } from '../data/exercises';
import type { Entry, Exercise, Item, ProgressionRule, Session, SetLog } from './schema';

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

const roundKg = (kg: number) => Math.round(kg * 2) / 2;

function metTop(entry: Entry, sets: number, top: number, key: 'reps' | 'seconds'): boolean {
  const d = done(entry);
  return d.length >= sets && d.every((s) => (s[key] ?? 0) >= top);
}

export function suggest(item: Item, exercise: Exercise, rule: ProgressionRule, history: Entry[]): Suggestion {
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
    const kg = Math.max(...lastSets.map((s) => s.kg ?? 0));
    if (rule.type === 'none') return { kg, reps: Math.min(hi, Math.max(lo, lastMin)), note: 'Repeat last time.' };
    const step = rule.type === 'linear' || rule.type === 'double' ? rule.stepKg : 2.5;
    if (top) return { kg: roundKg(kg + step), reps: lo, note: `You hit ${hi} on every set. Add ${step} kg.` };
    if (rule.type === 'linear') {
      const prev = history[1];
      const missedTwice = lastMin < lo && prev && Math.min(...done(prev).map((s) => s.reps ?? 0)) < lo && Math.max(...done(prev).map((s) => s.kg ?? 0)) >= kg;
      if (missedTwice) return { kg: roundKg(kg * 0.9), reps: hi, note: 'Two missed sessions at this load. Drop 10 % and build back up.' };
      return { kg, reps: hi, note: `Same load. Get all ${p.sets} sets of ${hi}.` };
    }
    return { kg, reps: Math.min(hi, Math.max(lo, lastMin + 1)), note: `Same load. Add a rep where you can, up to ${hi}.` };
  }

  // Bodyweight reps and holds.
  if (top && rule.type === 'variation' && exercise.ladder) {
    const prev = history[1];
    const steps = ladderSteps(exercise.ladder);
    const next = steps.find((s) => (s.step ?? 0) > (exercise.step ?? 0));
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

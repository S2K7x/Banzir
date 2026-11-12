import { findExercise } from '../data/exercises';
import { e1rm } from './progression';
import type { Muscle, Session } from './schema';

/** Monday 00:00 of the week containing the date. */
export function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function sessionsInWeek(sessions: Session[], ref = new Date()): Session[] {
  const start = weekStart(ref).getTime();
  const end = start + 7 * 86400000;
  return sessions.filter((s) => {
    const t = new Date(s.date).getTime();
    return t >= start && t < end;
  });
}

/** Session counts for the last n weeks, oldest first. */
export function weeklyCounts(sessions: Session[], n = 8, ref = new Date()): { label: string; count: number }[] {
  const out: { label: string; count: number }[] = [];
  const thisWeek = weekStart(ref);
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - i * 7);
    out.push({
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      count: sessionsInWeek(sessions, start).length,
    });
  }
  return out;
}

/** Consecutive weeks (ending this or last week) that hit the weekly target. */
export function weekStreak(sessions: Session[], target: number, ref = new Date()): number {
  let streak = 0;
  const cursor = weekStart(ref);
  if (sessionsInWeek(sessions, cursor).length < target) cursor.setDate(cursor.getDate() - 7);
  while (sessionsInWeek(sessions, cursor).length >= target && target > 0) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

/** Hard sets per muscle: 1 for primary movers, 0.5 for secondary. */
export function muscleSets(sessions: Session[]): { muscle: Muscle; sets: number }[] {
  const totals = new Map<Muscle, number>();
  for (const s of sessions) {
    for (const e of s.entries) {
      const ex = findExercise(e.exerciseId);
      if (!ex || ex.slot === 'cardio' || ex.slot === 'mobility') continue;
      const n = e.sets.filter((x) => x.done).length;
      for (const m of ex.primary) totals.set(m, (totals.get(m) ?? 0) + n);
      for (const m of ex.secondary) totals.set(m, (totals.get(m) ?? 0) + n / 2);
    }
  }
  return [...totals.entries()].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets);
}

export type RecordRow = { exerciseId: string; name: string; label: string; value: number; date: string };

/** Best performance per exercise: estimated 1RM, most reps, or longest hold. */
export function records(sessions: Session[]): RecordRow[] {
  const best = new Map<string, RecordRow>();
  for (const s of sessions) {
    for (const e of s.entries) {
      const ex = findExercise(e.exerciseId);
      if (!ex || ex.slot === 'cardio' || ex.slot === 'mobility') continue;
      for (const set of e.sets) {
        if (!set.done) continue;
        let value = 0;
        let label = '';
        if (ex.logType === 'weight_reps' && set.kg && set.reps) {
          value = e1rm(set.kg, set.reps);
          label = `${set.kg} kg × ${set.reps}`;
        } else if (ex.logType === 'reps' && set.reps) {
          value = set.reps;
          label = `${set.reps} reps`;
        } else if ((ex.logType === 'hold' || ex.logType === 'time') && set.seconds) {
          value = set.seconds;
          label = `${set.seconds} s`;
        }
        const cur = best.get(ex.id);
        if (value > 0 && (!cur || value > cur.value)) best.set(ex.id, { exerciseId: ex.id, name: ex.name, label, value, date: s.date });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export function totalMinutes(sessions: Session[]): number {
  return Math.round(sessions.reduce((a, s) => a + s.durationSeconds, 0) / 60);
}

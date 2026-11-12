import { db } from './db';
import type { BodyEntry } from './schema';

/**
 * Body weight: one weigh-in per day, a 7-day average as the trend, and the
 * weekly rate of change. Day-to-day weight moves with water and food, so the
 * app never reacts to a single weigh-in. Evidence: docs/science/nutrition-fat-loss.md.
 */

/** Local calendar date as YYYY-MM-DD. */
export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

/** Weigh-ins needed in a 7-day window before its average is trusted. */
export const MIN_WEIGH_INS = 3;

/** Average of the weigh-ins in the 7 days ending on `end` (inclusive), or null with too few. */
export function weekAverage(entries: BodyEntry[], end: string): number | null {
  const start = addDays(end, -6);
  const inWindow = entries.filter((e) => e.date >= start && e.date <= end);
  if (inWindow.length < MIN_WEIGH_INS) return null;
  return inWindow.reduce((a, e) => a + e.kg, 0) / inWindow.length;
}

export type Trend = {
  latest?: BodyEntry;
  average?: number;
  previousAverage?: number;
  /** Change of the 7-day average versus the week before, in % of body weight per week. */
  weeklyRatePct?: number;
};

export function trend(entries: BodyEntry[], today = dayKey()): Trend {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const average = weekAverage(sorted, today) ?? undefined;
  const previousAverage = weekAverage(sorted, addDays(today, -7)) ?? undefined;
  const weeklyRatePct = average != null && previousAverage != null ? ((average - previousAverage) / previousAverage) * 100 : undefined;
  return { latest, average, previousAverage, weeklyRatePct };
}

/** Daily weights and the 7-day average line for the last `days` days, oldest first. */
export function series(entries: BodyEntry[], days = 56, today = dayKey()): { date: string; kg?: number; avg?: number }[] {
  const byDate = new Map(entries.map((e) => [e.date, e.kg]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    out.push({ date, kg: byDate.get(date), avg: weekAverage(entries, date) ?? undefined });
  }
  return out;
}

/** Saves today's (or another day's) weight and keeps the profile weight current. */
export async function logWeight(kg: number, date = dayKey()): Promise<void> {
  await db.transaction('rw', db.body, db.profile, async () => {
    await db.body.put({ date, kg: Math.round(kg * 100) / 100 });
    const latest = await db.body.orderBy('date').last();
    const profile = await db.profile.get('me');
    if (profile && latest) await db.profile.put({ ...profile, weightKg: Math.round(latest.kg * 10) / 10 });
  });
}

export const deleteWeight = (date: string) => db.body.delete(date);

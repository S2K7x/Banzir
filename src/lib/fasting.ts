import { dayKey } from './body';
import { db, getKV, setKV } from './db';
import { uid } from './matcher';
import type { Fast } from './schema';

/**
 * Time-restricted eating: an eating window per weekday, a timer for the fast
 * in progress, and a log with a 1-5 rating. The fast "of day D" runs from the
 * close of the window on D-1 to the opening on D. Ported from the legacy app.
 *
 * Evidence (docs/science/nutrition-fat-loss.md): with the same food, a short
 * eating window gives no extra fat loss; it is a way to organise eating, not a
 * tool on its own. Very short windows make 3-4 protein meals hard, so the app
 * defaults to a 12-hour overnight fast and flags windows under 8 hours.
 * Safety (docs/science/populations-safety.md): not offered to minors, during
 * pregnancy or when underweight; a caution for eating disorders and diabetes
 * medicines.
 */

export type DayWindow = { open: string; close: string };
export type FastingSettings = { schedule: DayWindow[] };

const KEY = 'fasting.settings';
const HOUR = 3_600_000;
const MIN = 60_000;
/** A fast within 15 minutes of the plan counts as done. */
export const ON_TARGET_SLACK = 15 * MIN;
/** Longest fast the log accepts; longer is almost always a typing mistake. */
export const MAX_FAST_HOURS = 72;

export const PRESETS: { id: string; label: string; hint: string; window: DayWindow }[] = [
  { id: '12:12', label: '12:12', hint: 'Overnight fast, the easiest start', window: { open: '08:00', close: '20:00' } },
  { id: '14:10', label: '14:10', hint: 'A later breakfast', window: { open: '09:00', close: '19:00' } },
  { id: '16:8', label: '16:8', hint: 'Skip breakfast, eat noon to 8 pm', window: { open: '12:00', close: '20:00' } },
];

export const defaultFasting = (): FastingSettings => ({ schedule: Array.from({ length: 7 }, () => ({ ...PRESETS[0].window })) });

export async function getFastingSettings(): Promise<FastingSettings> {
  const s = await getKV<FastingSettings>(KEY);
  return s?.schedule?.length === 7 ? s : defaultFasting();
}
export const saveFastingSettings = (s: FastingSettings) => setKV(KEY, s);

export { fastingBlocked, FASTING_CAUTION } from './fastingSafety';

/* ---------- Time ---------- */

export function atTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function plusDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** "16 h 05", "45 min". */
export function hours(ms: number): string {
  const min = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`;
}

/** "15:42" as hours:minutes for the big timer. */
export function clock(ms: number): string {
  const min = Math.max(0, Math.floor(ms / MIN));
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

/** Length of a day's eating window in hours; a close after midnight belongs to the same day. */
export function windowHours(w: DayWindow): number {
  const [oh, om] = w.open.split(':').map(Number);
  const [ch, cm] = w.close.split(':').map(Number);
  let mins = ch * 60 + cm - (oh * 60 + om);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}

/** The eating window of a calendar day. */
export function windowOf(date: Date, s: FastingSettings): { open: Date; close: Date } {
  const w = s.schedule[date.getDay()];
  const open = atTime(date, w.open);
  let close = atTime(date, w.close);
  if (close <= open) close = plusDays(close, 1);
  return { open, close };
}

/** The planned fast that ends on `date`: from yesterday's close to today's opening. */
export function plannedFast(date: Date, s: FastingSettings): { start: Date; end: Date } {
  return { start: windowOf(plusDays(date, -1), s).close, end: windowOf(date, s).open };
}

/** The opening that ends a fast started at `t`. */
export function nextOpening(t: Date, s: FastingSettings): Date {
  for (let i = 0; i < 3; i++) {
    const o = windowOf(plusDays(t, i), s).open;
    if (o.getTime() - t.getTime() > 30 * MIN) return o;
  }
  return new Date(t.getTime() + 16 * HOUR);
}

export const duration = (f: Fast, now = Date.now()) => (f.end ? new Date(f.end).getTime() : now) - new Date(f.start).getTime();
export const openFast = (fasts: Fast[]) => fasts.find((f) => !f.end);
export const lastFast = (fasts: Fast[]) => fasts.filter((f) => f.end).sort((a, b) => b.end!.localeCompare(a.end!))[0];

/** The fast that ended on a calendar day (the longest if there were several). */
export function fastForDay(fasts: Fast[], key: string): Fast | undefined {
  return fasts.filter((f) => f.end && dayKey(new Date(f.end)) === key).sort((a, b) => duration(b) - duration(a))[0];
}

/* ---------- What the timer shows ---------- */

export type FastingNow =
  | { kind: 'fasting'; fast: Fast; start: Date; target: Date; elapsed: number; total: number }
  | { kind: 'eating'; open: Date; close: Date; left: number; last?: Fast }
  /** Outside the window with no fast running: the start button was probably forgotten. */
  | { kind: 'closed'; since: Date; next: Date; elapsed: number };

export function fastingNow(fasts: Fast[], s: FastingSettings, now = new Date()): FastingNow {
  const o = openFast(fasts);
  if (o) {
    const start = new Date(o.start);
    const target = nextOpening(start, s);
    return { kind: 'fasting', fast: o, start, target, elapsed: now.getTime() - start.getTime(), total: target.getTime() - start.getTime() };
  }
  const w = windowOf(now, s);
  const beforeOpen = now < w.open;
  const prevClose = beforeOpen ? windowOf(plusDays(now, -1), s).close : w.close;
  const last = lastFast(fasts);
  // Eating: inside today's window, or a fast already ended earlier than planned this morning.
  const brokeEarly = beforeOpen && last && new Date(last.end!) > prevClose;
  if (now < w.close && (!beforeOpen || brokeEarly)) return { kind: 'eating', open: w.open, close: w.close, left: w.close.getTime() - now.getTime(), last };
  // A window that closes after midnight is still open in the small hours.
  const y = windowOf(plusDays(now, -1), s);
  if (now < y.close) return { kind: 'eating', open: y.open, close: y.close, left: y.close.getTime() - now.getTime(), last };
  const next = beforeOpen ? w.open : windowOf(plusDays(now, 1), s).open;
  return { kind: 'closed', since: prevClose, next, elapsed: now.getTime() - prevClose.getTime() };
}

/* ---------- Week summary ---------- */

export type FastDay = { key: string; date: Date; fast?: Fast; planned: number; actual: number; past: boolean; onTarget: boolean };

/** Monday-to-Sunday view of the week containing `now`. */
export function fastingWeek(fasts: Fast[], s: FastingSettings, now = new Date()): { days: FastDay[]; logged: number; past: number; average: number; onTarget: number } {
  const monday = plusDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -((now.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = plusDays(monday, i);
    const key = dayKey(date);
    const fast = fastForDay(fasts, key);
    const p = plannedFast(date, s);
    const planned = p.end.getTime() - p.start.getTime();
    const actual = fast ? duration(fast) : 0;
    return { key, date, fast, planned, actual, past: p.end <= now, onTarget: !!fast && actual >= planned - ON_TARGET_SLACK };
  });
  const done = days.filter((d) => d.fast);
  return {
    days,
    logged: done.length,
    past: days.filter((d) => d.past).length,
    average: done.length ? done.reduce((n, d) => n + d.actual, 0) / done.length : 0,
    onTarget: done.filter((d) => d.onTarget).length,
  };
}

/* ---------- Storage ---------- */

export const allFasts = () => db.fasts.orderBy('start').reverse().toArray();

export async function startFast(at = new Date()): Promise<Fast | undefined> {
  if (openFast(await db.fasts.toArray())) return undefined;
  const f: Fast = { id: uid('fast'), start: at.toISOString() };
  await db.fasts.put(f);
  return f;
}

export async function endFast(at = new Date()): Promise<Fast | undefined> {
  const o = openFast(await db.fasts.toArray());
  if (!o) return undefined;
  const f = { ...o, end: at.toISOString() };
  await db.fasts.put(f);
  return f;
}

/** Checks a fast typed by hand. Returns an error message or null. */
export function checkFast(f: Pick<Fast, 'start' | 'end'>, others: Fast[], id?: string, now = new Date()): string | null {
  const start = new Date(f.start);
  if (Number.isNaN(start.getTime())) return 'The start time is not valid.';
  if (!f.end) {
    if (start > now) return 'The start is in the future.';
    if (others.some((o) => !o.end && o.id !== id)) return 'Another fast is already running.';
    return null;
  }
  const end = new Date(f.end);
  if (Number.isNaN(end.getTime())) return 'The end time is not valid.';
  if (end <= start) return 'The end must be after the start.';
  if (end.getTime() > now.getTime() + 60_000) return 'The end is in the future. Leave it empty while the fast is running.';
  if (end.getTime() - start.getTime() > MAX_FAST_HOURS * HOUR) return `More than ${MAX_FAST_HOURS} hours? Check the dates.`;
  return null;
}

export const saveFast = (f: Fast) => db.fasts.put(f);
export const deleteFast = (id: string) => db.fasts.delete(id);

/** Logs the planned fast for a day that was not tracked. */
export async function confirmPlanned(date: Date, s: FastingSettings): Promise<Fast> {
  const p = plannedFast(date, s);
  const f: Fast = { id: uid('fast'), start: p.start.toISOString(), end: p.end.toISOString() };
  await db.fasts.put(f);
  return f;
}

/** A meal logged today during a running fast ends it at the meal time. */
export async function endFastWithMeal(date: string, time: string, now = new Date()): Promise<Fast | undefined> {
  if (date !== dayKey(now)) return undefined;
  const o = openFast(await db.fasts.toArray());
  if (!o) return undefined;
  const at = atTime(now, time);
  if (at <= new Date(o.start) || at.getTime() > now.getTime() + MIN) return undefined;
  const f = { ...o, end: at.toISOString() };
  await db.fasts.put(f);
  return f;
}

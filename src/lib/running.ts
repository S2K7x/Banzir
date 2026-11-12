import { db, getKV, setKV } from './db';
import { uid } from './matcher';
import type { Profile, Run, Session } from './schema';

/**
 * The run log: distance, time, pace and heart rate, from manual entries, GPX
 * files and run sessions. Evidence: docs/science/running.md.
 * - Maximum heart rate is estimated with Tanaka (208 - 0.7 x age), which has
 *   an error of about 10 beats a minute; a measured value replaces it.
 * - Zones follow the common five-zone convention, on heart-rate reserve when
 *   the resting rate is known (Karvonen), otherwise on maximum heart rate.
 * - The single-run rule: a run more than 10 % longer than the longest run of
 *   the previous 30 days was linked to more overuse injuries (Frandsen 2025).
 * - Race equivalents use Riegel's formula, which fits up to the half marathon
 *   and is too optimistic for the marathon in recreational runners.
 */

export type RunningSettings = { maxHr?: number; restHr?: number; /** Recent 5 km time in seconds. */ fiveK?: number };
const KEY = 'running.settings';

export const getRunningSettings = async (): Promise<RunningSettings> => (await getKV<RunningSettings>(KEY)) ?? {};
export const saveRunningSettings = (s: RunningSettings) => setKV(KEY, s);

/* ---------- Heart rate ---------- */

export const tanaka = (age: number) => Math.round(208 - 0.7 * age);

/** Measured maximum if known, else the age estimate, else nothing. */
export function maxHrOf(profile: Pick<Profile, 'age'> | null | undefined, s: RunningSettings): { bpm: number; estimated: boolean } | null {
  if (s.maxHr) return { bpm: s.maxHr, estimated: false };
  if (profile?.age) return { bpm: tanaka(profile.age), estimated: true };
  return null;
}

export const ZONES = [
  { zone: 1, name: 'Recovery', lo: 0.5, hi: 0.6, feel: 'Very easy, walking or gentle jogging' },
  { zone: 2, name: 'Easy', lo: 0.6, hi: 0.7, feel: 'Conversational: you can talk in full sentences' },
  { zone: 3, name: 'Steady', lo: 0.7, hi: 0.8, feel: 'Comfortable but you notice your breathing' },
  { zone: 4, name: 'Threshold', lo: 0.8, hi: 0.9, feel: 'Comfortably hard: only a few words at a time' },
  { zone: 5, name: 'Hard', lo: 0.9, hi: 1, feel: 'Hard intervals; talking is not possible' },
] as const;

export type ZoneRange = { zone: number; name: string; feel: string; from: number; to: number };

/** Beats per minute for each zone. With a resting rate the bands sit on heart-rate reserve. */
export function hrZones(maxHr: number, restHr?: number): ZoneRange[] {
  const base = restHr && restHr < maxHr ? restHr : 0;
  const span = maxHr - base;
  return ZONES.map((z) => ({ zone: z.zone, name: z.name, feel: z.feel, from: Math.round(base + span * z.lo), to: Math.round(base + span * z.hi) }));
}

/** "Heart-rate zone 2 · 118-138 bpm", or null when no maximum is known. */
export function zoneText(zone: number, profile: Pick<Profile, 'age'> | null | undefined, s: RunningSettings): string | null {
  const max = maxHrOf(profile, s);
  if (!max) return null;
  const z = hrZones(max.bpm, s.restHr)[zone - 1];
  return z ? `${z.from}-${z.to} bpm` : null;
}

/* ---------- Pace and race equivalents ---------- */

export const DISTANCES = [
  { id: '5k', label: '5 km', meters: 5000 },
  { id: '10k', label: '10 km', meters: 10000 },
  { id: 'half', label: 'Half marathon', meters: 21097.5 },
  { id: 'marathon', label: 'Marathon', meters: 42195 },
] as const;

/** Riegel: T2 = T1 x (D2 / D1)^1.06. */
export const riegel = (seconds: number, fromMeters: number, toMeters: number) => seconds * (toMeters / fromMeters) ** 1.06;

/** Seconds per kilometre. */
export const paceOf = (seconds: number, meters: number) => (meters > 0 ? seconds / (meters / 1000) : 0);

/** "1:23:45" or "24:05". */
export function hms(total: number): string {
  const t = Math.round(total);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export type Equivalent = { id: string; label: string; seconds: number; pacePerKm: number; optimistic: boolean };

export function equivalents(fiveK: number): Equivalent[] {
  return DISTANCES.map((d) => {
    const seconds = d.id === '5k' ? fiveK : riegel(fiveK, 5000, d.meters);
    return { id: d.id, label: d.label, seconds, pacePerKm: paceOf(seconds, d.meters), optimistic: d.id === 'marathon' };
  });
}

/**
 * Training paces as ranges in seconds per km, from a 5 km time. Coaching
 * conventions, not lab values: intervals near 5 km race pace, tempo between
 * 10 km and half-marathon race pace. Easy running goes by feel or heart rate.
 */
export function trainingPaces(fiveK: number): { intervals: [number, number]; tempo: [number, number] } {
  const e = equivalents(fiveK);
  const p5 = e[0].pacePerKm;
  return { intervals: [p5 - 5, p5 + 5], tempo: [e[1].pacePerKm, e[2].pacePerKm] };
}

/* ---------- Volume and the single-run rule ---------- */

const DAY = 86_400_000;

export type LongestRecent = { meters: number; seconds: number; capMeters: number; capSeconds: number; days: number };

/** Longest run of the 30 days before `now`, and 10 % above it. Null without runs. */
export function longestRecent(runs: Run[], now = new Date(), days = 30): LongestRecent | null {
  const from = now.getTime() - days * DAY;
  const recent = runs.filter((r) => {
    const t = new Date(r.date).getTime();
    return t >= from && t < now.getTime();
  });
  if (!recent.length) return null;
  const meters = Math.max(0, ...recent.map((r) => r.meters ?? 0));
  const seconds = Math.max(...recent.map((r) => r.seconds));
  return { meters, seconds, capMeters: meters * 1.1, capSeconds: seconds * 1.1, days };
}

/** True when this run is more than 10 % longer than the longest of the previous 30 days. */
export function bigJump(run: Pick<Run, 'date' | 'meters' | 'seconds'>, runs: Run[]): boolean {
  const l = longestRecent(runs, new Date(run.date));
  if (!l) return false;
  if (run.meters && l.meters) return run.meters > l.capMeters;
  return run.seconds > l.capSeconds;
}

const mondayOf = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

/** Distance and time per week, oldest first, ending with the current week. */
export function weeklyRuns(runs: Run[], weeks = 8, now = new Date()): { start: Date; meters: number; seconds: number; count: number }[] {
  const thisMonday = mondayOf(now);
  return Array.from({ length: weeks }, (_, i) => {
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - 7 * (weeks - 1 - i));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const inWeek = runs.filter((r) => {
      const t = new Date(r.date);
      return t >= start && t < end;
    });
    return { start, meters: inWeek.reduce((n, r) => n + (r.meters ?? 0), 0), seconds: inWeek.reduce((n, r) => n + r.seconds, 0), count: inWeek.length };
  });
}

/** Fastest logged time for a distance (runs within 2 % of it). */
export function bestFor(runs: Run[], meters: number): Run | undefined {
  return runs.filter((r) => r.meters && Math.abs(r.meters - meters) <= meters * 0.02).sort((a, b) => a.seconds / a.meters! - b.seconds / b.meters!)[0];
}

/* ---------- GPX ---------- */

export type GpxRun = { date: string; seconds: number; meters: number; avgHr?: number; name?: string; points: number };

const R = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;
export function haversine(a: [number, number], b: [number, number]): number {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Reads a GPX 1.1 track: distance along the points, time from the first to
 * the last timestamp, and average heart rate from Garmin-style extensions
 * (any namespace prefix). Throws with a readable message.
 */
export function parseGpx(text: string): GpxRun {
  if (!/<(?:\w+:)?gpx[\s>]/.test(text)) throw new Error('This is not a GPX file.');
  const pts: { ll: [number, number]; t?: number; hr?: number }[] = [];
  const re = /<(?:\w+:)?trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?trkpt>)/g;
  for (const m of text.matchAll(re)) {
    const lat = Number(/\blat\s*=\s*["']([-\d.eE+]+)["']/.exec(m[1])?.[1]);
    const lon = Number(/\blon\s*=\s*["']([-\d.eE+]+)["']/.exec(m[1])?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const body = m[2] ?? '';
    const time = /<(?:\w+:)?time>\s*([^<\s]+)\s*</.exec(body)?.[1];
    const hr = Number(/<(?:\w+:)?hr>\s*(\d+)\s*</.exec(body)?.[1]);
    const t = time ? Date.parse(time) : NaN;
    pts.push({ ll: [lat, lon], t: Number.isFinite(t) ? t : undefined, hr: hr > 0 ? hr : undefined });
  }
  if (pts.length < 2) throw new Error('No track points found in this file.');
  let meters = 0;
  for (let i = 1; i < pts.length; i++) meters += haversine(pts[i - 1].ll, pts[i].ll);
  const times = pts.map((p) => p.t).filter((t): t is number => t != null);
  if (times.length < 2) throw new Error('This track has no timestamps, so its duration is unknown.');
  const seconds = Math.round((Math.max(...times) - Math.min(...times)) / 1000);
  if (seconds <= 0) throw new Error('This track has no duration.');
  const hrs = pts.map((p) => p.hr).filter((h): h is number => h != null);
  const name = /<(?:\w+:)?trk>[\s\S]*?<(?:\w+:)?name>([^<]+)</.exec(text)?.[1]?.trim();
  return {
    date: new Date(Math.min(...times)).toISOString(),
    seconds,
    meters: Math.round(meters),
    avgHr: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : undefined,
    name,
    points: pts.length,
  };
}

/* ---------- Storage ---------- */

export const allRuns = () => db.runs.orderBy('date').toArray();

/** A run starting within 2 minutes of an existing one is the same run. */
export const isDuplicate = (date: string, runs: Run[]) => runs.some((r) => Math.abs(new Date(r.date).getTime() - new Date(date).getTime()) < 120_000);

export async function saveRun(r: Omit<Run, 'id' | 'kind' | 'source'> & Partial<Pick<Run, 'id' | 'kind' | 'source'>>): Promise<Run> {
  const run: Run = { kind: 'easy', source: 'manual', ...r, id: r.id ?? uid('run') };
  await db.runs.put(run);
  return run;
}

export const deleteRun = (id: string) => db.runs.delete(id);

/** What kind of run a session was, from the exercises in it. */
export function kindOfSession(s: Pick<Session, 'entries'>): Run['kind'] {
  const ids = new Set(s.entries.map((e) => e.exerciseId));
  if (ids.has('time_trial')) return 'race';
  if (ids.has('run_intervals') || ids.has('hill_sprints') || ids.has('hard_intervals')) return 'intervals';
  if (ids.has('tempo_run') || ids.has('race_pace_run')) return 'tempo';
  if (ids.has('long_run')) return 'long';
  return 'easy';
}

export const KIND_LABEL: Record<Run['kind'], string> = { easy: 'Easy', long: 'Long', tempo: 'Tempo', intervals: 'Intervals', race: 'Race or test', other: 'Other' };

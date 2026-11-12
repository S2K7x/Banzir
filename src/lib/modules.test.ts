import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildBackup, importBackup } from './backup';
import { db } from './db';
import {
  checkFast,
  confirmPlanned,
  defaultFasting,
  endFast,
  endFastWithMeal,
  fastingBlocked,
  fastingNow,
  fastingWeek,
  hours,
  nextOpening,
  plannedFast,
  startFast,
  windowHours,
  type FastingSettings,
} from './fasting';
import { bigJump, equivalents, hms, hrZones, kindOfSession, longestRecent, maxHrOf, parseGpx, riegel, saveRun, tanaka, trainingPaces, weeklyRuns } from './running';
import type { Fast, Run } from './schema';
import { showDistance, showPace, toMeters, updateSettings } from './settings';
import { addFood } from './nutrition';
import { dayKey } from './body';

const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const S = defaultFasting(); // 08:00-20:00 every day

describe('fasting schedule', () => {
  it('plans the overnight fast from yesterday close to today open', () => {
    const p = plannedFast(local(2026, 11, 12), S);
    expect(p.start).toEqual(local(2026, 11, 11, 20));
    expect(p.end).toEqual(local(2026, 11, 12, 8));
    expect(windowHours(S.schedule[0])).toBe(12);
    expect(windowHours({ open: '18:00', close: '01:00' })).toBe(7);
  });

  it('targets the next opening at least 30 minutes away', () => {
    expect(nextOpening(local(2026, 11, 12, 20, 30), S)).toEqual(local(2026, 11, 13, 8));
    expect(nextOpening(local(2026, 11, 13, 7, 45), S)).toEqual(local(2026, 11, 14, 8));
  });

  it('knows whether you are fasting, eating, or forgot to start', () => {
    const open: Fast = { id: 'a', start: local(2026, 11, 11, 20, 15).toISOString() };
    const f = fastingNow([open], S, local(2026, 11, 12, 6, 15));
    expect(f.kind).toBe('fasting');
    if (f.kind === 'fasting') {
      expect(hours(f.elapsed)).toBe('10 h');
      expect(hours(f.total)).toBe('11 h 45');
    }
    expect(fastingNow([], S, local(2026, 11, 12, 13)).kind).toBe('eating');
    const closed = fastingNow([], S, local(2026, 11, 12, 22));
    expect(closed.kind).toBe('closed');
    if (closed.kind === 'closed') expect(closed.next).toEqual(local(2026, 11, 13, 8));
    // Ended early this morning: eating, not "forgot to start".
    const early: Fast = { id: 'b', start: local(2026, 11, 11, 20).toISOString(), end: local(2026, 11, 12, 7).toISOString() };
    expect(fastingNow([early], S, local(2026, 11, 12, 7, 30)).kind).toBe('eating');
  });

  it('handles a window that closes after midnight', () => {
    const late: FastingSettings = { schedule: Array.from({ length: 7 }, () => ({ open: '14:00', close: '01:00' })) };
    expect(fastingNow([], late, local(2026, 11, 12, 0, 30)).kind).toBe('eating');
    expect(fastingNow([], late, local(2026, 11, 12, 3)).kind).toBe('closed');
  });

  it('summarises the week against the plan', () => {
    const fasts: Fast[] = [
      { id: '1', start: local(2026, 11, 9, 20).toISOString(), end: local(2026, 11, 10, 8).toISOString() },
      { id: '2', start: local(2026, 11, 10, 21).toISOString(), end: local(2026, 11, 11, 7).toISOString() },
    ];
    const w = fastingWeek(fasts, S, local(2026, 11, 12, 12)); // a Thursday
    expect(w.days[0].key).toBe('2026-11-09');
    expect(w.logged).toBe(2);
    expect(w.past).toBe(4);
    expect(w.onTarget).toBe(1);
    expect(hours(w.average)).toBe('11 h');
  });

  it('rejects impossible entries', () => {
    const now = local(2026, 11, 12, 12);
    expect(checkFast({ start: local(2026, 11, 12, 8).toISOString(), end: local(2026, 11, 12, 7).toISOString() }, [], undefined, now)).toMatch(/after the start/);
    expect(checkFast({ start: local(2026, 11, 1).toISOString(), end: local(2026, 11, 5).toISOString() }, [], undefined, now)).toMatch(/72 hours/);
    expect(checkFast({ start: local(2026, 11, 12, 13).toISOString() }, [], undefined, now)).toMatch(/future/);
    expect(checkFast({ start: local(2026, 11, 12, 9).toISOString() }, [{ id: 'x', start: local(2026, 11, 12, 1).toISOString() }], undefined, now)).toMatch(/already running/);
  });

  it('is not offered to minors, in pregnancy or when underweight', () => {
    expect(fastingBlocked({ age: 16, flags: [] })).toMatch(/under 18/);
    expect(fastingBlocked({ age: 30, flags: ['pregnant'] })).toMatch(/pregnancy/);
    expect(fastingBlocked({ age: 30, flags: [], heightCm: 175, weightKg: 54 })).toMatch(/low for your height/);
    expect(fastingBlocked({ age: 30, flags: [], heightCm: 175, weightKg: 70 })).toBeNull();
  });

  it('starts, ends, confirms and is ended by a meal', async () => {
    await db.fasts.clear();
    const now = new Date();
    const start = new Date(now.getTime() - 10 * 3600_000);
    await startFast(start);
    expect(await startFast()).toBeUndefined(); // only one at a time
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const ended = await endFastWithMeal(today, `${hh}:${mm}`, now);
    // Ends at the meal time when the meal is after the start (always, unless the fast began before midnight and the clock is just past it).
    if (start.getDate() === now.getDate()) expect(ended?.end).toBeDefined();
    else await endFast(now);
    expect(await endFast()).toBeUndefined();
    await confirmPlanned(local(2026, 11, 12), S);
    expect(await db.fasts.count()).toBe(2);
  });
});

describe('fasting and the food log', () => {
  it('a meal logged during a running fast ends it at the meal time', async () => {
    await db.fasts.clear();
    const now = new Date();
    if (now.getHours() < 1) return; // the fast must start earlier the same day
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    await db.fasts.put({ id: 'open', start: start.toISOString() });
    updateSettings({ modules: { nutrition: true, body: false, running: false, fasting: true } });
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    await addFood({ date: dayKey(now), time, name: 'Eggs', kcal: 200 });
    const f = await db.fasts.get('open');
    expect(f?.end).toBeDefined();
    expect(new Date(f!.end!).getHours()).toBe(now.getHours());
    updateSettings({ modules: { nutrition: false, body: false, running: false, fasting: false } });
  });
});

/* ---------- Running ---------- */

const run = (daysAgo: number, km: number, min: number, now: Date): Run => ({
  id: `r${daysAgo}`,
  date: new Date(now.getTime() - daysAgo * 86400_000).toISOString(),
  meters: km * 1000,
  seconds: min * 60,
  kind: 'easy',
  source: 'manual',
});

describe('running', () => {
  it('estimates heart-rate zones', () => {
    expect(tanaka(40)).toBe(180);
    expect(maxHrOf({ age: 40 }, {})).toEqual({ bpm: 180, estimated: true });
    expect(maxHrOf({ age: 40 }, { maxHr: 191 })).toEqual({ bpm: 191, estimated: false });
    expect(maxHrOf({}, {})).toBeNull();
    const z = hrZones(180);
    expect(z[1]).toMatchObject({ zone: 2, from: 108, to: 126 });
    // Karvonen: reserve 120 bpm above a resting 60.
    expect(hrZones(180, 60)[1]).toMatchObject({ from: 132, to: 144 });
  });

  it('predicts race equivalents with Riegel', () => {
    expect(Math.round(riegel(1500, 5000, 10000))).toBe(3127);
    const e = equivalents(25 * 60);
    expect(hms(e[1].seconds)).toBe('52:07');
    expect(hms(e[2].seconds)).toBe('1:55:00');
    expect(e[3].optimistic).toBe(true);
    const p = trainingPaces(25 * 60);
    expect(Math.round(p.intervals[0])).toBe(295); // 5:00 /km minus 5 s
    expect(p.tempo[0]).toBeLessThan(p.tempo[1]);
  });

  it('flags a run more than 10 % longer than the longest of 30 days', () => {
    const now = new Date('2026-11-12T08:00:00Z');
    const runs = [run(3, 8, 48, now), run(10, 6, 36, now), run(40, 15, 90, now)];
    const l = longestRecent(runs, now)!;
    expect(l.meters).toBe(8000); // the 15 km run is older than 30 days
    expect(Math.round(l.capMeters)).toBe(8800);
    expect(bigJump({ date: now.toISOString(), meters: 9000, seconds: 3300 }, runs)).toBe(true);
    expect(bigJump({ date: now.toISOString(), meters: 8500, seconds: 3100 }, runs)).toBe(false);
    // Without distance, duration decides.
    expect(bigJump({ date: now.toISOString(), seconds: 55 * 60 }, runs)).toBe(true);
    expect(longestRecent([], now)).toBeNull();
  });

  it('adds up weeks', () => {
    const now = new Date(2026, 10, 12, 12); // Thursday
    const runs = [run(1, 5, 30, now), run(2, 4, 25, now), run(8, 10, 60, now)];
    const w = weeklyRuns(runs, 4, now);
    expect(w).toHaveLength(4);
    expect(w[3].meters).toBe(9000);
    expect(w[2].meters).toBe(10000);
  });

  it('reads a GPX track with heart rate under any prefix', () => {
    const gpx = `<?xml version="1.0"?><gpx version="1.1" xmlns:ns3="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><trk><name>Morning Run</name><trkseg>
      <trkpt lat="48.8566" lon="2.3522"><ele>35</ele><time>2026-11-10T07:00:00Z</time><extensions><ns3:TrackPointExtension><ns3:hr>120</ns3:hr></ns3:TrackPointExtension></extensions></trkpt>
      <trkpt lon="2.3612" lat="48.8566"><time>2026-11-10T07:03:30Z</time><extensions><ns3:TrackPointExtension><ns3:hr>140</ns3:hr></ns3:TrackPointExtension></extensions></trkpt>
      <trkpt lat="48.8656" lon="2.3612"><time>2026-11-10T07:08:00Z</time></trkpt>
    </trkseg></trk></gpx>`;
    const r = parseGpx(gpx);
    expect(r.name).toBe('Morning Run');
    expect(r.seconds).toBe(480);
    expect(r.avgHr).toBe(130);
    expect(r.meters).toBeGreaterThan(1650);
    expect(r.meters).toBeLessThan(1680);
    expect(r.date).toBe('2026-11-10T07:00:00.000Z');
    expect(() => parseGpx('<html></html>')).toThrow(/not a GPX/);
    expect(() => parseGpx('<gpx><trk><trkpt lat="1" lon="1"/><trkpt lat="1" lon="1.01"/></trk></gpx>')).toThrow(/timestamps/);
  });

  it('formats distance and pace in both unit systems', () => {
    expect(showDistance(10000, 'metric')).toBe(10);
    expect(showDistance(10000, 'imperial')).toBe(6.21);
    expect(Math.round(toMeters(1, 'imperial'))).toBe(1609);
    expect(showPace(1500, 5000, 'metric')).toBe('5:00 /km');
    expect(showPace(1500, 5000, 'imperial')).toBe('8:03 /mi');
  });

  it('names the run of a session from its exercises', () => {
    expect(kindOfSession({ entries: [{ exerciseId: 'easy_run', sets: [] }, { exerciseId: 'run_intervals', sets: [] }] })).toBe('intervals');
    expect(kindOfSession({ entries: [{ exerciseId: 'long_run', sets: [] }] })).toBe('long');
  });

  it('round-trips runs and fasts through a backup', async () => {
    await db.runs.clear();
    await db.fasts.clear();
    await saveRun({ date: '2026-11-10T07:00:00.000Z', seconds: 1800, meters: 5000, source: 'gpx' });
    await db.fasts.put({ id: 'f1', start: '2026-11-09T20:00:00.000Z', end: '2026-11-10T08:00:00.000Z', feel: 4 });
    const backup = await buildBackup();
    expect(backup.format).toBe(3);
    await db.runs.clear();
    await db.fasts.clear();
    await importBackup(JSON.stringify({ ...backup, settings: undefined }));
    expect(await db.runs.count()).toBe(1);
    expect((await db.fasts.get('f1'))?.feel).toBe(4);
    // A format-2 file without the new tables still restores.
    const old = { ...backup, format: 2, runs: undefined, fasts: undefined, settings: undefined };
    await importBackup(JSON.stringify(old));
    expect(await db.runs.count()).toBe(0);
  });
});

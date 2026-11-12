import { db } from './db';
import { getSettings, updateSettings, type Settings } from './settings';

/** One JSON file holding everything the app stores. */

/** 2 added body weight and the food log, 3 runs and fasts. Older files still restore. */
const FORMAT = 3;

export type Backup = {
  app: 'banzir';
  format: number;
  exportedAt: string;
  settings: Settings;
  profile: unknown[];
  programs: unknown[];
  sessions: unknown[];
  kv: { key: string; value: unknown }[];
  body?: unknown[];
  foods?: unknown[];
  runs?: unknown[];
  fasts?: unknown[];
};

/** Every table a backup holds; a restore or erase clears them all. */
const TABLES = () => [db.profile, db.programs, db.sessions, db.kv, db.body, db.foods, db.runs, db.fasts];

export async function buildBackup(): Promise<Backup> {
  const [profile, programs, sessions, kv, body, foods, runs, fasts] = await Promise.all([
    db.profile.toArray(),
    db.programs.toArray(),
    db.sessions.toArray(),
    db.kv.toArray(),
    db.body.toArray(),
    db.foods.toArray(),
    db.runs.toArray(),
    db.fasts.toArray(),
  ]);
  // The AI key never leaves the device in a backup file.
  const safeKv = kv.map((row) => (row.key === 'coach.config' && row.value && typeof row.value === 'object' ? { ...row, value: { ...(row.value as object), apiKey: '' } } : row));
  return { app: 'banzir', format: FORMAT, exportedAt: new Date().toISOString(), settings: getSettings(), profile, programs, sessions, kv: safeKv, body, foods, runs, fasts };
}

export async function exportBackup(): Promise<void> {
  const data = await buildBackup();
  const name = `banzir-backup-${data.exportedAt.slice(0, 10)}.json`;
  const file = new File([JSON.stringify(data)], name, { type: 'application/json' });
  // The share sheet is the reliable way to save a file from an installed iOS app.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Banzir backup' });
      updateSettings({ lastBackup: data.exportedAt });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  updateSettings({ lastBackup: data.exportedAt });
}

/** Replaces all local data with the backup. Throws with a readable message if the file is not usable. */
export async function importBackup(text: string): Promise<{ sessions: number }> {
  let data: Backup;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (data?.app !== 'banzir') throw new Error('This is not a Banzir backup file.');
  if (data.format > FORMAT) throw new Error('This backup comes from a newer version of Banzir. Update the app first.');

  // The validation library is only needed here, so it is loaded on demand.
  const { Profile, Program, Session, BodyEntry, FoodEntry, Run, Fast } = await import('./schema');
  const profile = (data.profile ?? []).map((p) => Profile.parse(p));
  const programs = (data.programs ?? []).map((p) => Program.parse(p));
  const sessions = (data.sessions ?? []).map((s) => Session.parse(s));
  const body = (data.body ?? []).map((b) => BodyEntry.parse(b));
  const foods = (data.foods ?? []).map((f) => FoodEntry.parse(f));
  const runs = (data.runs ?? []).map((r) => Run.parse(r));
  const fasts = (data.fasts ?? []).map((f) => Fast.parse(f));
  // A key saved on this device survives a restore, because backups never contain it.
  const coach = await db.kv.get('coach.config');

  await db.transaction('rw', TABLES(), async () => {
    await Promise.all(TABLES().map((t) => t.clear()));
    await db.profile.bulkPut(profile);
    await db.programs.bulkPut(programs);
    await db.sessions.bulkPut(sessions);
    await db.kv.bulkPut(data.kv ?? []);
    await db.body.bulkPut(body);
    await db.foods.bulkPut(foods);
    await db.runs.bulkPut(runs);
    await db.fasts.bulkPut(fasts);
    const restored = (data.kv ?? []).find((k) => k.key === 'coach.config')?.value as { apiKey?: string } | undefined;
    const local = coach?.value as { apiKey?: string } | undefined;
    if (local?.apiKey && restored && !restored.apiKey) await db.kv.put({ key: 'coach.config', value: { ...restored, apiKey: local.apiKey } });
  });
  if (data.settings) updateSettings({ ...data.settings, lastBackup: getSettings().lastBackup });
  return { sessions: sessions.length };
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', TABLES(), async () => {
    await Promise.all(TABLES().map((t) => t.clear()));
  });
}

/** Sessions as CSV, one row per set, for spreadsheets. */
export async function exportCsv(nameOf: (exerciseId: string) => string): Promise<void> {
  const sessions = await db.sessions.orderBy('date').toArray();
  const rows = [['date', 'session', 'exercise', 'set', 'reps', 'kg', 'seconds']];
  for (const s of sessions) {
    for (const e of s.entries) {
      e.sets.forEach((set, i) => {
        if (set.done) rows.push([s.date, s.dayName, nameOf(e.exerciseId), String(i + 1), String(set.reps ?? ''), String(set.kg ?? ''), String(set.seconds ?? '')]);
      });
    }
  }
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'banzir-sessions.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

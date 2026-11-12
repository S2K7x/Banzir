import Dexie, { type EntityTable, type Table } from 'dexie';
import type { BodyEntry, Entry, Fast, FoodEntry, Profile, Program, Run, Session } from './schema';
import type { ProgramState } from './programState';

/** In-progress workout, saved after every change so it survives a reload. */
export type ActiveSession = {
  programId?: string;
  dayId?: string;
  dayName: string;
  startedAt: number;
  entries: Entry[];
  /** Index of the item currently shown. */
  cursor: number;
  light?: boolean;
};

type KV = { key: string; value: unknown };

class BanzirDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  programs!: EntityTable<Program, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  kv!: Table<KV, string>;
  body!: EntityTable<BodyEntry, 'date'>;
  foods!: EntityTable<FoodEntry, 'id'>;
  runs!: EntityTable<Run, 'id'>;
  fasts!: EntityTable<Fast, 'id'>;

  constructor() {
    super('banzir');
    this.version(1).stores({
      profile: 'id',
      programs: 'id',
      sessions: 'id, date',
      kv: 'key',
    });
    // Version 2 adds body weight and the food log; existing data is untouched.
    this.version(2).stores({
      body: 'date',
      foods: 'id, date',
    });
    // Version 3 adds the run log and fasting log.
    this.version(3).stores({
      runs: 'id, date',
      fasts: 'id, start',
    });
  }
}

export const db = new BanzirDB();

export async function getKV<T>(key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined;
}

export function setKV(key: string, value: unknown) {
  return db.kv.put({ key, value });
}

export const getState = () => getKV<ProgramState>('state');
export const setState = (s: ProgramState) => setKV('state', s);
export const getActive = () => getKV<ActiveSession>('active');
export const setActive = (a: ActiveSession) => setKV('active', a);
export const clearActive = () => db.kv.delete('active');

export const saveProgram = (program: Program) => db.programs.put(program);

/**
 * Makes a program the active one and restarts progress through it. A previous
 * plan that was never edited is removed; edited and self-made ones are kept.
 */
export async function activateProgram(program: Program) {
  await db.transaction('rw', db.programs, db.kv, async () => {
    const state = await getState();
    const previous = state && state.programId !== program.id ? await db.programs.get(state.programId) : undefined;
    if (previous?.source === 'template') await db.programs.delete(previous.id);
    await db.programs.put(program);
    await setState({ programId: program.id, completed: 0, startedAt: new Date().toISOString() });
  });
}

/** Asks the browser not to evict our data. Returns whether it agreed. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* unsupported */
  }
  return false;
}

import { getExercise } from '../data/exercises';
import { clearActive, db, getState, setActive, setState, type ActiveSession } from './db';
import { uid } from './matcher';
import { historyFor, suggest } from './progression';
import type { DayTemplate, Entry, Item, Program, Session } from './schema';

export const flatItems = (day: DayTemplate): Item[] => day.blocks.flatMap((b) => b.items);

/** Opens a workout for a program day, pre-filling loads from the progression engine. */
export async function startWorkout(program: Program, day: DayTemplate, sessions: Session[], light = false): Promise<void> {
  const entries: Entry[] = flatItems(day).map((item) => {
    const p = item.prescription;
    const ex = getExercise(item.exerciseId);
    const n = p.mode === 'reps' || p.mode === 'hold' ? p.sets : 1;
    const s = suggest(item, ex, item.progression ?? program.progression, historyFor(ex.id, sessions));
    return {
      itemId: item.id,
      exerciseId: ex.id,
      sets: Array.from({ length: n }, () => ({ kg: s.kg, done: false })),
    };
  });
  const active: ActiveSession = { programId: program.id, dayId: day.id, dayName: day.name, startedAt: Date.now(), entries, cursor: 0, light };
  await setActive(active);
}

export type FinishOptions = { effort?: number; note?: string };

/** Saves the workout, advances the program and clears the in-progress state. */
export async function finishWorkout(active: ActiveSession, opts: FinishOptions = {}): Promise<Session> {
  const session: Session = {
    id: uid('s'),
    date: new Date().toISOString(),
    programId: active.programId,
    dayId: active.dayId,
    dayName: active.dayName,
    durationSeconds: Math.round((Date.now() - active.startedAt) / 1000),
    entries: active.entries.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length > 0),
    effort: opts.effort,
    note: opts.note || undefined,
  };
  await db.transaction('rw', db.sessions, db.kv, async () => {
    await db.sessions.put(session);
    const state = await getState();
    if (state && state.programId === active.programId) await setState({ ...state, completed: state.completed + 1 });
    await clearActive();
  });
  return session;
}

export const doneSets = (a: ActiveSession): number => a.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

/* ---------- Sound and screen ---------- */

let audio: AudioContext | undefined;

/** Call from a tap so the browser allows sound later. */
export function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    /* no audio available */
  }
}

export function beep(kind: 'tick' | 'go' | 'end' = 'go') {
  if (!audio) return;
  const freq = kind === 'tick' ? 660 : kind === 'go' ? 880 : 520;
  const length = kind === 'tick' ? 0.08 : 0.25;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.2, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + length);
  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + length);
  if (kind !== 'tick') navigator.vibrate?.(kind === 'end' ? [120, 60, 120] : 120);
}

/** Keeps the screen on; returns a function that releases the lock. */
export function keepScreenOn(): () => void {
  let lock: WakeLockSentinel | undefined;
  let released = false;
  const acquire = async () => {
    try {
      if (!released && document.visibilityState === 'visible') lock = await navigator.wakeLock?.request('screen');
    } catch {
      /* not supported or denied */
    }
  };
  void acquire();
  document.addEventListener('visibilitychange', acquire);
  return () => {
    released = true;
    document.removeEventListener('visibilitychange', acquire);
    void lock?.release();
  };
}

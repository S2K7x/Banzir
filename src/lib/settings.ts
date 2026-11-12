import { useSyncExternalStore } from 'react';

/**
 * Device preferences. Kept in localStorage (not IndexedDB) so the theme can be
 * applied synchronously before first paint. Included in backups.
 */

export type Settings = {
  theme: string;
  accentHue: number | null;
  radius: 'sharp' | 'round' | 'pill';
  units: 'metric' | 'imperial';
  autoRest: boolean;
  sound: boolean;
  keepAwake: boolean;
  lastBackup: string | null;
  /** Optional modules shown in the app. */
  modules: { nutrition: boolean; body: boolean };
};

const KEY = 'banzir.settings';

const DEFAULTS: Settings = {
  theme: 'midnight',
  accentHue: null,
  radius: 'round',
  units: 'metric',
  autoRest: true,
  sound: true,
  keepAwake: true,
  lastBackup: null,
  modules: { nutrition: false, body: false },
};

function read(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

let current = typeof localStorage === 'undefined' ? DEFAULTS : read();
const listeners = new Set<() => void>();

export function applyAppearance(s: Settings = current) {
  const root = document.documentElement;
  root.dataset.theme = s.theme;
  root.dataset.radius = s.radius;
  if (s.accentHue == null) root.style.removeProperty('--accent-h');
  else root.style.setProperty('--accent-h', String(s.accentHue));
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
}

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* storage unavailable: keep in memory */
  }
  if ('theme' in patch || 'accentHue' in patch || 'radius' in patch) applyAppearance();
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

/* ---------- Units ---------- */

const LB = 2.20462;

/** Stored weights are always kilograms. */
export function showWeight(kg: number, units: Settings['units']): number {
  return units === 'imperial' ? Math.round(kg * LB * 2) / 2 : Math.round(kg * 4) / 4;
}

export function toKg(value: number, units: Settings['units']): number {
  return units === 'imperial' ? value / LB : value;
}

export const weightUnit = (units: Settings['units']) => (units === 'imperial' ? 'lb' : 'kg');

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/** "45 s", "1 min", "1 min 30 s" — for prescriptions. */
export function formatSpan(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const r = seconds % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

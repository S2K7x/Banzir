import type { Equipment, Goal, Level, Prescription } from './schema';
import { formatSpan } from './settings';

/** All user-facing labels live here so languages can be added later. */

export const GOAL_INFO: Record<Goal, { label: string; blurb: string; icon: string; g1: string; g2: string }> = {
  muscle: { label: 'Build muscle', blurb: 'Size and shape', icon: 'dumbbell', g1: '#7b3ff2', g2: '#3b1790' },
  strength: { label: 'Get stronger', blurb: 'Heavier lifts', icon: 'bolt', g1: '#e0483b', g2: '#7a1420' },
  calisthenics: { label: 'Calisthenics skills', blurb: 'Master your bodyweight', icon: 'body', g1: '#1f8fe0', g2: '#0b3a8a' },
  running: { label: 'Run', blurb: 'From first steps to faster', icon: 'run', g1: '#12a87b', g2: '#075a4c' },
  fat_loss: { label: 'Lose fat', blurb: 'Leaner, keep your muscle', icon: 'flame', g1: '#f08a24', g2: '#a8390d' },
  general_fitness: { label: 'General fitness', blurb: 'Stronger, fitter, healthier', icon: 'heart', g1: '#e0489a', g2: '#7a1763' },
  sport: { label: 'Better at a sport', blurb: 'Strength, power, conditioning', icon: 'ball', g1: '#d9a514', g2: '#8a5a05' },
};

export const LEVEL_INFO: Record<Level, { label: string; blurb: string }> = {
  beginner: { label: 'Beginner', blurb: 'New to training, or less than about 6 months of consistent work.' },
  intermediate: { label: 'Intermediate', blurb: '6 months to a few years. You know the main movements.' },
  advanced: { label: 'Advanced', blurb: 'Several years of structured training.' },
};

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  pullup_bar: 'Pull-up bar',
  rings: 'Rings',
  parallettes: 'Parallettes',
  dip_bars: 'Dip bars',
  bands: 'Resistance bands',
  dumbbells: 'Dumbbells',
  kettlebell: 'Kettlebell',
  barbell: 'Barbell',
  rack: 'Squat rack',
  bench: 'Bench',
  cables: 'Cable machine',
  machines: 'Machines',
  medball: 'Medicine ball',
  box: 'Plyo box',
  jump_rope: 'Jump rope',
  heavy_bag: 'Punching bag',
};

export const DISCLAIMER =
  'Banzir gives general training guidance. It is not medical advice. If you have a medical condition, are pregnant, or are unsure whether exercise is safe for you, check with a health professional first. Stop and seek help if you feel chest pain, faintness, or sharp or worsening pain.';

const span = (lo: number, hi: number) => (lo === hi ? String(lo) : `${lo}-${hi}`);

export function describe(p: Prescription): string {
  switch (p.mode) {
    case 'reps':
      return `${p.sets} × ${span(p.reps[0], p.reps[1])}`;
    case 'hold':
      return `${p.sets} × ${span(p.seconds[0], p.seconds[1])} s`;
    case 'time':
      return formatSpan(p.seconds);
    case 'intervals': {
      const inner = p.segments.map((s) => `${s.label} ${formatSpan(s.seconds)}`).join(' / ');
      return p.reps > 1 ? `${p.reps} × (${inner})` : inner;
    }
  }
}

export function effortText(p: Prescription): string | undefined {
  if (p.mode === 'hold') return undefined;
  const t = p.target;
  if (!t) return undefined;
  if (t.type === 'rir') return `Stop ${span(t.value[0], t.value[1])} reps before failure`;
  if (t.type === 'rpe') return `Effort ${span(t.value[0], t.value[1])} out of 10`;
  if (t.type === 'hrZone') return `Heart-rate zone ${t.value}`;
  return `${t.ref} pace`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

import type { DayTemplate, Effort, Program } from '../../lib/schema';
import { DOUBLE, day, h, iv, phase, r, seg, t, template } from './build';

/**
 * Distance plans and strength for runners. Evidence: docs/science/running.md.
 * - About 80 % of running time is easy (zone 2 or a conversational pace).
 * - One or two quality sessions a week: intervals, tempo, hills, race pace.
 * - The long run never grows more than 10 % beyond the longest run of the
 *   previous four weeks (Frandsen et al. 2025). A unit test checks this.
 * - Every fourth week is lighter. Race weeks taper the volume and keep a
 *   little intensity.
 * Running is prescribed in minutes, not kilometres, so the plans work at any
 * pace and without GPS.
 */

const EASY: Effort = { type: 'hrZone', value: 2 };
const HARD: Effort = { type: 'rpe', value: [8, 9] };
const TEMPO: Effort = { type: 'rpe', value: [6, 7] };
const SOURCES = ['docs/science/running.md'];

/** One quality session. Minutes and seconds keep the table below readable. */
type Quality =
  | { kind: 'intervals'; reps: number; work: number; jog: number }
  | { kind: 'tempo'; reps: number; minutes: number; jog: number }
  | { kind: 'steady'; minutes: number }
  | { kind: 'hills'; reps: number; work: number }
  | { kind: 'sharpen'; reps: number };

type Week = {
  /** Easy runs in minutes, in the order they appear in the week. */
  easy: number[];
  quality?: Quality;
  /** Total long-run minutes; `pace` of them at race pace at the end. */
  long: number;
  pace?: number;
  /** Strides after the first easy run. */
  strides?: number;
  light?: boolean;
  /** Race week: the long run becomes the race or a time trial. */
  race?: string;
};

function qualityDay(id: string, q: Quality): DayTemplate {
  const warmup = [t('easy_run', 10, { cue: 'Very easy jog, then a few leg swings and skips.' })];
  const cooldown = [t('cooldown_walk', 5, { p: 2 })];
  switch (q.kind) {
    case 'intervals':
      return day(id, `Intervals ${q.reps} × ${q.work / 60} min`, 'run', ['VO2max'], {
        warmup,
        main: [iv('run_intervals', q.reps, [seg('Hard', q.work), seg('Jog', q.jog, 'rest')], { effort: HARD })],
        cooldown,
      });
    case 'tempo':
      return day(id, `Tempo ${q.reps} × ${q.minutes} min`, 'run', ['Threshold'], {
        warmup,
        main: [iv('tempo_run', q.reps, [seg('Tempo', q.minutes * 60), seg('Jog', q.jog, 'rest')], { effort: TEMPO })],
        cooldown,
      });
    case 'steady':
      return day(id, `Tempo ${q.minutes} min`, 'run', ['Threshold'], { warmup, main: [t('tempo_run', q.minutes, { effort: TEMPO })], cooldown });
    case 'hills':
      return day(id, `Hills ${q.reps} × ${q.work} s`, 'run', ['Strength', 'Economy'], {
        warmup,
        main: [iv('run_intervals', q.reps, [seg('Uphill', q.work), seg('Jog down', q.work * 2, 'rest')], { effort: HARD, cue: 'A 4 to 8 % slope. Drive the knees and arms, stay tall.' })],
        cooldown,
      });
    case 'sharpen':
      return day(id, 'Race-week sharpener', 'run', ['Speed'], {
        warmup,
        main: [iv('run_intervals', q.reps, [seg('Fast', 60), seg('Jog', 120, 'rest')], { effort: { type: 'rpe', value: [7, 8] }, cue: 'Quick and relaxed. You should finish fresh.' })],
        cooldown,
      });
  }
}

function weeks(prefix: string, table: Week[]) {
  return table.map((w, i) => {
    const n = i + 1;
    const id = `${prefix}${n}`;
    const easyDays = w.easy.map((minutes, j) =>
      day(`${id}e${j + 1}`, j === 0 && w.strides ? 'Easy run + strides' : 'Easy run', 'run', ['Aerobic base'], {
        main: [
          t('easy_run', minutes, { effort: EASY }),
          ...(j === 0 && w.strides ? [iv('run_intervals', w.strides, [seg('Stride', 20), seg('Walk', 60, 'rest')], { p: 2, cue: 'Smooth accelerations to about 90 %, not sprints.' })] : []),
        ],
      }),
    );
    const longDay = w.race
      ? day(`${id}race`, w.race, 'run', ['Race'], {
          warmup: [t('easy_run', 10, { cue: 'Easy jog with a few short accelerations.' })],
          main: [t('time_trial', w.long, { cue: 'Start a little slower than you think, then hold an even effort.' })],
          notes: 'Run it as a race or a solo time trial. Note your time: it sets your paces for what comes next.',
        })
      : day(`${id}long`, w.pace ? `Long run with race pace` : 'Long run', 'run', ['Endurance'], {
          main: [t('long_run', w.long - (w.pace ?? 0), { effort: EASY }), ...(w.pace ? [t('race_pace_run', w.pace, { effort: TEMPO })] : [])],
          notes: w.pace ? 'Finish the run at your goal race pace. Practise drinking and fuelling as you will in the race.' : undefined,
        });
    // Quality early in the week, the long run last, easy days spread between.
    const days = w.quality ? [easyDays[0], qualityDay(`${id}q`, w.quality), ...easyDays.slice(1), longDay] : [...easyDays, longDay];
    return phase(id, `Week ${n}${w.light ? ' (lighter)' : ''}${w.race ? ' (race week)' : ''}`, 1, days);
  });
}

const iv3 = (reps: number, work = 180, jog = 120): Quality => ({ kind: 'intervals', reps, work, jog });
const tempo = (reps: number, minutes: number, jog = 180): Quality => ({ kind: 'tempo', reps, minutes, jog });

type RunMeta = Pick<Program, 'id' | 'name' | 'description' | 'level' | 'sessionMinutes'> & { tags: string[]; runMinutes: number };

function runPlan(meta: RunMeta, table: Week[]): Program {
  const runs = table[0].easy.length + (table[0].quality ? 1 : 0) + 1;
  return template({
    ...meta,
    goal: 'running',
    daysPerWeek: runs,
    daysRange: [runs, runs],
    loops: false,
    progression: { type: 'none' },
    prerequisites: { runMinutes: meta.runMinutes },
    sources: SOURCES,
    phases: weeks(meta.id.replace('run-', '') + 'w', table),
  });
}

export const run5k = runPlan(
  {
    id: 'run-5k',
    name: '5 km improver',
    description: 'Eight weeks to run 5 km faster: one quality session, one easy run with strides and a long run each week, ending with a 5 km time trial. For people who can already run about 20 minutes.',
    level: 'beginner',
    sessionMinutes: 40,
    tags: ['5k'],
    runMinutes: 20,
  },
  [
    { easy: [25], strides: 4, quality: iv3(6, 120, 120), long: 35 },
    { easy: [25], strides: 4, quality: iv3(5, 180, 120), long: 38 },
    { easy: [30], strides: 6, quality: tempo(2, 8), long: 41 },
    { easy: [25], quality: iv3(4, 120, 120), long: 33, light: true },
    { easy: [30], strides: 6, quality: iv3(5, 180, 120), long: 45 },
    { easy: [30], strides: 6, quality: tempo(2, 10), long: 48 },
    { easy: [30], strides: 6, quality: iv3(4, 240, 180), long: 50 },
    { easy: [20], strides: 4, quality: { kind: 'sharpen', reps: 6 }, long: 30, race: '5 km time trial' },
  ],
);

export const run10k = runPlan(
  {
    id: 'run-10k',
    name: '10 km',
    description: 'Ten weeks, four runs a week: intervals or tempo, two easy runs and a long run building to about 75 minutes, then a 10 km race or time trial.',
    level: 'intermediate',
    sessionMinutes: 50,
    tags: ['10k'],
    runMinutes: 30,
  },
  [
    { easy: [30, 30], strides: 4, quality: iv3(5), long: 45 },
    { easy: [30, 30], strides: 4, quality: tempo(2, 10), long: 49 },
    { easy: [35, 30], strides: 6, quality: iv3(6), long: 54 },
    { easy: [30, 25], quality: iv3(4), long: 45, light: true },
    { easy: [35, 35], strides: 6, quality: tempo(3, 8, 120), long: 59 },
    { easy: [35, 35], strides: 6, quality: iv3(5, 240, 150), long: 64 },
    { easy: [40, 35], strides: 6, quality: { kind: 'steady', minutes: 20 }, long: 70 },
    { easy: [30, 30], quality: { kind: 'hills', reps: 8, work: 45 }, long: 56, light: true },
    { easy: [40, 35], strides: 6, quality: { kind: 'steady', minutes: 25 }, long: 75 },
    { easy: [30, 20], strides: 4, quality: { kind: 'sharpen', reps: 6 }, long: 60, race: '10 km race or time trial' },
  ],
);

export const runHalf = runPlan(
  {
    id: 'run-half',
    name: 'Half marathon',
    description: 'Twelve weeks, four runs a week. The long run builds to about 1 h 45, with race-pace finishes in the last block, then a two-week taper into race day.',
    level: 'intermediate',
    sessionMinutes: 60,
    tags: ['half'],
    runMinutes: 30,
  },
  [
    { easy: [35, 30], strides: 4, quality: tempo(2, 10), long: 60 },
    { easy: [35, 30], strides: 4, quality: iv3(5), long: 65 },
    { easy: [40, 35], strides: 6, quality: tempo(3, 10, 120), long: 70 },
    { easy: [30, 30], quality: { kind: 'hills', reps: 8, work: 45 }, long: 56, light: true },
    { easy: [40, 35], strides: 6, quality: tempo(2, 15), long: 76 },
    { easy: [40, 40], strides: 6, quality: iv3(5, 240, 150), long: 82, pace: 10 },
    { easy: [45, 40], strides: 6, quality: { kind: 'steady', minutes: 25 }, long: 89, pace: 15 },
    { easy: [35, 30], quality: iv3(5), long: 70, light: true },
    { easy: [45, 40], strides: 6, quality: tempo(3, 12, 120), long: 97, pace: 20 },
    { easy: [45, 40], strides: 6, quality: { kind: 'steady', minutes: 30 }, long: 105, pace: 25 },
    { easy: [40, 30], strides: 4, quality: tempo(2, 10), long: 75, pace: 15 },
    { easy: [30, 20], strides: 4, quality: { kind: 'sharpen', reps: 5 }, long: 130, race: 'Half marathon' },
  ],
);

export const runMarathon = runPlan(
  {
    id: 'run-marathon',
    name: 'Marathon',
    description: 'Sixteen weeks, five runs a week. The long run builds to about 2 h 30 with marathon-pace blocks, every fourth week is lighter, and the last three weeks taper into race day. For people who already run an hour comfortably.',
    level: 'intermediate',
    sessionMinutes: 70,
    tags: ['marathon'],
    runMinutes: 60,
  },
  [
    { easy: [40, 35, 50], strides: 4, quality: tempo(2, 10), long: 75 },
    { easy: [40, 35, 55], strides: 4, quality: iv3(5), long: 80 },
    { easy: [45, 40, 60], strides: 6, quality: tempo(3, 10, 120), long: 86 },
    { easy: [35, 30, 45], quality: { kind: 'hills', reps: 8, work: 45 }, long: 70, light: true },
    { easy: [45, 40, 60], strides: 6, quality: tempo(2, 15), long: 93 },
    { easy: [45, 40, 65], strides: 6, quality: iv3(5, 240, 150), long: 100 },
    { easy: [50, 40, 70], strides: 6, quality: { kind: 'steady', minutes: 25 }, long: 108, pace: 20 },
    { easy: [40, 35, 50], quality: iv3(5), long: 86, light: true },
    { easy: [50, 40, 70], strides: 6, quality: tempo(3, 12, 120), long: 117, pace: 30 },
    { easy: [50, 45, 75], strides: 6, quality: { kind: 'steady', minutes: 30 }, long: 126, pace: 35 },
    { easy: [50, 45, 80], strides: 6, quality: tempo(2, 20), long: 136, pace: 40 },
    { easy: [40, 35, 60], quality: iv3(5), long: 105, light: true },
    { easy: [50, 45, 80], strides: 6, quality: { kind: 'steady', minutes: 35 }, long: 148, pace: 45 },
    { easy: [45, 40, 60], strides: 6, quality: tempo(2, 15), long: 110, pace: 30 },
    { easy: [40, 35, 45], strides: 4, quality: tempo(2, 10), long: 90, pace: 20 },
    { easy: [30, 25, 20], strides: 4, quality: { kind: 'sharpen', reps: 5 }, long: 270, race: 'Marathon' },
  ],
);

export const runStrength = template({
  id: 'run-strength-addon',
  name: 'Strength for runners',
  description: 'Two short sessions a week to go alongside your own running: heavy single-leg work, calves, hamstrings and a little jumping, which make running more economical and help you stay injury-free.',
  goal: 'running',
  level: 'beginner',
  daysPerWeek: 2,
  daysRange: [1, 3],
  sessionMinutes: 30,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 6,
  tags: ['strength'],
  sources: SOURCES,
  phases: [
    phase(
      'base',
      'Base',
      6,
      [
        day('a', 'Runner strength A', 'strength', ['Legs', 'Calves', 'Core'], {
          warmup: [t('warmup_general', 4, { p: 2 })],
          main: [
            r('pogo_jumps', 2, 15, 20, { rest: 60, prog: { type: 'none' }, cue: 'Quick, stiff ankles. Low jumps.' }),
            r('db_split_squat', 3, 6, 8, { rir: [2, 3], rest: 90, alt: ['bw_bulgarian', 'split_squat'] }),
            r('db_rdl', 3, 6, 8, { rir: [2, 3], rest: 90, alt: ['single_leg_rdl'] }),
            r('calf_raise', 3, 10, 15, { rest: 45, alt: ['db_calf_raise'], cue: 'One leg at a time when two is easy.' }),
            r('bent_knee_calf_raise', 2, 12, 15, { rest: 45, p: 2 }),
            h('side_plank', 2, 20, 40, { rest: 30, p: 2 }),
          ],
          notes: 'On a hard running day or at least 48 hours before the next hard run.',
        }),
        day('b', 'Runner strength B', 'strength', ['Legs', 'Hamstrings', 'Core'], {
          warmup: [t('warmup_general', 4, { p: 2 })],
          main: [
            r('a_skip', 2, 10, 20, { rest: 60, prog: { type: 'none' } }),
            r('step_up', 3, 8, 10, { rir: [2, 3], rest: 75 }),
            r('nordic_curl', 2, 4, 6, { rest: 120, alt: ['single_leg_bridge'] }),
            r('single_leg_bridge', 3, 10, 12, { rest: 45, p: 2 }),
            r('calf_raise', 3, 10, 15, { rest: 45, alt: ['db_calf_raise'] }),
            h('copenhagen_plank', 2, 15, 30, { rest: 30, p: 2, alt: ['side_plank'] }),
          ],
        }),
      ],
      ['a', 'b'],
    ),
  ],
});

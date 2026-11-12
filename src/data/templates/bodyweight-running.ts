import type { Phase, Segment } from '../../lib/schema';
import { VARIATION, day, h, iv, phase, r, seg, t, template } from './build';

/** Calisthenics and running templates. */

const PREP = [t('warmup_wrists', 5, { p: 2 })];

export const cal3Foundation = template({
  id: 'cal-3-foundation',
  name: 'Calisthenics foundations',
  description: 'Push, pull, legs and core with your own bodyweight. Each exercise moves up a ladder of harder variations as you get stronger.',
  goal: 'calisthenics',
  level: 'beginner',
  daysPerWeek: 3,
  daysRange: [2, 4],
  sessionMinutes: 45,
  loops: true,
  progression: VARIATION,
  deloadEveryWeeks: 6,
  sources: ['docs/science/calisthenics.md'],
  phases: [
    phase(
      'base',
      'Foundations',
      6,
      [
        day('a', 'Full body A', 'skill', ['Push', 'Pull', 'Legs', 'Core'], {
          warmup: PREP,
          main: [
            h('wall_plank', 3, 20, 40, { p: 2, rest: 45, cue: 'Handstand preparation: practise while you are fresh.' }),
            r('pushup', 3, 5, 12, { rir: [1, 3] }),
            r('pullup', 3, 5, 10, { rir: [1, 3], rest: 120, alt: ['band_pulldown', 'table_row'] }),
            r('bw_squat', 3, 8, 15, { rir: [1, 3] }),
            r('pike_pushup', 3, 5, 10, { p: 2 }),
            r('glute_bridge', 3, 8, 15, { p: 2, rest: 60 }),
            h('hollow_hold', 3, 15, 40, { p: 2, alt: ['plank'] }),
          ],
        }),
        day('b', 'Full body B', 'skill', ['Push', 'Pull', 'Legs', 'Core'], {
          warmup: PREP,
          main: [
            h('wall_handstand', 3, 15, 40, { p: 2, rest: 60, alt: ['wall_plank'], cue: 'Come down before your form breaks.' }),
            r('bench_dip', 3, 5, 12, { rir: [1, 3] }),
            r('inverted_row', 3, 5, 12, { rir: [1, 3], alt: ['ring_row', 'table_row'] }),
            r('split_squat', 3, 8, 12, { rir: [1, 3] }),
            r('pushup', 2, 5, 12, { p: 2 }),
            r('single_leg_bridge', 3, 8, 12, { p: 2, rest: 60, alt: ['glute_bridge'] }),
            r('hanging_knee_raise', 3, 6, 12, { p: 2, rest: 60, alt: ['lying_leg_raise'] }),
          ],
        }),
      ],
      ['a', 'b'],
    ),
  ],
});

/* ---------- Start running: nine weeks from walking to 30 minutes ---------- */

const run = (min: number): Segment => seg('Run', Math.round(min * 60));
const walk = (min: number): Segment => seg('Walk', Math.round(min * 60), 'rest');

const RUN_WEEKS: { reps: number; segments: Segment[] }[] = [
  { reps: 8, segments: [run(1), walk(1.5)] },
  { reps: 6, segments: [run(1.5), walk(2)] },
  { reps: 2, segments: [run(1.5), walk(1.5), run(3), walk(3)] },
  { reps: 1, segments: [run(3), walk(1.5), run(5), walk(2.5), run(3), walk(1.5), run(5)] },
  { reps: 1, segments: [run(8), walk(3), run(8)] },
  { reps: 1, segments: [run(12), walk(2), run(10)] },
  { reps: 1, segments: [run(25)] },
  { reps: 1, segments: [run(28)] },
  { reps: 1, segments: [run(30)] },
];

const runPhases: Phase[] = RUN_WEEKS.map((w, i) => {
  const id = `w${i + 1}`;
  const runMinutes = Math.round((w.reps * w.segments.filter((s) => s.kind === 'work').reduce((a, s) => a + s.seconds, 0)) / 60);
  return phase(id, `Week ${i + 1}`, 1, [
    day(id, `Week ${i + 1} run`, 'run', [`${runMinutes} min running`], {
      warmup: [t('brisk_walk', 5)],
      main: [iv('run_walk', w.reps, w.segments, { effort: { type: 'rpe', value: [3, 5] }, cue: 'Slow down until you could hold a conversation.' })],
      cooldown: [t('cooldown_walk', 5, { p: 2 })],
      notes: 'Repeat a week whenever it felt too hard. There is no deadline.',
    }),
  ]);
});

export const runStart = template({
  id: 'run-start',
  name: 'Start running',
  description: 'From walking to 30 minutes of continuous running in nine weeks, three sessions a week.',
  goal: 'running',
  level: 'beginner',
  daysPerWeek: 3,
  daysRange: [3, 3],
  sessionMinutes: 35,
  loops: false,
  progression: { type: 'none' },
  sources: ['docs/science/running.md'],
  phases: runPhases,
});

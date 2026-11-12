import type { DayTemplate } from '../../lib/schema';
import { DOUBLE, VARIATION, WARMUP, day, h, iv, phase, r, seg, t, template } from './build';

/**
 * General fitness, muscle, strength, fat loss and mobility plans.
 * Evidence: docs/science/training-principles.md, strength-hypertrophy.md,
 * nutrition-fat-loss.md, populations-safety.md.
 */

const NONE = { type: 'none' } as const;
const HARD: [number, number] = [1, 3];
const EASY: [number, number] = [2, 4];

/* ---------- General fitness ---------- */

export const gf2Express = template({
  id: 'gf-2-express',
  name: 'Express full body',
  description: 'Two 30-minute sessions a week built on big multi-joint lifts, two hard sets each. The least time that still builds real strength and muscle.',
  goal: 'general_fitness',
  level: 'beginner',
  daysPerWeek: 2,
  daysRange: [2, 3],
  sessionMinutes: 30,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 8,
  tags: ['express'],
  sources: ['docs/science/training-principles.md'],
  phases: [
    phase(
      'base',
      'Base',
      8,
      [
        day('a', 'Express A', 'strength', ['Legs', 'Chest', 'Back'], {
          warmup: [t('warmup_general', 4, { p: 2, cue: 'A few light sets of the first exercise are enough.' })],
          main: [
            r('goblet_squat', 2, 6, 15, { rir: [1, 2], alt: ['bw_squat'] }),
            r('db_bench_press', 2, 6, 15, { rir: [1, 2], alt: ['pushup'] }),
            r('lat_pulldown', 2, 6, 15, { rir: [1, 2], alt: ['band_pulldown', 'inverted_row', 'table_row'] }),
            r('db_rdl', 2, 6, 15, { rir: [1, 2], alt: ['single_leg_bridge'] }),
            r('db_shoulder_press', 2, 6, 15, { rir: [1, 2], p: 2, alt: ['pike_pushup'] }),
          ],
        }),
        day('b', 'Express B', 'strength', ['Legs', 'Chest', 'Back'], {
          warmup: [t('warmup_general', 4, { p: 2, cue: 'A few light sets of the first exercise are enough.' })],
          main: [
            r('leg_press', 2, 6, 15, { rir: [1, 2], alt: ['goblet_squat', 'split_squat'] }),
            r('incline_db_press', 2, 6, 15, { rir: [1, 2], alt: ['pushup'] }),
            r('db_row', 2, 6, 15, { rir: [1, 2], alt: ['band_row', 'inverted_row', 'table_row'] }),
            r('db_hip_thrust', 2, 6, 15, { rir: [1, 2], alt: ['glute_bridge'] }),
          ],
        }),
      ],
      ['a', 'b'],
    ),
  ],
});

export const gf4Hybrid = template({
  id: 'gf-4-hybrid',
  name: 'Strong and fit',
  description: 'An upper-body day, a lower-body day, an easy cardio session and a mixed circuit with intervals. Covers strength, endurance and the weekly activity guidelines.',
  goal: 'general_fitness',
  level: 'intermediate',
  daysPerWeek: 4,
  daysRange: [3, 5],
  sessionMinutes: 50,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 6,
  sources: ['docs/science/training-principles.md'],
  phases: [
    phase('base', 'Base', 6, [
      day('upper', 'Upper strength', 'strength', ['Chest', 'Back', 'Shoulders'], {
        warmup: WARMUP,
        main: [
          r('db_bench_press', 3, 6, 10, { rir: HARD, rest: 120, alt: ['pushup'] }),
          r('pullup', 3, 6, 10, { rir: HARD, rest: 120, alt: ['lat_pulldown', 'band_pulldown', 'inverted_row'] }),
          r('db_shoulder_press', 3, 8, 12, { rir: HARD, alt: ['pike_pushup'] }),
          r('db_row', 3, 8, 12, { rir: HARD, alt: ['inverted_row', 'table_row'] }),
          h('plank', 3, 30, 60, { p: 3 }),
        ],
      }),
      day('lower', 'Lower strength', 'strength', ['Legs', 'Glutes', 'Core'], {
        warmup: WARMUP,
        main: [
          r('back_squat', 3, 6, 10, { rir: HARD, rest: 150, alt: ['goblet_squat', 'bw_bulgarian'] }),
          r('db_rdl', 3, 8, 10, { rir: HARD, rest: 120, alt: ['single_leg_rdl'] }),
          r('reverse_lunge', 2, 8, 12, { rir: HARD, p: 2 }),
          r('calf_raise', 3, 10, 15, { rest: 45, p: 3, alt: ['db_calf_raise'] }),
          h('side_plank', 2, 20, 40, { p: 2 }),
        ],
      }),
      day('cardio', 'Easy cardio', 'conditioning', ['Endurance'], {
        main: [t('easy_cardio', 40, { effort: { type: 'hrZone', value: 2 } })],
        notes: 'Easy means easy: you can speak in full sentences the whole time.',
      }),
      day('mixed', 'Circuit + intervals', 'mixed', ['Full body', 'Conditioning'], {
        warmup: WARMUP,
        main: [
          r('goblet_squat', 3, 10, 15, { rir: EASY, rest: 45, alt: ['bw_squat'] }),
          r('pushup', 3, 8, 15, { rir: EASY, rest: 45, prog: VARIATION }),
          r('inverted_row', 3, 8, 12, { rir: EASY, rest: 45, alt: ['db_row', 'table_row'] }),
          h('farmer_carry', 3, 30, 45, { rest: 45, alt: ['plank'] }),
          iv('hard_intervals', 6, [seg('Hard', 60), seg('Easy', 60, 'rest')], { effort: { type: 'rpe', value: [7, 8] } }),
        ],
      }),
    ]),
  ],
});

export const gfSenior = template({
  id: 'gf-senior',
  name: 'Strong for life',
  description: 'Strength, power and balance for adults over 60: standing up quickly, pushing, pulling, carrying and steady balance, plus a daily walk. Gentle to start, and it progresses.',
  goal: 'general_fitness',
  level: 'beginner',
  daysPerWeek: 3,
  daysRange: [2, 3],
  sessionMinutes: 40,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 8,
  tags: ['senior'],
  sources: ['docs/science/populations-safety.md'],
  phases: [
    phase(
      'base',
      'Base',
      8,
      [
        day('a', 'Strength and balance A', 'strength', ['Legs', 'Push', 'Balance'], {
          warmup: [t('warmup_general', 6, { cue: 'March on the spot, roll the shoulders, a few slow sit-to-stands.' })],
          main: [
            r('sit_to_stand', 3, 8, 12, { rir: EASY, prog: VARIATION, cue: 'Stand up as quickly as you safely can, sit down slowly.' }),
            r('wall_pushup', 3, 8, 12, { rir: EASY, prog: VARIATION }),
            r('band_row', 3, 10, 12, { rir: EASY, alt: ['db_row', 'table_row'] }),
            r('glute_bridge', 2, 10, 12, { rir: EASY, p: 2 }),
            h('tandem_stance', 3, 20, 30, { rest: 30, prog: NONE }),
          ],
          cooldown: [t('brisk_walk', 10, { p: 2 })],
          notes: 'Keep a chair or wall within reach for every balance exercise.',
        }),
        day('b', 'Strength and balance B', 'strength', ['Legs', 'Pull', 'Balance'], {
          warmup: [t('warmup_general', 6, { cue: 'March on the spot, roll the shoulders, a few slow step-ups.' })],
          main: [
            r('step_up', 3, 8, 10, { rir: EASY, cue: 'A low step, hand on a rail or wall. Push through the top foot.' }),
            r('band_shoulder_press', 2, 10, 12, { rir: EASY, alt: ['db_shoulder_press', 'wall_pushup'] }),
            r('band_pulldown', 3, 10, 12, { rir: EASY, alt: ['lat_pulldown', 'band_row', 'table_row'] }),
            h('farmer_carry', 3, 30, 40, { rest: 60, alt: ['tandem_stance'], cue: 'Light weights, tall posture, normal steps.' }),
            r('calf_raise', 2, 10, 15, { rest: 45, p: 2, cue: 'Hold a support for balance.' }),
            h('single_leg_balance', 2, 15, 30, { rest: 30, prog: NONE }),
          ],
          cooldown: [t('brisk_walk', 10, { p: 2 })],
          notes: 'Keep a chair or wall within reach for every balance exercise.',
        }),
      ],
      ['a', 'b'],
    ),
  ],
});

/* ---------- Muscle ---------- */

export const mus3Home = template({
  id: 'mus-3-home',
  name: 'Home dumbbell builder',
  description: 'Three full-body sessions with dumbbells and a bench. When the weights get too light, slower tempo, pauses and one-arm or one-leg versions keep you growing.',
  goal: 'muscle',
  level: 'beginner',
  daysPerWeek: 3,
  daysRange: [2, 4],
  sessionMinutes: 50,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 6,
  requires: ['dumbbells'],
  tags: ['home'],
  sources: ['docs/science/strength-hypertrophy.md'],
  phases: [
    phase('base', 'Base', 6, [
      day('a', 'Full body A', 'strength', ['Legs', 'Chest', 'Back'], {
        warmup: WARMUP,
        main: [
          r('goblet_squat', 3, 8, 15, { rir: HARD }),
          r('db_bench_press', 3, 8, 12, { rir: HARD, alt: ['db_floor_press'] }),
          r('db_row', 3, 8, 12, { rir: HARD }),
          r('db_rdl', 3, 10, 12, { rir: HARD }),
          r('db_lateral_raise', 2, 12, 15, { p: 2, rest: 60 }),
          r('db_curl', 2, 10, 15, { p: 3, rest: 60 }),
        ],
      }),
      day('b', 'Full body B', 'strength', ['Legs', 'Shoulders', 'Back'], {
        warmup: WARMUP,
        main: [
          r('db_bulgarian', 3, 8, 12, { rir: HARD, alt: ['db_split_squat'] }),
          r('db_shoulder_press', 3, 8, 12, { rir: HARD }),
          r('pullup', 3, 6, 10, { rir: HARD, alt: ['band_pulldown', 'inverted_row', 'table_row'] }),
          r('db_hip_thrust', 3, 10, 15, { rir: HARD, alt: ['single_leg_bridge'] }),
          r('db_overhead_triceps', 2, 10, 15, { p: 2, rest: 60 }),
          r('db_calf_raise', 3, 12, 20, { p: 3, rest: 45 }),
        ],
      }),
      day('c', 'Full body C', 'strength', ['Legs', 'Chest', 'Back'], {
        warmup: WARMUP,
        main: [
          r('db_split_squat', 3, 10, 12, { rir: HARD }),
          r('incline_db_press', 3, 8, 12, { rir: HARD, alt: ['pushup'] }),
          r('db_row', 3, 12, 15, { rir: HARD, cue: 'Lighter than day A: pause for a second at the top.' }),
          r('db_rdl', 3, 8, 10, { rir: HARD }),
          r('db_fly', 2, 12, 15, { p: 2, rest: 60, alt: ['pushup'] }),
          r('lying_leg_raise', 3, 8, 15, { p: 3, rest: 45 }),
        ],
      }),
    ]),
  ],
});

export const mus5UlPpl = template({
  id: 'mus-5-ulppl',
  name: 'Five-day hybrid split',
  description: 'Heavier upper and lower days early in the week, then push, pull and legs with higher reps. Every muscle twice a week with room for plenty of volume.',
  goal: 'muscle',
  level: 'intermediate',
  daysPerWeek: 5,
  daysRange: [4, 6],
  sessionMinutes: 60,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 6,
  sources: ['docs/science/strength-hypertrophy.md'],
  phases: [
    phase('base', 'Base', 6, [
      day('upper', 'Upper (heavy)', 'strength', ['Chest', 'Back', 'Shoulders'], {
        warmup: WARMUP,
        main: [
          r('bench_press', 4, 6, 8, { rir: HARD, rest: 150, alt: ['db_bench_press'] }),
          r('barbell_row', 4, 6, 10, { rir: HARD, rest: 120, alt: ['db_row'] }),
          r('overhead_press', 3, 6, 10, { rir: HARD, rest: 120, alt: ['db_shoulder_press'] }),
          r('lat_pulldown', 3, 8, 10, { rir: HARD, alt: ['pullup'] }),
          r('db_curl', 2, 8, 12, { p: 3, rest: 60 }),
          r('triceps_pushdown', 2, 8, 12, { p: 3, rest: 60, alt: ['db_overhead_triceps'] }),
        ],
      }),
      day('lower', 'Lower (heavy)', 'strength', ['Quads', 'Hamstrings', 'Calves'], {
        warmup: WARMUP,
        main: [
          r('back_squat', 4, 6, 8, { rir: HARD, rest: 180, alt: ['goblet_squat'] }),
          r('barbell_rdl', 3, 6, 10, { rir: HARD, rest: 150, alt: ['db_rdl'] }),
          r('leg_press', 3, 8, 12, { rir: HARD, rest: 120, alt: ['db_bulgarian'] }),
          r('leg_curl', 3, 8, 12, { p: 2 }),
          r('machine_calf_raise', 3, 8, 12, { p: 3, rest: 60, alt: ['db_calf_raise'] }),
        ],
      }),
      day('push', 'Push', 'strength', ['Chest', 'Shoulders', 'Triceps'], {
        warmup: WARMUP,
        main: [
          r('incline_db_press', 3, 10, 12, { rir: HARD }),
          r('db_shoulder_press', 3, 10, 12, { rir: HARD }),
          r('db_fly', 3, 12, 15, { rir: [0, 2], rest: 60 }),
          r('db_lateral_raise', 4, 12, 20, { rir: [0, 2], rest: 60 }),
          r('triceps_pushdown', 3, 12, 15, { rir: [0, 2], rest: 60, p: 2, alt: ['db_overhead_triceps'] }),
        ],
      }),
      day('pull', 'Pull', 'strength', ['Back', 'Rear shoulders', 'Biceps'], {
        warmup: WARMUP,
        main: [
          r('pullup', 3, 6, 10, { rir: HARD, rest: 120, alt: ['lat_pulldown'] }),
          r('cable_row', 3, 10, 12, { rir: HARD, alt: ['db_row'] }),
          r('db_row', 3, 10, 12, { rir: HARD }),
          r('face_pull', 3, 15, 20, { rest: 60, alt: ['db_rear_delt_fly', 'band_pull_apart'] }),
          r('incline_db_curl', 3, 10, 15, { rir: [0, 2], rest: 60, p: 2 }),
        ],
      }),
      day('legs', 'Legs', 'strength', ['Quads', 'Glutes', 'Hamstrings'], {
        warmup: WARMUP,
        main: [
          r('db_bulgarian', 3, 10, 12, { rir: HARD }),
          r('leg_press', 3, 12, 15, { rir: HARD, alt: ['goblet_squat'] }),
          r('hip_thrust', 3, 10, 12, { rir: HARD, alt: ['db_hip_thrust'] }),
          r('leg_extension', 3, 12, 15, { rir: [0, 2], rest: 60, p: 2 }),
          r('leg_curl', 3, 12, 15, { rir: [0, 2], rest: 60, p: 2 }),
          r('machine_calf_raise', 4, 12, 15, { p: 3, rest: 45, alt: ['db_calf_raise'] }),
          r('cable_crunch', 3, 10, 15, { p: 3, rest: 45, alt: ['hanging_knee_raise'] }),
        ],
      }),
    ]),
  ],
});

export const mus6Ppl = template({
  id: 'mus-6-ppl',
  name: 'Push Pull Legs',
  description: 'Six days, every muscle twice a week with high volume. The first round of the week is heavier, the second round chases the pump. For experienced lifters with time to recover.',
  goal: 'muscle',
  level: 'intermediate',
  daysPerWeek: 6,
  daysRange: [5, 6],
  sessionMinutes: 65,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 6,
  sources: ['docs/science/strength-hypertrophy.md'],
  phases: [
    phase('base', 'Base', 6, [
      day('pusha', 'Push A', 'strength', ['Chest', 'Shoulders', 'Triceps'], {
        warmup: WARMUP,
        main: [
          r('bench_press', 4, 5, 8, { rir: HARD, rest: 180, alt: ['db_bench_press'] }),
          r('overhead_press', 3, 6, 10, { rir: HARD, rest: 150, alt: ['db_shoulder_press'] }),
          r('incline_db_press', 3, 8, 12, { rir: HARD }),
          r('db_lateral_raise', 4, 12, 20, { rir: [0, 2], rest: 60 }),
          r('triceps_pushdown', 3, 10, 15, { p: 2, rest: 60, alt: ['db_overhead_triceps'] }),
          r('db_overhead_triceps', 2, 12, 15, { p: 3, rest: 60 }),
        ],
      }),
      day('pulla', 'Pull A', 'strength', ['Back', 'Biceps'], {
        warmup: WARMUP,
        main: [
          r('pullup', 4, 5, 8, { rir: HARD, rest: 150, alt: ['lat_pulldown'] }),
          r('barbell_row', 3, 6, 10, { rir: HARD, rest: 120, alt: ['db_row'] }),
          r('cable_row', 3, 10, 12, { rir: HARD, alt: ['db_row'] }),
          r('face_pull', 3, 15, 20, { rest: 60, alt: ['db_rear_delt_fly'] }),
          r('barbell_curl', 3, 8, 12, { p: 2, rest: 60, alt: ['db_curl'] }),
          r('incline_db_curl', 2, 10, 15, { p: 3, rest: 60 }),
        ],
      }),
      day('legsa', 'Legs A', 'strength', ['Quads', 'Hamstrings', 'Calves'], {
        warmup: WARMUP,
        main: [
          r('back_squat', 4, 5, 8, { rir: HARD, rest: 180, alt: ['goblet_squat'] }),
          r('barbell_rdl', 3, 6, 10, { rir: HARD, rest: 150, alt: ['db_rdl'] }),
          r('leg_press', 3, 10, 12, { rir: HARD, rest: 120 }),
          r('leg_curl', 3, 10, 15, { p: 2 }),
          r('machine_calf_raise', 4, 10, 15, { p: 2, rest: 60, alt: ['db_calf_raise'] }),
          r('hanging_knee_raise', 3, 8, 15, { p: 3, rest: 45 }),
        ],
      }),
      day('pushb', 'Push B', 'strength', ['Shoulders', 'Chest', 'Triceps'], {
        warmup: WARMUP,
        main: [
          r('db_shoulder_press', 4, 8, 12, { rir: HARD, rest: 120 }),
          r('db_bench_press', 3, 10, 12, { rir: HARD }),
          r('db_fly', 3, 12, 15, { rir: [0, 2], rest: 60 }),
          r('db_lateral_raise', 4, 15, 20, { rir: [0, 2], rest: 60 }),
          r('dip', 3, 8, 12, { rir: HARD, p: 2, alt: ['bench_dip'] }),
          r('triceps_pushdown', 3, 12, 15, { p: 3, rest: 60, alt: ['band_pushdown'] }),
        ],
      }),
      day('pullb', 'Pull B', 'strength', ['Back', 'Rear shoulders', 'Biceps'], {
        warmup: WARMUP,
        main: [
          r('lat_pulldown', 4, 8, 12, { rir: HARD, rest: 120, alt: ['pullup'] }),
          r('db_row', 3, 10, 12, { rir: HARD }),
          r('cable_row', 3, 12, 15, { rir: [0, 2], alt: ['db_row'] }),
          r('db_rear_delt_fly', 3, 15, 20, { rest: 60, alt: ['face_pull'] }),
          r('db_curl', 3, 10, 15, { p: 2, rest: 60 }),
        ],
      }),
      day('legsb', 'Legs B', 'strength', ['Glutes', 'Quads', 'Hamstrings'], {
        warmup: WARMUP,
        main: [
          r('db_bulgarian', 3, 8, 12, { rir: HARD, rest: 120 }),
          r('hip_thrust', 3, 8, 12, { rir: HARD, rest: 120, alt: ['db_hip_thrust'] }),
          r('leg_extension', 3, 12, 15, { rir: [0, 2], rest: 60 }),
          r('leg_curl', 3, 12, 15, { rir: [0, 2], rest: 60 }),
          r('machine_calf_raise', 4, 12, 20, { p: 2, rest: 45, alt: ['db_calf_raise'] }),
          r('cable_crunch', 3, 10, 15, { p: 3, rest: 45, alt: ['lying_leg_raise'] }),
        ],
      }),
    ]),
  ],
});

/* ---------- Strength ---------- */

export const str4Undulating = template({
  id: 'str-4-undulating',
  name: 'Strength builder',
  description: 'Squat, bench press, deadlift and overhead press, each trained heavy once and for volume once a week. Loads go up as you hit the top of each range.',
  goal: 'strength',
  level: 'intermediate',
  daysPerWeek: 4,
  daysRange: [4, 4],
  sessionMinutes: 65,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 5,
  requires: ['barbell'],
  sources: ['docs/science/strength-hypertrophy.md', 'docs/science/training-principles.md'],
  phases: [
    phase('base', 'Base', 5, [
      day('uh', 'Upper: heavy bench', 'strength', ['Bench press', 'Back'], {
        warmup: WARMUP,
        main: [
          r('bench_press', 4, 3, 5, { rir: [2, 3], rest: 210 }),
          r('barbell_row', 4, 5, 8, { rir: HARD, rest: 150, alt: ['db_row'] }),
          r('overhead_press', 3, 6, 8, { rir: [2, 3], rest: 150 }),
          r('pullup', 3, 5, 8, { rir: HARD, rest: 120, alt: ['lat_pulldown'] }),
          r('triceps_pushdown', 2, 10, 12, { p: 3, rest: 60, alt: ['db_overhead_triceps'] }),
        ],
      }),
      day('lh', 'Lower: heavy squat', 'strength', ['Squat', 'Hamstrings'], {
        warmup: WARMUP,
        main: [
          r('back_squat', 4, 3, 5, { rir: [2, 3], rest: 240, alt: ['goblet_squat'] }),
          r('barbell_rdl', 3, 6, 8, { rir: HARD, rest: 150, alt: ['db_rdl'] }),
          r('leg_curl', 2, 10, 12, { p: 2, alt: ['single_leg_bridge'] }),
          r('calf_raise', 3, 10, 15, { p: 3, rest: 45, alt: ['db_calf_raise'] }),
          h('plank', 3, 30, 60, { p: 3 }),
        ],
      }),
      day('uv', 'Upper: heavy press', 'strength', ['Overhead press', 'Bench volume'], {
        warmup: WARMUP,
        main: [
          r('overhead_press', 4, 3, 5, { rir: [2, 3], rest: 210 }),
          r('bench_press', 4, 6, 8, { rir: [2, 3], rest: 180 }),
          r('lat_pulldown', 3, 8, 10, { rir: HARD, alt: ['pullup', 'band_pulldown'] }),
          r('db_row', 3, 8, 12, { rir: HARD }),
          r('face_pull', 2, 15, 20, { p: 3, rest: 60, alt: ['band_pull_apart'] }),
        ],
      }),
      day('lv', 'Lower: heavy deadlift', 'strength', ['Deadlift', 'Squat volume'], {
        warmup: WARMUP,
        main: [
          r('deadlift', 3, 3, 5, { rir: [2, 3], rest: 240, prog: { type: 'double', stepKg: 5 } }),
          r('back_squat', 4, 6, 8, { rir: [2, 3], rest: 180, alt: ['goblet_squat'] }),
          r('db_bulgarian', 3, 8, 10, { rir: HARD, p: 2, alt: ['bw_bulgarian'] }),
          r('hanging_knee_raise', 3, 8, 12, { p: 3, rest: 45, alt: ['lying_leg_raise'] }),
        ],
      }),
    ]),
  ],
});

type Block = { sets: number; reps: [number, number]; rir: [number, number]; acc: { sets: number; reps: [number, number] } };

/** The four sessions of a strength block at a given intensity. Ids are prefixed so each phase has its own. */
function blockWeek(prefix: string, b: Block, label: string): DayTemplate[] {
  const [lo, hi] = b.reps;
  const [alo, ahi] = b.acc.reps;
  const main = { rir: b.rir, rest: hi <= 5 ? 240 : 180 };
  return [
    day(`${prefix}sq`, `${label}: squat + bench`, 'strength', ['Squat', 'Bench press'], {
      warmup: WARMUP,
      main: [
        r('back_squat', b.sets, lo, hi, main),
        r('bench_press', b.sets, lo, hi, main),
        r('barbell_row', b.acc.sets, alo, ahi, { rir: HARD, rest: 120, alt: ['db_row'] }),
        h('plank', 2, 30, 60, { p: 3 }),
      ],
    }),
    day(`${prefix}dl`, `${label}: deadlift + press`, 'strength', ['Deadlift', 'Overhead press'], {
      warmup: WARMUP,
      main: [
        r('deadlift', Math.max(2, b.sets - 1), lo, hi, { ...main, prog: { type: 'double', stepKg: 5 } }),
        r('overhead_press', b.sets, lo, hi, main),
        r('pullup', b.acc.sets, alo, ahi, { rir: HARD, rest: 120, alt: ['lat_pulldown'] }),
        r('leg_curl', 2, 8, 12, { p: 3, alt: ['single_leg_bridge'] }),
      ],
    }),
    day(`${prefix}sq2`, `${label}: squat + bench volume`, 'strength', ['Squat', 'Bench press'], {
      warmup: WARMUP,
      main: [
        r('back_squat', b.sets - 1, lo + 2, hi + 2, { rir: [b.rir[0] + 1, b.rir[1] + 1], rest: 180 }),
        r('bench_press', b.sets - 1, lo + 2, hi + 2, { rir: [b.rir[0] + 1, b.rir[1] + 1], rest: 180 }),
        r('db_row', b.acc.sets, alo + 2, ahi + 2, { rir: HARD }),
        r('triceps_pushdown', 2, 10, 15, { p: 3, rest: 60, alt: ['db_overhead_triceps'] }),
      ],
    }),
    day(`${prefix}dl2`, `${label}: hinge + press volume`, 'strength', ['Hinge', 'Overhead press'], {
      warmup: WARMUP,
      main: [
        r('barbell_rdl', b.acc.sets, alo, ahi, { rir: HARD, rest: 150 }),
        r('overhead_press', b.sets - 1, lo + 2, hi + 2, { rir: [b.rir[0] + 1, b.rir[1] + 1], rest: 150 }),
        r('db_bulgarian', b.acc.sets, alo + 2, ahi + 2, { rir: HARD, p: 2 }),
        r('face_pull', 2, 15, 20, { p: 3, rest: 60, alt: ['band_pull_apart'] }),
      ],
    }),
  ];
}

const testDays = (): DayTemplate[] => {
  const test = (exerciseId: string) =>
    r(exerciseId, 1, 1, 1, { rir: [0, 1], rest: 300, prog: { type: 'none' }, cue: 'Work up in small jumps to a heavy single you could have done once more. Not a grinder.' });
  return [
    day('tsq', 'Test: squat', 'strength', ['Squat'], { warmup: WARMUP, main: [test('back_squat'), r('bench_press', 2, 5, 5, { rir: [3, 4], p: 2, prog: { type: 'none' } })] }),
    day('tbp', 'Test: bench press', 'strength', ['Bench press'], { warmup: WARMUP, main: [test('bench_press'), r('pullup', 2, 5, 8, { p: 2, alt: ['lat_pulldown'] })] }),
    day('tdl', 'Test: deadlift', 'strength', ['Deadlift'], { warmup: WARMUP, main: [test('deadlift')] }),
    day('tohp', 'Test: overhead press', 'strength', ['Overhead press'], { warmup: WARMUP, main: [test('overhead_press'), h('plank', 2, 30, 60, { p: 3 })] }),
  ];
};

export const str4Block = template({
  id: 'str-4-block',
  name: 'Peak strength (12-week block)',
  description: 'Twelve weeks of block periodisation: volume first, then heavier triples and fives, then near-maximal singles to triples, with lighter weeks between blocks and a test week at the end.',
  goal: 'strength',
  level: 'advanced',
  daysPerWeek: 4,
  daysRange: [4, 4],
  sessionMinutes: 75,
  loops: false,
  progression: DOUBLE,
  requires: ['barbell', 'rack', 'bench'],
  sources: ['docs/science/strength-hypertrophy.md', 'docs/science/training-principles.md'],
  phases: [
    phase('acc', 'Accumulation', 3, blockWeek('a', { sets: 5, reps: [6, 8], rir: [3, 3], acc: { sets: 3, reps: [8, 12] } }, 'Volume')),
    phase('accd', 'Lighter week', 1, blockWeek('ad', { sets: 3, reps: [6, 8], rir: [4, 4], acc: { sets: 2, reps: [8, 12] } }, 'Light')),
    phase('int', 'Intensification', 3, blockWeek('i', { sets: 5, reps: [3, 5], rir: [2, 2], acc: { sets: 3, reps: [6, 10] } }, 'Heavy')),
    phase('intd', 'Lighter week', 1, blockWeek('id', { sets: 3, reps: [3, 5], rir: [4, 4], acc: { sets: 2, reps: [6, 10] } }, 'Light')),
    phase('real', 'Realisation', 3, blockWeek('r', { sets: 4, reps: [1, 3], rir: [1, 2], acc: { sets: 2, reps: [6, 8] } }, 'Peak')),
    phase('test', 'Test week', 1, testDays()),
  ],
});

/* ---------- Fat loss ---------- */

export const fat4Mixed = template({
  id: 'fat-4-mixed',
  name: 'Lean down: lift and condition',
  description: 'Two strength sessions keep your muscle, one interval session and one easy cardio session add to your weekly burn. Pair it with a moderate calorie deficit and a daily step goal.',
  goal: 'fat_loss',
  level: 'intermediate',
  daysPerWeek: 4,
  daysRange: [3, 5],
  sessionMinutes: 50,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 6,
  sources: ['docs/science/nutrition-fat-loss.md'],
  phases: [
    phase('base', 'Base', 6, [
      day('a', 'Strength A', 'strength', ['Full body'], {
        warmup: WARMUP,
        main: [
          r('back_squat', 3, 6, 10, { rir: HARD, rest: 150, alt: ['goblet_squat', 'bw_bulgarian'] }),
          r('db_bench_press', 3, 8, 12, { rir: HARD, alt: ['pushup'] }),
          r('lat_pulldown', 3, 8, 12, { rir: HARD, alt: ['pullup', 'band_pulldown', 'inverted_row'] }),
          r('db_rdl', 3, 8, 12, { rir: HARD, alt: ['single_leg_rdl'] }),
          h('plank', 3, 30, 60, { p: 3 }),
        ],
      }),
      day('int', 'Intervals', 'conditioning', ['Conditioning'], {
        warmup: [t('easy_cardio', 5)],
        main: [iv('hard_intervals', 8, [seg('Hard', 60), seg('Easy', 60, 'rest')], { effort: { type: 'rpe', value: [8, 9] } })],
        cooldown: [t('easy_cardio', 5, { p: 2 })],
        notes: 'Any machine, a hill, stairs or a bike. Hard, not all-out.',
      }),
      day('b', 'Strength B', 'strength', ['Full body'], {
        warmup: WARMUP,
        main: [
          r('db_bulgarian', 3, 8, 12, { rir: HARD, alt: ['bw_bulgarian'] }),
          r('db_shoulder_press', 3, 8, 12, { rir: HARD, alt: ['pike_pushup'] }),
          r('db_row', 3, 8, 12, { rir: HARD, alt: ['inverted_row', 'table_row'] }),
          r('db_hip_thrust', 3, 10, 15, { rir: HARD, alt: ['single_leg_bridge'] }),
          h('farmer_carry', 3, 30, 45, { p: 2, alt: ['side_plank'] }),
        ],
      }),
      day('easy', 'Easy cardio', 'conditioning', ['Endurance'], {
        main: [t('easy_cardio', 40, { effort: { type: 'hrZone', value: 2 } })],
      }),
    ]),
  ],
});

export const fatLowImpact = template({
  id: 'fat-home-lowimpact',
  name: 'Low-impact start',
  description: 'Joint-friendly strength sessions at home and short daily walks that grow week by week. No jumping, no floor-to-standing rushes. A comfortable way to start losing fat.',
  goal: 'fat_loss',
  level: 'beginner',
  daysPerWeek: 3,
  daysRange: [2, 4],
  sessionMinutes: 35,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 8,
  tags: ['low-impact'],
  sources: ['docs/science/nutrition-fat-loss.md', 'docs/science/populations-safety.md'],
  phases: [
    phase(
      'base',
      'Base',
      8,
      [
        day('a', 'Strength + walk A', 'mixed', ['Full body', 'Walking'], {
          warmup: [t('warmup_general', 5, { cue: 'March on the spot and roll the shoulders.' })],
          main: [
            r('sit_to_stand', 3, 8, 12, { rir: EASY, prog: VARIATION }),
            r('wall_pushup', 3, 6, 12, { rir: EASY, prog: VARIATION }),
            r('band_row', 3, 10, 12, { rir: EASY, alt: ['db_row', 'table_row'] }),
            r('glute_bridge', 3, 10, 15, { rir: EASY }),
          ],
          cooldown: [t('brisk_walk', 15, { cue: 'Add a minute each week until you reach 30.' })],
        }),
        day('b', 'Strength + walk B', 'mixed', ['Full body', 'Walking'], {
          warmup: [t('warmup_general', 5, { cue: 'March on the spot and roll the shoulders.' })],
          main: [
            r('step_up', 3, 8, 10, { rir: EASY, cue: 'A low, stable step. Hold a rail or wall.' }),
            r('band_pulldown', 3, 10, 12, { rir: EASY, alt: ['band_row', 'table_row'] }),
            r('band_shoulder_press', 2, 10, 12, { rir: EASY, alt: ['db_shoulder_press', 'wall_pushup'] }),
            r('dead_bug', 3, 6, 10, { rest: 45 }),
          ],
          cooldown: [t('brisk_walk', 15, { cue: 'Add a minute each week until you reach 30.' })],
        }),
      ],
      ['a', 'b'],
    ),
  ],
});

/* ---------- Mobility add-on ---------- */

export const mobDaily = template({
  id: 'mob-daily',
  name: 'Daily mobility',
  description: 'Ten to twelve minutes for hips, upper back, shoulders, ankles and hamstrings. Use it on rest days or after training, alongside another plan.',
  goal: 'general_fitness',
  level: 'beginner',
  daysPerWeek: 5,
  daysRange: [3, 7],
  sessionMinutes: 12,
  loops: true,
  progression: { type: 'none' },
  tags: ['addon', 'mobility'],
  sources: ['docs/science/training-principles.md'],
  phases: [
    phase('base', 'Daily', 4, [
      day('m', 'Mobility', 'mobility', ['Hips', 'Upper back', 'Shoulders', 'Ankles'], {
        main: [
          h('hip_9090', 2, 30, 45, { rest: 15, prog: NONE }),
          h('couch_stretch', 2, 30, 45, { rest: 15, prog: NONE }),
          h('thoracic_rotation', 2, 30, 30, { rest: 15, prog: NONE }),
          t('wall_slides', 2),
          t('ankle_rocks', 2),
          h('hamstring_stretch', 2, 30, 45, { rest: 15, prog: NONE }),
        ],
        notes: 'Better after training or on its own than right before heavy lifting.',
      }),
    ]),
  ],
});

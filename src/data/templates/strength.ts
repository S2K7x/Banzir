import { DOUBLE, VARIATION, WARMUP, day, h, iv, phase, r, seg, t, template } from './build';

/** General fitness, muscle, strength, fat loss and sport-support templates. */

const HARD: [number, number] = [1, 3];
const EASY: [number, number] = [2, 4];

export const gf3Start = template({
  id: 'gf-3-start',
  name: 'Start here',
  description: 'Two alternating full-body sessions that teach the basic movements. A solid base for any goal.',
  goal: 'general_fitness',
  level: 'beginner',
  daysPerWeek: 3,
  daysRange: [2, 4],
  sessionMinutes: 40,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 8,
  sources: ['docs/science/training-principles.md', 'docs/science/populations-safety.md'],
  phases: [
    phase(
      'base',
      'Base',
      8,
      [
        day('a', 'Full body A', 'strength', ['Legs', 'Chest', 'Back', 'Core'], {
          warmup: WARMUP,
          main: [
            r('goblet_squat', 3, 8, 12, { rir: EASY, alt: ['bw_squat'] }),
            r('pushup', 3, 6, 12, { rir: EASY, prog: VARIATION }),
            r('db_row', 3, 8, 12, { rir: EASY, alt: ['band_row', 'inverted_row', 'table_row'] }),
            r('db_rdl', 2, 10, 12, { rir: EASY, p: 2, alt: ['glute_bridge'] }),
            h('plank', 3, 20, 45, { p: 2 }),
          ],
          cooldown: [t('brisk_walk', 10, { p: 3 })],
        }),
        day('b', 'Full body B', 'strength', ['Legs', 'Shoulders', 'Back', 'Core'], {
          warmup: WARMUP,
          main: [
            r('db_split_squat', 3, 8, 12, { rir: EASY, alt: ['split_squat'] }),
            r('db_shoulder_press', 3, 8, 12, { rir: EASY, alt: ['band_shoulder_press', 'pike_pushup'] }),
            r('lat_pulldown', 3, 8, 12, { rir: EASY, alt: ['band_pulldown', 'inverted_row', 'table_row'] }),
            r('db_hip_thrust', 2, 10, 15, { rir: EASY, p: 2, alt: ['glute_bridge'] }),
            r('dead_bug', 3, 6, 10, { p: 2, rest: 45 }),
          ],
          cooldown: [t('brisk_walk', 10, { p: 3 })],
        }),
      ],
      ['a', 'b'],
    ),
  ],
});

export const mus3FullBody = template({
  id: 'mus-3-fullbody',
  name: 'Full body foundations',
  description: 'Three full-body sessions a week. Every muscle is trained about three times with enough volume to grow.',
  goal: 'muscle',
  level: 'beginner',
  daysPerWeek: 3,
  daysRange: [2, 4],
  sessionMinutes: 55,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 6,
  sources: ['docs/science/strength-hypertrophy.md'],
  phases: [
    phase('base', 'Base', 6, [
      day('a', 'Full body A', 'strength', ['Quads', 'Chest', 'Back'], {
        warmup: WARMUP,
        main: [
          r('back_squat', 3, 6, 10, { rir: HARD, rest: 150, alt: ['goblet_squat'] }),
          r('bench_press', 3, 6, 10, { rir: HARD, rest: 150, alt: ['db_bench_press', 'db_floor_press'] }),
          r('lat_pulldown', 3, 8, 12, { rir: HARD, alt: ['pullup', 'band_pulldown'] }),
          r('leg_curl', 2, 10, 15, { p: 2, alt: ['db_rdl'] }),
          r('db_lateral_raise', 2, 12, 15, { p: 2, rest: 60 }),
          r('machine_calf_raise', 2, 10, 15, { p: 3, rest: 60 }),
        ],
      }),
      day('b', 'Full body B', 'strength', ['Hamstrings', 'Shoulders', 'Back'], {
        warmup: WARMUP,
        main: [
          r('barbell_rdl', 3, 8, 10, { rir: HARD, rest: 150, alt: ['db_rdl'] }),
          r('overhead_press', 3, 6, 10, { rir: HARD, rest: 150, alt: ['db_shoulder_press'] }),
          r('barbell_row', 3, 8, 12, { rir: HARD, alt: ['cable_row', 'db_row'] }),
          r('db_split_squat', 2, 8, 12, { p: 2 }),
          r('db_curl', 2, 10, 12, { p: 2, rest: 60 }),
          h('plank', 3, 30, 60, { p: 3 }),
        ],
      }),
      day('c', 'Full body C', 'strength', ['Quads', 'Chest', 'Back'], {
        warmup: WARMUP,
        main: [
          r('leg_press', 3, 10, 12, { rir: HARD, rest: 120, alt: ['goblet_squat'] }),
          r('incline_db_press', 3, 8, 12, { rir: HARD, rest: 120 }),
          r('pullup', 3, 6, 10, { rir: HARD, rest: 120, alt: ['lat_pulldown', 'band_pulldown'] }),
          r('cable_row', 2, 10, 12, { p: 2, alt: ['db_row'] }),
          r('triceps_pushdown', 2, 10, 12, { p: 2, rest: 60 }),
          r('hanging_knee_raise', 3, 8, 12, { p: 3, rest: 60 }),
        ],
      }),
    ]),
  ],
});

export const mus4UpperLower = template({
  id: 'mus-4-upperlower',
  name: 'Upper / Lower',
  description: 'Four sessions a week, each muscle twice. The standard next step once full-body sessions get too long.',
  goal: 'muscle',
  level: 'intermediate',
  daysPerWeek: 4,
  daysRange: [3, 5],
  sessionMinutes: 65,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 6,
  sources: ['docs/science/strength-hypertrophy.md'],
  phases: [
    phase('base', 'Base', 6, [
      day('ua', 'Upper A', 'strength', ['Chest', 'Back', 'Arms'], {
        warmup: WARMUP,
        main: [
          r('bench_press', 4, 6, 8, { rir: HARD, rest: 150, alt: ['db_bench_press'] }),
          r('barbell_row', 4, 6, 10, { rir: HARD, rest: 150, alt: ['db_row'] }),
          r('incline_db_press', 3, 8, 12, { rir: HARD, rest: 120 }),
          r('lat_pulldown', 3, 10, 12, { rir: HARD, alt: ['pullup'] }),
          r('db_lateral_raise', 3, 12, 15, { p: 2, rest: 60 }),
          r('triceps_pushdown', 3, 10, 12, { p: 2, rest: 60 }),
          r('db_curl', 3, 10, 12, { p: 3, rest: 60 }),
        ],
      }),
      day('la', 'Lower A', 'strength', ['Quads', 'Hamstrings', 'Calves'], {
        warmup: WARMUP,
        main: [
          r('back_squat', 4, 6, 8, { rir: HARD, rest: 180, alt: ['goblet_squat'] }),
          r('barbell_rdl', 3, 8, 10, { rir: HARD, rest: 150, alt: ['db_rdl'] }),
          r('leg_press', 3, 10, 12, { rir: HARD, rest: 120, alt: ['db_bulgarian'] }),
          r('leg_curl', 3, 10, 15, { p: 2 }),
          r('machine_calf_raise', 3, 10, 15, { p: 2, rest: 60 }),
          r('hanging_knee_raise', 3, 8, 12, { p: 3, rest: 60 }),
        ],
      }),
      day('ub', 'Upper B', 'strength', ['Shoulders', 'Back', 'Arms'], {
        warmup: WARMUP,
        main: [
          r('overhead_press', 4, 6, 8, { rir: HARD, rest: 150, alt: ['db_shoulder_press'] }),
          r('pullup', 4, 6, 10, { rir: HARD, rest: 150, alt: ['lat_pulldown'] }),
          r('db_bench_press', 3, 8, 12, { rir: HARD, rest: 120 }),
          r('cable_row', 3, 10, 12, { rir: HARD, alt: ['db_row'] }),
          r('db_rear_delt_fly', 3, 12, 15, { p: 2, rest: 60 }),
          r('incline_db_curl', 3, 10, 15, { p: 2, rest: 60 }),
          r('db_overhead_triceps', 3, 10, 15, { p: 3, rest: 60 }),
        ],
      }),
      day('lb', 'Lower B', 'strength', ['Hamstrings', 'Glutes', 'Quads'], {
        warmup: WARMUP,
        main: [
          r('deadlift', 3, 5, 8, { rir: [2, 3], rest: 180, alt: ['db_rdl'] }),
          r('db_bulgarian', 3, 8, 12, { rir: HARD, rest: 120 }),
          r('hip_thrust', 3, 8, 12, { rir: HARD, rest: 120, alt: ['db_hip_thrust'] }),
          r('leg_extension', 3, 12, 15, { p: 2, alt: ['db_split_squat'] }),
          r('db_calf_raise', 3, 12, 15, { p: 2, rest: 60 }),
          h('plank', 3, 30, 60, { p: 3 }),
        ],
      }),
    ]),
  ],
});

export const str3Linear = template({
  id: 'str-3-linear',
  name: 'Strength basics',
  description: 'A few heavy barbell lifts, three times a week, adding weight every session while it lasts.',
  goal: 'strength',
  level: 'beginner',
  daysPerWeek: 3,
  daysRange: [2, 3],
  sessionMinutes: 55,
  loops: true,
  progression: { type: 'linear', stepKg: 2.5 },
  deloadEveryWeeks: 8,
  sources: ['docs/science/strength-hypertrophy.md', 'docs/science/training-principles.md'],
  phases: [
    phase(
      'base',
      'Base',
      8,
      [
        day('a', 'Session A', 'strength', ['Squat', 'Bench', 'Row'], {
          warmup: WARMUP,
          main: [
            r('back_squat', 3, 5, 5, { rir: [2, 4], rest: 180, alt: ['goblet_squat'] }),
            r('bench_press', 3, 5, 5, { rir: [2, 4], rest: 180, alt: ['db_bench_press'] }),
            r('barbell_row', 3, 5, 8, { rir: [2, 4], rest: 150, alt: ['db_row'], prog: DOUBLE }),
            h('plank', 3, 30, 60, { p: 3 }),
          ],
        }),
        day('b', 'Session B', 'strength', ['Squat', 'Press', 'Deadlift'], {
          warmup: WARMUP,
          main: [
            r('back_squat', 3, 5, 5, { rir: [2, 4], rest: 180, alt: ['goblet_squat'] }),
            r('overhead_press', 3, 5, 5, { rir: [2, 4], rest: 180, alt: ['db_shoulder_press'] }),
            r('deadlift', 1, 5, 5, { rir: [2, 4], rest: 180, alt: ['db_rdl'], prog: { type: 'linear', stepKg: 5 } }),
            r('pullup', 3, 5, 8, { rest: 120, p: 2, alt: ['lat_pulldown', 'band_pulldown'], prog: VARIATION }),
          ],
        }),
      ],
      ['a', 'b'],
    ),
  ],
});

export const fat3LiftWalk = template({
  id: 'fat-3-lift-walk',
  name: 'Lean down: lift and walk',
  description: 'Strength training protects your muscle while you lose fat; walking and short intervals add the extra burn.',
  goal: 'fat_loss',
  level: 'beginner',
  daysPerWeek: 3,
  daysRange: [2, 4],
  sessionMinutes: 45,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 8,
  sources: ['docs/science/nutrition-fat-loss.md'],
  phases: [
    phase(
      'base',
      'Base',
      8,
      [
        day('a', 'Strength + intervals', 'mixed', ['Full body', 'Conditioning'], {
          warmup: WARMUP,
          main: [
            r('goblet_squat', 3, 10, 15, { rir: EASY, rest: 75, alt: ['bw_squat'] }),
            r('pushup', 3, 6, 12, { rir: EASY, rest: 75, prog: VARIATION }),
            r('db_row', 3, 10, 15, { rir: EASY, rest: 75, alt: ['band_row', 'inverted_row', 'table_row'] }),
            r('db_rdl', 3, 10, 15, { rir: EASY, rest: 75, p: 2, alt: ['glute_bridge'] }),
            iv('hard_intervals', 6, [seg('Hard', 60), seg('Easy', 60, 'rest')], { p: 2, effort: { type: 'rpe', value: [7, 8] } }),
          ],
        }),
        day('b', 'Strength + walk', 'mixed', ['Full body', 'Walking'], {
          warmup: WARMUP,
          main: [
            r('db_split_squat', 3, 8, 12, { rir: EASY, rest: 75, alt: ['split_squat'] }),
            r('db_shoulder_press', 3, 8, 12, { rir: EASY, rest: 75, alt: ['band_shoulder_press', 'pike_pushup'] }),
            r('lat_pulldown', 3, 10, 12, { rir: EASY, rest: 75, alt: ['band_pulldown', 'inverted_row', 'table_row'] }),
            r('db_hip_thrust', 3, 10, 15, { rir: EASY, rest: 75, p: 2, alt: ['glute_bridge'] }),
            h('plank', 3, 20, 45, { p: 3 }),
          ],
          cooldown: [t('brisk_walk', 20, { p: 2 })],
        }),
      ],
      ['a', 'b'],
    ),
  ],
});

export const sptAthlete = template({
  id: 'spt-athlete-general',
  name: 'General athlete',
  description: 'Strength, power and conditioning to support any field or court sport, built to sit next to your practice.',
  goal: 'sport',
  level: 'intermediate',
  daysPerWeek: 3,
  daysRange: [2, 3],
  sessionMinutes: 55,
  loops: true,
  progression: DOUBLE,
  deloadEveryWeeks: 6,
  tags: ['athlete'],
  sources: ['docs/science/sport-specific.md'],
  phases: [
    phase('base', 'Base', 6, [
      day('lower', 'Lower strength + jumps', 'strength', ['Legs', 'Power'], {
        warmup: WARMUP,
        main: [
          r('squat_jump', 3, 4, 5, { rest: 90, prog: { type: 'none' }, cue: 'Maximum height, full reset between jumps.' }),
          r('back_squat', 4, 4, 6, { rir: [2, 3], rest: 180, alt: ['goblet_squat', 'bw_bulgarian'] }),
          r('barbell_rdl', 3, 6, 8, { rir: [2, 3], rest: 150, alt: ['db_rdl', 'single_leg_rdl'] }),
          r('db_bulgarian', 3, 6, 8, { rir: HARD, rest: 120, p: 2, alt: ['bw_bulgarian'] }),
          r('db_calf_raise', 3, 10, 15, { p: 3, rest: 60, alt: ['calf_raise'] }),
          h('side_plank', 2, 20, 40, { p: 2 }),
        ],
      }),
      day('upper', 'Upper strength + carries', 'strength', ['Push', 'Pull', 'Grip'], {
        warmup: WARMUP,
        main: [
          r('bench_press', 4, 4, 6, { rir: [2, 3], rest: 150, alt: ['db_bench_press', 'pushup'] }),
          r('pullup', 4, 4, 8, { rir: [1, 3], rest: 150, alt: ['lat_pulldown', 'inverted_row'], prog: VARIATION }),
          r('db_shoulder_press', 3, 6, 10, { rir: HARD, rest: 120, alt: ['pike_pushup'] }),
          r('db_row', 3, 8, 10, { rir: HARD, p: 2, alt: ['inverted_row', 'table_row'] }),
          h('farmer_carry', 3, 30, 45, { p: 2, alt: ['plank'] }),
          r('prone_ytw', 2, 8, 10, { p: 3, rest: 45, prog: { type: 'none' } }),
        ],
      }),
      day('power', 'Power + conditioning', 'mixed', ['Power', 'Conditioning'], {
        warmup: WARMUP,
        main: [
          r('broad_jump', 4, 3, 3, { rest: 90, prog: { type: 'none' }, alt: ['squat_jump'] }),
          r('pogo_jumps', 3, 12, 15, { rest: 60, prog: { type: 'none' } }),
          r('deadlift', 3, 4, 5, { rir: [2, 3], rest: 180, alt: ['db_hip_thrust', 'single_leg_bridge'] }),
          r('pushup', 3, 8, 12, { p: 2, prog: VARIATION }),
          iv('hard_intervals', 8, [seg('Hard', 20), seg('Easy', 40, 'rest')], { effort: { type: 'rpe', value: [8, 9] } }),
        ],
      }),
    ]),
  ],
});

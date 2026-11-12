import type { Program } from '../../lib/schema';
import { DOUBLE, WARMUP, day, h, iv, phase, r, seg, t, template } from './build';

/**
 * Sport support plans: strength, power, conditioning and injury prevention that
 * sit next to the sport itself. They do not teach technique.
 * Evidence: docs/science/sport-specific.md.
 * - Power work (jumps, throws, sprints) comes first, fresh, with full rest.
 * - Conditioning copies the sport's work-to-rest pattern.
 * - In season, do two sessions a week and keep them short.
 */

const NONE = { type: 'none' } as const;
const STRONG: [number, number] = [2, 3];
const SOURCES = ['docs/science/sport-specific.md'];

type Meta = Pick<Program, 'id' | 'name' | 'description' | 'tags' | 'phases'>;

const sportPlan = (meta: Meta) =>
  template({
    ...meta,
    goal: 'sport',
    level: 'beginner',
    daysPerWeek: 3,
    daysRange: [2, 3],
    sessionMinutes: 55,
    loops: true,
    progression: DOUBLE,
    deloadEveryWeeks: 6,
    sources: SOURCES,
  });

export const sptBoxing = sportPlan({
  id: 'spt-boxing',
  name: 'Boxing support',
  description: 'Leg and hip strength, rotational power for harder punches, neck and shoulder care, and conditioning in three-minute rounds. Built around your boxing sessions, not instead of them.',
  tags: ['boxing'],
  phases: [
    phase('base', 'Base', 6, [
      day('str', 'Strength + rotation', 'strength', ['Legs', 'Rotation', 'Neck'], {
        warmup: WARMUP,
        main: [
          r('medball_rot_throw', 4, 4, 5, { rest: 75, prog: NONE, alt: ['cable_woodchop', 'band_woodchop', 'db_woodchop'], cue: 'Each side. Throw as hard as you can, reset fully between throws.' }),
          r('back_squat', 4, 4, 6, { rir: STRONG, rest: 180, alt: ['goblet_squat', 'bw_bulgarian'] }),
          r('db_bench_press', 3, 5, 8, { rir: STRONG, rest: 120, alt: ['pushup'] }),
          r('pullup', 3, 5, 8, { rir: STRONG, rest: 120, alt: ['lat_pulldown', 'inverted_row'] }),
          r('db_split_squat', 3, 6, 8, { rir: STRONG, p: 2, alt: ['split_squat'] }),
          h('neck_isometric', 2, 10, 15, { rest: 30, p: 2, prog: NONE }),
          r('pallof_press', 2, 8, 12, { rest: 45, p: 3, alt: ['side_plank'] }),
        ],
      }),
      day('pow', 'Power + upper body', 'strength', ['Power', 'Shoulders', 'Hips'], {
        warmup: WARMUP,
        main: [
          r('broad_jump', 4, 3, 3, { rest: 90, prog: NONE, alt: ['squat_jump'] }),
          r('landmine_press', 3, 6, 8, { rir: STRONG, rest: 90, alt: ['db_shoulder_press', 'pike_pushup'], cue: 'Each arm. Drive from the back foot like a straight punch.' }),
          r('db_row', 3, 8, 10, { rir: STRONG, alt: ['inverted_row', 'table_row'] }),
          r('db_hip_thrust', 3, 8, 10, { rir: STRONG, alt: ['single_leg_bridge'] }),
          r('medball_slam', 3, 6, 8, { rest: 60, prog: NONE, alt: ['band_woodchop', 'db_woodchop'] }),
          h('farmer_carry', 3, 30, 40, { p: 2, alt: ['side_plank'] }),
          r('band_external_rotation', 2, 12, 15, { p: 3, rest: 45, alt: ['prone_ytw'], prog: NONE }),
        ],
      }),
      day('rounds', 'Conditioning rounds', 'conditioning', ['Conditioning'], {
        warmup: [t('jump_rope_rounds', 5, { alt: ['shadow_boxing'] })],
        main: [
          iv('bag_rounds', 6, [seg('Round', 180), seg('Rest', 60, 'rest')], { alt: ['shadow_boxing'], effort: { type: 'rpe', value: [7, 9] } }),
          t('easy_cardio', 15, { p: 2, cue: 'Easy jog or bike to finish: it builds the aerobic base that helps you recover between rounds.' }),
        ],
        notes: 'Skip this day in weeks with hard sparring.',
      }),
    ]),
  ],
});

export const sptTennis = sportPlan({
  id: 'spt-tennis',
  name: 'Tennis support',
  description: 'Single-leg strength and lateral power for movement, rotational power for strokes, shoulder and forearm care for the serving arm, and conditioning in short repeated efforts like real points.',
  tags: ['tennis'],
  phases: [
    phase('base', 'Base', 6, [
      day('a', 'Lateral power + strength', 'strength', ['Legs', 'Rotation', 'Shoulders'], {
        warmup: WARMUP,
        main: [
          r('lateral_bound', 3, 4, 5, { rest: 75, prog: NONE, cue: 'Each side. Stick each landing for a second.' }),
          r('db_split_squat', 3, 6, 8, { rir: STRONG, rest: 90, alt: ['split_squat'] }),
          r('db_rdl', 3, 6, 8, { rir: STRONG, rest: 90, alt: ['single_leg_rdl'] }),
          r('db_row', 3, 8, 10, { rir: STRONG, alt: ['inverted_row', 'table_row'] }),
          r('medball_rot_throw', 3, 5, 5, { rest: 60, prog: NONE, alt: ['band_woodchop', 'cable_woodchop', 'db_woodchop'], cue: 'Each side, forehand and backhand stance.' }),
          r('band_external_rotation', 2, 12, 15, { p: 2, rest: 45, alt: ['prone_ytw'], prog: NONE, cue: 'The serving shoulder gets strong turning in; this balances it.' }),
        ],
      }),
      day('b', 'Strength + arm care', 'strength', ['Legs', 'Back', 'Forearms'], {
        warmup: WARMUP,
        main: [
          r('squat_jump', 3, 4, 4, { rest: 75, prog: NONE }),
          r('lateral_lunge', 3, 6, 8, { rir: STRONG }),
          r('db_hip_thrust', 3, 8, 10, { rir: STRONG, alt: ['single_leg_bridge'] }),
          r('lat_pulldown', 3, 8, 10, { rir: STRONG, alt: ['pullup', 'band_pulldown', 'inverted_row'] }),
          r('pallof_press', 2, 8, 12, { rest: 45, p: 2, alt: ['side_plank'] }),
          r('db_wrist_extension', 2, 12, 15, { rest: 45, p: 2, prog: NONE, cue: 'Slow on the way down: it keeps the elbow tendons healthy.' }),
          r('calf_raise', 3, 12, 15, { rest: 45, p: 3 }),
        ],
      }),
      day('c', 'Court conditioning', 'conditioning', ['Conditioning', 'Footwork'], {
        warmup: WARMUP,
        main: [
          iv('court_shuffles', 20, [seg('Point', 10), seg('Recover', 20, 'rest')], { effort: { type: 'rpe', value: [8, 9] }, cue: 'Split step, move, recover to the middle. Like a long game.' }),
          t('easy_cardio', 20, { p: 2 }),
        ],
      }),
    ]),
  ],
});

export const sptSoccer = sportPlan({
  id: 'spt-soccer',
  name: 'Soccer support',
  description: 'Hamstring and groin protection in every session (Nordic curls and the Copenhagen plank both have strong trial evidence), lower-body strength, sprint speed and match-like intervals.',
  tags: ['soccer'],
  phases: [
    phase('base', 'Base', 6, [
      day('str', 'Strength + prevention', 'strength', ['Legs', 'Hamstrings', 'Groin'], {
        warmup: [t('warmup_general', 6, { cue: 'Jog, skips, side shuffles, a few accelerations and cuts.' })],
        main: [
          r('back_squat', 4, 4, 6, { rir: STRONG, rest: 180, alt: ['goblet_squat', 'bw_bulgarian'] }),
          r('db_hip_thrust', 3, 6, 8, { rir: STRONG, alt: ['single_leg_bridge'] }),
          r('nordic_curl', 3, 4, 6, { rest: 120, cue: 'Lower as slowly as you can. The single best hamstring protector.' }),
          h('copenhagen_plank', 2, 15, 25, { rest: 45, cue: 'Each side. Bend the knee on the bench to make it easier.' }),
          r('calf_raise', 3, 12, 15, { rest: 45, p: 3, alt: ['db_calf_raise'] }),
          h('side_plank', 2, 20, 40, { p: 3 }),
        ],
      }),
      day('speed', 'Speed + strength', 'strength', ['Speed', 'Hamstrings', 'Upper body'], {
        warmup: [t('warmup_general', 6, { cue: 'Jog, skips, side shuffles, a few build-up runs.' })],
        main: [
          iv('sprints', 6, [seg('Sprint', 5), seg('Walk back', 60, 'rest')], { cue: '20 to 30 m flat out, then walk back. Full rest every time.' }),
          r('db_rdl', 3, 6, 8, { rir: STRONG, rest: 120, alt: ['single_leg_rdl'] }),
          r('db_split_squat', 3, 6, 8, { rir: STRONG, alt: ['split_squat'] }),
          r('pushup', 3, 8, 12, { p: 2, prog: { type: 'variation' } }),
          r('pullup', 3, 5, 8, { p: 2, rest: 120, alt: ['lat_pulldown', 'inverted_row'] }),
          h('copenhagen_plank', 2, 15, 25, { rest: 45 }),
        ],
      }),
      day('cond', 'Match conditioning', 'conditioning', ['Conditioning'], {
        warmup: [t('easy_run', 8)],
        main: [
          iv('run_intervals', 4, [seg('Hard', 240), seg('Easy', 180, 'rest')], { effort: { type: 'rpe', value: [8, 9] } }),
          h('copenhagen_plank', 2, 15, 25, { rest: 45, p: 2 }),
        ],
        notes: 'Off-season and pre-season. In season, matches and practice usually cover this.',
      }),
    ]),
  ],
});

export const sptBasketball = sportPlan({
  id: 'spt-basketball',
  name: 'Basketball support',
  description: 'Jumping and landing well, lower-body strength, slow heavy work for knee tendons, ankle balance, and repeated-sprint conditioning.',
  tags: ['basketball'],
  phases: [
    phase('base', 'Base', 6, [
      day('a', 'Jump + lower strength', 'strength', ['Power', 'Legs', 'Knees'], {
        warmup: WARMUP,
        main: [
          r('box_jump', 4, 3, 3, { rest: 90, prog: NONE, alt: ['squat_jump'], cue: 'Land quietly with knees over toes. Step down.' }),
          r('back_squat', 4, 4, 6, { rir: STRONG, rest: 180, alt: ['goblet_squat', 'bw_bulgarian'], cue: '3 seconds down: slow heavy work keeps the knee tendons healthy.' }),
          r('db_rdl', 3, 6, 8, { rir: STRONG, alt: ['single_leg_rdl'] }),
          r('db_split_squat', 3, 6, 8, { rir: STRONG, p: 2, alt: ['split_squat'] }),
          h('wall_sit', 3, 30, 45, { rest: 60, p: 2, prog: NONE }),
          h('single_leg_balance', 2, 20, 30, { rest: 30, p: 3, prog: NONE }),
        ],
      }),
      day('b', 'Lateral power + upper body', 'strength', ['Power', 'Upper body', 'Calves'], {
        warmup: WARMUP,
        main: [
          r('lateral_bound', 3, 4, 5, { rest: 75, prog: NONE }),
          r('db_bench_press', 3, 6, 8, { rir: STRONG, alt: ['pushup'] }),
          r('pullup', 3, 5, 8, { rir: STRONG, rest: 120, alt: ['lat_pulldown', 'inverted_row'] }),
          r('db_hip_thrust', 3, 8, 10, { rir: STRONG, alt: ['single_leg_bridge'] }),
          r('calf_raise', 3, 12, 15, { rest: 45, alt: ['db_calf_raise'], cue: 'Slow and full range, one leg at a time when you can.' }),
          r('pallof_press', 2, 8, 12, { rest: 45, p: 3, alt: ['side_plank'] }),
        ],
      }),
      day('c', 'Repeated sprints', 'conditioning', ['Conditioning'], {
        warmup: WARMUP,
        main: [
          iv('sprints', 10, [seg('Sprint', 15), seg('Rest', 30, 'rest')], { effort: { type: 'rpe', value: [8, 9] }, cue: 'Court lengths or shuttle runs.' }),
          r('lateral_lunge', 2, 8, 10, { p: 2 }),
          h('copenhagen_plank', 2, 15, 25, { rest: 45, p: 3, alt: ['side_plank'] }),
        ],
      }),
    ]),
  ],
});
